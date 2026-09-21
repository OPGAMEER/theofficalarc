import { NavLink, useLocation, Navigate } from "react-router-dom";
import { Home, UtensilsCrossed, Dumbbell, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile } from "@/lib/profile-sync";

const PUBLIC_ROUTES = new Set(["/auth", "/auth/callback", "/landing"]);
const APP_ROUTES = new Set(["/", "/diet", "/workout", "/profile", "/chat", "/history"]);

const TABS = [
  { to: "/", icon: Home, key: "home", label: "Home" },
  { to: "/diet", icon: UtensilsCrossed, key: "diet", label: "Meal" },
  { to: "/workout", icon: Dumbbell, key: "workout", label: "Workout" },
  
  { to: "/profile", icon: User, key: "profile", label: "Profile" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const isPublic = PUBLIC_ROUTES.has(pathname);
  const isAppRoute = APP_ROUTES.has(pathname);
  const isOnboarding = pathname === "/onboarding";
  const hideNav = isPublic || isOnboarding || pathname === "/chat";
  const isGuest = (() => {
    try { return typeof window !== "undefined" && localStorage.getItem("arc_guest") === "1"; }
    catch { return false; }
  })();
  const getCachedOnboarded = (userId: string) => {
    try { return typeof window !== "undefined" && localStorage.getItem(`arc_onboarded_${userId}`) === "1"; }
    catch { return false; }
  };
  const getCachedGuestOnboarded = () => {
    try {
      if (localStorage.getItem("arc_guest_onboarded") === "1") return true;
      const p = JSON.parse(localStorage.getItem("arc_profile") || "null");
      return !!(p?.name && p?.age && p?.sex && p?.goal);
    } catch { return false; }
  };

  // onboarded flag fetched from Supabase (cross-device)
  const [onboardedKnown, setOnboardedKnown] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [onboardedUserId, setOnboardedUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setOnboardedKnown(false); setOnboarded(false); setOnboardedUserId(null); return; }

    const cacheKey = `arc_onboarded_${user.id}`;
    const hasLocalOnboardingCache = () => getCachedOnboarded(user.id);
    const cachedOnboarded = hasLocalOnboardingCache();
    setOnboardedUserId(user.id);
    setOnboarded(cachedOnboarded);
    setOnboardedKnown(cachedOnboarded);

    const refresh = () => {
      const cachedBeforeFetch = hasLocalOnboardingCache();
      if (cachedBeforeFetch) {
        setOnboardedUserId(user.id);
        setOnboarded(true);
        setOnboardedKnown(true);
      }
      fetchProfile(user.id).then(async (p) => {
        if (cancelled) return;
        const cachedAfterFetch = hasLocalOnboardingCache();
        const hasEssentials = !!(p && p.name && p.age && p.sex && p.goal);
        const flagged = !!p?.onboarded;
        const isOnboarded = !p ? cachedAfterFetch : (flagged || hasEssentials || cachedAfterFetch);
        try {
          const diag = { ts: Date.now(), profile: p, hasEssentials, flagged, cachedAfterFetch, isOnboarded };
          sessionStorage.setItem("arc_onboarding_diag", JSON.stringify(diag));
        } catch {}
        if (p && !flagged && isOnboarded) {
          try {
            const { upsertProfile } = await import("@/lib/profile-sync");
            await upsertProfile(user.id, { onboarded: true });
          } catch {}
        }
        try {
          if (isOnboarded) localStorage.setItem(cacheKey, "1");
          else localStorage.removeItem(cacheKey);
        } catch {}
        setOnboarded(isOnboarded);
        setOnboardedKnown(true);
        setOnboardedUserId(user.id);
      });
    };
    refresh();
    const onChanged = () => refresh();
    window.addEventListener("arc:profile-changed", onChanged);
    return () => { cancelled = true; window.removeEventListener("arc:profile-changed", onChanged); };
  }, [user?.id]);

  if (!loading && !user && !isGuest && !isPublic && !isAppRoute) {
    return <Navigate to="/landing" replace />;
  }

  const effectiveOnboarded = isAppRoute ? true : user ? onboarded || getCachedOnboarded(user.id) : isGuest ? getCachedGuestOnboarded() : false;

  if (!loading && (user || isGuest) && !isPublic && !isOnboarding) {
    if (user && (!onboardedKnown || onboardedUserId !== user.id)) {
      return null;
    }
    if (!effectiveOnboarded) {
      try {
        const n = Number(sessionStorage.getItem("arc_onboarding_redirects") || "0") + 1;
        sessionStorage.setItem("arc_onboarding_redirects", String(n));
        sessionStorage.setItem("arc_onboarding_last_from", pathname);
      } catch {}
      return <Navigate to="/onboarding" replace />;
    }
  }

  if (!loading && (user || isGuest) && isOnboarding && (!user || onboardedUserId === user.id) && effectiveOnboarded) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-background text-text flex justify-center">
      <div className="relative w-full max-w-md min-h-screen bg-background flex flex-col">
        <main className="flex-1 pb-20">{children}</main>
        {!hideNav && <TabBar />}
      </div>
    </div>
  );
}

function TabBar() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface border-t border-border z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around h-[68px]">
        {TABS.map(({ to, icon: Icon, key, label }) => (
          <li key={key} className="flex-1">
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center h-full gap-1 transition-colors ${
                  isActive ? "text-text" : "text-text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={1.75} />
                  <span className={`text-[10px] tracking-[0.12em] font-medium ${isActive ? "text-text" : "text-text-muted"}`}>
                    {label}
                  </span>
                  <span className="block w-1 h-0.5" style={{ background: isActive ? "hsl(var(--accent))" : "transparent" }} />
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
