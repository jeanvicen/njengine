import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Gamepad2, Volume2, VolumeX, ImagePlus, Play, X } from "lucide-react";
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

export function StudioShell() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<GameSlot[]>(createSlots);
  const [phase, setPhase] = useState<Phase>("intro");
  const [progress, setProgress] = useState(0);
  const [openingComplete, setOpeningComplete] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [webgl, setWebgl] = useState(true);
  const [engineOn, setEngineOn] = useState(false);
  const [activeSlot, setActiveSlot] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

  useEffect(() => {
    const saved = readSlots();
    setSlots(saved);
    slotsRef.current = saved;
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
        onHover: (id) => setHoverId(id),
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
    const finishOpening = window.setTimeout(() => {
      engineRef.current?.skip();
      setPhase("gallery");
      setProgress(100);
      setOpeningComplete(true);
    }, 6500);
    return () => window.clearTimeout(finishOpening);
  }, []);

  useEffect(() => {
    engineRef.current?.setSelected(selectedId);
  }, [selectedId, engineOn]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Escape") {
        if (selectedId) setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/intro.mp3");
    audio.preload = "auto";
    audio.loop = false;
    audio.volume = 0.75;
    audioRef.current = audio;
    let started = false;
    const kick = () => {
      if (started) return;
      started = true;
      void audio.play().catch(() => {});
    };
    kick();
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
    if (!audio || phase !== "gallery") return;
    const fade = window.setInterval(() => {
      audio.volume = Math.max(0, audio.volume - 0.08);
      if (audio.volume <= 0) {
        audio.pause();
        window.clearInterval(fade);
      }
    }, 120);
    return () => window.clearInterval(fade);
  }, [phase]);

  useEffect(() => {
    const ring = cursorRef.current;
    if (!ring) return;
    const move = (event: PointerEvent) => {
      const onCanvas = (event.target as HTMLElement | null)?.tagName === "CANVAS";
      ring.style.opacity = onCanvas ? "1" : "0";
      ring.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const selected = slots.find((slot) => slot.id === selectedId) ?? null;
  const hover = slots.find((slot) => slot.id === hoverId) ?? null;
  const filled = slots.filter(isFilled).length;

  function persist(next: GameSlot[]) {
    setSlots(next);
    return writeSlots(next);
  }

  function playUiSound(frequency = 520) {
    if (!soundOn) return;
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
      gain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.008);
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
    const wrapped = (next + 3) % 3;
    setActiveSlot(wrapped);
    playUiSound(460 + wrapped * 85);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!openingComplete && (phase !== "gallery" || progress < 100)) return;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") moveSelection(activeSlot + 1);
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") moveSelection(activeSlot - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeSlot, openingComplete, phase, progress, soundOn]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-void text-ink">
      <canvas ref={canvasRef} className="stage-canvas absolute inset-0 h-full w-full" />
      <div className="vignette pointer-events-none absolute inset-0" />
      <div className="grain pointer-events-none absolute inset-0" />
      <div className="veil pointer-events-none absolute inset-0 z-10 bg-void" />
      <div ref={cursorRef} className="cursor-ring pointer-events-none fixed top-0 left-0 z-40" />

      {!openingComplete && phase !== "gallery" && (
        <div className="opening-prompt absolute inset-x-0 bottom-12 z-20 flex flex-col items-center gap-3 px-5 text-center">
          <p className="kicker text-ember">NJENGINE · INICIANDO</p>
          <p className="opening-copy">Preparando sua biblioteca de jogos</p>
          <button
            type="button"
            className="opening-skip"
            onClick={() => {
              engineRef.current?.skip();
              setPhase("gallery");
              setProgress(100);
              setOpeningComplete(true);
            }}
          >
            PULAR ABERTURA <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}

      {(openingComplete || (phase === "gallery" && progress >= 100)) && (
        <section className="selector-screen absolute inset-0 z-20 flex flex-col" aria-label="Seletor de jogos NJengine">
          <header className="selector-header flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="brand-mark"><Gamepad2 aria-hidden="true" /></div>
              <div><p className="selector-brand">NJENGINE</p><p className="selector-subtitle">SUA PRÓXIMA JOGADA</p></div>
            </div>
            <button className="sound-toggle" type="button" onClick={() => setSoundOn((value) => !value)} aria-label={soundOn ? "Desativar sons" : "Ativar sons"}>
              {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              <span>{soundOn ? "SOM LIGADO" : "SOM DESLIGADO"}</span>
            </button>
          </header>

          <div className="selector-content">
            <div className="selector-heading"><p className="kicker">BIBLIOTECA</p><h1>Escolha seu jogo</h1><p className="selector-hint">Um novo universo começa aqui.</p></div>
            <div className="game-rail" role="tablist" aria-label="Espaços de jogo">
              {[0, 1, 2].map((index) => (
                <button key={index} type="button" role="tab" aria-selected={activeSlot === index} className={`empty-game-card ${activeSlot === index ? "is-active" : ""}`} onClick={() => moveSelection(index)}>
                  <span className="card-number">0{index + 1}</span>
                  <span className="empty-card-symbol"><Gamepad2 aria-hidden="true" /></span>
                  <span className="card-label">ESPAÇO VAZIO</span>
                  <span className="card-status">JOGOS EM BREVE</span>
                </button>
              ))}
            </div>
            <div className="rail-controls">
              <button type="button" className="rail-arrow" onClick={() => moveSelection(activeSlot - 1)} aria-label="Espaço anterior"><ChevronLeft /></button>
              <div className="rail-dots" aria-label={`Espaço ${activeSlot + 1} de 3`}>{[0, 1, 2].map((index) => <span key={index} className={activeSlot === index ? "active" : ""} />)}</div>
              <button type="button" className="rail-arrow" onClick={() => moveSelection(activeSlot + 1)} aria-label="Próximo espaço"><ChevronRight /></button>
            </div>
            <p className="coming-soon">A biblioteca está sendo preparada<span> — em breve, novas aventuras.</span></p>
          </div>
          <footer className="selector-footer"><span>© NJENGINE</span><span>← → NAVEGAR <i /> A / D</span></footer>
        </section>
      )}

      {!webgl && (
        <div className="absolute inset-0 z-10 overflow-y-auto bg-void pt-28 pb-16">
          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedId(slot.id)}
                className="overflow-hidden rounded-2xl border border-line bg-face text-left"
              >
                <img
                  src={slot.imageUrl || paintCoverDataUrl({ bay: slot.bay, title: slot.title, filled: isFilled(slot) })}
                  alt={slotTitle(slot)}
                  className="aspect-[4/5] w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

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
