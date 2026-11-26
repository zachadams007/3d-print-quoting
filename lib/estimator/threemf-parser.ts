import JSZip from "jszip";

export interface ThreeMFResult {
  volumeMm3: number;
  volumeCm3: number;
  surfaceAreaMm2: number;
  parsed: boolean;
}

function triangleArea(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): number {
  const ex = bx - ax, ey = by - ay, ez = bz - az;
  const fx = cx - ax, fy = cy - ay, fz = cz - az;
  const nx = ey * fz - ez * fy;
  const ny = ez * fx - ex * fz;
  const nz = ex * fy - ey * fx;
  return 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
}

interface MeshMetrics {
  volume: number;
  surfaceArea: number;
}

/**
 * Parse a single <mesh>…</mesh> block. Vertex indices in <triangle>
 * elements are local to the enclosing <mesh>, so each block must be
 * processed independently.
 */
function parseMeshBlock(meshXml: string): MeshMetrics {
  const vertices: number[][] = [];
  const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = vRegex.exec(meshXml)) !== null) {
    vertices.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
  }

  const tRegex = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
  let volume = 0;
  let surfaceArea = 0;

  while ((m = tRegex.exec(meshXml)) !== null) {
    const a = vertices[parseInt(m[1])];
    const b = vertices[parseInt(m[2])];
    const c = vertices[parseInt(m[3])];
    if (!a || !b || !c) continue;

    volume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;

    surfaceArea += triangleArea(
      a[0], a[1], a[2],
      b[0], b[1], b[2],
      c[0], c[1], c[2],
    );
  }

  return { volume, surfaceArea };
}

export async function parseThreeMF(buffer: ArrayBuffer): Promise<ThreeMFResult> {
  try {
    const zip = await JSZip.loadAsync(buffer);

    const modelFile =
      zip.file("3D/3dmodel.model") ?? zip.file(/3dmodel\.model$/i)[0];

    if (!modelFile) {
      return { volumeMm3: 0, volumeCm3: 0, surfaceAreaMm2: 0, parsed: false };
    }

    const xml = await modelFile.async("text");

    // Each <mesh> has its own vertex list with local indices.
    // Process independently to avoid cross-object index collisions.
    const meshRegex = /<mesh>([\s\S]*?)<\/mesh>/gi;
    let meshMatch: RegExpExecArray | null;
    let totalVolume = 0;
    let totalSurfaceArea = 0;

    while ((meshMatch = meshRegex.exec(xml)) !== null) {
      const metrics = parseMeshBlock(meshMatch[1]);
      totalVolume += metrics.volume;
      totalSurfaceArea += metrics.surfaceArea;
    }

    const vol = Math.abs(totalVolume);
    if (vol === 0) return { volumeMm3: 0, volumeCm3: 0, surfaceAreaMm2: 0, parsed: false };

    return { volumeMm3: vol, volumeCm3: vol / 1000, surfaceAreaMm2: totalSurfaceArea, parsed: true };
  } catch {
    return { volumeMm3: 0, volumeCm3: 0, surfaceAreaMm2: 0, parsed: false };
  }
}
