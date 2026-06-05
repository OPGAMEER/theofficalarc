import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pause, Play, X, Zap, Loader2, Maximize2, ListOrdered, User, UserRound, Users, History as HistoryIcon } from "lucide-react";
import { useWorkoutPlan, useProfile, type WorkoutPlan } from "@/lib/arc-store";
import { saveWorkoutToHistory } from "@/lib/plan-history";
import { toast } from "sonner";
import { exerciseMedia } from "@/lib/exercise-media";
import { exerciseSteps } from "@/lib/exercise-steps";
import { runInBackground } from "@/lib/resilient-actions";
import { createWorkoutPlan } from "@/lib/arc-engine";


const HERO_BY_GENDER: Record<string, string> = {
  MALE:   "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  FEMALE: "https://images.pexels.com/photos/3076509/pexels-photo-3076509.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  OTHER:  "https://images.pexels.com/photos/4720766/pexels-photo-4720766.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
};

const FALLBACK: WorkoutPlan = {
  title: "Tap Generate",
  subtitle: "READY",
  duration_min: 45,
  rpe: 0,
  volume_kg: 0,
  exercises: [],
};

function fmt(s: number) {
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

export default function Workout() {
  const { plan, setPlan } = useWorkoutPlan();
  const { profile } = useProfile();
  const gender = (profile.sex || "").toUpperCase();
  const isMale = gender === "MALE";
  const isFemale = gender === "FEMALE";
  const genderLabel = isMale ? "MALE-ONLY" : isFemale ? "FEMALE-ONLY" : "ALL ATHLETES";
  const GenderIcon = isMale ? User : isFemale ? UserRound : Users;
  const heroSrc = useMemo(
    () => HERO_BY_GENDER[gender] || HERO_BY_GENDER.OTHER,
    [gender]
  );

  const [intake, setIntake] = useState({ location: "GYM" as "HOME"|"GYM", equipment: "", focus: "FULL BODY", duration_min: 45, variety: "fresh" as "fresh" | "familiar" });
  const focusOptions = ["UPPER", "LOWER", "FULL BODY", "PUSH", "PULL", "GLUTES", "ARMS", "CORE", "ATHLETIC"] as const;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [zoom, setZoom] = useState<{ url: string; name: string } | null>(null);
  const idRef = useRef<number | null>(null);
  const lastSigRef = useRef<string>(`${gender}|${profile.age ?? ""}`);

  useEffect(() => {
    if (running) idRef.current = window.setInterval(() => setSeconds((x) => x+1), 1000);
    else if (idRef.current) window.clearInterval(idRef.current);
    return () => { if (idRef.current) window.clearInterval(idRef.current); };
  }, [running]);

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    const nextPlan = createWorkoutPlan({
      location: intake.location,
      focus: intake.focus,
      duration_min: intake.duration_min,
      gender: gender || "OTHER",
      equipment: intake.equipment,
      seed: Math.floor(Math.random() * 1_000_000) ^ Date.now(),
    });
    setPlan(nextPlan);
    runInBackground("workout-history", saveWorkoutToHistory(nextPlan));
    setOpen(false);
    toast.success(`${genderLabel.toLowerCase()} plan ready.`);
    setLoading(false);
  };

  // Auto-refresh workout when gender or age changes (only if a plan exists)
  useEffect(() => {
    const sig = `${gender}|${profile.age ?? ""}`;
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    if (!plan || loading) return;
    toast.info("Profile changed — refreshing workout…");
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gender, profile.age]);

  const p = plan || FALLBACK;

  return (
    <div className="px-6 pt-6 pb-24 animate-fade-up">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="mono-label-strong">03 · WORKOUT</span>
        <div className="flex items-center gap-3">
          <Link to="/history" className="flex items-center gap-1.5 mono-label hover:text-text" aria-label="View plan history">
            <HistoryIcon size={11} className="text-[hsl(var(--accent))]" /> HISTORY
          </Link>
          <span
            key={genderLabel}
            className="inline-flex items-center gap-1.5 border border-border px-2 py-1 mono-label motion-safe:animate-[gender-pill_0.4s_ease-out]"
            aria-label={`Workouts tailored for ${genderLabel.toLowerCase()}`}
          >
            <GenderIcon size={11} className="text-[hsl(var(--accent))]" />
            {genderLabel}
          </span>
          <Zap size={16} className="text-[hsl(var(--accent))]" />
        </div>
      </div>
      <style>{`
        @keyframes gender-pill {
          0%   { transform: translateY(-4px) scale(0.92); opacity: 0; }
          60%  { transform: translateY(0) scale(1.04); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>

      <h1 className="hero-text text-text mt-8" style={{ fontSize: "clamp(48px,13vw,64px)" }}>
        Push,<br />
        <span className="text-text-muted">then push</span><br />
        <span className="text-[hsl(var(--accent))]">again.</span>
      </h1>

      {/* Mode toggle */}
      <div className="mt-8 grid grid-cols-2 border border-text">
        {(["HOME","GYM"] as const).map((mode) => {
          const active = intake.location === mode;
          return (
            <button
              key={mode}
              onClick={() => setIntake({ ...intake, location: mode })}
              className={`py-4 font-mono text-xs tracking-[0.3em] font-semibold ${active ? "bg-text text-text-inverse" : "bg-surface text-text"}`}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* Featured */}
      <div className="mt-8 relative h-80 arc-tr overflow-hidden bg-inverse">
        <img key={heroSrc} src={heroSrc} alt={`${genderLabel} workout`} className="absolute inset-0 w-full h-full object-cover opacity-60 motion-safe:animate-fade-in" />
        <div className="absolute inset-0 bg-black/40 p-6 flex flex-col justify-between">
          <div className="flex justify-between">
            <span className="mono-label-strong text-[#D4D4D8]">{p.subtitle || "SESSION"}</span>
            <span className="mono-label-strong text-[#D4D4D8]">{p.duration_min} MIN</span>
          </div>
          <div>
            <h2 className="hero-text text-white" style={{ fontSize: 40 }}>{p.title}</h2>
            <div className="flex gap-7 mt-3">
              <div>
                <div className="mono-label" style={{ color: "#A1A1AA" }}>VOLUME</div>
                <div className="text-white font-semibold text-lg font-mono">{p.volume_kg.toLocaleString()} kg</div>
              </div>
              <div>
                <div className="mono-label" style={{ color: "#A1A1AA" }}>RPE</div>
                <div className="text-white font-semibold text-lg font-mono">{p.rpe}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={() => setOpen(true)}
        className="mt-6 w-full flex items-center justify-between border border-text px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
          <span className="mono-label-strong">{plan ? "REGENERATE WITH ARC" : "GENERATE A WORKOUT"}</span>
        </div>
        <ArrowRight size={16} />
      </button>

      {/* Timer */}
      <div className="mt-8 border border-border bg-surface p-6 flex flex-col items-center gap-4">
        <div className="w-full flex justify-between">
          <span className="mono-label">REST TIMER</span>
          <button onClick={() => { setSeconds(0); setRunning(false); }} className="mono-label-strong">RESET</button>
        </div>
        <span
          className={`mono-num ${running ? "text-[hsl(var(--accent))]" : "text-text"}`}
          style={{ fontSize: 96, lineHeight: 1 }}
        >
          {fmt(seconds)}
        </span>
        <button
          onClick={() => setRunning(r => !r)}
          className="flex items-center gap-3 bg-inverse text-text-inverse px-7 py-3.5 font-mono text-xs tracking-[0.3em] font-semibold"
        >
          {running ? "PAUSE" : "START"}
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      {/* Exercises */}
      <div className="mt-8 flex items-center justify-between border-b border-text pb-2">
        <span className="mono-label-strong">EXERCISES</span>
        <span className="mono-label">{p.exercises.length}</span>
      </div>
      {p.exercises.length === 0 ? (
        <p className="text-text-muted py-6">No exercises yet. Tap "Generate a workout" to let Arc draft your session.</p>
      ) : (
        p.exercises.map((e, i) => {
          const steps = exerciseSteps(e.name);
          const media = exerciseMedia(e.name);
          return (
            <div key={i} className="border-b border-border py-4">
              <div className="flex items-center gap-3">
                <span className="mono-label w-7">0{i + 1}</span>
                <div className="flex-1">
                  <div className="text-text text-base">{e.name}</div>
                  <div className="text-text-muted text-sm">Rest · {e.rest_sec}s{e.cue ? ` · ${e.cue}` : ""}</div>
                </div>
                <span className="mono-label-strong">{e.reps}</span>
              </div>

              {/* Tutorial: animated demo + numbered steps side-by-side on wider, stacked on mobile */}
              <div className="mt-3 ml-10 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
                <button
                  type="button"
                  onClick={() => setZoom({ url: media, name: e.name })}
                  className="group relative aspect-video w-full overflow-hidden bg-surface border border-border hover:border-text transition-colors"
                  aria-label={`Zoom ${e.name} demo`}
                >
                  <img
                    src={media}
                    alt={`${e.name} animated tutorial`}
                    loading="eager"
                    decoding="async"
                    width={400}
                    height={225}
                    style={{
                      transform: "translate3d(0,0,0)",
                      willChange: "transform",
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(ev) => {
                      const img = ev.currentTarget as HTMLImageElement;
                      const fb = "https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif";
                      if (img.src !== fb) img.src = fb;
                    }}
                  />
                  <span className="absolute top-1.5 left-1.5 mono-label bg-background/85 px-1.5 py-0.5 flex items-center gap-1">
                    <span className="block w-1 h-1 bg-[hsl(var(--accent))] animate-pulse-soft" />
                    TUTORIAL
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 bg-background/85 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={12} />
                  </span>
                </button>

                <ol className="flex flex-col gap-1.5">
                  {steps.map((s, k) => (
                    <li key={k} className="flex gap-2.5 text-sm text-text leading-snug">
                      <span
                        className="mono-num text-[hsl(var(--accent))] flex-shrink-0"
                        style={{ fontSize: 12, lineHeight: "20px" }}
                      >
                        {String(k + 1).padStart(2, "0")}
                      </span>
                      <span className="text-text-muted">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })
      )}

      {/* Intake sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => !loading && setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-surface border-t border-border max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center p-5 border-b border-border">
              <span className="mono-label-strong">WORKOUT INTAKE</span>
              <button onClick={() => !loading && setOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="mono-label">EQUIPMENT</label>
                <input
                  value={intake.equipment}
                  onChange={(e) => setIntake({ ...intake, equipment: e.target.value })}
                  placeholder="dumbbells, bands, bench…"
                  className="w-full bg-transparent border-b border-border outline-none py-3 text-text placeholder:text-text-muted"
                />
              </div>
              <div>
                <label className="mono-label">FOCUS</label>
                <div className="mt-2 grid grid-cols-3 border border-text">
                  {focusOptions.map((f, idx) => {
                    const active = intake.focus === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setIntake({ ...intake, focus: f })}
                        className={`py-3 font-mono text-[10px] tracking-[0.2em] border-border ${idx % 3 !== 2 ? "border-r" : ""} ${idx < focusOptions.length - 3 ? "border-b" : ""} ${active ? "bg-text text-text-inverse" : ""}`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
                <p className="text-text-muted text-[10px] mt-2 leading-relaxed">
                  {(() => {
                    const map: Record<string, string> = {
                      "UPPER":     "Push + pull balance — chest, back, shoulders, arms.",
                      "LOWER":     "Quads + hamstrings + glutes — squats, hinges, unilaterals.",
                      "FULL BODY": "Every major pattern — squat, hinge, push, pull, core.",
                      "PUSH":      "Chest, shoulders, triceps — horizontal + vertical pressing.",
                      "PULL":      "Back, rear delts, biceps — vertical + horizontal pulling.",
                      "GLUTES":    "Hip thrusts, hinges, abductions, glute-focused unilaterals.",
                      "ARMS":      "Biceps + triceps from multiple angles, plus grip work.",
                      "CORE":      "Anti-extension, anti-rotation, dynamic flexion.",
                      "ATHLETIC":  "Plyometrics, sprints, throws, explosive power.",
                    };
                    return map[intake.focus] || "";
                  })()}
                </p>
              </div>
              <div>
                <label className="mono-label">EXERCISE STYLE</label>
                <div className="mt-2 grid grid-cols-2 border border-text">
                  {([
                    ["fresh", "NEW EXERCISES"],
                    ["familiar", "CLASSIC"],
                  ] as ["fresh" | "familiar", string][]).map(([val, label], i) => {
                    const active = intake.variety === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setIntake({ ...intake, variety: val })}
                        className={`py-3 font-mono text-[10px] tracking-[0.2em] ${i === 0 ? "border-r border-text" : ""} ${active ? "bg-text text-text-inverse" : ""}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-text-muted text-[10px] mt-1">
                  {intake.variety === "fresh" ? "Arc tries movements you haven't done recently." : "Arc sticks to proven classic exercises."}
                </p>
              </div>
              <div>
                <label className="mono-label">DURATION · {intake.duration_min} MIN</label>
                <input
                  type="range" min={15} max={90} step={5}
                  value={intake.duration_min}
                  onChange={(e) => setIntake({ ...intake, duration_min: Number(e.target.value) })}
                  className="w-full mt-3 accent-[hsl(var(--accent))]"
                />
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="bg-inverse text-text-inverse py-4 font-mono text-xs tracking-[0.3em] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <><Loader2 size={14} className="animate-spin" /> ARC IS THINKING…</> : <>GENERATE PLAN <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom modal — bigger demo + full step-by-step tutorial */}
      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setZoom(null)}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListOrdered size={16} className="text-[hsl(var(--accent))]" />
                <span className="mono-label-strong text-white">{zoom.name.toUpperCase()}</span>
              </div>
              <button onClick={() => setZoom(null)} className="text-white"><X size={22} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-4 bg-surface border border-border p-4">
              <div className="bg-background overflow-hidden">
                <img src={zoom.url} alt={`${zoom.name} animated tutorial`} className="w-full h-auto" />
              </div>
              <div>
                <div className="mono-label-strong text-text mb-3 flex items-center gap-2">
                  <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
                  HOW TO DO IT
                </div>
                <ol className="flex flex-col gap-3">
                  {exerciseSteps(zoom.name).map((s, k) => (
                    <li key={k} className="flex gap-3 text-sm text-text leading-snug">
                      <span
                        className="mono-num text-[hsl(var(--accent))] flex-shrink-0"
                        style={{ fontSize: 14, lineHeight: "20px" }}
                      >
                        {String(k + 1).padStart(2, "0")}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <p className="mono-label text-white/60 mt-3 text-center">TAP OUTSIDE TO CLOSE</p>
          </div>
        </div>
      )}
    </div>
  );
}
