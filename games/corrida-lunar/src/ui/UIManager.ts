import type { EngineKind } from "../runtime/createEngine";
import type { PersistedState } from "../runtime/storage";

export type HudState = {
  speedMph: number;
  gear: number;
  lap: number;
  lapTimeSeconds: number;
};

type UIHandlers = {
  getState: () => PersistedState;
  onSetQuality: (q: PersistedState["quality"]) => void;
  onStartRace: () => void;
  onOpenGarage: () => void;
  onBackToMenu: () => void;
  onSelectCar: (car: PersistedState["selectedCar"]) => void;
};

export class UIManager {
  private readonly root: HTMLDivElement;
  private readonly handlers: UIHandlers;
  private engineKind: EngineKind = "webgl2";
  private screen: "menu" | "garage" | "race" = "menu";
  private hudGetter: (() => HudState) | null = null;

  private menuEl!: HTMLDivElement;
  private garageEl!: HTMLDivElement;
  private loadingEl!: HTMLDivElement;
  private hudEl!: HTMLDivElement;
  private toastEl!: HTMLDivElement;

  private hudSpeedEl!: HTMLDivElement;
  private hudGearEl!: HTMLSpanElement;
  private hudLapEl!: HTMLSpanElement;
  private hudTimeEl!: HTMLSpanElement;

  private loadingBarEl!: HTMLDivElement;
  private loadingLabelEl!: HTMLDivElement;

  constructor(root: HTMLDivElement, handlers: UIHandlers) {
    this.root = root;
    this.handlers = handlers;
  }

