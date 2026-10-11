import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Gamepad2,
  HardDrive,
  Library,
  Pencil,
  Play,
  Search,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Dossier } from "@/components/studio-shell";
import { paintCoverDataUrl } from "@/studio/covers";
import type { EngineHandle } from "@/studio/create-engine";
import {
  createSlots,
  isFilled,
  readSlots,
  safeHttpUrl,
  sanitizeSlot,
  slotTitle,
  writeSlots,
  type GameSlot,
} from "@/studio/slots";

type BootPhase = "forming" | "blackout" | "flash" | "reveal";

type CarouselCard = {
  slot: GameSlot;
  index: number;
  position: "previous" | "selected" | "next";
};

export function LibraryShell() {
  const [slots, setSlots] = useState<GameSlot[]>(createSlots);
  const [ready, setReady] = useState(false);
  const [bootVisible, setBootVisible] = useState(true);
  const [bootPhase, setBootPhase] = useState<BootPhase>("forming");
  const [introFinished, setIntroFinished] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [clock, setClock] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const games = useMemo(() => slots.filter(isFilled), [slots]);
  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const canAdd = slots.some((slot) => !isFilled(slot));

  useEffect(() => {
    const saved = readSlots();
    setSlots(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !introFinished) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setBootPhase("reveal");
      const timer = window.setTimeout(() => setBootVisible(false), 550);
      return () => window.clearTimeout(timer);
    }
    setBootPhase("blackout");
    const flash = window.setTimeout(() => setBootPhase("flash"), 420);
    const reveal = window.setTimeout(() => setBootPhase("reveal"), 610);
    const done = window.setTimeout(() => setBootVisible(false), 1510);
    return () => {
      window.clearTimeout(flash);
      window.clearTimeout(reveal);
      window.clearTimeout(done);
    };
  }, [ready, introFinished]);

  useEffect(() => {
    if (!bootVisible) return;
    const audio = new Audio("/intro.mp3");
    audio.preload = "auto";
    audio.volume = 0.7;
    audioRef.current = audio;
    void audio.play().catch(() => {});
    const start = () => {
      if (soundRef.current) void audio.play().catch(() => {});
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
  }, [bootVisible]);

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedId) setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    soundRef.current = next;
    if (!next) audioRef.current?.pause();
    else if (bootVisible && audioRef.current) void audioRef.current.play().catch(() => {});
  }

  function persist(next: GameSlot[]) {
    setSlots(next);
    return writeSlots(next);
  }

  function addGame() {
    const next = slots.find((slot) => !isFilled(slot));
    if (next) setSelectedId(next.id);
  }

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
      gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + seconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + seconds + 0.02);
    } catch {
      // O som é opcional; a navegação continua funcionando sem ele.
    }
  }

  const dossier = selected ? (
    <>
      <button type="button" className="backdrop fixed inset-0" aria-label="Fechar ficha" onClick={() => setSelectedId(null)} />
      <Dossier
        slot={selected}
        onClose={() => setSelectedId(null)}
        onSave={(draft) => {
          const next = slots.map((slot) => (slot.id === draft.id ? sanitizeSlot(draft) : slot));
          return persist(next).ok;
        }}
        onClear={(id) => {
          const fresh = createSlots().find((slot) => slot.id === id);
          if (fresh) persist(slots.map((slot) => (slot.id === id ? fresh : slot)));
        }}
      />
    </>
  ) : null;

  return (
    <main className={`nj-shell ${bootVisible ? `nj-shell--${bootPhase}` : "nj-shell--ready"}`} aria-busy={bootVisible}>
      <div className={`nj-app-content ${bootVisible && bootPhase !== "reveal" ? "nj-app-content--covered" : ""} ${bootVisible && bootPhase === "reveal" ? "nj-app-content--revealing" : ""}`} aria-hidden={bootVisible || undefined}>
        <LibraryView
          slots={slots}
          ready={ready}
          interactive={ready && !bootVisible && !selectedId}
          clock={clock}
          canAdd={canAdd}
          onAdd={addGame}
          onSelect={setSelectedId}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onNavigate={() => playUiSound(640, 0.075, "sine")}
        />
        {dossier}
      </div>
      {bootVisible && <BootIntro phase={bootPhase} slots={slots} ready={ready} soundOn={soundOn} onToggleSound={toggleSound} onComplete={() => setIntroFinished(true)} />}
    </main>
  );
}

