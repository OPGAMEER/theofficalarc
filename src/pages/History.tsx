import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UtensilsCrossed, Dumbbell, RotateCcw, Trash2, Eraser } from "lucide-react";
import { toast } from "sonner";
import {
  getDietHistory,
  getWorkoutHistory,
  deleteDietEntry,
  deleteWorkoutEntry,
  clearAllHistory,
  type DietHistoryEntry,
  type WorkoutHistoryEntry,
} from "@/lib/plan-history";
import { useDietPlan, useWorkoutPlan } from "@/lib/arc-store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function History() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"meals" | "workouts">("meals");
  const [diets, setDiets] = useState<DietHistoryEntry[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { setPlan: setDietPlan } = useDietPlan();
  const { setPlan: setWorkoutPlan } = useWorkoutPlan();

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const [d, w] = await Promise.all([getDietHistory(), getWorkoutHistory()]);
      if (cancelled) return;
      setDiets(d);
      setWorkouts(w);
      setLoading(false);
    };
    refresh();
    const onChange = () => { refresh(); };
    window.addEventListener("arc:history-changed", onChange);
    return () => { cancelled = true; window.removeEventListener("arc:history-changed", onChange); };
  }, []);

  const handleClearAll = async () => {
    await clearAllHistory();
    toast.success("History cleared");
  };

  return (
    <div className="px-6 pt-6 pb-24 animate-fade-up">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mono-label-strong">
          <ArrowLeft size={14} /> BACK
        </button>
        <span className="mono-label">HISTORY</span>
      </div>

      <h1 className="hero-text text-text mt-8" style={{ fontSize: "clamp(40px,11vw,56px)" }}>
        Every<br />
        <span className="text-text-muted">plan you've</span><br />
        <span className="text-[hsl(var(--accent))]">ever made.</span>
      </h1>

      <div className="mt-8 grid grid-cols-2 border border-border">
        {([
          ["meals", "MEALS", UtensilsCrossed, diets.length],
          ["workouts", "WORKOUTS", Dumbbell, workouts.length],
        ] as const).map(([val, label, Icon, count], i) => {
          const active = tab === val;
          return (
            <button
              key={val}
              onClick={() => setTab(val)}
              className={`py-3 mono-label-strong text-[11px] flex items-center justify-center gap-2 transition-colors ${
                i === 0 ? "border-r border-border" : ""
              } ${active ? "bg-[hsl(var(--accent))] text-[hsl(var(--background))]" : "text-text hover:bg-surface"}`}
            >
              <Icon size={12} />
              {label} · {count}
            </button>
          );
        })}
      </div>

      {(diets.length > 0 || workouts.length > 0) && (
        <div className="mt-4 flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="flex items-center gap-2 border border-border px-3 py-2 mono-label-strong text-[10px] text-text-muted hover:text-destructive hover:border-destructive transition-colors"
              >
                <Eraser size={12} /> CLEAR HISTORY
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear all saved plans?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes every saved meal and workout plan from your history. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="mt-6">
        {loading && <p className="text-text-muted py-6">Loading…</p>}

        {!loading && tab === "meals" && (diets.length === 0 ? (
          <p className="text-text-muted py-6">No meal plans saved yet. Generate one from the Meal tab.</p>
        ) : diets.map((e) => (
          <div key={e.id} className="border border-border bg-surface p-4 mb-3">
            <div className="flex items-center justify-between">
              <span className="mono-label-strong text-[10px]">{new Date(e.ts).toLocaleDateString()} · {timeAgo(e.ts)}</span>
              <span className="mono-num text-[hsl(var(--accent))]" style={{ fontSize: 18 }}>{e.plan.kcal} kcal</span>
            </div>
            <div className="mt-2 text-text text-sm">
              {(e.plan.meals || []).map((m) => m.name).join(" · ")}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-muted">
              <span>P {e.plan.protein_g}g</span>
              <span>C {e.plan.carbs_g}g</span>
              <span>F {e.plan.fat_g}g</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setDietPlan(e.plan); toast.success("Meal plan reloaded"); navigate("/diet"); }}
                className="flex-1 flex items-center justify-center gap-2 border border-text py-2 mono-label-strong text-[10px]"
              >
                <RotateCcw size={12} /> RELOAD
              </button>
              <button
                onClick={() => deleteDietEntry(e.id)}
                aria-label="Delete"
                className="border border-border px-3 text-text-muted hover:text-destructive hover:border-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )))}

        {!loading && tab === "workouts" && (workouts.length === 0 ? (
          <p className="text-text-muted py-6">No workouts saved yet. Generate one from the Workout tab.</p>
        ) : workouts.map((e) => (
          <div key={e.id} className="border border-border bg-surface p-4 mb-3">
            <div className="flex items-center justify-between">
              <span className="mono-label-strong text-[10px]">{new Date(e.ts).toLocaleDateString()} · {timeAgo(e.ts)}</span>
              <span className="mono-label">{e.plan.duration_min} MIN</span>
            </div>
            <div className="mt-2 text-text text-base">{e.plan.title}</div>
            <div className="mt-1 text-text-muted text-xs">{e.plan.subtitle} · {e.plan.exercises.length} exercises</div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { setWorkoutPlan(e.plan); toast.success("Workout reloaded"); navigate("/workout"); }}
                className="flex-1 flex items-center justify-center gap-2 border border-text py-2 mono-label-strong text-[10px]"
              >
                <RotateCcw size={12} /> RELOAD
              </button>
              <button
                onClick={() => deleteWorkoutEntry(e.id)}
                aria-label="Delete"
                className="border border-border px-3 text-text-muted hover:text-destructive hover:border-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )))}
      </div>
    </div>
  );
}
