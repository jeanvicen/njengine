import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Gamepad2,
  HardDrive,
  Library,
  Maximize2,
  Minimize2,
  Pencil,
  Play,
  Search,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Dossier } from "@/components/studio-shell";
import { paintCoverDataUrl } from "@/studio/covers";
import type { EngineHandle, Phase } from "@/studio/create-engine";
import {
  createSlots,
  isFilled,
  readSlots,
  sanitizeSlot,
  slotTitle,
  writeSlots,
  type GameSlot,
} from "@/studio/slots";

type ViewMode = "library" | "immersive";

export function LibraryShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [slots, setSlots] = useState<GameSlot[]>(createSlots);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<ViewMode>("library");
  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [engineOn, setEngineOn] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState("");
  const slotsRef = useRef(slots);
  const soundRef = useRef(soundOn);
  const playUiSoundRef = useRef<(frequency: number, seconds: number, type: OscillatorType) => void>(() => {});
  slotsRef.current = slots;
  soundRef.current = soundOn;

  const filledSlots = useMemo(() => slots.filter(isFilled), [slots]);
  const filledIds = filledSlots.map((slot) => slot.id).join("|");
  const focused = filledSlots.find((slot) => slot.id === focusId) ?? filledSlots[0] ?? null;
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const canAdd = slots.some((slot) => !isFilled(slot));

  useEffect(() => {
    const saved = readSlots();
    setSlots(saved);
    slotsRef.current = saved;
    setReady(true);
  }, []);

  useEffect(() => {
    const update = () => {
      setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mode !== "immersive" || !ready || !filledIds) {
      engineRef.current = null;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    let dead = false;
    let handle: EngineHandle | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Create the 3D carousel only when requested, not on the library screen.
    void import("@/studio/create-engine").then(({ createEngine: makeEngine }) => {
      if (dead || !canvasRef.current) return;
      handle = makeEngine({
        canvas: canvasRef.current,
        slots: slotsRef.current.filter(isFilled),
        reduced,
        onPhase: setPhase,
        onProgress: () => {},
        onSelect: (id) => {
          setSelectedId(id);
          if (id) playUiSoundRef.current(140, 0.2, "sawtooth");
        },
        onHover: () => {},
        onFocus: setFocusId,
        onFail: () => setWebgl(false),
      });
      if (dead) {
        handle.dispose();
        return;
      }
      engineRef.current = handle;
      setEngineOn(true);
      if (!reduced) handle.skip();
    });

    return () => {
      dead = true;
      handle?.dispose();
      engineRef.current = null;
    };
  }, [mode, ready, filledIds]);

  useEffect(() => {
    if (!engineOn) return;
    engineRef.current?.sync(filledSlots);
  }, [filledSlots, engineOn]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedId);
  }, [selectedId, engineOn]);

  useEffect(() => {
    if (mode !== "immersive") return;
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setMode((current) => (current === "immersive" ? "library" : current));
        setSelectedId(null);
        setEngineOn(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [mode]);

  useEffect(() => {
    if (mode !== "immersive") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      if (event.key === "Escape") {
        if (selectedId) {
          setSelectedId(null);
        } else {
          setMode("library");
          setSelectedId(null);
          setEngineOn(false);
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        }
        return;
      }
      if (selectedId) return;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        engineRef.current?.moveFocus(1);
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        engineRef.current?.moveFocus(-1);
      } else if (event.key === "Enter") {
        engineRef.current?.confirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, selectedId]);

  useEffect(() => {
    if (mode !== "immersive") return;
    let frame = 0;
    const held = { left: false, right: false, confirm: false, back: false };
    const edge = (key: keyof typeof held, pressed: boolean, action: () => void) => {
      if (pressed && !held[key]) action();
      held[key] = pressed;
    };
    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((item) => item !== null);
      if (pad) {
        const left = (pad.axes[0] ?? 0) < -0.55 || Boolean(pad.buttons[14]?.pressed);
        const right = (pad.axes[0] ?? 0) > 0.55 || Boolean(pad.buttons[15]?.pressed);
        const confirm = Boolean(pad.buttons[0]?.pressed || pad.buttons[9]?.pressed);
        const back = Boolean(pad.buttons[1]?.pressed || pad.buttons[8]?.pressed);
        if (!selectedId) {
          edge("left", left, () => engineRef.current?.moveFocus(-1));
          edge("right", right, () => engineRef.current?.moveFocus(1));
          edge("confirm", confirm, () => engineRef.current?.confirm());
        } else {
          edge("back", back, () => setSelectedId(null));
        }
      } else {
        held.left = false;
        held.right = false;
        held.confirm = false;
        held.back = false;
      }
      frame = window.requestAnimationFrame(poll);
    };
    frame = window.requestAnimationFrame(poll);
    return () => window.cancelAnimationFrame(frame);
  }, [mode, selectedId]);

  useEffect(() => {
    if (mode !== "immersive") return;
    const audio = new Audio("/intro.mp3");
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = 0.72;
    audioRef.current = audio;
    const start = () => {
      if (!soundRef.current) return;
      void audio.play().catch(() => {});
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = !soundOn;
  }, [soundOn, mode]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || mode !== "immersive" || phase !== "gallery") return;
    const fade = window.setInterval(() => {
      audio.volume = Math.max(0, audio.volume - 0.08);
      if (audio.volume <= 0) {
        audio.pause();
        window.clearInterval(fade);
      }
    }, 120);
    return () => window.clearInterval(fade);
  }, [phase, mode]);

  function playUiSound(frequency: number, seconds: number, type: OscillatorType) {
    if (!soundRef.current) return;
    try {
      const Context = window.AudioContext;
      if (!Context) return;
      const context = audioContextRef.current ?? new Context();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * 0.6), context.currentTime + seconds);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + seconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + seconds + 0.02);
    } catch {
      // O feedback sonoro é opcional; os controles continuam funcionando sem ele.
    }
  }
  playUiSoundRef.current = playUiSound;

  function persist(next: GameSlot[]) {
    setSlots(next);
    slotsRef.current = next;
    return writeSlots(next);
  }

  function addGame() {
    const next = slots.find((slot) => !isFilled(slot));
    if (next) setSelectedId(next.id);
  }

  function enterImmersive() {
    if (!ready) return;
    setWebgl(true);
    setPhase("intro");
    setFocusId(filledSlots[0]?.id ?? null);
    setSelectedId(null);
    setMode("immersive");
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen) {
      void root.requestFullscreen().catch(() => {});
    }
  }

  function leaveImmersive() {
    setMode("library");
    setSelectedId(null);
    setEngineOn(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }

  const dossier = selected ? (
    <>
      <button
        type="button"
        className="backdrop fixed inset-0"
        aria-label="Fechar ficha"
        onClick={() => setSelectedId(null)}
      />
      <Dossier
        slot={selected}
        onClose={() => setSelectedId(null)}
        onSave={(draft) => {
          const next = slots.map((slot) => (slot.id === draft.id ? sanitizeSlot(draft) : slot));
          return persist(next).ok;
        }}
        onClear={(id) => {
          const fresh = createSlots().find((slot) => slot.id === id);
          if (!fresh) return;
          const next = slots.map((slot) => (slot.id === id ? fresh : slot));
          if (!next.some(isFilled)) setEngineOn(false);
          persist(next);
        }}
      />
    </>
  ) : null;

  if (mode === "library") {
    return (
      <main className="launcher-page">
        <LibraryView
          slots={slots}
          ready={ready}
          clock={clock}
          canAdd={canAdd}
          onAdd={addGame}
          onSelect={setSelectedId}
          onImmersive={enterImmersive}
        />
        {dossier}
      </main>
    );
  }

  const emptyImmersive = filledSlots.length === 0;
  return (
    <main className="immersive-page">
      {!emptyImmersive && webgl && <canvas ref={canvasRef} className="stage-canvas absolute inset-0 h-full w-full" />}
      <div className="immersive-vignette pointer-events-none absolute inset-0" />
      <div className="immersive-grain pointer-events-none absolute inset-0" />

      <header className="immersive-toolbar">
        <div className="immersive-brand-lockup">
          <span className="immersive-mark"><img src="/favicon.svg" alt="" /></span>
          <span className="immersive-brand-name">NJ<span>engine</span></span>
          <span className="immersive-mode-label">MODO IMERSIVO</span>
        </div>
        <div className="immersive-toolbar-actions">
          <span className="immersive-count">{filledSlots.length} {filledSlots.length === 1 ? "jogo" : "jogos"}</span>
          <button type="button" className="immersive-icon-btn" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Silenciar" : "Ativar som"}>
            {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          </button>
          <button type="button" className="immersive-toolbar-btn" onClick={leaveImmersive}>
            <Library aria-hidden="true" /> <span>Biblioteca</span>
          </button>
          <button type="button" className="immersive-icon-btn" onClick={leaveImmersive} aria-label="Sair do modo imersivo">
            <Minimize2 aria-hidden="true" />
          </button>
        </div>
      </header>

      {emptyImmersive ? (
        <section className="immersive-empty" aria-labelledby="immersive-empty-title">
          <div className="immersive-empty-mark"><Gamepad2 aria-hidden="true" /></div>
          <p className="immersive-eyebrow">NJENGINE · MODO IMERSIVO</p>
          <h1 id="immersive-empty-title">Sua biblioteca está vazia</h1>
          <p>Adicione um jogo real à biblioteca para navegar por ele aqui. Nenhum jogo de demonstração foi incluído.</p>
          <button type="button" className="immersive-primary-btn" onClick={leaveImmersive}>Voltar à biblioteca</button>
        </section>
      ) : !webgl ? (
        <section className="immersive-fallback" aria-label="Biblioteca em modo compatível">
          <p className="immersive-eyebrow">MODO COMPATÍVEL</p>
          <h1>Seus jogos</h1>
          <p>Este navegador não disponibilizou a visualização 3D. A biblioteca continua acessível.</p>
          <div className="immersive-fallback-grid">
            {filledSlots.map((slot) => (
              <GameCard key={slot.id} slot={slot} onSelect={setSelectedId} />
            ))}
          </div>
          <button type="button" className="immersive-primary-btn" onClick={leaveImmersive}>Voltar à biblioteca</button>
        </section>
      ) : (
        <>
          {phase === "intro" && (
            <div className="immersive-boot" role="status">
              <span className="boot-indicator" />
              <p>Preparando a sessão</p>
              <button type="button" className="boot-skip-btn" onClick={() => engineRef.current?.skip()}>Pular abertura <ArrowRight aria-hidden="true" /></button>
            </div>
          )}
          {phase === "gallery" && focused && (
            <section className="immersive-focus" aria-live="polite">
              <p className="immersive-eyebrow">BAIA {focused.bay} <span>·</span> {focused.genre.trim() || "SEM GÊNERO"}</p>
              <h1>{slotTitle(focused)}</h1>
              <p className="immersive-meta">{[focused.platform, focused.year].filter(Boolean).join(" · ") || "Ficha cadastrada por você"}</p>
              {focused.description.trim() && <p className="immersive-description">{focused.description}</p>}
              <div className="immersive-game-actions">
                <button type="button" className="immersive-primary-btn" onClick={() => setSelectedId(focused.id)}><Pencil aria-hidden="true" /> Ficha do jogo</button>
                {focused.playUrl.trim() ? (
                  <a className="immersive-secondary-btn" href={focused.playUrl} target="_blank" rel="noreferrer"><Play aria-hidden="true" /> Abrir jogo</a>
                ) : (
                  <span className="immersive-no-link">Link de jogo não configurado</span>
                )}
              </div>
            </section>
          )}
          <div className="immersive-controls">
            <button type="button" className="immersive-nav-btn" onClick={() => engineRef.current?.moveFocus(-1)} aria-label="Jogo anterior"><ChevronLeft aria-hidden="true" /></button>
            <span className="immersive-hint"><span className="desktop-hint">← → / A D navegar <i /> Enter abre a ficha <i /> Controle: direcional + A <i /> Esc retorna</span><span className="mobile-hint">Deslize entre jogos · toque para abrir</span></span>
            <button type="button" className="immersive-nav-btn" onClick={() => engineRef.current?.moveFocus(1)} aria-label="Próximo jogo"><ChevronRight aria-hidden="true" /></button>
          </div>
        </>
      )}
      {dossier}
    </main>
  );
}

function LibraryView({
  slots,
  ready,
  clock,
  canAdd,
  onAdd,
  onSelect,
  onImmersive,
}: {
  slots: GameSlot[];
  ready: boolean;
  clock: string;
  canAdd: boolean;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onImmersive: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("all");
  const [sort, setSort] = useState("title");
  const games = useMemo(() => slots.filter(isFilled), [slots]);
  const genres = useMemo(() => {
    const unique = new Map<string, string>();
    games.forEach((slot) => {
      const genre = slot.genre.trim();
      if (genre && !unique.has(genre.toLocaleLowerCase("pt-BR"))) unique.set(genre.toLocaleLowerCase("pt-BR"), genre);
    });
    return [...unique.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [games]);
  const visibleGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return games
      .filter((slot) => {
        const matchesGenre = activeGenre === "all" || slot.genre.trim() === activeGenre;
        const searchable = [slot.title, slot.genre, slot.platform, slot.year, slot.description].join(" ").toLocaleLowerCase("pt-BR");
        return matchesGenre && (!normalized || searchable.includes(normalized));
      })
      .sort((a, b) => {
        if (sort === "title-desc") return slotTitle(b).localeCompare(slotTitle(a), "pt-BR");
        if (sort === "bay") return a.bay.localeCompare(b.bay);
        return slotTitle(a).localeCompare(slotTitle(b), "pt-BR");
      });
  }, [games, query, activeGenre, sort]);
  const freeSlots = slots.filter((slot) => !isFilled(slot)).length;

  return (
    <div className="launcher-layout">
      <aside className="launcher-sidebar">
        <a className="launcher-brand" href="#biblioteca" aria-label="NJengine — Biblioteca">
          <span className="launcher-brand-icon"><img src="/favicon.svg" alt="" /></span>
          <span className="launcher-brand-word">NJ<span>engine</span></span>
        </a>

        <nav className="launcher-nav" aria-label="Navegação da biblioteca">
          <p className="launcher-nav-label">COLEÇÃO</p>
          <button type="button" className={`launcher-nav-item ${activeGenre === "all" ? "is-active" : ""}`} onClick={() => setActiveGenre("all")}>
            <Library aria-hidden="true" /><span>Todos os jogos</span><span className="launcher-nav-count">{games.length}</span>
          </button>
          {genres.length > 0 && <p className="launcher-nav-label launcher-genre-label">GÊNEROS</p>}
          {genres.map((genre) => (
            <button key={genre} type="button" className={`launcher-nav-item ${activeGenre === genre ? "is-active" : ""}`} onClick={() => setActiveGenre(genre)}>
              <span className="genre-dot" aria-hidden="true" /><span>{genre}</span><span className="launcher-nav-count">{games.filter((slot) => slot.genre.trim() === genre).length}</span>
            </button>
          ))}
        </nav>

        <div className="launcher-sidebar-spacer" />
        <div className="launcher-local-note">
          <HardDrive aria-hidden="true" />
          <div><strong>Biblioteca local</strong><span>Salva neste navegador</span></div>
        </div>
        <div className="launcher-sidebar-foot">NJENGINE · WEB EDITION</div>
      </aside>

      <section className="launcher-main" id="biblioteca">
        <header className="launcher-topbar">
          <div className="launcher-time"><span className="local-status-dot" /> Neste aparelho <span className="topbar-divider" /> {clock || "—:—"}</div>
          <div className="launcher-top-actions">
            <button type="button" className="launcher-action launcher-action-secondary" onClick={onImmersive} disabled={!ready}>
              <Maximize2 aria-hidden="true" /><span>Modo imersivo</span>
            </button>
            <button type="button" className="launcher-action launcher-action-primary" onClick={onAdd} disabled={!canAdd || !ready}>
              <CirclePlus aria-hidden="true" /><span>Adicionar jogo</span>
            </button>
          </div>
        </header>

        <div className="launcher-heading-row">
          <div>
            <p className="launcher-eyebrow">SUA COLEÇÃO</p>
            <h1>Biblioteca</h1>
            <p className="launcher-subheading">
              {ready ? `${games.length} ${games.length === 1 ? "jogo salvo" : "jogos salvos"} · ${freeSlots} ${freeSlots === 1 ? "baia disponível" : "baias disponíveis"}` : "Carregando sua biblioteca…"}
            </p>
          </div>
          {games.length > 0 && <div className="launcher-heading-mark"><Gamepad2 aria-hidden="true" /><span>NJENGINE<br />GAME LIBRARY</span></div>}
        </div>

        {games.length > 0 && (
          <div className="launcher-toolbar">
            <label className="launcher-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Buscar jogos</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na biblioteca" />
              {query && <button type="button" aria-label="Limpar busca" onClick={() => setQuery("")}><X aria-hidden="true" /></button>}
            </label>
            <label className="launcher-sort">
              <ArrowDownAZ aria-hidden="true" />
              <span className="sr-only">Ordenar biblioteca</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="title">Nome A–Z</option>
                <option value="title-desc">Nome Z–A</option>
                <option value="bay">Ordem das baias</option>
              </select>
              <ChevronDown aria-hidden="true" />
            </label>
          </div>
        )}

        {genres.length > 0 && (
          <div className="launcher-mobile-filters" aria-label="Filtrar por gênero">
            <button type="button" className={activeGenre === "all" ? "is-active" : ""} onClick={() => setActiveGenre("all")}>Todos</button>
            {genres.map((genre) => <button key={genre} type="button" className={activeGenre === genre ? "is-active" : ""} onClick={() => setActiveGenre(genre)}>{genre}</button>)}
          </div>
        )}

        {!ready ? (
          <div className="launcher-loading" role="status"><span className="boot-indicator" /> Lendo jogos salvos neste navegador…</div>
        ) : games.length === 0 ? (
          <section className="launcher-empty" aria-labelledby="library-empty-title">
            <div className="launcher-empty-art"><span className="empty-art-orbit empty-art-orbit-one" /><span className="empty-art-orbit empty-art-orbit-two" /><Gamepad2 aria-hidden="true" /></div>
            <p className="launcher-eyebrow">SEM JOGOS DE DEMONSTRAÇÃO</p>
            <h2 id="library-empty-title">Monte sua biblioteca</h2>
            <p>Adicione os jogos que você realmente usa, escolha capas e salve os links de acesso. Seus dados ficam neste navegador.</p>
            <button type="button" className="launcher-action launcher-action-primary launcher-empty-action" onClick={onAdd} disabled={!canAdd}><CirclePlus aria-hidden="true" /> Adicionar primeiro jogo</button>
            <span className="launcher-empty-foot">12 baias pessoais · sem títulos ou links fictícios</span>
          </section>
        ) : visibleGames.length > 0 ? (
          <>
            <div className="launcher-section-heading"><h2>{activeGenre === "all" ? "Todos os jogos" : activeGenre}</h2><span>{visibleGames.length} {visibleGames.length === 1 ? "item" : "itens"}</span></div>
            <div className="launcher-game-grid">
              {visibleGames.map((slot) => <GameCard key={slot.id} slot={slot} onSelect={onSelect} />)}
              {canAdd && <button type="button" className="launcher-add-card" onClick={onAdd}><span className="launcher-add-icon"><CirclePlus aria-hidden="true" /></span><strong>Adicionar jogo</strong><span>Use uma baia disponível</span></button>}
            </div>
          </>
        ) : (
          <section className="launcher-no-results">
            <Search aria-hidden="true" />
            <h2>Nenhum jogo encontrado</h2>
            <p>Tente outro termo ou limpe os filtros para ver sua coleção.</p>
            <button type="button" className="launcher-text-action" onClick={() => { setQuery(""); setActiveGenre("all"); }}>Limpar busca e filtros</button>
          </section>
        )}

        <footer className="launcher-main-foot"><span>Os jogos são cadastrados por você.</span><span>{freeSlots} de 12 baias livres</span></footer>
      </section>
    </div>
  );
}

function GameCard({ slot, onSelect }: { slot: GameSlot; onSelect: (id: string) => void }) {
  const cover = slot.imageUrl || paintCoverDataUrl({ bay: slot.bay, title: slot.title, filled: isFilled(slot) });
  const meta = [slot.genre, slot.platform].filter((value) => value.trim()).join(" · ");
  return (
    <article className="launcher-game-card">
      <button type="button" className="launcher-cover-button" onClick={() => onSelect(slot.id)} aria-label={`Abrir ficha de ${slotTitle(slot)}`}>
        <img src={cover} alt={slot.imageUrl ? `Capa de ${slotTitle(slot)}` : `Capa gerada para a baia ${slot.bay}`} loading="lazy" />
        <span className="launcher-cover-open"><Play aria-hidden="true" /> Ver ficha</span>
        <span className="launcher-bay-tag">BAIA {slot.bay}</span>
      </button>
      <div className="launcher-game-info">
        <button type="button" className="launcher-game-title" onClick={() => onSelect(slot.id)}>{slotTitle(slot)}</button>
        <button type="button" className="launcher-edit-btn" onClick={() => onSelect(slot.id)} aria-label={`Editar ${slotTitle(slot)}`}><Pencil aria-hidden="true" /></button>
      </div>
      <p className="launcher-game-meta">{meta || "Ficha pessoal"}</p>
    </article>
  );
}
