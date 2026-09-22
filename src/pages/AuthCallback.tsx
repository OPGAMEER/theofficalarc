import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchProfile } from "@/lib/profile-sync";

/**
 * Handles the Google OAuth return. Works with both PKCE (`?code=`) and the
 * implicit hash flow, waits for the session to be written to storage, and then
 * sends the user to onboarding (new) or the app (returning) — never back to /auth
 * once a session exists.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const done = useRef(false);
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    let cancelled = false;

    const go = async (userId: string) => {
      if (done.current) return;
      done.current = true;
      try { localStorage.removeItem("arc_guest"); } catch { /* noop */ }

      let onboarded = false;
      try { onboarded = localStorage.getItem(`arc_onboarded_${userId}`) === "1"; } catch { /* noop */ }
      if (!onboarded) {
        const p = await fetchProfile(userId);
        onboarded = !!(p && (p.onboarded || (p.name && p.age && p.sex && p.goal)));
        if (onboarded) {
          try { localStorage.setItem(`arc_onboarded_${userId}`, "1"); } catch { /* noop */ }
        }
      }
      // clean the OAuth params out of the URL so a refresh can't replay them
      window.history.replaceState({}, "", "/auth/callback");
      navigate(onboarded ? "/" : "/onboarding", { replace: true });
    };

    const run = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const errorDescription = url.searchParams.get("error_description") || hash.get("error_description");
      const code = url.searchParams.get("code");

      if (errorDescription) {
        if (!cancelled) setMessage("Sign-in was cancelled. Taking you back...");
        setTimeout(() => navigate("/auth", { replace: true }), 1200);
        return;
      }

      if (code) {
        try { await supabase.auth.exchangeCodeForSession(code); } catch { /* handled by polling below */ }
      }

      // poll briefly: detectSessionInUrl may still be finishing the exchange
      for (let i = 0; i < 25 && !cancelled && !done.current; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await go(data.session.user.id);
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!cancelled && !done.current) {
        setMessage("Couldn't complete sign-in. Taking you back...");
        setTimeout(() => navigate("/auth", { replace: true }), 1200);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void go(session.user.id);
    });

    void run();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center text-sm font-medium text-foreground">
      {message}
    </div>
  );
}
