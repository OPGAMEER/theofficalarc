import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Flame, Footprints, Play, Pause, RotateCcw, MessageCircle, UtensilsCrossed, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/lib/arc-store";
import { pedometer } from "@/lib/pedometer";

import { QUOTES, getDailyQuote } from "@/lib/quotes";

const HERO_IMG = "https://images.pexels.com/photos/4498603/pexels-photo-4498603.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Home() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [now, setNow] = useState(new Date());

  // Pedometer state
  const [steps, setSteps] = useState<number>(pedometer.steps);
  const [tracking, setTracking] = useState<boolean>(pedometer.isRunning);
  const [permState, setPermState] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = pedometer.subscribe((s) => setSteps(s));
    return () => { unsub(); };
  }, []);

  const startTracking = async () => {
    if (!pedometer.isSupported) {
      setPermState("unsupported");
      toast.error("Motion sensor unavailable on this device.", {
        description: "Open ARC on your phone to count steps.",
      });
      return;
    }
    const res = await pedometer.requestPermission();
    if (res === "denied") {
      setPermState("denied");
      toast.error("Motion permission denied.", {
        description: "Enable Motion & Orientation access in your browser settings.",
      });
      return;
    }
    if (res === "unsupported") {
      setPermState("unsupported");
      toast.error("Motion sensor unavailable on this device.");
      return;
    }
    setPermState("granted");
    pedometer.start();
    setTracking(true);
    toast.success("Step tracking on. Keep your phone with you.");
  };

  const stopTracking = () => {
    pedometer.stop();
    setTracking(false);
    toast("Step tracking paused.");
  };

  const resetSteps = () => {
    pedometer.reset();
    toast("Steps reset.");
  };

  const h = now.getHours();
  const greeting = h < 5 ? "Still up" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const shuffledQuotes = useMemo(() => {
    const daily = getDailyQuote();
    const rest = QUOTES.filter((q) => q !== daily);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [daily, ...rest];
  }, []);
  const [quoteIdx, setQuoteIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setQuoteIdx((i) => (i + 1) % shuffledQuotes.length);
    }, 12000);
    return () => window.clearInterval(id);
  }, [shuffledQuotes.length]);
  const quote = shuffledQuotes[quoteIdx];

  const streakNum = profile.streak ?? 0;
  const streakBars = Array.from({ length: 14 }).map((_, i) => 8 + ((i * 7) % 36));

  return (
    <div className="px-6 pt-6 pb-32 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="block w-2 h-2 bg-[hsl(var(--accent))] animate-pulse-soft" />
          <span className="mono-label-strong">ARC · 01</span>
        </div>
        <span className="mono-label">{dateStr} · {timeStr}</span>
      </div>

      {/* Greeting */}
      <div className="mt-8">
        <span className="mono-label">// AI ASSISTANT</span>
        <h1 className="hero-text text-text mt-3" style={{ fontSize: "clamp(56px,15vw,72px)" }}>
          {greeting},<br />
          <span className="text-text-muted">{(profile?.name || "traveler").toLowerCase()}.</span>
        </h1>
      </div>

      {/* Marquee quote */}
      <div className="mt-8 border-t border-b border-text overflow-hidden h-11 flex items-center">
        <div className="flex whitespace-nowrap animate-marquee">
          {[0,1,2,3].map((k) => (
            <span key={k} className="text-sm font-medium tracking-wide pr-8">
              {quote.text} — {quote.author}    ✦    
            </span>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3">
        {[
          { label: "AI CHATBOT", sub: "Ask Arc now", to: "/chat", Icon: MessageCircle },
          { label: "MEAL GENERATOR", sub: "Create today's meals", to: "/diet", Icon: UtensilsCrossed },
          { label: "WORKOUT GENERATOR", sub: "Build today's training", to: "/workout", Icon: Dumbbell },
        ].map(({ label, sub, to, Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex items-center justify-between border border-text bg-surface px-5 py-4 text-left active:opacity-85"
          >
            <span className="flex items-center gap-3">
              <Icon size={18} className="text-[hsl(var(--accent))]" />
              <span>
                <span className="block mono-label-strong">{label}</span>
                <span className="block text-sm text-text-muted mt-1">{sub}</span>
              </span>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>

      {/* Streak hero card */}
      <div className="mt-8 grid grid-cols-2 border border-border bg-surface arc-tr overflow-hidden">
        <div className="border-r border-border p-6 flex flex-col gap-1">
          <span className="mono-label">STREAK</span>
          <span className="mono-num text-[hsl(var(--accent))] animate-pulse-soft" style={{ fontSize: 64, lineHeight: 1 }}>
            {streakNum.toString().padStart(2, "0")}
          </span>
          <span className="text-text-muted text-sm">consecutive days</span>
          <div className="flex items-center gap-1.5 mt-2">
            <Flame size={14} className="text-[hsl(var(--accent))] animate-pulse-soft" />
            <span className="mono-label" style={{ color: "hsl(var(--accent))" }}>+25 XP / DAY</span>
          </div>
        </div>
        <div className="p-6 flex items-end justify-between gap-1">
          {streakBars.map((h, i) => (
            <span
              key={i}
              className="flex-1"
              style={{
                height: h,
                background: i < (streakNum % 14) ? "hsl(var(--accent))" : "hsl(var(--border))",
              }}
            />
          ))}
        </div>
      </div>

      {/* Featured */}
      <div className="mt-8 relative h-80 overflow-hidden arc-tr bg-inverse">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-black/40 p-6 flex flex-col justify-between">
          <div className="flex justify-between">
            <span className="mono-label-strong text-[#D4D4D8]">TODAY · FOCUS</span>
            <ArrowUpRight size={16} className="text-white" />
          </div>
          <div>
            <h2 className="hero-text text-white" style={{ fontSize: 40 }}>
              Move first.<br />
              <span className="text-[hsl(var(--accent))]">Then plan.</span>
            </h2>
            <div className="flex gap-7 mt-4">
              {[["ENERGY","HIGH"],["READINESS","87%"],["RECOVERY","9.2"]].map(([l,v]) => (
                <div key={l}>
                  <div className="mono-label" style={{ color: "#A1A1AA" }}>{l}</div>
                  <div className="text-white font-semibold text-lg font-mono">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <svg width="60" height="60" className="absolute top-0 right-0">
          <path d="M 0,0 L 60,0 L 60,60 A 60,60 0 0 0 0,0 Z" fill="hsl(var(--accent))" />
        </svg>
      </div>

      {/* Steps tracker */}
      <div className="mt-8 border border-border bg-surface arc-tr overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Footprints size={14} className="text-[hsl(var(--accent))]" />
            <span className="mono-label-strong">STEPS · TODAY</span>
          </div>
          <span className="mono-label text-text-muted">
            {tracking ? "TRACKING" : permState === "denied" ? "BLOCKED" : permState === "unsupported" ? "UNAVAILABLE" : "PAUSED"}
          </span>
        </div>
        <div className="p-5 flex items-end justify-between gap-4">
          <div className="flex flex-col">
            <span className="mono-num text-text" style={{ fontSize: 56, lineHeight: 1 }}>
              {steps.toLocaleString()}
            </span>
            <span className="text-text-muted text-sm mt-1">
              {tracking
                ? "Counting from your phone's motion sensor."
                : "Tap start — keep your phone with you while you walk."}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-border">
          {!tracking ? (
            <button
              onClick={startTracking}
              className="col-span-2 flex items-center justify-center gap-2 py-3 mono-label-strong bg-inverse text-text-inverse hover:opacity-90"
            >
              <Play size={12} /> START TRACKING
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="col-span-2 flex items-center justify-center gap-2 py-3 mono-label-strong border-r border-border hover:bg-background"
            >
              <Pause size={12} /> PAUSE
            </button>
          )}
          <button
            onClick={resetSteps}
            className="flex items-center justify-center gap-2 py-3 mono-label text-text-muted hover:text-text hover:bg-background border-l border-border"
          >
            <RotateCcw size={12} /> RESET
          </button>
        </div>
        {permState === "denied" && (
          <div className="px-5 py-2 border-t border-border text-xs text-text-muted">
            Motion access blocked. Enable "Motion & Orientation" in your browser settings, then refresh.
          </div>
        )}
        {permState === "unsupported" && (
          <div className="px-5 py-2 border-t border-border text-xs text-text-muted">
            This device has no motion sensor. Open ARC on your phone for accurate step tracking.
          </div>
        )}
      </div>

      {/* Floating chat FAB */}
      <button
        onClick={() => navigate("/chat")}
        className="fixed left-1/2 -translate-x-1/2 bottom-20 z-30 flex items-center gap-2.5 px-6 py-3.5 bg-inverse text-text-inverse arc-tr active:opacity-85"
      >
        <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
        <span className="font-mono text-xs tracking-[0.3em] font-semibold">ASK ARC</span>
        <ArrowUpRight size={16} />
      </button>

    </div>
  );
}