function BootIntro({
  phase,
  slots,
  ready,
  soundOn,
  onToggleSound,
  onComplete,
}: {
  phase: BootPhase;
  slots: GameSlot[];
  ready: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const completeRef = useRef(onComplete);
  const [webgl, setWebgl] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cameraPullingBack, setCameraPullingBack] = useState(false);
  const [progress, setProgress] = useState(0);
  const games = slots.filter(isFilled);
  const gameSignature = games.map((game) => game.id).join("|");
  completeRef.current = onComplete;

  useEffect(() => {
    if (!ready) return;
    let dead = false;
    let handle: EngineHandle | null = null;
    let fallbackTimer: number | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduced);

    if (reduced) {
      setProgress(100);
      fallbackTimer = window.setTimeout(() => completeRef.current(), 900);
      return () => {
        dead = true;
        if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setWebgl(false);
      fallbackTimer = window.setTimeout(() => completeRef.current(), 1_200);
      return () => {
        dead = true;
        if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      };
    }

    void import("@/studio/create-engine").then(({ createEngine }) => {
      if (dead || !canvasRef.current) return;
      handle = createEngine({
        canvas: canvasRef.current,
        slots: games,
        reduced: false,
        onPhase: (next) => {
          if (next === "gallery") setCameraPullingBack(true);
        },
        onProgress: (value) => {
          setProgress(value);
          if (value >= 100) completeRef.current();
        },
        onSelect: () => {},
        onHover: () => {},
        onFocus: () => {},
        onFail: () => {
          setWebgl(false);
          fallbackTimer = window.setTimeout(() => completeRef.current(), 1_200);
        },
      });
      if (dead) {
        handle.dispose();
        return;
      }
      engineRef.current = handle;
    }).catch(() => {
      if (dead) return;
      setWebgl(false);
      fallbackTimer = window.setTimeout(() => completeRef.current(), 1_200);
    });

    return () => {
      dead = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      handle?.dispose();
      engineRef.current = null;
    };
  }, [ready, gameSignature]);

  const useFallback = reducedMotion || !webgl;
  return (
    <section className={`nj-boot nj-boot--${phase}`} aria-label="Abertura do NJ Engine" aria-live="polite">
      {!useFallback && <canvas ref={canvasRef} className="nj-boot-canvas" aria-hidden="true" />}
      <div className="nj-boot-shade" aria-hidden="true" />
      {useFallback ? (
        <div className="nj-boot-fallback">
          <img src="/favicon.svg" alt="" />
          <h1 className="nj-boot-fallback-name">NJ<span>ENGINE</span></h1>
          <p className="nj-boot-status"><span className="nj-boot-status-dot" /> CARREGANDO SUA BIBLIOTECA</p>
        </div>
      ) : (
        <div className="nj-boot-hud">
          <p className="nj-boot-status"><span className="nj-boot-status-dot" /> {cameraPullingBack ? "ABRINDO SUA BIBLIOTECA" : "CARTAS SE ORGANIZANDO"}</p>
          <div className="nj-boot-progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      {phase === "forming" && (
        <button type="button" className="nj-boot-sound" onClick={onToggleSound} aria-label={soundOn ? "Silenciar abertura" : "Ativar som da abertura"}>
          {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        </button>
      )}
      {phase === "flash" && <span className="nj-boot-flash" aria-hidden="true" />}
    </section>
  );
}

function LibraryView({
  slots,
  ready,
  interactive,
  clock,
  canAdd,
  soundOn,
  onAdd,
  onSelect,
  onToggleSound,
  onNavigate,
}: {
  slots: GameSlot[];
  ready: boolean;
  interactive: boolean;
  clock: string;
  canAdd: boolean;
  soundOn: boolean;
  onAdd: () => void;
  onSelect: (id: string) => void;
  onToggleSound: () => void;
  onNavigate: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeGenre, setActiveGenre] = useState("all");
  const [sort, setSort] = useState("title");
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const games = useMemo(() => slots.filter(isFilled), [slots]);
  const genres = useMemo(() => {
    const unique = new Map<string, string>();
    games.forEach((slot) => {
      const genre = slot.genre.trim();
      const key = genre.toLocaleLowerCase("pt-BR");
      if (genre && !unique.has(key)) unique.set(key, genre);
    });
    return [...unique.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [games]);
  const visibleGames = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return games
      .filter((slot) => {
        const matchesGenre = activeGenre === "all" || slot.genre.trim().toLocaleLowerCase("pt-BR") === activeGenre.toLocaleLowerCase("pt-BR");
        const searchable = [slot.title, slot.genre, slot.platform, slot.year, slot.description].join(" ").toLocaleLowerCase("pt-BR");
        return matchesGenre && (!normalized || searchable.includes(normalized));
      })
      .sort((a, b) => {
        if (sort === "title-desc") return slotTitle(b).localeCompare(slotTitle(a), "pt-BR");
        if (sort === "bay") return a.bay.localeCompare(b.bay);
        return slotTitle(a).localeCompare(slotTitle(b), "pt-BR");
      });
  }, [games, query, activeGenre, sort]);
  const safeIndex = visibleGames.length ? activeIndex % visibleGames.length : 0;
  const activeGame = visibleGames[safeIndex] ?? null;
  const carouselCards = useMemo(() => buildCarouselCards(visibleGames, safeIndex), [visibleGames, safeIndex]);
  const freeSlots = slots.filter((slot) => !isFilled(slot)).length;
  const countRef = useRef(visibleGames.length);
  const indexRef = useRef(safeIndex);
  const openActiveRef = useRef<() => void>(() => {});
  const moveRef = useRef<(direction: number) => void>(() => {});
  const onNavigateRef = useRef(onNavigate);
  countRef.current = visibleGames.length;
  indexRef.current = safeIndex;
  onNavigateRef.current = onNavigate;
  openActiveRef.current = () => {
    const game = visibleGames[indexRef.current];
    if (game) onSelect(game.id);
  };
  moveRef.current = (direction) => {
    const count = countRef.current;
    if (count < 2) return;
    setActiveIndex((index) => (index + direction + count) % count);
    onNavigateRef.current();
  };

  useEffect(() => {
    if (!interactive) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        moveRef.current(1);
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        moveRef.current(-1);
      } else if (event.key === "Enter") {
        if (target?.closest("button, a, [role='button']")) return;
        openActiveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interactive]);

  useEffect(() => {
    if (!interactive) return;
    const held = { left: false, right: false, confirm: false };
    const edge = (key: keyof typeof held, pressed: boolean, action: () => void) => {
      if (pressed && !held[key]) action();
      held[key] = pressed;
    };
    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((item) => item !== null);
      if (pad) {
        edge("left", (pad.axes[0] ?? 0) < -0.55 || Boolean(pad.buttons[14]?.pressed), () => moveRef.current(-1));
        edge("right", (pad.axes[0] ?? 0) > 0.55 || Boolean(pad.buttons[15]?.pressed), () => moveRef.current(1));
        edge("confirm", Boolean(pad.buttons[0]?.pressed || pad.buttons[9]?.pressed), () => openActiveRef.current());
      } else {
        held.left = false;
        held.right = false;
        held.confirm = false;
      }
    };
    const timer = window.setInterval(poll, 80);
    return () => window.clearInterval(timer);
  }, [interactive]);

  function moveBy(direction: number) {
    moveRef.current(direction);
  }

  function selectCard(card: CarouselCard) {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    if (card.index === safeIndex) onSelect(card.slot.id);
    else {
      setActiveIndex(card.index);
      onNavigate();
    }
  }

  return (
    <div className="nj-layout">
      <aside className="nj-sidebar">
        <a className="nj-brand" href="#nj-library" aria-label="NJ Engine — biblioteca">
          <span className="nj-brand-mark"><img src="/favicon.svg" alt="" /></span>
          <span className="nj-brand-name">NJ<span>engine</span></span>
        </a>
        <nav className="nj-nav" aria-label="Navegação da biblioteca">
          <p className="nj-nav-heading">COLEÇÃO</p>
          <button type="button" className={`nj-nav-item ${activeGenre === "all" ? "is-active" : ""}`} onClick={() => setActiveGenre("all")}>
            <Library aria-hidden="true" /><span>Todos os jogos</span><span className="nj-nav-count">{games.length}</span>
          </button>
          {genres.length > 0 && <p className="nj-nav-heading nj-nav-heading--spaced">GÊNEROS</p>}
          {genres.map((genre) => (
            <button key={genre} type="button" className={`nj-nav-item ${activeGenre.toLocaleLowerCase("pt-BR") === genre.toLocaleLowerCase("pt-BR") ? "is-active" : ""}`} onClick={() => setActiveGenre(genre)}>
              <span className="nj-genre-dot" aria-hidden="true" /><span>{genre}</span><span className="nj-nav-count">{games.filter((slot) => slot.genre.trim().toLocaleLowerCase("pt-BR") === genre.toLocaleLowerCase("pt-BR")).length}</span>
            </button>
          ))}
        </nav>
        <div className="nj-sidebar-spacer" />
        <div className="nj-local-note"><HardDrive aria-hidden="true" /><div><strong>Biblioteca local</strong><span>Salva neste navegador</span></div></div>
        <div className="nj-sidebar-foot">NJ ENGINE · WEB EDITION</div>
      </aside>

      <section className="nj-main" id="nj-library">
        <header className="nj-topbar">
          <div className="nj-time"><span className="nj-status-dot" /> Neste aparelho <span className="nj-divider" /> {clock || "—:—"}</div>
          <div className="nj-actions">
            <button type="button" className="nj-sound-toggle" onClick={onToggleSound} aria-label={soundOn ? "Desativar sons" : "Ativar sons"}>
              {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            </button>
            <button type="button" className="nj-button nj-button--primary" onClick={onAdd} disabled={!canAdd || !ready}>
              <CirclePlus aria-hidden="true" /><span>Adicionar jogo</span>
            </button>
          </div>
        </header>

        <div className="nj-heading-row">
          <div><p className="nj-eyebrow">SUA COLEÇÃO</p><h1>Biblioteca</h1><p className="nj-subheading">{ready ? `${games.length} ${games.length === 1 ? "jogo salvo" : "jogos salvos"} · ${freeSlots} ${freeSlots === 1 ? "baia disponível" : "baias disponíveis"}` : "Carregando seus jogos…"}</p></div>
          {games.length > 0 && <div className="nj-heading-mark"><Gamepad2 aria-hidden="true" /><span>NJ ENGINE<br />GAME LIBRARY</span></div>}
        </div>

        {games.length > 0 && (
          <div className="nj-tools">
            <label className="nj-search">
              <Search aria-hidden="true" /><span className="sr-only">Buscar jogos</span>
              <input value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} placeholder="Buscar na biblioteca" />
              {query && <button type="button" aria-label="Limpar busca" onClick={() => { setQuery(""); setActiveIndex(0); }}><X aria-hidden="true" /></button>}
            </label>
            <label className="nj-sort">
              <ArrowDownAZ aria-hidden="true" /><span className="sr-only">Ordenar jogos</span>
              <select value={sort} onChange={(event) => { setSort(event.target.value); setActiveIndex(0); }}><option value="title">Nome A–Z</option><option value="title-desc">Nome Z–A</option><option value="bay">Ordem das baias</option></select><ChevronDown aria-hidden="true" />
            </label>
          </div>
        )}

        {genres.length > 0 && (
          <div className="nj-mobile-filters" aria-label="Filtrar por gênero">
            <button type="button" className={activeGenre === "all" ? "is-active" : ""} onClick={() => { setActiveGenre("all"); setActiveIndex(0); }}>Todos</button>
            {genres.map((genre) => <button key={genre} type="button" className={activeGenre.toLocaleLowerCase("pt-BR") === genre.toLocaleLowerCase("pt-BR") ? "is-active" : ""} onClick={() => { setActiveGenre(genre); setActiveIndex(0); }}>{genre}</button>)}
          </div>
        )}

        {!ready ? (
          <div className="nj-loading" role="status"><span className="nj-loading-dot" /> Lendo jogos salvos neste navegador…</div>
        ) : games.length === 0 ? (
          <section className="nj-empty" aria-labelledby="nj-empty-title">
            <div className="nj-empty-art"><span className="nj-empty-orbit nj-empty-orbit--one" /><span className="nj-empty-orbit nj-empty-orbit--two" /><Gamepad2 aria-hidden="true" /></div>
            <p className="nj-eyebrow">SEM JOGOS DE DEMONSTRAÇÃO</p>
            <h2 id="nj-empty-title">Monte sua biblioteca</h2>
            <p>Adicione os jogos que você realmente usa, escolha capas e salve os links de acesso. Seus dados ficam neste navegador.</p>
            <button type="button" className="nj-button nj-button--primary nj-empty-action" onClick={onAdd} disabled={!canAdd}><CirclePlus aria-hidden="true" /> Adicionar primeiro jogo</button>
            <span className="nj-empty-foot">12 baias pessoais · sem títulos ou links fictícios</span>
          </section>
        ) : visibleGames.length === 0 ? (
          <section className="nj-no-results"><Search aria-hidden="true" /><h2>Nenhum jogo encontrado</h2><p>Tente outro termo ou limpe os filtros para ver sua coleção.</p><button type="button" className="nj-text-button" onClick={() => { setQuery(""); setActiveGenre("all"); setActiveIndex(0); }}>Limpar busca e filtros</button></section>
        ) : (
          <>
            <div className="nj-library-section-heading"><div><p className="nj-eyebrow">NAVEGUE PELA COLEÇÃO</p><h2>{activeGenre === "all" ? "Seus jogos" : activeGenre}</h2></div><span className="nj-count-tag">{safeIndex + 1} <i /> {visibleGames.length}</span></div>
            <div className="nj-selected-info" aria-live="polite">
              <div className="nj-selected-copy"><p className="nj-selected-meta">BAIA {activeGame?.bay} <span>·</span> {activeGame?.genre.trim() || "SEM GÊNERO"}</p><h3>{activeGame ? slotTitle(activeGame) : ""}</h3><p className="nj-selected-description">{activeGame?.description.trim() || [activeGame?.platform, activeGame?.year].filter(Boolean).join(" · ") || "Ficha pessoal adicionada à sua biblioteca."}</p></div>
              <div className="nj-selected-actions">
                {activeGame && safeHttpUrl(activeGame.playUrl) ? <a className="nj-button nj-button--primary" href={safeHttpUrl(activeGame.playUrl)} target="_blank" rel="noreferrer"><Play aria-hidden="true" /> Abrir jogo</a> : <button type="button" className="nj-button nj-button--secondary" onClick={() => activeGame && onSelect(activeGame.id)}><Pencil aria-hidden="true" /> Adicionar link</button>}
                {activeGame && <button type="button" className="nj-details-button" onClick={() => onSelect(activeGame.id)}>Ver ficha</button>}
              </div>
            </div>

            <div className="nj-carousel-heading"><span>← → / A D para navegar</span><span>ENTER abre a ficha · controle compatível</span></div>
            <div className="nj-carousel-frame" onTouchStart={(event) => { touchStartRef.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => {
              const start = touchStartRef.current;
              const end = event.changedTouches[0]?.clientX;
              touchStartRef.current = null;
              if (start === null || end === undefined || Math.abs(start - end) < 46) return;
              swipedRef.current = true;
              moveBy(start > end ? 1 : -1);
              window.setTimeout(() => { swipedRef.current = false; }, 350);
            }}>
              <button type="button" className="nj-carousel-arrow nj-carousel-arrow--left" onClick={() => moveBy(-1)} aria-label="Jogo anterior"><ChevronLeft aria-hidden="true" /></button>
              <div className="nj-carousel-track" role="group" aria-label="Carrossel de jogos">
                {carouselCards.map((card) => (
                  <button key={card.slot.id} type="button" className={`nj-carousel-card nj-carousel-card--${card.position}`} aria-pressed={card.index === safeIndex} aria-label={`${slotTitle(card.slot)}${card.index === safeIndex ? ", selecionado" : ", selecionar"}`} onClick={() => selectCard(card)}>
                    <img src={card.slot.imageUrl || paintCoverDataUrl({ bay: card.slot.bay, title: card.slot.title, filled: true })} alt={card.slot.imageUrl ? `Capa de ${slotTitle(card.slot)}` : `Arte da baia ${card.slot.bay}`} loading="lazy" />
                    <span className="nj-card-shade" />
                    <span className="nj-card-bay">BAIA {card.slot.bay}</span>
                    <span className="nj-card-copy"><strong>{slotTitle(card.slot)}</strong><span>{[card.slot.genre, card.slot.platform].filter((value) => value.trim()).join(" · ") || "Jogo da biblioteca"}</span></span>
                    {card.index === safeIndex && <span className="nj-card-selected-mark" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              <button type="button" className="nj-carousel-arrow nj-carousel-arrow--right" onClick={() => moveBy(1)} aria-label="Próximo jogo"><ChevronRight aria-hidden="true" /></button>
            </div>
          </>
        )}

        <footer className="nj-main-foot"><span>Os jogos são cadastrados por você.</span><span>{freeSlots} de 12 baias livres</span></footer>
      </section>
    </div>
  );
}

function buildCarouselCards(games: GameSlot[], activeIndex: number): CarouselCard[] {
  const count = games.length;
  if (count === 0) return [];
  if (count === 1) return [{ slot: games[0], index: 0, position: "selected" }];
  if (count === 2) {
    const next = (activeIndex + 1) % count;
    return [
      { slot: games[activeIndex], index: activeIndex, position: "selected" },
      { slot: games[next], index: next, position: "next" },
    ];
  }
  const previous = (activeIndex - 1 + count) % count;
  const next = (activeIndex + 1) % count;
  return [
    { slot: games[previous], index: previous, position: "previous" },
    { slot: games[activeIndex], index: activeIndex, position: "selected" },
    { slot: games[next], index: next, position: "next" },
  ];
}
