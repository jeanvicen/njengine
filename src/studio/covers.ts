const INK = "#ece8de";
const EMBER = "#ed7135";
const VOID = "#07080b";
const FACE = "#14161c";

export type CoverInput = {
  bay: string;
  title: string;
  filled: boolean;
};

export function coverPixelSize(): { w: number; h: number } {
  const wide = typeof window !== "undefined" && window.innerWidth >= 900;
  const w = wide ? 1280 : 800;
  return { w, h: Math.round(w * 1.25) };
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const count = Math.round((w * h) / 1800);
  for (let i = 0; i < count; i++) {
    const a = 0.04 + rand() * 0.12;
    ctx.fillStyle = rand() > 0.82 ? `rgba(232,93,44,${a})` : `rgba(200,194,180,${a})`;
    ctx.fillRect(rand() * w, rand() * h, rand() > 0.7 ? 2 : 1, 1);
  }
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(236,232,222,0.45)";
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeRect(w * 0.045, h * 0.036, w * 0.91, h * 0.928);
  ctx.strokeStyle = "rgba(237,113,53,0.85)";
  ctx.lineWidth = Math.max(3, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(w * 0.045, h * 0.036);
  ctx.lineTo(w * 0.22, h * 0.036);
  ctx.stroke();
}

function scrim(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, h * 0.52, 0, h);
  g.addColorStop(0, "rgba(7,8,11,0)");
  g.addColorStop(1, "rgba(7,8,11,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
}

function motif(ctx: CanvasRenderingContext2D, w: number, h: number, index: number) {
  const rand = mulberry(index * 97 + 13);
  const kind = index % 8;
  ctx.save();
  ctx.translate(w / 2, h * 0.42);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === 0) {
    for (let i = 5; i >= 1; i--) {
      ctx.beginPath();
      ctx.strokeStyle = i === 2 ? EMBER : INK;
      ctx.globalAlpha = 0.35 + i * 0.1;
      ctx.arc(0, 0, w * 0.06 * i, rand() * 0.4, Math.PI * 1.7);
      ctx.stroke();
    }
  } else if (kind === 1) {
    for (let i = 0; i < 7; i++) {
      const y = (i - 3) * h * 0.045;
      ctx.globalAlpha = 0.45 + (i % 3) * 0.15;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, y);
      ctx.lineTo(0, y - h * 0.03);
      ctx.lineTo(w * 0.28, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = EMBER;
    ctx.fillRect(-w * 0.015, -h * 0.16, w * 0.03, h * 0.32);
  } else if (kind === 2) {
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, h * 0.08);
    ctx.lineTo(w * 0.34, h * 0.08);
    ctx.stroke();
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.arc(w * 0.08, -h * 0.02, w * 0.055, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      ctx.globalAlpha = 0.25 + rand() * 0.4;
      ctx.fillStyle = INK;
      ctx.fillRect(-w * 0.3 + i * w * 0.07, h * 0.12, w * 0.02, h * 0.05 + rand() * h * 0.08);
    }
  } else if (kind === 3) {
    ctx.rotate(-0.4);
    for (let i = -8; i <= 8; i++) {
      ctx.globalAlpha = 0.2 + ((i + 8) % 4) * 0.12;
      ctx.beginPath();
      ctx.moveTo(i * w * 0.045, -h * 0.28);
      ctx.lineTo(i * w * 0.045, h * 0.28);
      ctx.stroke();
    }
    ctx.rotate(0.4);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = EMBER;
    ctx.strokeRect(-w * 0.16, -h * 0.1, w * 0.32, h * 0.2);
  } else if (kind === 4) {
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = 0.9;
    ctx.strokeRect(-w * 0.16, -w * 0.16, w * 0.32, w * 0.32);
    ctx.strokeRect(-w * 0.08, -w * 0.08, w * 0.16, w * 0.16);
    ctx.fillStyle = EMBER;
    ctx.fillRect(-w * 0.025, -w * 0.025, w * 0.05, w * 0.05);
  } else if (kind === 5) {
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * w * 0.11;
      ctx.globalAlpha = 0.55;
      ctx.strokeRect(x - w * 0.035, -h * 0.16, w * 0.07, h * 0.32);
      ctx.globalAlpha = 1;
      ctx.fillStyle = i === 2 ? EMBER : INK;
      ctx.fillRect(x - w * 0.012, -h * 0.02 + (i % 2) * h * 0.04, w * 0.024, h * 0.08);
    }
  } else if (kind === 6) {
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.35 + i * 0.2;
      ctx.beginPath();
      ctx.arc(-w * 0.02, h * 0.02, w * (0.1 + i * 0.08), Math.PI * 0.9, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = EMBER;
    ctx.beginPath();
    ctx.arc(w * 0.16, -h * 0.08, w * 0.028, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.4 + i * 0.12;
      const inset = i * w * 0.045;
      ctx.strokeRect(-w * 0.26 + inset, -h * 0.16 + inset * 0.6, w * 0.52 - inset * 2, h * 0.32 - inset * 1.2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = EMBER;
    ctx.fillRect(-w * 0.26, -h * 0.16, w * 0.08, h * 0.018);
  }

  ctx.restore();
  grain(ctx, w, h, rand);
}

function labelBlock(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  input: CoverInput,
) {
  scrim(ctx, w, h);
  frame(ctx, w, h);

  ctx.textBaseline = "middle";
  ctx.fillStyle = INK;
  ctx.font = `500 ${Math.round(w * 0.034)}px Unbounded, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("NJ", w * 0.08, h * 0.075);
  ctx.textAlign = "right";
  ctx.fillStyle = EMBER;
  ctx.fillText(input.bay, w * 0.92, h * 0.075);

  const title = (input.title.trim() || "EM BREVE").toUpperCase();
  let size = Math.round(w * 0.062);
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  do {
    ctx.font = `700 ${size}px Unbounded, sans-serif`;
    size -= 2;
  } while (ctx.measureText(title).width > w * 0.78 && size > 18);
  ctx.fillText(title, w / 2, h * 0.785);

  const pw = w * 0.36;
  const ph = h * 0.058;
  const x = (w - pw) / 2;
  const y = h * 0.845;
  ctx.fillStyle = EMBER;
  roundRect(ctx, x, y, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = VOID;
  ctx.font = `700 ${Math.round(ph * 0.42)}px Unbounded, sans-serif`;
  ctx.fillText("LOCAL", w / 2, y + ph / 2 + 1);

  if (input.filled) {
    ctx.fillStyle = EMBER;
    ctx.fillRect(w * 0.08, h * 0.1, w * 0.035, h * 0.008);
  }
}

export function paintCoverCanvas(
  input: CoverInput,
  image: CanvasImageSource | null,
): HTMLCanvasElement {
  const { w, h } = coverPixelSize();
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = FACE;
  ctx.fillRect(0, 0, w, h);

  if (image) {
    const iw = "width" in image ? Number(image.width) : w;
    const ih = "height" in image ? Number(image.height) : h;
    const ir = iw / Math.max(1, ih);
    const cr = w / h;
    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;
    if (ir > cr) {
      sw = ih * cr;
      sx = (iw - sw) / 2;
    } else {
      sh = iw / cr;
      sy = (ih - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
    ctx.fillStyle = "rgba(7,8,11,0.28)";
    ctx.fillRect(0, 0, w, h);
  } else {
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, "#1b1d24");
    wash.addColorStop(1, FACE);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
    const index = Number.parseInt(input.bay, 10) || 1;
    motif(ctx, w, h, index);
  }

  labelBlock(ctx, w, h, input);
  return canvas;
}

export function paintCoverDataUrl(input: CoverInput): string {
  return paintCoverCanvas(input, null).toDataURL("image/jpeg", 0.86);
}

export function paintSwarmCanvas(variant: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#12141a";
  ctx.fillRect(0, 0, w, h);
  motif(ctx, w, h, variant + 1);
  frame(ctx, w, h);
  const g = ctx.createLinearGradient(0, h * 0.7, 0, h);
  g.addColorStop(0, "rgba(7,8,11,0)");
  g.addColorStop(1, "rgba(7,8,11,0.78)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(w * 0.07)}px Unbounded, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NJ", w / 2, h * 0.8);
  ctx.fillStyle = EMBER;
  roundRect(ctx, w * 0.32, h * 0.86, w * 0.36, h * 0.055, h * 0.03);
  ctx.fill();
  ctx.fillStyle = VOID;
  ctx.font = `700 ${Math.round(w * 0.035)}px Unbounded, sans-serif`;
  ctx.fillText("LOCAL", w / 2, h * 0.888);
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image"));
    img.src = src;
  });
}

export async function compressImageFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const maxEdge = 960;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}
