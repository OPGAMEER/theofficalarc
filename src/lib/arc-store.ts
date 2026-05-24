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

const DEFAULT_PROFILE: Profile = {
  name: "",
  handle: "",
  level: 1,
  xp: 0,
  streak: 0,
};

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function write<T>(k: string, v: T) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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

export function useChatHistory() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => read<ChatMessage[]>(KEYS.chat, []));
  useEffect(() => { write(KEYS.chat, messages); }, [messages]);
  return { messages, setMessages };
}

export type { Profile, Task, Health, WorkoutPlan, DietPlan, ChatMessage };
