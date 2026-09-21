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
  const [profile, setProfileLocal] = useState<Profile>(() => read(KEYS.profile, DEFAULT_PROFILE));
  const userIdRef = useRef<string | null>(null);
  const hydrated = useRef(false);

  // Subscribe to auth & hydrate from Supabase
  useEffect(() => {
    let cancelled = false;
    const hydrate = async (uid: string | null) => {
      userIdRef.current = uid;
      if (!uid) { hydrated.current = true; return; }
      const remote = await fetchProfile(uid);
      if (cancelled) return;
      if (remote) {
        const merged = remoteToLocal(remote);
        setProfileLocal(merged);
        write(KEYS.profile, merged);
      }
      hydrated.current = true;
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      hydrate(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      hydrated.current = false;
      hydrate(session?.user?.id ?? null);
    });
    const onChanged = () => { /* trigger re-render via state */ setProfileLocal(p => ({ ...p })); };
    window.addEventListener("arc:profile-changed", onChanged);
    return () => { cancelled = true; subscription.unsubscribe(); window.removeEventListener("arc:profile-changed", onChanged); };
  }, []);

  // Persist locally always; push to Supabase if signed in
  useEffect(() => {
    write(KEYS.profile, profile);
    const uid = userIdRef.current;
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
  }, [profile]);

  const setProfile = (next: Profile | ((p: Profile) => Profile)) => {
    setProfileLocal(prev => (typeof next === "function" ? (next as (p: Profile) => Profile)(prev) : next));
  };

  return { profile, setProfile };
}

export function useHealthToday() {
  const [health, setHealth] = useState<Health>(() => {
    const all = read<Record<string, Health>>(KEYS.health, {});
    return all[todayKey()] || { water_ml: 0, sleep_hr: 0, steps: 0 };
  });
  useEffect(() => {
    const all = read<Record<string, Health>>(KEYS.health, {});
    all[todayKey()] = health;
    write(KEYS.health, all);
  }, [health]);
  return { health, setHealth };
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => read<Task[]>(KEYS.tasks, []));
  useEffect(() => { write(KEYS.tasks, tasks); }, [tasks]);
  return { tasks, setTasks };
}

export function useWorkoutPlan() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(() => read<WorkoutPlan | null>(KEYS.workout, null));
  useEffect(() => { write(KEYS.workout, plan); }, [plan]);
  return { plan, setPlan };
}

export function useDietPlan() {
  const [plan, setPlan] = useState<DietPlan | null>(() => read<DietPlan | null>(KEYS.diet, null));
  useEffect(() => { write(KEYS.diet, plan); }, [plan]);
  return { plan, setPlan };
}

// Chat history is scoped per user so every signed-in user gets a fresh
// conversation. Guests share an anonymous bucket that resets on sign-in.
export function useChatHistory() {
  const [userId, setUserId] = useState<string | null>(null);
  const keyFor = (uid: string | null) => (uid ? `${KEYS.chat}_${uid}` : `${KEYS.chat}_guest`);
  const [messages, setMessages] = useState<ChatMessage[]>(() => read<ChatMessage[]>(keyFor(null), []));

  useEffect(() => {
    let cancelled = false;
    const apply = (uid: string | null) => {
      if (cancelled) return;
      setUserId(uid);
      setMessages(read<ChatMessage[]>(keyFor(uid), []));
    };
    supabase.auth.getSession().then(({ data: { session } }) => apply(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      // Fresh chat on every new sign-in.
      if (event === "SIGNED_IN" && uid) {
        try { localStorage.removeItem(keyFor(uid)); } catch { /* noop */ }
      }
      if (event === "SIGNED_OUT") {
        try { localStorage.removeItem(keyFor("guest" as unknown as string)); } catch { /* noop */ }
      }
      apply(uid);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { write(keyFor(userId), messages); }, [messages, userId]);
  return { messages, setMessages };
}

export type { Profile, Task, Health, WorkoutPlan, DietPlan, ChatMessage };
