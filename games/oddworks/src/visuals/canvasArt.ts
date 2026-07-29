import { palette } from "./palette";

export type Facing = "left" | "right";
export type PersonRole = "porter" | "maker" | "keeper" | "visitor";
export type PersonMood = "content" | "busy" | "worried" | "waiting";

export interface PersonArt {
  role: PersonRole;
  mood?: PersonMood;
  facing?: Facing;
  carrying?: boolean;
  selected?: boolean;
}

/**
 * Draws sprites in a deliberate 16px logical grid. Callers can scale the
 * context for crisp, larger sprites; smoothing is disabled automatically.
 */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  art: PersonArt,
  tick = 0,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  if (art.facing === "left") ctx.scale(-1, 1);

  const bob = Math.floor(tick / 12) % 2;
  const coat = {
    porter: palette.blue,
    maker: palette.honey,
    keeper: palette.plum,
    visitor: palette.berry,
  }[art.role];

  if (art.selected) {
    ctx.fillStyle = palette.focus;
    ctx.fillRect(-7, 14, 14, 2);
    ctx.fillRect(-5, 12, 10, 1);
  }

  // Feet, coat, face, cap/hair: chunky shapes read at every zoom level.
  ctx.fillStyle = palette.ink;
  ctx.fillRect(-4, 12 + bob, 3, 2);
  ctx.fillRect(2, 12 + (1 - bob), 3, 2);
  ctx.fillStyle = coat;
  ctx.fillRect(-5, 5, 10, 8);
  ctx.fillRect(-6, 7, 2, 4);
  ctx.fillStyle = palette.paper;
  ctx.fillRect(-4, 0, 8, 6);
  ctx.fillStyle = palette.ink;
  ctx.fillRect(-5, -1, 9, 2);
  ctx.fillRect(2, 2, 1, 1);

  if (art.mood === "worried") {
    ctx.fillRect(0, 5, 2, 1);
  } else if (art.mood === "content") {
    ctx.fillRect(1, 4, 2, 1);
  }

  if (art.carrying) {
    ctx.fillStyle = palette.timber;
    ctx.fillRect(5, 6, 5, 5);
    ctx.strokeStyle = palette.timberDark;
    ctx.strokeRect(5.5, 6.5, 4, 4);
  }
  ctx.restore();
}

export type MechanismKind = "bell" | "sign" | "cart" | "gate";

export function drawMechanism(
  ctx: CanvasRenderingContext2D,
  kind: MechanismKind,
  x: number,
  y: number,
  active = false,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  ctx.lineWidth = 2;
  ctx.strokeStyle = palette.ink;
  ctx.fillStyle = active ? palette.focus : palette.honey;

  if (kind === "bell") {
    ctx.fillRect(-5, -5, 10, 7);
    ctx.strokeRect(-5, -5, 10, 7);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(-7, 2, 14, 2);
    ctx.fillRect(-1, 4, 2, 2);
    if (active) {
      ctx.fillRect(-10, -3, 2, 1);
      ctx.fillRect(8, -3, 2, 1);
    }
  } else if (kind === "sign") {
    ctx.fillStyle = palette.paper;
    ctx.fillRect(-7, -7, 14, 8);
    ctx.strokeRect(-7, -7, 14, 8);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(-3, -4, 6, 2);
    ctx.fillRect(1, -6, 2, 6);
    ctx.fillStyle = palette.timber;
    ctx.fillRect(-1, 1, 2, 9);
  } else if (kind === "cart") {
    ctx.fillStyle = palette.timber;
    ctx.fillRect(-8, -5, 16, 8);
    ctx.strokeRect(-8, -5, 16, 8);
    ctx.fillStyle = palette.ink;
    ctx.fillRect(-6, 4, 4, 4);
    ctx.fillRect(3, 4, 4, 4);
  } else {
    ctx.fillStyle = palette.timberDark;
    ctx.fillRect(-8, -9, 3, 18);
    ctx.fillRect(5, -9, 3, 18);
    ctx.fillStyle = active ? palette.success : palette.timber;
    ctx.fillRect(-5, -6, 10, 3);
    ctx.fillRect(-5, 0, 10, 3);
    ctx.fillRect(-5, 6, 10, 3);
  }
  ctx.restore();
}

/** A tactile stippled ground tile, deterministic for stable replays. */
export function drawGroundTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
): void {
  ctx.fillStyle = palette.paperShade;
  ctx.fillRect(x, y, size, size);
  let value = seed | 0;
  for (let i = 0; i < 6; i += 1) {
    value = (value * 1664525 + 1013904223) | 0;
    const px = x + ((value >>> 4) % size);
    value = (value * 1664525 + 1013904223) | 0;
    const py = y + ((value >>> 4) % size);
    ctx.fillStyle = i % 2 ? "#cbb685" : "#e8d5aa";
    ctx.fillRect(px, py, 1, 1);
  }
}

export function setupCrispCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Oddworks needs a 2D canvas context.");
  ctx.scale(ratio, ratio);
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

