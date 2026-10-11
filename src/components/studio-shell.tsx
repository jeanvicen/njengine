import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Cpu, Gamepad2, ImagePlus, Monitor, Play, Volume2, VolumeX, X } from "lucide-react";
import { compressImageFile, paintCoverDataUrl } from "@/studio/covers";
import type { EngineHandle, Phase } from "@/studio/create-engine";

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

const STARTUP_STEPS = [
  "Initializing graphics core",
  "Syncing library",
  "Preparing game environment",
  "Optimizing renderer",
];

type Screen = "boot" | "flash" | "black" | "dashboard";

export function StudioShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);
  const [slots, setSlots] = useState<GameSlot[]>(createSlots);
  const [phase, setPhase] = useState<Phase>("intro");
  const [progress, setProgress] = useState(0);
  const [screen, setScreen] = useState<Screen>("boot");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [engineOn, setEngineOn] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const slotsRef = useRef(slots);
  const soundOnRef = useRef(soundOn);
  slotsRef.current = slots;
  soundOnRef.current = soundOn;

  useEffect(() => {
    const saved = readSlots();
    setSlots(saved);
    slotsRef.current = saved;
    const firstSaved = saved.findIndex(isFilled);
    if (firstSaved >= 0) setActiveSlot(firstSaved);
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let handle: EngineHandle | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    void (async () => {
      const { createEngine } = await import("@/studio/create-engine");
      if (dead || !canvasRef.current) return;
      handle = createEngine({
        canvas: canvasRef.current,
        slots: slotsRef.current,
        reduced,
        onPhase: (next) => setPhase(next),
        onProgress: (value) => setProgress(value),
        onSelect: (id) => setSelectedId(id),
        onHover: () => {},
        onFail: () => setWebgl(false),
      });
      if (dead) {
        handle.dispose();
        return;
      }
      engineRef.current = handle;
      setEngineOn(true);
    })();

    return () => {
      dead = true;
      handle?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!engineOn) return;
    engineRef.current?.sync(slots);
  }, [slots, engineOn]);

  useEffect(() => {
    engineRef.current?.setSelected(selectedId);
  }, [selectedId, engineOn]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Three.js drives the real 12.6-second boot. If WebGL is unavailable, keep the same
  // sequence and timing with a lightweight local fallback instead of leaving the UI stuck.
  useEffect(() => {
    if (webgl || screen !== "boot") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setProgress(100);
      setPhase("gallery");
      return;
    }
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      const value = Math.min(100, Math.round(((performance.now() - startedAt) / 12_600) * 100));
      setProgress(value);
      if (value >= 100) {
        setPhase("gallery");
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [webgl, screen]);

  // The reveal deliberately lands only after the engine's complete timeline.
  useEffect(() => {
    if (phase !== "gallery" || progress < 100) return;
    setScreen("flash");
    const toBlack = window.setTimeout(() => setScreen("black"), 110);
    const toDashboard = window.setTimeout(() => setScreen("dashboard"), 440);
    return () => {
      window.clearTimeout(toBlack);
      window.clearTimeout(toDashboard);
    };
  }, [phase, progress]);

  useEffect(() => {
    const audio = new Audio("/intro.mp3");
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = 0.72;
    audioRef.current = audio;
    const kick = () => {
      if (soundOnRef.current) void audio.play().catch(() => {});
    };
    void audio.play().catch(() => {});
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !soundOn;
    if (soundOn && screen === "boot") void audio.play().catch(() => {});
  }, [soundOn, screen]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || screen !== "dashboard") return;
    const fade = window.setInterval(() => {
      audio.volume = Math.max(0, audio.volume - 0.08);
      if (audio.volume <= 0) {
        audio.pause();
        window.clearInterval(fade);
      }
    }, 120);
    return () => window.clearInterval(fade);
  }, [screen]);

  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const total = slots.length || 1;
  const current = slots[activeSlot] ?? slots[0];
  const currentFilled = Boolean(current && isFilled(current));
  const currentPlayHref = current ? safeHttpUrl(current.playUrl) : "";
  const filledCount = slots.filter(isFilled).length;
  const activeStep = Math.min(STARTUP_STEPS.length - 1, Math.floor(Math.max(0, progress) / 25));
  const displayCards = [-1, 0, 1].map((offset) => {
    const index = (activeSlot + offset + total) % total;
    return { offset, index, slot: slots[index] };
  }).filter((card) => Boolean(card.slot));

  function persist(next: GameSlot[]) {
    setSlots(next);
    return writeSlots(next);
  }

  function playUiSound(frequency = 520) {
    if (!soundOnRef.current) return;
    try {
      const Context = window.AudioContext;
      if (!Context) return;
      const context = audioContextRef.current ?? new Context();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, context.currentTime + 0.075);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.1);
    } catch {
      // Audio is an enhancement; keep the selector usable when unavailable.
    }
  }

  function moveSelection(next: number) {
    const wrapped = (next + total) % total;
    setActiveSlot(wrapped);
    playUiSound(440 + wrapped * 8);
  }

  function activateCurrent() {
    if (!current) return;
    if (currentPlayHref) {
      window.open(currentPlayHref, "_blank", "noopener,noreferrer");
      playUiSound(660);
    } else {
      setSelectedId(current.id);
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (screen !== "dashboard") return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (selectedId) return;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        moveSelection(activeSlot + 1);
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        moveSelection(activeSlot - 1);
      } else if (event.key === "Enter" && !target?.closest("button, a")) {
        event.preventDefault();
        activateCurrent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlot, current, currentPlayHref, screen, selectedId, soundOn, total]);

  return (
    <main className="nj-console fixed inset-0 overflow-hidden bg-void text-ink">
      <canvas ref={canvasRef} className="stage-canvas absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="console-vignette pointer-events-none absolute inset-0" />
      <div className="console-grain pointer-events-none absolute inset-0" />

      {screen === "boot" && (
        <section className="boot-screen absolute inset-0 z-30 flex flex-col items-center justify-center" aria-label="Iniciando NJENGINE">
          <div className="boot-mark" aria-hidden="true">
            {"NJENGINE".split("").map((letter, index) => (
              <span key={`${letter}-${index}`} className="boot-letter" style={{ animationDelay: `${index * 65}ms` }}>{letter}</span>
            ))}
          </div>
          <p className="boot-caption">CONSOLE SYSTEM · STARTUP SEQUENCE</p>
          <div className="boot-status" aria-live="polite">
            <div className="boot-step-list">
              {STARTUP_STEPS.map((step, index) => (
                <p key={step} className={`boot-step ${index === activeStep ? "is-current" : ""} ${index < activeStep ? "is-done" : ""}`}>
                  <span className="boot-step-marker">{index < activeStep ? "✓" : index === activeStep ? "›" : "·"}</span>{step}
                </p>
              ))}
            </div>
            <div className="boot-progress-meta"><span>ENGINE STARTUP</span><span>{Math.max(0, Math.min(100, progress))}%</span></div>
            <div className="boot-progress-track"><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
          </div>
          <div className="boot-baseline"><span><Cpu aria-hidden="true" /> NJENGINE CORE</span><span>LOCAL SYSTEM</span></div>
        </section>
      )}
      {screen === "flash" && <div className="boot-flash absolute inset-0 z-40" aria-hidden="true" />}
      {screen === "black" && <div className="boot-black absolute inset-0 z-40" aria-hidden="true" />}

      {screen === "dashboard" && (
        <section className="console-screen absolute inset-0 z-20 flex flex-col" aria-label="Biblioteca NJENGINE">
          <header className="console-header">
            <div className="console-brand-lockup">
              <div className="console-brand-glyph" aria-hidden="true"><Gamepad2 /></div>
              <div><p className="console-wordmark">NJENGINE</p><p className="console-brand-caption">PERSONAL CONSOLE</p></div>
            </div>
            <div className="console-hud">
              <div className="console-status" aria-label="Biblioteca local"><span className="status-pulse" /><span>LOCAL LIBRARY</span></div>
              <div className="device-status" title="Dados salvos neste navegador"><Monitor aria-hidden="true" /><span><strong>ESTE DISPOSITIVO</strong><small>DADOS NESTE NAVEGADOR</small></span></div>
              <time className="console-clock" dateTime={now.toISOString()}>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time>
              <button className="console-sound" type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Desativar som" : "Ativar som"} aria-pressed={soundOn}>
                {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}<span>SOM</span>
              </button>
            </div>
          </header>

          <div className="console-content">
            <div className="library-heading">
              <div className="library-eyebrow"><span className="ember-rule" /> NJENGINE · BIBLIOTECA</div>
              <h1>{filledCount ? "Sua coleção" : "Sua próxima jogada"}</h1>
              <p>{filledCount ? "Seus jogos, prontos para continuar." : "Um espaço seu. Adicione jogos quando quiser."}</p>
            </div>

            <div
              className="game-rail"
              role="region"
              aria-label={`Carrossel da biblioteca, baia ${current?.bay ?? "01"} de ${total}`}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                dragStartRef.current = event.clientX;
                dragMovedRef.current = false;
              }}
              onPointerUp={(event) => {
                const start = dragStartRef.current;
                dragStartRef.current = null;
                if (start === null) return;
                const distance = event.clientX - start;
                if (Math.abs(distance) > 38) {
                  dragMovedRef.current = true;
                  moveSelection(activeSlot + (distance < 0 ? 1 : -1));
                }
              }}
              onPointerCancel={() => { dragStartRef.current = null; }}
            >
              {displayCards.map(({ offset, index, slot }) => {
                const filled = isFilled(slot);
                const artwork = slot.imageUrl || (filled ? paintCoverDataUrl({ bay: slot.bay, title: slot.title, filled }) : "");
                const title = slot.title.trim() || (filled ? `Baia ${slot.bay}` : "Baia vazia");
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`game-card ${offset === 0 ? "game-card--active" : offset < 0 ? "game-card--left" : "game-card--right"} ${filled ? "has-game" : "is-empty"}`}
                    aria-label={`${title}, baia ${slot.bay}${filled ? ", jogo salvo neste navegador" : ", espaço vazio"}`}
                    aria-current={offset === 0 ? "true" : undefined}
                    onClick={() => {
                      if (dragMovedRef.current) {
                        dragMovedRef.current = false;
                        return;
                      }
                      if (offset !== 0) moveSelection(index);
                      else setSelectedId(slot.id);
                    }}
                  >
                    {artwork && <img src={artwork} alt={slot.imageUrl && slot.title ? `Capa de ${slot.title}` : ""} className="game-card-art" draggable={false} />}
                    <span className="game-card-shade" />
                    <span className="game-card-topline"><span>BAIA {slot.bay}</span>{filled && <span className="game-card-saved">LOCAL</span>}</span>
                    {!filled && <span className="empty-glyph" aria-hidden="true"><Gamepad2 /></span>}
                    <span className="game-card-copy"><strong>{title}</strong><small>{filled ? [slot.genre, slot.platform].filter(Boolean).join(" · ") || "Jogo salvo neste dispositivo" : "ESPAÇO DISPONÍVEL"}</small></span>
                  </button>
                );
              })}
            </div>

            <div className="carousel-controls">
              <button type="button" className="carousel-arrow" onClick={() => moveSelection(activeSlot - 1)} aria-label="Baia anterior"><ChevronLeft /></button>
              <div className="carousel-position" aria-live="polite"><span>{String(activeSlot + 1).padStart(2, "0")}</span><i /><span>{String(total).padStart(2, "0")}</span></div>
              <button type="button" className="carousel-arrow" onClick={() => moveSelection(activeSlot + 1)} aria-label="Próxima baia"><ChevronRight /></button>
            </div>

            <div className="game-details" aria-live="polite">
              <div className="game-details-copy">
                <p className="game-details-kicker">BAIA {current?.bay ?? "01"} <span>·</span> {currentFilled ? "NA SUA BIBLIOTECA" : "AGUARDANDO SEU JOGO"}</p>
                <h2>{current?.title.trim() || (currentFilled ? `Baia ${current?.bay}` : "Sua biblioteca está vazia")}</h2>
                <p className="game-description">{currentFilled ? current?.description.trim() || [current?.genre, current?.platform, current?.year].filter(Boolean).join(" · ") || "" : "Configure uma baia para adicionar seu primeiro jogo. Tudo fica salvo apenas neste navegador."}</p>
              </div>
              <div className="game-actions">
                {currentPlayHref ? (
                  <a className="game-action-primary" href={currentPlayHref} target="_blank" rel="noreferrer" onClick={() => playUiSound(660)}><Play aria-hidden="true" fill="currentColor" /> JOGAR</a>
                ) : (
                  <button type="button" className="game-action-primary" onClick={() => setSelectedId(current?.id ?? null)}><Gamepad2 aria-hidden="true" /> {currentFilled ? "EDITAR JOGO" : "CONFIGURAR BAIA"}</button>
                )}
                {currentFilled && currentPlayHref && <button type="button" className="game-action-secondary" onClick={() => setSelectedId(current?.id ?? null)}>EDITAR FICHA</button>}
              </div>
            </div>
          </div>

          <footer className="console-footer"><span><b>NJENGINE</b><i /> {filledCount} {filledCount === 1 ? "JOGO" : "JOGOS"} SALVOS LOCALMENTE</span><span className="footer-controls">← → NAVEGAR <i /> ENTER ABRIR</span></footer>
        </section>
      )}

      {!webgl && screen === "dashboard" && <div className="webgl-fallback-mark" aria-hidden="true">NJENGINE</div>}

      {selected && (
        <>
          <button type="button" className="backdrop fixed inset-0" aria-label="Fechar ficha" onClick={() => setSelectedId(null)} />
          <Dossier
            slot={selected}
            onClose={() => setSelectedId(null)}
            onSave={(draft) => {
              const next = slots.map((slot) => (slot.id === draft.id ? sanitizeSlot(draft) : slot));
              const saved = persist(next);
              return saved.ok;
            }}
            onClear={(id) => {
              const fresh = createSlots().find((slot) => slot.id === id);
              if (!fresh) return;
              persist(slots.map((slot) => (slot.id === id ? fresh : slot)));
            }}
          />
        </>
      )}
    </main>
  );
}

