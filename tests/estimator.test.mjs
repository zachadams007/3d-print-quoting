// Written for this public copy; not part of the original project.
// Solids with known volumes go through the project's parsers and calculator.
// Node 22.18 or later strips the TypeScript types itself:
//   node --no-warnings --test tests/estimator.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import { parseSTL } from "../lib/estimator/stl-parser.ts";
import { parseThreeMF } from "../lib/estimator/threemf-parser.ts";
import { calculateEstimate } from "../lib/estimator/calculator.ts";

function box(size, offset = 0) {
  const vertices = [0, 1].flatMap((x) => [0, 1].flatMap((y) => [0, 1].map((z) => [x, y, z].map((v) => v * size + offset))));
  const faces = [
    [0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5],
    [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6],
    [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3],
  ];
  return { vertices, faces };
}

function sphere(radius, rings) {
  const at = (i, j) => {
    const theta = (Math.PI * i) / rings;
    const phi = (Math.PI * 2 * (j % (2 * rings))) / (2 * rings);
    return [radius * Math.sin(theta) * Math.cos(phi), radius * Math.sin(theta) * Math.sin(phi), radius * Math.cos(theta)];
  };
  const out = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < 2 * rings; j++) {
      if (i > 0) out.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
      if (i < rings - 1) out.push([at(i, j + 1), at(i + 1, j), at(i + 1, j + 1)]);
    }
  }
  return out;
}

const triangles = ({ vertices, faces }) => faces.map((f) => f.map((i) => vertices[i]));

function binarySTL(tris, header, extraBytes = 0) {
  const buffer = Buffer.alloc(84 + tris.length * 50 + extraBytes);
  buffer.write(header, 0, "ascii");
  buffer.writeUInt32LE(tris.length, 80);
  tris.forEach((tri, i) => tri.flat().forEach((v, k) => buffer.writeFloatLE(v, 84 + i * 50 + 12 + k * 4)));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length);
}

function asciiSTL(tris) {
  const body = tris.map((t) => `facet normal 0 0 0\nouter loop\n${t.map((v) => `vertex ${v.join(" ")}`).join("\n")}\nendloop\nendfacet`);
  return new TextEncoder().encode(`solid demo\n${body.join("\n")}\nendsolid demo`).buffer;
}

function threeMF(meshes) {
  const xml = meshes.map(({ vertices, faces }) =>
    `<object><mesh><vertices>${vertices.map(([x, y, z]) => `<vertex x="${x}" y="${y}" z="${z}"/>`).join("")}</vertices>` +
    `<triangles>${faces.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join("")}</triangles></mesh></object>`);
  return new JSZip().file("3D/3dmodel.model", `<model>${xml.join("")}</model>`).generateAsync({ type: "arraybuffer" });
}

const settings = {
  printing_hours_per_day: 8, buffer_hours_per_job: 0.5, base_hours_per_cm3: 0.5, overhead_hours: 0.25, waste_factor: 1.1,
  minimum_price: 5, time_rate_per_hour: 0, rush_multiplier: 1.25, setup_fee_standard: 0, setup_fee_special: 3, supports_fee: 2,
  quality_multipliers: { "0.28": 0.85, "0.20": 1, "0.12": 1.35 }, infill_multipliers: { "15": 1, "25": 1.1, "40": 1.25 },
};
const material = { id: "pla", name: "PLA", in_stock: true, density_g_cm3: 1.24, price_per_gram: 0.1, price_per_gram_slope: 0, time_multiplier: 1 };

function quote(mesh, over = {}) {
  return calculateEstimate({
    material, settings, qualityPreset: "0.20", infillPreset: "15", supports: false, rush: false,
    fileEstimates: [{ fileName: "x.stl", fileExt: "stl", volumeCm3: mesh.volumeCm3 || null, surfaceAreaMm2: mesh.surfaceAreaMm2, manualRequired: mesh.volumeCm3 === 0 }],
    ...over,
  });
}

function near(actual, expected, relative) {
  assert.ok(Math.abs(actual - expected) <= relative * expected, `${actual} is not within ${relative} of ${expected}`);
}

const cube = (mm, offset) => parseSTL(binarySTL(triangles(box(mm, offset)), "cube"));

describe("STL volume and area", () => {
  it("measures a 20 mm cube whose binary header says solid", () => {
    const mesh = parseSTL(binarySTL(triangles(box(20)), "solid cube"));
    near(mesh.volumeCm3, 8, 1e-6);
    near(mesh.surfaceAreaMm2, 2400, 1e-6);
  });
  it("measures the same cube as ASCII", () => near(parseSTL(asciiSTL(triangles(box(20)))).volumeCm3, 8, 1e-9));
  it("does not depend on distance from the origin", () => near(cube(20, 500).volumeCm3, 8, 1e-6));
  it("accepts a binary file with trailing bytes", () => near(parseSTL(binarySTL(triangles(box(20)), "cube", 40)).volumeCm3, 8, 1e-6));
  it("converges on a sphere", () => near(parseSTL(binarySTL(sphere(15, 128), "sphere")).volumeCm3, (4 / 3) * Math.PI * 3.375, 1e-3));
  it("returns zero for bytes that are not a mesh", () => {
    assert.equal(parseSTL(new TextEncoder().encode("this is not a mesh").buffer).volumeCm3, 0);
  });
});

describe("3MF volume", () => {
  it("keeps triangle indices local to each mesh", async () => {
    near((await parseThreeMF(await threeMF([box(20), box(10, 100)]))).volumeCm3, 9, 1e-9);
  });
  it("reports no volume for a package without a mesh", async () => {
    const mesh = await parseThreeMF(await threeMF([])).catch(() => ({ volumeCm3: 0 }));
    assert.equal(mesh.volumeCm3, 0);
  });
});

describe("Shell and infill model", () => {
  it("uses less plastic than a solid part", () => assert.ok(quote(cube(40)).grams < 64 * 1.24 * settings.waste_factor));
  it("uses more plastic as infill rises", () => {
    const grams = ["15", "25", "40"].map((infillPreset) => quote(cube(40), { infillPreset }).grams);
    assert.ok(grams[0] < grams[1] && grams[1] < grams[2], String(grams));
  });
  it("thins the shell as area grows against a cube of equal volume", () => {
    const shell = (9600 * 4 * 0.8) / 4 ** 0.2 / 1000;
    const expected = (shell + 0.15 * (64 - shell)) * material.density_g_cm3 * settings.waste_factor;
    near(quote({ volumeCm3: 64, surfaceAreaMm2: 9600 * 4 }).grams, expected, 1e-3);
  });
});

describe("Price rules", () => {
  it("never quotes below the minimum", () => assert.ok(quote(cube(2)).price >= settings.minimum_price));
  it("raises the price for a rush order", () => assert.ok(quote(cube(60), { rush: true }).price > quote(cube(60)).price));
  it("sends an unreadable file to manual review without a price", () => {
    const result = quote({ volumeCm3: 0, surfaceAreaMm2: 0 });
    assert.equal(result.manualRequired, true);
    assert.equal(result.price, 0);
  });
});
