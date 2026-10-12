const GLYPHS: Record<string, string[]> = {
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  J: ["..###", "...#.", "...#.", "...#.", "#..#.", "#..#.", ".##.."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
};

export const WORD = "NJENGINES";

export type LogoPoint = { x: number; y: number };
export type LogoCell = { row: number; column: number; index: number };

export function buildWordGrid(): { cells: LogoCell[]; columns: number; rows: number } {
  const cells: LogoCell[] = [];
  let letterOffset = 0;
  for (const character of WORD) {
    const glyph = GLYPHS[character];
    if (!glyph) continue;
    for (let row = 0; row < 7; row++) {
      for (let column = 0; column < 5; column++) {
        if (glyph[row]?.[column] === "#") {
          cells.push({ row, column: letterOffset + column, index: cells.length });
        }
      }
    }
    letterOffset += 6;
  }
  return { cells, columns: WORD.length * 5 + WORD.length - 1, rows: 7 };
}

export type LogoLayout = {
  points: LogoPoint[];
  width: number;
  height: number;
  pitch: number;
};

export function buildLogo(): LogoLayout {
  const pitch = 0.64;
  const gap = 0.86;
  const cols = 5;
  const rows = 7;
  const letterW = cols * pitch;
  const width = WORD.length * letterW + (WORD.length - 1) * gap;
  const height = rows * pitch;
  const points: LogoPoint[] = [];
  let cursor = -width / 2;

  for (const ch of WORD) {
    const glyph = GLYPHS[ch];
    if (!glyph) continue;
    for (let r = 0; r < rows; r++) {
      const line = glyph[r] ?? "";
      for (let c = 0; c < cols; c++) {
        if (line[c] !== "#") continue;
        points.push({
          x: cursor + (c + 0.5) * pitch,
          y: height / 2 - (r + 0.5) * pitch,
        });
      }
    }
    cursor += letterW + gap;
  }

  return { points, width, height, pitch };
}
