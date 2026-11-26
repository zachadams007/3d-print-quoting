export interface STLResult {
  volumeMm3: number;
  volumeCm3: number;
  surfaceAreaMm2: number;
  triangleCount: number;
}

function isLikelyBinary(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  const expectedSize = 84 + numTriangles * 50;
  return Math.abs(buffer.byteLength - expectedSize) < 100;
}

interface MeshMetrics {
  volume: number;
  surfaceArea: number;
  count: number;
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

function parseBinary(buffer: ArrayBuffer): MeshMetrics {
  const view = new DataView(buffer);
  const numTriangles = view.getUint32(80, true);
  let volume = 0;
  let surfaceArea = 0;

  for (let i = 0; i < numTriangles; i++) {
    const off = 84 + i * 50;
    const v1x = view.getFloat32(off + 12, true);
    const v1y = view.getFloat32(off + 16, true);
    const v1z = view.getFloat32(off + 20, true);
    const v2x = view.getFloat32(off + 24, true);
    const v2y = view.getFloat32(off + 28, true);
    const v2z = view.getFloat32(off + 32, true);
    const v3x = view.getFloat32(off + 36, true);
    const v3y = view.getFloat32(off + 40, true);
    const v3z = view.getFloat32(off + 44, true);

    volume +=
      (v1x * (v2y * v3z - v2z * v3y) -
        v1y * (v2x * v3z - v2z * v3x) +
        v1z * (v2x * v3y - v2y * v3x)) /
      6;

    surfaceArea += triangleArea(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
  }

  return { volume: Math.abs(volume), surfaceArea, count: numTriangles };
}

function parseAscii(buffer: ArrayBuffer): MeshMetrics {
  const text = new TextDecoder().decode(buffer);
  const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  const verts: number[][] = [];
  let match: RegExpExecArray | null;

  while ((match = vertexRegex.exec(text)) !== null) {
    verts.push([parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]);
  }

  let volume = 0;
  let surfaceArea = 0;
  let count = 0;

  for (let i = 0; i + 2 < verts.length; i += 3) {
    const [v1x, v1y, v1z] = verts[i];
    const [v2x, v2y, v2z] = verts[i + 1];
    const [v3x, v3y, v3z] = verts[i + 2];

    volume +=
      (v1x * (v2y * v3z - v2z * v3y) -
        v1y * (v2x * v3z - v2z * v3x) +
        v1z * (v2x * v3y - v2y * v3x)) /
      6;

    surfaceArea += triangleArea(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
    count++;
  }

  return { volume: Math.abs(volume), surfaceArea, count };
}

export function parseSTL(buffer: ArrayBuffer): STLResult {
  const { volume, surfaceArea, count } = isLikelyBinary(buffer)
    ? parseBinary(buffer)
    : parseAscii(buffer);

  return {
    volumeMm3: volume,
    volumeCm3: volume / 1000,
    surfaceAreaMm2: surfaceArea,
    triangleCount: count,
  };
}
