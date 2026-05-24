import { supabase } from "@/integrations/supabase/client";
import type { DietPlan, WorkoutPlan } from "@/lib/arc-store";

export type DietHistoryEntry = { id: string; ts: number; plan: DietPlan };
export type WorkoutHistoryEntry = { id: string; ts: number; plan: WorkoutPlan };

const DIET_KEY = "arc_diet_history";
const WORKOUT_KEY = "arc_workout_history";
const MAX = 30;

function read<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || "[]") as T[]; } catch { return []; }
}
function write<T>(k: string, v: T[]) {
  try { localStorage.setItem(k, JSON.stringify(v.slice(0, MAX))); } catch {}
}
function emit() { window.dispatchEvent(new Event("arc:history-changed")); }

function fingerprint(obj: unknown) {
  try { return JSON.stringify(obj).slice(0, 400); } catch { return String(Math.random()); }
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ---------- DIET ----------
export async function saveDietToHistory(plan: DietPlan) {
  const uid = await currentUserId();
  if (uid) {
    // dedupe against most recent remote entry
    const { data: latest } = await supabase
      .from("diet_history" as any)
      .select("plan")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const fp = fingerprint(plan.meals?.map((m) => m.name));
    if (latest && fingerprint(((latest as any).plan as DietPlan).meals?.map((m) => m.name)) === fp) return;
    const { error } = await supabase.from("diet_history" as any).insert({ user_id: uid, plan: plan as any });
    if (error) console.warn("[history] diet insert", error);
    emit();
    return;
  }
  // guest fallback
  const list = read<DietHistoryEntry>(DIET_KEY);
  const fp = fingerprint(plan.meals?.map((m) => m.name));
  if (list[0] && fingerprint(list[0].plan.meals?.map((m) => m.name)) === fp) return;
  list.unshift({ id: crypto.randomUUID(), ts: Date.now(), plan });
  write(DIET_KEY, list);
  emit();
}

export async function saveWorkoutToHistory(plan: WorkoutPlan) {
  const uid = await currentUserId();
  if (uid) {
    const { data: latest } = await supabase
      .from("workout_history" as any)
      .select("plan")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const fp = fingerprint(plan.exercises?.map((e) => e.name));
    if (latest && fingerprint(((latest as any).plan as WorkoutPlan).exercises?.map((e) => e.name)) === fp) return;
    const { error } = await supabase.from("workout_history" as any).insert({ user_id: uid, plan: plan as any });
    if (error) console.warn("[history] workout insert", error);
    emit();
    return;
  }
  const list = read<WorkoutHistoryEntry>(WORKOUT_KEY);
  const fp = fingerprint(plan.exercises?.map((e) => e.name));
  if (list[0] && fingerprint(list[0].plan.exercises?.map((e) => e.name)) === fp) return;
  list.unshift({ id: crypto.randomUUID(), ts: Date.now(), plan });
  write(WORKOUT_KEY, list);
  emit();
}

export async function getDietHistory(): Promise<DietHistoryEntry[]> {
  const uid = await currentUserId();
  if (uid) {
    const { data, error } = await supabase
      .from("diet_history" as any)
      .select("id, plan, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(MAX);
    if (error) { console.warn("[history] diet load", error); return []; }
    return (data || []).map((r: any) => ({ id: r.id, ts: new Date(r.created_at).getTime(), plan: r.plan as DietPlan }));
  }
  return read<DietHistoryEntry>(DIET_KEY);
}

export async function getWorkoutHistory(): Promise<WorkoutHistoryEntry[]> {
  const uid = await currentUserId();
  if (uid) {
    const { data, error } = await supabase
      .from("workout_history" as any)
      .select("id, plan, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(MAX);
    if (error) { console.warn("[history] workout load", error); return []; }
    return (data || []).map((r: any) => ({ id: r.id, ts: new Date(r.created_at).getTime(), plan: r.plan as WorkoutPlan }));
  }
  return read<WorkoutHistoryEntry>(WORKOUT_KEY);
}

export async function deleteDietEntry(id: string) {
  const uid = await currentUserId();
  if (uid) {
    await supabase.from("diet_history" as any).delete().eq("id", id).eq("user_id", uid);
  } else {
    write(DIET_KEY, read<DietHistoryEntry>(DIET_KEY).filter((e) => e.id !== id));
  }
  emit();
}

export async function deleteWorkoutEntry(id: string) {
  const uid = await currentUserId();
  if (uid) {
    await supabase.from("workout_history" as any).delete().eq("id", id).eq("user_id", uid);
  } else {
    write(WORKOUT_KEY, read<WorkoutHistoryEntry>(WORKOUT_KEY).filter((e) => e.id !== id));
  }
  emit();
}

export async function clearAllDietHistory() {
  const uid = await currentUserId();
  if (uid) {
    await supabase.from("diet_history" as any).delete().eq("user_id", uid);
  }
  write(DIET_KEY, []);
  emit();
}

export async function clearAllWorkoutHistory() {
  const uid = await currentUserId();
  if (uid) {
    await supabase.from("workout_history" as any).delete().eq("user_id", uid);
  }
  write(WORKOUT_KEY, []);
  emit();
}

export async function clearAllHistory() {
  await Promise.all([clearAllDietHistory(), clearAllWorkoutHistory()]);
}
