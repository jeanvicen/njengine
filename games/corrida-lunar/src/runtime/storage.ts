const KEY = "njengine:corrida-lunar:v1";

export type PersistedState = {
  quality: "low" | "medium" | "high";
  selectedCar: "basic" | "premium";
};

const DEFAULTS: PersistedState = {
  quality: "high",
  selectedCar: "basic"
};

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      quality: parsed.quality === "low" || parsed.quality === "medium" || parsed.quality === "high"
        ? parsed.quality
        : DEFAULTS.quality,
      selectedCar: parsed.selectedCar === "premium" ? "premium" : "basic"
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveState(next: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // The game remains playable when browser storage is unavailable.
  }
}