function Dossier({
  slot,
  onClose,
  onSave,
  onClear,
}: {
  slot: GameSlot;
  onClose: () => void;
  onSave: (draft: GameSlot) => boolean;
  onClear: (id: string) => void;
}) {
  const [draft, setDraft] = useState(slot);
  const [notice, setNotice] = useState("");
  const [armClear, setArmClear] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(slot);
    setNotice("");
    setArmClear(false);
  }, [slot]);

  useEffect(() => {
    closeRef.current?.focus();
  }, [slot.id]);

  const poster = useMemo(() => {
    if (draft.imageUrl) return draft.imageUrl;
    return paintCoverDataUrl({
      bay: slot.bay,
      title: draft.title,
      filled: Boolean(draft.title.trim() || draft.playUrl || draft.videoUrl || draft.description.trim()),
    });
  }, [draft.imageUrl, draft.title, draft.playUrl, draft.videoUrl, draft.description, slot.bay]);

  const playHref = safeHttpUrl(draft.playUrl);
  const videoHref = safeHttpUrl(slot.videoUrl);

  function patch(partial: Partial<GameSlot>) {
    setDraft((current) => ({ ...current, ...partial }));
    setNotice("");
  }

  return (
    <aside className="dossier" role="dialog" aria-modal="true" aria-labelledby="bay-title">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <p className="kicker text-mute">Baia {slot.bay}</p>
        <button ref={closeRef} type="button" className="ghost-btn min-h-11 px-3" onClick={onClose} aria-label="Fechar">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="overflow-hidden rounded-2xl border border-line bg-void">
          {videoHref ? (
            <video
              key={videoHref}
              src={videoHref}
              poster={poster}
              controls
              playsInline
              muted
              loop
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <img src={poster} alt="" className="aspect-[4/5] w-full object-cover" />
          )}
        </div>

        <p className="kicker mt-5 text-ember">{isFilled(slot) ? "No ar" : "Em breve"}</p>
        <h2 id="bay-title" className="mt-2 font-display text-3xl text-balance text-ink">
          {slotTitle({ ...slot, title: draft.title })}
        </h2>
        <p className="mt-3 text-pretty text-base leading-relaxed text-mute">
          {draft.description.trim() ||
            "Nenhum texto ainda. A capa, o trailer e o Play desta baia entram na ficha."}
        </p>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4">
          <Fact label="Gênero" value={draft.genre} />
          <Fact label="Plataforma" value={draft.platform} />
          <Fact label="Ano" value={draft.year} />
        </dl>

        <div className="mt-5">
          {playHref ? (
            <a className="play-btn" href={playHref} target="_blank" rel="noreferrer">
              <Play className="size-4 fill-current" />
              Play
            </a>
          ) : (
            <button
              type="button"
              className="play-btn"
              onClick={() => setNotice("Esta baia ainda não tem destino. Cole o link e guarde a ficha.")}
            >
              <Play className="size-4 fill-current" />
              Play
            </button>
          )}
          {notice && (
            <p className="mt-3 text-sm text-ember" role="status">
              {notice}
            </p>
          )}
        </div>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const ok = onSave(draft);
            setNotice(ok ? "Ficha guardada neste aparelho." : "A capa ficou grande demais para guardar.");
          }}
        >
          <p className="kicker text-mute">Ficha</p>
          <Field label="Título" value={draft.title} maxLength={48} onChange={(title) => patch({ title })} placeholder="Nome do jogo" />
          <label className="flex flex-col gap-2">
            <span className="kicker text-mute">Descrição</span>
            <textarea
              className="field min-h-28 resize-none"
              maxLength={480}
              value={draft.description}
              placeholder="O que a pessoa encontra quando aperta Play."
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Gênero" value={draft.genre} maxLength={28} onChange={(genre) => patch({ genre })} placeholder="Ação" />
            <Field label="Plataforma" value={draft.platform} maxLength={28} onChange={(platform) => patch({ platform })} placeholder="Web" />
            <Field label="Ano" value={draft.year} maxLength={4} onChange={(year) => patch({ year })} placeholder="2026" />
          </div>
          <Field label="Link do Play" value={draft.playUrl} maxLength={500} onChange={(playUrl) => patch({ playUrl })} placeholder="https://" />
          <Field label="Trailer direto" value={draft.videoUrl} maxLength={500} onChange={(videoUrl) => patch({ videoUrl })} placeholder="https://…/trailer.mp4" />

          <div className="flex flex-wrap gap-3">
            <button type="button" className="ghost-btn" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="size-4" />
              Capa
            </button>
            {draft.imageUrl && (
              <button type="button" className="ghost-btn" onClick={() => patch({ imageUrl: "" })}>
                Tirar capa
              </button>
            )}
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void compressImageFile(file).then((imageUrl) => {
                  if (imageUrl) patch({ imageUrl });
                  else setNotice("Não deu para ler essa imagem.");
                });
              }}
            />
          </div>

          <button type="submit" className="save-btn">
            Guardar ficha
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              if (!armClear) {
                setArmClear(true);
                return;
              }
              onClear(slot.id);
              setArmClear(false);
              setNotice("Baia limpa.");
            }}
          >
            {armClear ? "Confirmar limpeza" : "Limpar baia"}
          </button>
        </form>
      </div>
    </aside>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="kicker text-mute">{label}</dt>
      <dd className="mt-2 text-sm text-ink">{value.trim() || "—"}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="kicker text-mute">{label}</span>
      <input
        className="field"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
