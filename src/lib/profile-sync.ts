import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/arc-store";
import { withTimeout } from "@/lib/resilient-actions";

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
  try {
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase
          .from("profiles" as any)
          .select("*")
          .eq("id", userId)
          .maybeSingle() as any,
      ) as Promise<{ data: unknown; error: unknown }>,
      2500,
      "Profile fetch",
    );
    if (error) {
      console.warn("[profile] fetch error", error);
      return null;
    }
    return (data as unknown) as RemoteProfile | null;
  } catch (error) {
    console.warn("[profile] fetch unavailable", error);
    return null;
  }
}

export async function upsertProfile(userId: string, patch: Partial<RemoteProfile>) {
  try {
    const { error } = await withTimeout(
      Promise.resolve(
        supabase
          .from("profiles" as any)
          .upsert({ id: userId, ...patch } as any, { onConflict: "id" }) as any,
      ) as Promise<{ error: unknown }>,
      2500,
      "Profile save",
    );
    if (error) {
      console.warn("[profile] upsert error", error);
      return { ok: false as const, error };
    }
    return { ok: true as const };
  } catch (error) {
    console.warn("[profile] upsert unavailable", error);
    return { ok: false as const, error };
  }
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
