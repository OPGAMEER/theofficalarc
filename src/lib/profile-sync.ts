import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/arc-store";

export type RemoteProfile = {
  id: string;
  name: string | null;
  handle: string | null;
  age: number | null;
  sex: string | null;
  goal: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak: number;
  last_streak_date: string | null;
  onboarded: boolean;
};

export async function fetchProfile(userId: string): Promise<RemoteProfile | null> {
  const { data, error } = await supabase
    .from("profiles" as any)
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[profile] fetch error", error);
    return null;
  }
  return (data as unknown) as RemoteProfile | null;
}

export async function upsertProfile(userId: string, patch: Partial<RemoteProfile>) {
  const { error } = await supabase
    .from("profiles" as any)
    .upsert({ id: userId, ...patch } as any, { onConflict: "id" });
  if (error) {
    console.warn("[profile] upsert error", error);
    return { ok: false as const, error };
  }
  return { ok: true as const };
}

export function remoteToLocal(r: RemoteProfile): Profile {
  return {
    name: r.name || "",
    handle: r.handle || "",
    age: r.age ?? undefined,
    sex: r.sex ?? undefined,
    goal: r.goal ?? undefined,
    avatar_url: r.avatar_url ?? undefined,
    level: r.level ?? 1,
    xp: r.xp ?? 0,
    streak: r.streak ?? 0,
  };
}
