export type GameSlot = {
  id: string;
  bay: string;
  title: string;
  description: string;
  genre: string;
  platform: string;
  year: string;
  playUrl: string;
  videoUrl: string;
  imageUrl: string;
};

export const STORAGE_KEY = "njengines.bays.v1";
export const BAY_COUNT = 12;

const LIMITS: Record<keyof Omit<GameSlot, "id" | "bay">, number> = {
  title: 48,
  description: 480,
  genre: 28,
  platform: 28,
  year: 4,
  playUrl: 500,
  videoUrl: 500,
  imageUrl: 2_400_000,
};

export function createSlots(): GameSlot[] {
  return Array.from({ length: BAY_COUNT }, (_, i) => {
    const bay = String(i + 1).padStart(2, "0");
    return {
      id: `bay-${bay}`,
      bay,
      title: "",
      description: "",
      genre: "",
      platform: "",
      year: "",
      playUrl: "",
      videoUrl: "",
      imageUrl: "",
    };
  });
}

export function isFilled(slot: GameSlot): boolean {
  return Boolean(
    slot.title.trim() || slot.imageUrl || slot.playUrl || slot.videoUrl || slot.description.trim(),
  );
}

export function slotTitle(slot: GameSlot): string {
  return slot.title.trim() || "Compartimento livre";
}

export function safeHttpUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return "";
  }
  return "";
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

export function sanitizeSlot(slot: GameSlot): GameSlot {
  const image = slot.imageUrl.startsWith("data:image/")
    ? slot.imageUrl.slice(0, LIMITS.imageUrl)
    : "";
  return {
    ...slot,
    title: clip(slot.title, LIMITS.title).trim(),
    description: clip(slot.description, LIMITS.description).trim(),
    genre: clip(slot.genre, LIMITS.genre).trim(),
    platform: clip(slot.platform, LIMITS.platform).trim(),
    year: clip(slot.year, LIMITS.year).replace(/[^\d]/g, ""),
    playUrl: safeHttpUrl(clip(slot.playUrl, LIMITS.playUrl)),
    videoUrl: safeHttpUrl(clip(slot.videoUrl, LIMITS.videoUrl)),
    imageUrl: image,
  };
}

export function hydrateSlots(raw: unknown): GameSlot[] {
  const base = createSlots();
  if (!Array.isArray(raw)) return base;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = (item as { id?: unknown }).id;
    if (typeof id !== "string") continue;
    const index = base.findIndex((slot) => slot.id === id);
    if (index < 0) continue;
    base[index] = sanitizeSlot({ ...base[index], ...(item as GameSlot), id, bay: base[index].bay });
  }
  return base;
}

export function readSlots(): GameSlot[] {
  if (typeof localStorage === "undefined") return createSlots();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSlots();
    return hydrateSlots(JSON.parse(raw) as unknown);
  } catch {
    return createSlots();
  }
}

export function writeSlots(slots: GameSlot[]): { ok: true } | { ok: false } {
  const clean = slots.map(sanitizeSlot);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
