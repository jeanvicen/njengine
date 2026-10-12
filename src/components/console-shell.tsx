import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Dossier } from "@/components/studio-shell";
import { paintCoverDataUrl } from "@/studio/covers";
import { createSlots, isFilled, readSlots, safeHttpUrl, sanitizeSlot, slotTitle, writeSlots, type GameSlot } from "@/studio/slots";

type Hub = 0 | 1 | 2;
type RailItem = GameSlot | null;
type RailCardStyle = CSSProperties & { [property: `--${string}`]: string | number };
type DragState = { x: number; y: number; lastX: number; startPosition: number; velocity: number };

const HUBS = ["Jogos", "Biblioteca", "Sistema"] as const;
const BOOT_MESSAGES = [
  "Initializing graphics core",
  "Syncing library",
  "Preparing game environment",
  "Optimizing renderer",
];
const BOOT_WORD = "NJENGINE";

export function ConsoleShell() {
  const [slots, setSlots] = useState<GameSlot[]>(createSlots);
  const [ready, setReady] = useState(false);
  const [hub, setHub] = useState<Hub>(0);
  const [position, setPosition] = useState(0);
  const [cardWidth, setCardWidth] = useState(160);
  const [spacing, setSpacing] = useState(140);
  const [lite, setLite] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [clock, setClock] = useState("");
  const [online, setOnline] = useState(true);
  const [muted, setMuted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [bootStarted, setBootStarted] = useState(false);
  const [bootHidden, setBootHidden] = useState(false);
  const [bootLit, setBootLit] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [messageOkCount, setMessageOkCount] = useState(0);
  const [revealedLetters, setRevealedLetters] = useState(0);
  const [wordShines, setWordShines] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [flash, setFlash] = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const positionRef = useRef(position);
  const audioRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const busRef = useRef<GainNode | null>(null);
  const mutedRef = useRef(muted);
  const bootStartedRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);
  const lastWheelRef = useRef(0);
  positionRef.current = position;
  mutedRef.current = muted;

  const games = useMemo(() => slots.filter(isFilled), [slots]);
  const covers = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of games) {
      map.set(slot.id, slot.imageUrl || paintCoverDataUrl({ bay: slot.bay, title: slot.title, filled: true }));
    }
    return map;
  }, [games]);
  const railItems: RailItem[] = useMemo(() => {
    if (hub === 0) return games.length ? games : [null];
    if (hub === 1) return slots;
    return [];
  }, [hub, games, slots]);
  const firstFree = slots.find((slot) => !isFilled(slot)) ?? null;
  const maxPosition = Math.max(0, railItems.length - 1);
  const safePosition = clamp(position, 0, maxPosition);
  const activeIndex = clamp(Math.round(safePosition), 0, maxPosition);
  const currentItem = railItems[activeIndex] ?? null;
  const currentSlot = currentItem ?? (hub === 0 ? firstFree : null);
  const currentFilled = Boolean(currentSlot && isFilled(currentSlot));
  const currentPlayUrl = currentFilled && currentSlot ? safeHttpUrl(currentSlot.playUrl) : "";
  const currentMeta = currentSlot
    ? [currentSlot.genre.trim(), currentSlot.platform.trim(), currentSlot.year.trim()].filter(Boolean).join(" · ")
    : "";
  const selectedSlot = selectedId ? slots.find((slot) => slot.id === selectedId) ?? null : null;

  useEffect(() => {
    setSlots(readSlots());
    setReady(true);
  }, []);

  useEffect(() => {
    const orientation = window.matchMedia("(pointer: coarse) and (orientation: portrait)");
    const pointer = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setPortrait(orientation.matches);
      setLite(pointer.matches || window.innerWidth < 900);
    };
    update();
    orientation.addEventListener("change", update);
    pointer.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      orientation.removeEventListener("change", update);
      pointer.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const resize = () => {
      const width = row.clientWidth || window.innerWidth;
      const height = row.clientHeight || window.innerHeight;
      const touch = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900;
      const nextWidth = Math.max(Math.min(height * 0.62 * 0.75, width * (touch ? 0.3 : 0.22), 280), 84);
      setCardWidth((previous) => Math.abs(previous - nextWidth) < 1 ? previous : nextWidth);
      setSpacing((previous) => Math.abs(previous - nextWidth * (touch ? 0.8 : 0.88)) < 1 ? previous : nextWidth * (touch ? 0.8 : 0.88));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(row);
    resize();
    return () => observer.disconnect();
  }, [appVisible, hub]);

  useEffect(() => {
    setPosition((value) => clamp(value, 0, Math.max(0, railItems.length - 1)));
  }, [railItems.length, hub]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let frame = 0;
    let particles: { x: number; y: number; radius: number; speed: number; phase: number }[] = [];
    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const count = lite ? 28 : 90;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 0.4,
        speed: Math.random() * 0.3 + 0.05,
        phase: Math.random() * 6,
      }));
    };
    const draw = (time: number) => {
      const seconds = time / 1000;
      context.globalCompositeOperation = "source-over";
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      const background = context.createRadialGradient(width * 0.62, height * 0.1, 0, width * 0.62, height * 0.1, height * 1.1);
      background.addColorStop(0, "#2a1f0a");
      background.addColorStop(0.5, "#0b0904");
      background.addColorStop(1, "#000");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      const beamCount = lite ? 2 : 4;
      for (let index = 0; index < beamCount; index++) {
        context.save();
        context.translate(width * (0.35 + index * 0.17), -20);
        context.rotate(0.35 + Math.sin(seconds * 0.15 + index) * 0.08);
        const beam = context.createLinearGradient(0, 0, 0, height * 1.3);
        beam.addColorStop(0, "rgba(246,226,122,.09)");
        beam.addColorStop(1, "rgba(246,226,122,0)");
        context.fillStyle = beam;
        context.fillRect(-width * 0.04, 0, width * 0.08, height * 1.3);
        context.restore();
      }
      context.fillStyle = "#f6e27a";
      for (const particle of particles) {
        particle.y -= particle.speed;
        particle.x += Math.sin(seconds + particle.phase) * 0.12;
        if (particle.y < -4) {
          particle.y = height + 4;
          particle.x = Math.random() * width;
        }
        context.globalAlpha = 0.25 + 0.25 * Math.sin(seconds * 1.5 + particle.phase);
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [lite]);

  useEffect(() => {
    if (!bootStarted) return;
    const timers: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setBootLit(true);
      setRevealedLetters(BOOT_WORD.length);
      setSubtitleVisible(true);
      schedule(() => setFlash(true), 650);
      schedule(() => setFlash(false), 850);
      schedule(() => { setBootHidden(true); setAppVisible(true); }, 1_050);
      return () => timers.forEach(window.clearTimeout);
    }
    schedule(() => setBootLit(true), 5_000);
    BOOT_MESSAGES.forEach((_, index) => {
      schedule(() => setMessageCount(index + 1), 5_500 + index * 1_500);
      schedule(() => setMessageOkCount(index + 1), 6_500 + index * 1_500);
    });
    [...BOOT_WORD].forEach((_, index) => {
      schedule(() => setRevealedLetters(index + 1), 12_200 + index * 260);
    });
    schedule(() => setSubtitleVisible(true), 15_000);
    schedule(() => setWordShines(true), 15_500);
    schedule(() => { playSelectionSound(); setFlash(true); }, 19_500);
    schedule(() => setFlash(false), 20_000);
    schedule(() => { setBootHidden(true); setAppVisible(true); }, 20_300);
    return () => timers.forEach(window.clearTimeout);
  }, [bootStarted]);

  useEffect(() => {
    if (!appVisible) return;
    const held = { left: false, right: false, up: false, down: false, confirm: false };
    const timer = window.setInterval(() => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((item) => item !== null);
      if (!pad) {
        held.left = held.right = held.up = held.down = held.confirm = false;
        return;
      }
      const edge = (key: keyof typeof held, down: boolean, action: () => void) => {
        if (down && !held[key]) action();
        held[key] = down;
      };
      edge("left", (pad.axes[0] ?? 0) < -0.55 || Boolean(pad.buttons[14]?.pressed), () => moveCard(-1));
      edge("right", (pad.axes[0] ?? 0) > 0.55 || Boolean(pad.buttons[15]?.pressed), () => moveCard(1));
      edge("up", (pad.axes[1] ?? 0) < -0.55 || Boolean(pad.buttons[12]?.pressed), () => changeHub(-1));
      edge("down", (pad.axes[1] ?? 0) > 0.55 || Boolean(pad.buttons[13]?.pressed), () => changeHub(1));
      edge("confirm", Boolean(pad.buttons[0]?.pressed || pad.buttons[9]?.pressed), activateCurrent);
    }, 90);
    return () => window.clearInterval(timer);
  }, [appVisible, hub, railItems.length, currentSlot, currentPlayUrl, selectedId, muted]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      if (!bootStartedRef.current) {
        if ((event.key === "Enter" || event.key === " ") && !portrait) {
          event.preventDefault();
          startBoot();
        }
        return;
      }
      if (!appVisible || selectedId) return;
      if (event.key === "ArrowDown") { event.preventDefault(); changeHub(1); }
      else if (event.key === "ArrowUp") { event.preventDefault(); changeHub(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); moveCard(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); moveCard(-1); }
      else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (hub === 2) toggleMute();
        else activateCurrent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appVisible, bootStarted, hub, position, railItems.length, currentSlot, currentPlayUrl, selectedId, portrait, muted]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    void audioRef.current?.close().catch(() => {});
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 2_200);
  }

  function ensureAudio(): AudioContext | null {
    if (audioRef.current) return audioRef.current;
    const browserWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext || browserWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    try {
      const context = new AudioContextConstructor();
      const master = context.createGain();
      master.gain.value = mutedRef.current ? 0 : 0.7;
      const compressor = context.createDynamicsCompressor();
      master.connect(compressor).connect(context.destination);
      const length = context.sampleRate * 2.8;
      const impulse = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const samples = impulse.getChannelData(channel);
        for (let index = 0; index < length; index++) samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / length, 3);
      }
      const reverb = context.createConvolver();
      reverb.buffer = impulse;
      const reverbGain = context.createGain();
      reverbGain.gain.value = 0.35;
      reverb.connect(reverbGain).connect(master);
      const bus = context.createGain();
      bus.connect(master);
      bus.connect(reverb);
      audioRef.current = context;
      masterRef.current = master;
      busRef.current = bus;
      return context;
    } catch {
      return null;
    }
  }

  function tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0, glide = 1, attack = 0.01) {
    const context = audioRef.current;
    const bus = busRef.current;
    if (!context || !bus || mutedRef.current) return;
    try {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (glide !== 1) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, frequency * glide), start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(bus);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    } catch {
      // O áudio é decorativo; a navegação continua sem ele.
    }
  }

  function chime(frequency: number, volume = 0.06, delay = 0) {
    [1, 2, 3].forEach((multiplier, index) => tone(frequency * multiplier, 1.5 / (index + 1), "sine", volume / (index * 1.5 + 1), delay, 1, 0.006));
  }

  function playBootSound() {
    [73.4, 110, 146.8, 185, 220, 329.6].forEach((frequency, index) => {
      tone(frequency, 15, "sine", 0.07, index * 0.4, 1, 6);
      tone(frequency * 1.004, 15, "triangle", 0.025, index * 0.4, 1, 7);
    });
    [587, 740, 880, 1109, 1319].forEach((frequency, index) => chime(frequency, 0.05, 9 + index * 0.5));
    window.setTimeout(() => {
      tone(73.4, 5, "sine", 0.3, 0, 1, 0.05);
      [880, 1319, 1760].forEach((frequency, index) => chime(frequency, 0.08, index * 0.12));
    }, 12_200);
  }

  function playTick() {
    if (mutedRef.current) return;
    tone(1760, 0.14, "sine", 0.035);
    tone(2640, 0.09, "sine", 0.015, 0.01);
  }

  function playSelectionSound() {
    if (mutedRef.current) return;
    [659, 988].forEach((frequency, index) => chime(frequency, 0.07, index * 0.09));
    tone(165, 0.6, "sine", 0.1);
  }

  function toggleMute() {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      const context = audioRef.current;
      const master = masterRef.current;
      if (context && master) master.gain.setTargetAtTime(next ? 0 : 0.7, context.currentTime, 0.05);
      return next;
    });
  }

  function startBoot() {
    if (bootStartedRef.current || portrait) return;
    bootStartedRef.current = true;
    setBootStarted(true);
    const context = ensureAudio();
    if (context?.state === "suspended") void context.resume().catch(() => {});
    playBootSound();
  }

  function changeHub(direction: number) {
    const next = clamp(hub + direction, 0, HUBS.length - 1) as Hub;
    if (next === hub) return;
    setHub(next);
    setPosition(0);
    positionRef.current = 0;
    setTilt({ x: 0, y: 0 });
    playTick();
  }

  function moveCard(direction: number) {
    if (!railItems.length) return;
    const next = clamp(Math.round(positionRef.current) + (direction > 0 ? 1 : -1), 0, railItems.length - 1);
    if (next === Math.round(positionRef.current)) return;
    setPosition(next);
    positionRef.current = next;
    setTilt({ x: 0, y: 0 });
    playTick();
  }

  function activateSlot(slot: GameSlot | null) {
    if (!slot) return;
    const href = safeHttpUrl(slot.playUrl);
    if (isFilled(slot) && href) {
      window.open(href, "_blank", "noopener,noreferrer");
      playSelectionSound();
      return;
    }
    setSelectedId(slot.id);
    playSelectionSound();
  }

  function activateCurrent() {
    if (hub === 2) {
      toggleMute();
      return;
    }
    activateSlot(currentSlot);
  }

  function handleCardClick(item: RailItem, index: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (index !== activeIndex) {
      setPosition(index);
      positionRef.current = index;
      playTick();
      return;
    }
    activateSlot(item ?? firstFree);
  }

  function clampRailPosition(value: number) {
    return clamp(value, 0, Math.max(0, railItems.length - 1));
  }

  function onRailPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".nj-console-system")) return;
    dragRef.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, startPosition: positionRef.current, velocity: 0 };
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onRailPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) {
      if (event.pointerType === "mouse" && !lite) {
        const rect = event.currentTarget.getBoundingClientRect();
        setTilt({ x: ((event.clientX - rect.left) / rect.width - 0.5) * 10, y: -((event.clientY - rect.top) / rect.height - 0.5) * 8 });
      }
      return;
    }
    const delta = event.clientX - drag.lastX;
    drag.lastX = event.clientX;
    if (Math.abs(event.clientX - drag.x) > 6 || Math.abs(event.clientY - drag.y) > 6) movedRef.current = true;
    const scroll = -delta / Math.max(spacing, 1);
    drag.velocity = drag.velocity * 0.6 + scroll * 0.4;
    const next = clampRailPosition(drag.startPosition - (event.clientX - drag.x) / Math.max(spacing, 1));
    setPosition(next);
    positionRef.current = next;
  }

  function onRailPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = null;
    if (Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      movedRef.current = true;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 350);
      changeHub(dy < 0 ? 1 : -1);
    } else if (movedRef.current) {
      const next = clampRailPosition(Math.round(positionRef.current + drag.velocity * 5));
      setPosition(next);
      positionRef.current = next;
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 350);
      playTick();
    }
    setTilt({ x: 0, y: 0 });
    movedRef.current = false;
  }

  function onRailWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const now = performance.now();
    if (now - lastWheelRef.current < 300) return;
    lastWheelRef.current = now;
    moveCard(Math.sign(Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY));
  }

  function persist(nextSlots: GameSlot[]): boolean {
    const result = writeSlots(nextSlots);
    if (!result.ok) {
      showToast("Não foi possível guardar neste navegador.");
      return false;
    }
    setSlots(nextSlots.map(sanitizeSlot));
    return true;
  }

  function onSave(draft: GameSlot): boolean {
    return persist(slots.map((slot) => slot.id === draft.id ? sanitizeSlot(draft) : slot));
  }

  function onClear(id: string) {
    const empty = createSlots().find((slot) => slot.id === id);
    if (!empty) return;
    persist(slots.map((slot) => slot.id === id ? empty : slot));
  }

  const hints = lite
    ? ["Deslize para os lados: jogos", "Deslize para cima ou baixo: menus"]
    : ["↑ ↓ Menus", "← → Navegar", "Enter Selecionar"];
  const title = hub === 2
    ? "Sistema"
    : currentFilled && currentSlot
      ? slotTitle(currentSlot)
      : currentSlot
        ? `Baia ${currentSlot.bay} · livre`
        : "Biblioteca vazia";
  const genre = hub === 2
    ? "NJENGINE"
    : currentFilled && currentSlot
      ? currentSlot.genre.trim() || currentMeta || "JOGO DA BIBLIOTECA"
      : currentSlot
        ? `BAIA ${currentSlot.bay} · ESPAÇO LIVRE`
        : "SEM JOGOS CADASTRADOS";
  const description = hub === 2
    ? "Informações reais deste aparelho e da biblioteca local."
    : currentFilled && currentSlot
      ? currentSlot.description.trim() || currentMeta || "Jogo cadastrado nesta biblioteca."
      : currentSlot
        ? "Este espaço fica reservado para um jogo seu. Abra a ficha para adicionar título, capa e link."
        : "Sua biblioteca está pronta. Adicione seu primeiro jogo quando quiser.";

  const railPointerProps = {
    onPointerDown: onRailPointerDown,
    onPointerMove: onRailPointerMove,
    onPointerUp: onRailPointerUp,
    onPointerCancel: onRailPointerUp,
    onWheel: onRailWheel,
  };

  return (
    <main className="nj-console" aria-label="NJENGINE">
      <canvas ref={canvasRef} className="nj-console-fx" aria-hidden="true" />
      <div className="nj-console-vignette" aria-hidden="true" />
      <div className="nj-console-grain" aria-hidden="true" />

      <section
        className={`nj-console-boot ${bootStarted ? "is-running" : ""} ${bootHidden ? "is-hidden" : ""}`}
        aria-label="Abertura NJENGINE"
        onClick={startBoot}
      >
        <div className={`nj-console-rays ${bootLit ? "is-lit" : ""}`} />
        <div className={`nj-console-bloom ${bootLit ? "is-lit" : ""}`} />
        <div className={`nj-console-line ${bootStarted ? "is-going" : ""}`} />
        <div className="nj-console-stage">
          <h1 className={`nj-console-reveal ${wordShines ? "is-shining" : ""}`} aria-label="NJENGINE">
            {[...BOOT_WORD].map((letter, index) => (
              <span key={`${letter}-${index}`} className={index < revealedLetters ? "is-in" : ""}>{letter}</span>
            ))}
          </h1>
          <p className={`nj-console-subtitle ${subtitleVisible ? "is-in" : ""}`}>INTERACTIVE ENTERTAINMENT SYSTEM</p>
        </div>
        {!bootStarted && <button type="button" className="nj-console-press" onClick={(event) => { event.stopPropagation(); startBoot(); }}>TOQUE PARA LIGAR</button>}
        {bootStarted && (
          <div className="nj-console-boot-messages" aria-hidden="true">
            {BOOT_MESSAGES.slice(0, messageCount).map((message, index) => (
              <div key={message} className={`nj-console-boot-message ${messageCount > index ? "is-on" : ""} ${messageOkCount > index ? "is-ok" : ""}`}>{message}</div>
            ))}
          </div>
        )}
      </section>

      {flash && <div className="nj-console-flash" aria-hidden="true" />}

      <section className={`nj-console-app ${appVisible ? "is-visible" : ""}`} aria-hidden={!appVisible || portrait || undefined}>
        <header className="nj-console-top">
          <div className="nj-console-logo nj-gold-text">NJENGINE</div>
          <div className="nj-console-status">
            <span>{clock}</span>
            <span className="nj-console-status-connection"><i className={`nj-console-dot ${online ? "" : "is-off"}`} />{online ? "Online" : "Offline"}</span>
          </div>
        </header>

        <div className="nj-console-main">
          <nav className="nj-console-hubs" aria-label="Menus NJENGINE">
            {HUBS.map((name, index) => {
              const distance = index - hub;
              return (
                <button
                  key={name}
                  type="button"
                  className={`nj-console-hub ${distance === 0 ? "is-selected nj-gold-text" : ""}`}
                  style={{ transform: `translateY(calc(-50% + ${distance * (lite ? 46 : 68)}px)) scale(${1 - 0.3 * Math.abs(distance)})`, opacity: Math.max(0.12, 1 - 0.55 * Math.abs(distance)) }}
                  aria-current={distance === 0 ? "page" : undefined}
                  onClick={() => changeHub(index - hub)}
                >
                  {name}
                </button>
              );
            })}
          </nav>

          <section className="nj-console-right">
            <div
              ref={rowRef}
              className="nj-console-row"
              {...railPointerProps}
              aria-label={hub === 2 ? "Painel do sistema" : "Carrossel de jogos"}
            >
              {hub === 2 ? (
                <div className="nj-console-system">
                  <h2 className="nj-gold-text">Sistema</h2>
                  <p>NJENGINE — interface de console.</p>
                  <dl>
                    <div><dt>Conexão</dt><dd>{online ? "online" : "offline"}</dd></div>
                    <div><dt>Biblioteca</dt><dd>{games.length} de {slots.length} jogos</dd></div>
                    <div><dt>Armazenamento</dt><dd>Neste navegador</dd></div>
                  </dl>
                  <button type="button" className="nj-console-sound-button" onClick={toggleMute}>
                    {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
                    Som {muted ? "desligado" : "ligado"}
                  </button>
                </div>
              ) : railItems.map((item, index) => {
                const slot = item ?? firstFree;
                if (!slot) return null;
                const filled = isFilled(slot);
                const delta = index - safePosition;
                const distance = Math.abs(delta);
                const focus = distance < 0.5;
                const blend = Math.max(0, 1 - distance);
                const width = cardWidth;
                const cardTransform = `translate(-50%,-50%) translateX(${delta * spacing}px) translateZ(${blend * 100}px) rotateY(${-delta * (lite ? 16 : 26) + (focus ? tilt.x : 0)}deg) rotateX(${focus ? tilt.y : 0}deg) scale(${0.76 + 0.28 * blend})`;
                const cardFilter = blend > 0.95 ? "none" : `blur(${lite ? 1 : 1.5 + distance * 1.5}px) brightness(${0.28 + blend * 0.72})`;
                const cardStyle: CSSProperties = {
                  width,
                  transform: cardTransform,
                  filter: cardFilter,
                  opacity: Math.max(0.25, blend + 0.3),
                  zIndex: Math.round(100 - distance * 10),
                };
                const cardTitle = filled ? slotTitle(slot) : `BAIA ${slot.bay}`;
                const cardDescription = filled
                  ? [slot.genre.trim(), slot.platform.trim()].filter(Boolean).join(" · ")
                  : "ESPAÇO LIVRE";
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={`nj-console-card ${focus ? "is-focused" : ""} ${filled ? "" : "is-empty"}`}
                    style={cardStyle}
                    aria-label={filled ? `${cardTitle}${focus ? ", selecionado" : ", selecionar"}` : `Baia ${slot.bay}, espaço livre${focus ? ", selecionada" : ", selecionar"}`}
                    aria-pressed={focus}
                    onClick={() => handleCardClick(item, index)}
                  >
                    <span className="nj-console-face">
                      {filled ? (
                        <img src={covers.get(slot.id) || paintCoverDataUrl({ bay: slot.bay, title: slot.title, filled: true })} alt="" draggable={false} />
                      ) : (
                        <span className="nj-console-empty-art">
                          <span className="nj-console-disc"><i /></span>
                          <span className="nj-console-empty-label">BAIA {slot.bay}</span>
                          <span className="nj-console-empty-status">LIVRE</span>
                        </span>
                      )}
                      {filled && <span className="nj-console-caption">{cardTitle}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {hub !== 2 && (
              <div className="nj-console-info">
                <div className="nj-console-copy">
                  <p className="nj-console-genre">{genre}</p>
                  <h2>{title}</h2>
                  <p className="nj-console-description">{description}</p>
                </div>
                {currentPlayUrl ? (
                  <a id="nj-console-play" href={currentPlayUrl} target="_blank" rel="noopener noreferrer" onClick={playSelectionSound}>
                    <span>JOGAR</span><Play aria-hidden="true" />
                  </a>
                ) : (
                  <button id="nj-console-play" type="button" disabled={!currentSlot || !ready} onClick={() => currentSlot && setSelectedId(currentSlot.id)}>
                    <span>{currentFilled ? "EDITAR FICHA" : "ADICIONAR JOGO"}</span>{currentFilled ? <Play aria-hidden="true" /> : <span className="nj-console-plus">+</span>}
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="nj-console-hints">
          {hints.map((hint) => <span key={hint}>{hint}</span>)}
        </footer>
      </section>

      {selectedSlot && (
        <>
          <button type="button" className="backdrop fixed inset-0" aria-label="Fechar ficha" onClick={() => setSelectedId(null)} />
          <Dossier
            slot={selectedSlot}
            onClose={() => setSelectedId(null)}
            onSave={onSave}
            onClear={onClear}
          />
        </>
      )}

      {toast && <div className="nj-console-toast" role="status">{toast}</div>}
      {portrait && (
        <div className="nj-console-rotate" role="status" aria-label="Gire o celular para continuar">
          <i aria-hidden="true" />
          <span>GIRE O CELULAR<br />PARA O MODO PAISAGEM</span>
        </div>
      )}
    </main>
  );
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