  mount(): void {
    this.root.innerHTML = "";

    this.menuEl = this.buildMenu();
    this.garageEl = this.buildGarage();
    this.loadingEl = this.buildLoading();
    this.hudEl = this.buildHud();
    this.toastEl = document.createElement("div");
    this.toastEl.className = "toast";
    this.root.append(this.menuEl, this.garageEl, this.loadingEl, this.hudEl, this.toastEl);

    this.setScreen("menu");
    const loop = () => {
      this.tick();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setEngineKind(kind: EngineKind): void {
    this.engineKind = kind;
    const el = this.menuEl.querySelector<HTMLElement>("[data-engine-kind]");
    if (el) el.textContent = kind === "webgpu" ? "WebGPU" : "WebGL2";
  }

  setScreen(state: "menu" | "garage" | "race"): void {
    this.screen = state;
    this.menuEl.style.display = state === "menu" ? "grid" : "none";
    this.garageEl.style.display = state === "garage" ? "grid" : "none";
    this.hudEl.style.display = state === "race" ? "block" : "none";
    if (state === "garage") this.refreshGarage();
  }

  setLoading(show: boolean, label = "Carregando…"): void {
    this.loadingEl.style.display = show ? "grid" : "none";
    this.loadingLabelEl.textContent = label;
    if (!show) this.setLoadingProgress(0);
  }

  setLoadingProgress(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    this.loadingBarEl.style.width = `${Math.round(clamped * 100)}%`;
  }

  bindHud(getter: (() => HudState) | null): void {
    this.hudGetter = getter;
  }

  toast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add("toast--show");
    window.setTimeout(() => this.toastEl.classList.remove("toast--show"), 2200);
  }

  private tick(): void {
    if (!this.hudGetter || this.screen !== "race") return;
    const s = this.hudGetter();
    this.hudSpeedEl.textContent = `${Math.round(s.speedMph * 1.60934)}`;
    this.hudGearEl.textContent = `${s.gear}`;
    this.hudLapEl.textContent = `${s.lap}`;
    this.hudTimeEl.textContent = formatTime(s.lapTimeSeconds);
  }

  private buildMenu(): HTMLDivElement {
    const screen = document.createElement("div");
    screen.className = "ui-screen";
    const panel = document.createElement("div");
    panel.className = "panel";

    const inner = document.createElement("div");
    inner.className = "panel__inner";

    const title = document.createElement("div");
    title.className = "title";
    title.innerHTML = `
      <div>
        <h1>Corrida Lunar</h1>
        <p>Acelere no circuito lunar, complete voltas e acompanhe seu tempo.</p>
      </div>
      <div class="tag"><span class="tag__dot"></span><span data-engine-kind>…</span></div>
    `;

    const cards = document.createElement("div");
    cards.className = "grid-2";
    cards.innerHTML = `
      <div class="card">
        <h3>Controles</h3>
        <p><span class="kbd">W</span>/<span class="kbd">↑</span> acelerar • <span class="kbd">S</span>/<span class="kbd">↓</span> frear/recuar • <span class="kbd">A/D</span> ou setas para virar • <span class="kbd">R</span> reposicionar</p>
        <p>Controle compatível. No celular, arraste para virar; deslize para cima para acelerar e para baixo para frear.</p>
      </div>
      <div class="card">
        <h3>Qualidade gráfica</h3>
        <p>Ajuste os gráficos ao seu dispositivo para equilibrar qualidade e desempenho.</p>
        <div class="row">
          <div class="field" style="min-width: 220px">
            <label for="quality">Nível</label>
            <select id="quality">
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
          <button class="btn btn--ghost" data-action="apply-quality">Aplicar</button>
        </div>
      </div>
    `;

    const footer = document.createElement("div");
    footer.className = "row";
    footer.innerHTML = `
      <div style="color: var(--muted); font-size: 12px">Dica: pressione <span class="kbd">R</span> para voltar ao início da pista.</div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end">
        <button class="btn btn--ghost" data-action="garage">Garagem</button>
        <button class="btn btn--primary" data-action="start">Iniciar corrida</button>
      </div>
    `;

    const credit = document.createElement("p");
    credit.className = "source-credit";
    credit.innerHTML = 'Base de jogo: <a href="https://github.com/InnovatingTech/new-racer" target="_blank" rel="noopener noreferrer">Neon Dusk Circuit — InnovatingTech</a>, adaptado a partir do fork <a href="https://github.com/jeanvicen/new-racer" target="_blank" rel="noopener noreferrer">jeanvicen/new-racer</a>.';

    inner.append(title, cards, footer, credit);
    panel.append(inner);
    screen.append(panel);

    const qualityInput = cards.querySelector<HTMLSelectElement>("#quality");
    if (qualityInput) qualityInput.value = this.handlers.getState().quality;

    cards.querySelector("[data-action=apply-quality]")?.addEventListener("click", () => {
      const value = (qualityInput?.value ?? "high").trim().toLowerCase();
      const q = value === "low" || value === "medium" || value === "high" ? value : "high";
      this.handlers.onSetQuality(q);
      this.toast(`Qualidade ajustada: ${q === "high" ? "alta" : q === "medium" ? "média" : "baixa"}.`);
    });

    screen.querySelector("[data-action=start]")?.addEventListener("click", () => this.handlers.onStartRace());
    screen.querySelector("[data-action=garage]")?.addEventListener("click", () => this.handlers.onOpenGarage());

    return screen;
  }

  private buildGarage(): HTMLDivElement {
    const screen = document.createElement("div");
    screen.className = "ui-screen";
    const panel = document.createElement("div");
    panel.className = "panel";
    const inner = document.createElement("div");
    inner.className = "panel__inner";

    const title = document.createElement("div");
    title.className = "title";
    title.innerHTML = `
      <div>
        <h1>Garagem lunar</h1>
        <p>Escolha seu carro. As duas opções estão disponíveis.</p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end">
        <button class="btn btn--ghost" data-action="back">Voltar</button>
        <button class="btn btn--primary" data-action="race">Iniciar corrida</button>
      </div>
    `;

    const cards = document.createElement("div");
    cards.className = "grid-2";
    cards.innerHTML = `
      <div class="card" data-car="basic">
        <h3>Rover de treino</h3>
        <p>Carro estável para aprender o circuito e controlar as curvas.</p>
        <div class="row">
          <span class="tag"><span class="tag__dot" style="background: var(--accent2)"></span><span data-basic-status>Disponível</span></span>
          <button class="btn" data-action="select-basic">Selecionar</button>
        </div>
      </div>
      <div class="card" data-car="premium">
        <h3>Lunar GT</h3>
        <p>Visual esportivo com detalhes luminosos para a pista noturna.</p>
        <div class="row">
          <span class="tag"><span class="tag__dot" style="background: var(--accent)"></span><span data-premium-status>Disponível</span></span>
          <button class="btn" data-action="select-premium">Selecionar</button>
        </div>
      </div>
    `;

    inner.append(title, cards);
    panel.append(inner);
    screen.append(panel);

    screen.querySelector("[data-action=back]")?.addEventListener("click", () => this.handlers.onBackToMenu());
    screen.querySelector("[data-action=race]")?.addEventListener("click", () => this.handlers.onStartRace());
    screen.querySelector("[data-action=select-basic]")?.addEventListener("click", () => {
      this.handlers.onSelectCar("basic");
      this.toast("Rover de treino selecionado.");
      this.refreshGarage();
    });
    screen.querySelector("[data-action=select-premium]")?.addEventListener("click", () => {
      this.handlers.onSelectCar("premium");
      this.toast("Lunar GT selecionado.");
      this.refreshGarage();
    });
    return screen;
  }

  private refreshGarage(): void {
    const state = this.handlers.getState();
    const basic = this.garageEl.querySelector<HTMLElement>("[data-car=basic]");
    const lunar = this.garageEl.querySelector<HTMLElement>("[data-car=premium]");
    basic?.setAttribute(
      "style",
      state.selectedCar === "basic" ? "outline: 1px solid rgba(0,199,255,.45)" : ""
    );
    lunar?.setAttribute(
      "style",
      state.selectedCar === "premium" ? "outline: 1px solid rgba(255,106,0,.45)" : ""
    );
    const basicStatus = this.garageEl.querySelector<HTMLElement>("[data-basic-status]");
    const lunarStatus = this.garageEl.querySelector<HTMLElement>("[data-premium-status]");
    if (basicStatus) basicStatus.textContent = state.selectedCar === "basic" ? "Selecionado" : "Disponível";
    if (lunarStatus) lunarStatus.textContent = state.selectedCar === "premium" ? "Selecionado" : "Disponível";
    const selectLunarBtn = this.garageEl.querySelector<HTMLButtonElement>("[data-action=select-premium]");
    if (selectLunarBtn) selectLunarBtn.disabled = false;
  }

  private buildLoading(): HTMLDivElement {
    const screen = document.createElement("div");
    screen.className = "ui-screen";
    screen.style.display = "none";
    const panel = document.createElement("div");
    panel.className = "panel";
    const inner = document.createElement("div");
    inner.className = "panel__inner";
    inner.innerHTML = `
      <div class="title">
        <div>
          <h1>Carregando</h1>
          <p data-loading-label>…</p>
        </div>
      </div>
      <div style="height: 10px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; border: 1px solid rgba(255,255,255,0.12)">
        <div data-loading-bar style="height: 100%; width: 0%; background: linear-gradient(90deg, rgba(0,199,255,0.65), rgba(255,106,0,0.85))"></div>
      </div>
      <div style="color: var(--muted); font-size: 12px">A primeira abertura pode demorar um pouco enquanto os gráficos são preparados.</div>
    `;
    panel.append(inner);
    screen.append(panel);

    this.loadingBarEl = inner.querySelector<HTMLDivElement>("[data-loading-bar]")!;
    this.loadingLabelEl = inner.querySelector<HTMLDivElement>("[data-loading-label]")!;
    return screen;
  }

  private buildHud(): HTMLDivElement {
    const hud = document.createElement("div");
    hud.className = "hud";
    hud.style.display = "none";
    hud.innerHTML = `
      <div class="hud__panel">
        <div class="hud__big">
          <div>
            <div class="hud__speed" data-hud-speed>0</div>
            <div style="margin-top: 2px; color: var(--muted); letter-spacing: 1.2px">
              <span class="hud__unit">KM/H</span>
            </div>
          </div>
          <div class="hud__meta">
            <span>MARCHA <b data-hud-gear>1</b></span>
            <span>VOLTA <b data-hud-lap>1</b></span>
            <span><b data-hud-time>00:00.00</b> TEMPO</span>
          </div>
        </div>
      </div>
    `;
    this.hudSpeedEl = hud.querySelector<HTMLDivElement>("[data-hud-speed]")!;
    this.hudGearEl = hud.querySelector<HTMLSpanElement>("[data-hud-gear]")!;
    this.hudLapEl = hud.querySelector<HTMLSpanElement>("[data-hud-lap]")!;
    this.hudTimeEl = hud.querySelector<HTMLSpanElement>("[data-hud-time]")!;
    return hud;
  }
}

function formatTime(totalSeconds: number): string {
  const ms = Math.max(0, Math.floor((totalSeconds % 1) * 100));
  const s = Math.max(0, Math.floor(totalSeconds) % 60);
  const m = Math.max(0, Math.floor(totalSeconds / 60));
  return `${`${m}`.padStart(2, "0")}:${`${s}`.padStart(2, "0")}.${`${ms}`.padStart(2, "0")}`;
}

