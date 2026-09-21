import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile, upsertProfile, remoteToLocal } from "@/lib/profile-sync";

type Profile = {
  name: string;
  handle: string;
  age?: number;
  sex?: string;
  pronouns?: string;
  goal?: string;
  avatar_url?: string;
  level: number;
  xp: number;
  streak: number;
  last_streak_date?: string;
};

type Task = {
  id: string;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:MM
  title: string;
  tag: string;
  done: boolean;
  duration_min: number;
};

type Health = { water_ml: number; sleep_hr: number; steps: number };

type WorkoutPlan = {
  title: string;
  subtitle: string;
  duration_min: number;
  rpe: number;
  volume_kg: number;
  exercises: { name: string; reps: string; rest_sec: number; cue?: string }[];
};

type DietPlan = {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meals: {
    name: string;
    time: string;
    kcal: number;
    items: string[];
    prep_min?: number;
    cook_min?: number;
    recipe?: string[];
  }[];
};

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; ts: number };

const KEYS = {
  profile: "arc_profile",
  tasks: "arc_tasks",
  health: "arc_health",
  workout: "arc_workout",
  diet: "arc_diet",
  chat: "arc_chat",
} as const;

const DYNAMIC_CACHE_VERSION = "2026-05-27-generation-reset";
const DYNAMIC_CACHE_VERSION_KEY = "arc_dynamic_cache_version";

function resetStaleDynamicCache() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(DYNAMIC_CACHE_VERSION_KEY) === DYNAMIC_CACHE_VERSION) return;
    [KEYS.workout, KEYS.diet, KEYS.chat, "arc_workout_history", "arc_diet_history"].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(DYNAMIC_CACHE_VERSION_KEY, DYNAMIC_CACHE_VERSION);
  } catch {}
}

const DEFAULT_PROFILE: Profile = {
  name: "",
  handle: "",
  level: 1,
  xp: 0,
  streak: 0,
};

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  resetStaleDynamicCache();
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function write<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ------- per-user scoping -------
// Every signed-in user gets their own isolated bucket of local data so no
// personal plans, profile or logs leak between accounts on the same device.
let currentUserId: string | null = null;
const scopeListeners = new Set<(uid: string | null) => void>();

function scopedKey(base: string, uid: string | null) {
  return uid ? `${base}__${uid}` : `${base}__guest`;
}

function initScopeWatcher() {
  if (typeof window === "undefined") return;
  if ((initScopeWatcher as any).done) return;
  (initScopeWatcher as any).done = true;
  const apply = (uid: string | null) => {
    if (uid === currentUserId) return;
    currentUserId = uid;
    scopeListeners.forEach((fn) => fn(uid));
  };
  supabase.auth.getSession().then(({ data: { session } }) => apply(session?.user?.id ?? null));
  supabase.auth.onAuthStateChange((_e, session) => apply(session?.user?.id ?? null));
}

function useScoped<T>(base: string, fallback: T) {
  initScopeWatcher();
  const [uid, setUid] = useState<string | null>(currentUserId);
  const [value, setValue] = useState<T>(() => read<T>(scopedKey(base, currentUserId), fallback));

  useEffect(() => {
    const listener = (next: string | null) => {
      setUid(next);
      setValue(read<T>(scopedKey(base, next), fallback));
    };
    scopeListeners.add(listener);
    return () => { scopeListeners.delete(listener); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => { write(scopedKey(base, uid), value); }, [base, uid, value]);

  return [value, setValue, uid] as const;
}

// ------- profile (Supabase-backed when signed in, localStorage for guests) -------
export function useProfile() {
  const [profile, setProfileLocal, uid] = useScoped<Profile>(KEYS.profile, DEFAULT_PROFILE);
  const hydrated = useRef(false);

  // Hydrate the signed-in user's profile from Supabase (cross-device)
  useEffect(() => {
    let cancelled = false;
    hydrated.current = false;
    if (!uid) { hydrated.current = true; return; }
    fetchProfile(uid).then((remote) => {
      if (cancelled) return;
      if (remote) setProfileLocal(remoteToLocal(remote));
      hydrated.current = true;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    const onChanged = () => setProfileLocal((p) => ({ ...p }));
    window.addEventListener("arc:profile-changed", onChanged);
    return () => window.removeEventListener("arc:profile-changed", onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push to Supabase if signed in
  useEffect(() => {
    if (!uid || !hydrated.current) return;
    upsertProfile(uid, {
      name: profile.name || null,
      handle: profile.handle || null,
      age: profile.age ?? null,
      sex: profile.sex ?? null,
      goal: profile.goal ?? null,
      avatar_url: profile.avatar_url ?? null,
      level: profile.level,
      xp: profile.xp,
      streak: profile.streak,
      last_streak_date: profile.last_streak_date ?? null,
    });
  }, [profile, uid]);

  const setProfile = (next: Profile | ((p: Profile) => Profile)) => {
    setProfileLocal((prev) => (typeof next === "function" ? (next as (p: Profile) => Profile)(prev) : next));
  };

  return { profile, setProfile };
}

export function useHealthToday() {
  const [all, setAll] = useScoped<Record<string, Health>>(KEYS.health, {});
  const health = all[todayKey()] || { water_ml: 0, sleep_hr: 0, steps: 0 };
  const setHealth = (next: Health | ((h: Health) => Health)) => {
    setAll((prev) => {
      const cur = prev[todayKey()] || { water_ml: 0, sleep_hr: 0, steps: 0 };
      const value = typeof next === "function" ? (next as (h: Health) => Health)(cur) : next;
      return { ...prev, [todayKey()]: value };
    });
  };
  return { health, setHealth };
}

export function useTasks() {
  const [tasks, setTasks] = useScoped<Task[]>(KEYS.tasks, []);
  return { tasks, setTasks };
}

export function useWorkoutPlan() {
  const [plan, setPlan] = useScoped<WorkoutPlan | null>(KEYS.workout, null);
  return { plan, setPlan };
}

export function useDietPlan() {
  const [plan, setPlan] = useScoped<DietPlan | null>(KEYS.diet, null);
  return { plan, setPlan };
}

// Chat history is scoped per user so every signed-in user gets a fresh
// conversation. Guests share an anonymous bucket that resets on sign-in.
export function useChatHistory() {
  const [messages, setMessages] = useScoped<ChatMessage[]>(KEYS.chat, []);
  const endChat = () => setMessages([]);
  return { messages, setMessages, endChat };
}

export type { Profile, Task, Health, WorkoutPlan, DietPlan, ChatMessage };
