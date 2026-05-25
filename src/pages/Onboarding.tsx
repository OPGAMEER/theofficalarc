import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Target, Flame, Dumbbell, Heart, Brain, Sparkles, AtSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/lib/arc-store";
import { upsertProfile } from "@/lib/profile-sync";
import GenderSelect from "@/components/profile/GenderSelect";
import AgeSlider from "@/components/profile/AgeSlider";
import { toast } from "sonner";

const GOALS = [
  { key: "LOSE_WEIGHT", label: "Lose weight",        desc: "Calorie deficit, cardio focus",     Icon: Flame },
  { key: "BUILD_MUSCLE", label: "Build muscle",      desc: "Strength + higher protein",         Icon: Dumbbell },
  { key: "STAY_FIT",    label: "Stay fit",           desc: "Balanced workouts and meals",       Icon: Heart },
  { key: "FOCUS",       label: "Focus & energy",     desc: "Lighter routines, mindfulness",     Icon: Brain },
] as const;

type GoalKey = typeof GOALS[number]["key"];

function makeHandle(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
  return "@" + (slug || "arc");
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { profile, setProfile } = useProfile();

  const [step, setStep] = useState(0);
  const [name, setName] = useState<string>("");
  const [sex, setSex] = useState<string | undefined>(undefined);
  const [age, setAge] = useState<number | null>(null);
  const [goal, setGoal] = useState<GoalKey | undefined>(undefined);
  const [handle, setHandle] = useState<string>("");

  // keep handle in sync with name until user manually edits it
  const [handleTouched, setHandleTouched] = useState(false);
  const finishingRef = useRef(false);
  useEffect(() => {
    if (!handleTouched) setHandle(makeHandle(name));
  }, [name, handleTouched]);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/landing", { replace: true });
  }, [user, loading, navigate]);

  const steps = useMemo(() => ["name", "gender", "age", "goal", "review"] as const, []);
  const total = steps.length;
  const handleValid = /^@[a-z0-9_]{2,20}$/.test(handle);
  const canNext =
    (step === 0 && name.trim().length >= 2) ||
    (step === 1 && !!sex) ||
    (step === 2 && age !== null && age >= 10 && age <= 99) ||
    (step === 3 && !!goal) ||
    (step === 4 && handleValid);

  const next = () => {
    if (!canNext) return;
    if (step < total - 1) setStep(step + 1);
    else finish();
  };

  const back = () => { if (step > 0) setStep(step - 1); };

  const [loopInfo, setLoopInfo] = useState<{ count: number; from: string; diag: any } | null>(null);
  useEffect(() => {
    try {
      const count = Number(sessionStorage.getItem("arc_onboarding_redirects") || "0");
      const from = sessionStorage.getItem("arc_onboarding_last_from") || "";
      const diagRaw = sessionStorage.getItem("arc_onboarding_diag");
      const diag = diagRaw ? JSON.parse(diagRaw) : null;
      console.log("[Onboarding] mount", { count, from, diag, userId: user?.id });
      if (count >= 2) setLoopInfo({ count, from, diag });
    } catch (e) { console.warn("[Onboarding] diag read failed", e); }
  }, [user?.id]);

  const finish = async () => {
    if (finishingRef.current) { console.log("[Onboarding] finish blocked (already running)"); return; }
    finishingRef.current = true;
    console.log("[Onboarding] finish start", { userId: user?.id, name, sex, age, goal, handle });

    try {
      setProfile({ ...profile, name: name.trim(), handle, sex, age, goal });
      if (user?.id) {
        const res = await upsertProfile(user.id, {
          name: name.trim(),
          handle,
          sex: sex ?? null,
          age: age ?? null,
          goal: goal ?? null,
          onboarded: true,
        });
        console.log("[Onboarding] upsertProfile result", res);
        if (!res.ok) {
          toast.error("Couldn't save your profile", { description: "Check your connection and try again." });
          return;
        }
      }
      localStorage.removeItem("arc_workout");
      localStorage.removeItem("arc_diet");
      if (user?.id) {
        try { localStorage.setItem(`arc_onboarded_${user.id}`, "1"); } catch {}
      }
      try {
        sessionStorage.removeItem("arc_onboarding_redirects");
        sessionStorage.removeItem("arc_onboarding_last_from");
      } catch {}
      window.dispatchEvent(new Event("arc:profile-changed"));
      await new Promise((r) => setTimeout(r, 50));
      console.log("[Onboarding] finish navigate → /");
      toast.success("You're all set", { description: "Building your plan…" });
      navigate("/", { replace: true });
    } catch (e) {
      console.error("[Onboarding] finish error", e);
      toast.error("Something went wrong", { description: "Check your connection and try again." });
    } finally {
      finishingRef.current = false;
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <motion.div aria-hidden className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full bg-primary/30 blur-3xl"
        style={{ animation: "orb-float 9s ease-in-out infinite" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[hsl(var(--accent))]" />
            <span className="mono-label-strong">SETUP</span>
          </div>
          <span className="mono-label">{String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        </div>

        <div className="mb-10 flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 bg-divider overflow-hidden">
              <motion.div className="h-full bg-[hsl(var(--accent))]" initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          ))}
        </div>

        {loopInfo && (
          <div className="mb-6 border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))]/10 p-3 text-xs">
            <div className="mono-label-strong text-[hsl(var(--destructive))] mb-1">REDIRECT LOOP DETECTED</div>
            <div className="text-text-muted">Bounced back to onboarding {loopInfo.count}× this session (last from {loopInfo.from || "?"}).</div>
            <pre className="mt-2 whitespace-pre-wrap break-all opacity-70">{JSON.stringify(loopInfo.diag, null, 2)}</pre>
            <button type="button" onClick={() => { try { sessionStorage.removeItem("arc_onboarding_redirects"); } catch {} setLoopInfo(null); }}
              className="mt-2 underline">dismiss</button>
          </div>
        )}


        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={steps[step]} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              {step === 0 && (
                <div>
                  <h1 className="hero-text text-text" style={{ fontSize: 40, lineHeight: 1 }}>WHAT'S YOUR<br />NAME?</h1>
                  <p className="mt-3 text-sm text-text-muted">We'll use this across your dashboard.</p>
                  <input autoFocus value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Your name"
                    className="mt-8 w-full bg-transparent border-b-2 border-text outline-none py-3 text-2xl font-semibold text-text placeholder:text-text-muted/50"
                    onKeyDown={(e) => { if (e.key === "Enter" && canNext) next(); }} />
                  <div className="mt-2 mono-label opacity-60">{name.trim().length}/40</div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h1 className="hero-text text-text" style={{ fontSize: 40, lineHeight: 1 }}>HI {name.split(" ")[0]?.toUpperCase() || "THERE"}.<br />YOUR GENDER?</h1>
                  <p className="mt-3 text-sm text-text-muted">Helps tailor calorie & strength targets.</p>
                  <div className="mt-8"><GenderSelect value={sex} onChange={setSex} /></div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 className="hero-text text-text" style={{ fontSize: 40, lineHeight: 1 }}>HOW OLD<br />ARE YOU?</h1>
                  <p className="mt-3 text-sm text-text-muted">Adjusts intensity and recovery.</p>
                  <div className="mt-8"><AgeSlider value={age} onChange={setAge} /></div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h1 className="hero-text text-text" style={{ fontSize: 40, lineHeight: 1 }}>WHAT DO YOU<br />WANT TO ACHIEVE?</h1>
                  <p className="mt-3 text-sm text-text-muted">Pick one — you can change it later.</p>
                  <div className="mt-8 grid grid-cols-1 gap-2">
                    {GOALS.map(({ key, label, desc, Icon }) => {
                      const active = goal === key;
                      return (
                        <button key={key} type="button" onClick={() => setGoal(key)}
                          className={["group relative flex items-center gap-4 border px-4 py-4 text-left transition-all motion-safe:hover:-translate-y-0.5",
                            active ? "bg-text text-text-inverse border-text" : "border-border text-text hover:border-text"].join(" ")}>
                          <Icon size={22} className={active ? "text-[hsl(var(--accent))]" : ""} />
                          <div className="flex-1">
                            <div className="font-mono text-xs tracking-[0.2em] font-semibold">{label.toUpperCase()}</div>
                            <div className={`text-xs mt-0.5 ${active ? "opacity-80" : "text-text-muted"}`}>{desc}</div>
                          </div>
                          {active && <Check size={18} className="text-[hsl(var(--accent))]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h1 className="hero-text text-text" style={{ fontSize: 40, lineHeight: 1 }}>CONFIRM<br />YOUR HANDLE</h1>
                  <p className="mt-3 text-sm text-text-muted">This is how friends will find you. You can edit it now.</p>

                  <div className="mt-8 border border-border p-4">
                    <div className="mono-label mb-2">HANDLE</div>
                    <div className="flex items-center gap-2">
                      <AtSign size={20} className="text-[hsl(var(--accent))]" />
                      <input value={handle.replace(/^@/, "")}
                        onChange={(e) => { setHandleTouched(true); setHandle("@" + e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20)); }}
                        className="flex-1 bg-transparent border-b border-text outline-none py-2 text-2xl font-semibold text-text"
                        placeholder="yourname" />
                    </div>
                    <p className={`mt-2 text-xs ${handleValid ? "text-text-muted" : "text-[hsl(var(--destructive))]"}`}>
                      {handleValid ? "Looks good." : "3–20 chars. Letters, numbers, underscore."}
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                    <Summary label="NAME" value={name} />
                    <Summary label="GENDER" value={sex || "—"} />
                    <Summary label="AGE" value={String(age)} />
                    <Summary label="GOAL" value={(goal || "—").replace(/_/g, " ")} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <button type="button" onClick={back} disabled={step === 0}
            className="flex items-center gap-2 border border-border px-4 py-3 mono-label-strong disabled:opacity-30 hover:border-text">
            <ArrowLeft size={14} /> BACK
          </button>
          <button type="button" onClick={next} disabled={!canNext || finishingRef.current}
            className={["flex-1 flex items-center justify-center gap-2 py-3 font-mono text-xs tracking-[0.3em] font-semibold border transition-all",
              canNext && !finishingRef.current ? "bg-inverse text-text-inverse border-inverse motion-safe:hover:-translate-y-0.5"
                      : "border-border text-text-muted opacity-50 cursor-not-allowed"].join(" ")}>
            {finishingRef.current ? "SAVING..." : step === total - 1 ? (<>FINISH <Target size={14} /></>) : (<>CONTINUE <ArrowRight size={14} /></>)}
          </button>
        </div>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-3">
      <div className="mono-label opacity-60">{label}</div>
      <div className="mt-1 text-text font-semibold uppercase">{value}</div>
    </div>
  );
}
