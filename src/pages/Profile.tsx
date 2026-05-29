import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight, Check, Share2, Flame, X, Lock, Target, Dumbbell, Heart, Brain, Download, ImageIcon, Loader2, MessageCircle, Facebook, Instagram, Send } from "lucide-react";
import { useArcTheme, type ThemeKey } from "@/contexts/ThemeContext";
import { useProfile } from "@/lib/arc-store";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";
import GenderSelect from "@/components/profile/GenderSelect";
import AgeSlider from "@/components/profile/AgeSlider";
import { getGroqKey, setGroqKey, clearGroqKey } from "@/lib/groq";


const THEMES: { key: ThemeKey; label: string }[] = [
  { key: "LIGHT",  label: "LIGHT" },
  { key: "DARK",   label: "DARK" },
  { key: "INDIGO", label: "INDIGO" },
  { key: "VIOLET", label: "VIOLET" },
];

const GOALS = [
  { key: "LOSE_WEIGHT",  label: "Lose weight",   Icon: Flame },
  { key: "BUILD_MUSCLE", label: "Build muscle",  Icon: Dumbbell },
  { key: "STAY_FIT",     label: "Stay fit",      Icon: Heart },
  { key: "FOCUS",        label: "Focus",         Icon: Brain },
];

export default function Profile() {
  const { profile, setProfile } = useProfile();
  const { theme, setTheme } = useArcTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [groqKeyInput, setGroqKeyInput] = useState<string>(() => getGroqKey());
  const [showGroqKey, setShowGroqKey] = useState(false);


  const xpInLevel = profile.xp % 100;
  const isAuthed = !!user;          // Google OR email/password
  const canEditName = isAuthed;     // both Google and email/password — guests cannot

  const save = () => {
    setProfile(draft);
    setSaved(true);
    toast.success("Profile saved");
    window.setTimeout(() => { setSaved(false); setEditing(false); }, 900);
  };

  const handleSignOut = async () => {
    if (user) await signOut();
    localStorage.removeItem("arc_guest");
    navigate("/landing", { replace: true });
  };

  const updateGoal = (g: string) => {
    setProfile({ ...profile, goal: g });
    setDraft(d => ({ ...d, goal: g }));
    localStorage.removeItem("arc_workout");
    localStorage.removeItem("arc_diet");
    window.dispatchEvent(new Event("arc:profile-changed"));
    toast.success("Goal updated", { description: "Plan will refresh." });
    setGoalOpen(false);
  };

  const googleAvatar = (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined;
  const displayName = profile.name || (user?.user_metadata?.full_name as string) || (user?.email?.split("@")[0]) || "Guest";
  const initial = (displayName || "A").slice(0, 1).toUpperCase();

  return (
    <div className="px-6 pt-6 pb-24 animate-fade-up">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="mono-label-strong">05 · PROFILE</span>
        <div className="flex items-center gap-4">
          <button onClick={() => setShareOpen(true)} aria-label="Share profile" className="mono-label-strong flex items-center gap-1.5">
            <Share2 size={14} /> SHARE
          </button>
          <button onClick={() => setEditing(e => !e)} className="mono-label-strong">{editing ? "DONE" : "EDIT"}</button>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-text flex items-center justify-center ring-2 ring-border">
          {googleAvatar ? (
            <img src={googleAvatar} alt={`${displayName} profile picture`} className="w-full h-full object-cover" referrerPolicy="no-referrer"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span className="hero-text text-text-inverse" style={{ fontSize: 48 }}>{initial}</span>
          )}
        </div>
        {editing ? (
          canEditName ? (
            <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="text-center bg-transparent border-b border-text outline-none hero-text" style={{ fontSize: 32 }} />
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="hero-text text-text" style={{ fontSize: 36 }}>{displayName}</h2>
              <Lock size={16} className="text-text-muted" />
            </div>
          )
        ) : (
          <h2 className="hero-text text-text" style={{ fontSize: 36 }}>{displayName}</h2>
        )}
        <span className="mono-label">{profile.handle || "@arc"}</span>

        {/* Goal pill — tap to change */}
        <button onClick={() => setGoalOpen(true)}
          className="mt-1 inline-flex items-center gap-1.5 border border-border px-3 py-1 mono-label hover:border-text transition-colors">
          <Target size={12} className="text-[hsl(var(--accent))]" />
          GOAL · {String(profile.goal || "—").replace(/_/g, " ")}
        </button>

        {/* Streak chip */}
        <div className="mt-2 inline-flex items-center gap-1.5 border border-border px-3 py-1">
          <motion.span initial={{ scale: 0.8 }} animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <Flame size={14} className="text-[hsl(var(--accent))]" />
          </motion.span>
          <span className="mono-num text-text">{profile.streak ?? 0}</span>
          <span className="mono-label">DAY STREAK</span>
        </div>
      </div>

      {/* Level / XP */}
      <div className="mt-12">
        <div className="flex justify-between items-end">
          <div>
            <div className="mono-label">LEVEL</div>
            <div className="mono-num text-[hsl(var(--accent))]" style={{ fontSize: 80, lineHeight: 1 }}>{String(profile.level).padStart(2,"0")}</div>
          </div>
          <div className="text-right">
            <div className="mono-label">XP</div>
            <div className="mono-num text-text" style={{ fontSize: 32 }}>{profile.xp}</div>
            <div className="mono-label">/ {profile.level*100}</div>
          </div>
        </div>
        <div className="mt-5 h-0.5 bg-divider w-full">
          <div className="h-full bg-[hsl(var(--accent))]" style={{ width: `${xpInLevel}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-10 grid grid-cols-3 border-t border-l border-border">
        {[["STREAK", profile.streak], ["LEVEL",  profile.level], ["XP",     profile.xp]].map(([l,v]) => (
          <div key={l as string} className="border-r border-b border-border p-4">
            <div className="mono-label text-[9px]">{l}</div>
            <div className="mono-num text-text" style={{ fontSize: 22 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Always-visible gender + age */}
      <div className="mt-10 flex flex-col gap-5">
        <GenderSelect value={profile.sex} onChange={(v) => {
          setProfile({ ...profile, sex: v });
          setDraft({ ...profile, sex: v });
          localStorage.removeItem("arc_workout");
          window.dispatchEvent(new Event("arc:profile-changed"));
          toast.success(`Gender set to ${v}`);
        }} />
        <AgeSlider value={profile.age} onChange={(v) => {
          setProfile({ ...profile, age: v });
          setDraft({ ...profile, age: v });
          localStorage.removeItem("arc_workout");
          window.dispatchEvent(new Event("arc:profile-changed"));
        }} />
      </div>

      {editing && (
        <div className="mt-8 flex flex-col gap-5">
          <Field label="HANDLE"   value={draft.handle}   onChange={v => setDraft({ ...draft, handle: v })} />
          <Field label="PRONOUNS" value={draft.pronouns ?? ""} onChange={v => setDraft({ ...draft, pronouns: v })} />
          <button onClick={save} disabled={saved}
            className={["relative overflow-hidden py-4 font-mono text-xs tracking-[0.3em] font-semibold flex items-center justify-center gap-2 border transition-all",
              saved ? "bg-[hsl(var(--accent))] text-text border-[hsl(var(--accent))]"
                    : "bg-inverse text-text-inverse border-inverse hover:-translate-y-0.5 active:scale-[0.99]"].join(" ")}>
            {saved ? (<><Check size={16} /> SAVED</>) : (<>SAVE PROFILE <ArrowRight size={14} /></>)}
          </button>
        </div>
      )}

      {/* Theme */}
      <div className="mt-10">
        <div className="border-b border-text pb-2 flex justify-between items-center">
          <span className="mono-label-strong">THEME</span>
          <span className="mono-label">{theme}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {THEMES.map(({ key, label }) => {
            const active = theme === key;
            return (
              <button key={key} onClick={() => setTheme(key)}
                className={`flex items-center justify-between border px-4 py-3.5 font-mono text-[11px] tracking-[0.2em] ${active ? "bg-text text-text-inverse border-text" : "border-border"}`}>
                <span>{label}</span>
                {active && <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI · Groq API key (stored in browser only) */}
      <div className="mt-10">
        <div className="border-b border-text pb-2 flex justify-between items-center">
          <span className="mono-label-strong">AI · GROQ API KEY</span>
          <span className="mono-label">{getGroqKey() ? "ACTIVE" : "NOT SET"}</span>
        </div>
        <p className="text-text-muted text-xs mt-3 leading-relaxed">
          Paste a Groq API key to power chat, workout, and meal generation directly from your browser. Stored locally only — never sent to Arc servers.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type={showGroqKey ? "text" : "password"}
            value={groqKeyInput}
            onChange={(e) => setGroqKeyInput(e.target.value)}
            placeholder="gsk_..."
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent border border-border outline-none focus:border-text px-3 py-2.5 text-text font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShowGroqKey((v) => !v)}
            className="border border-border px-3 mono-label-strong text-[10px] hover:border-text"
          >
            {showGroqKey ? "HIDE" : "SHOW"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setGroqKey(groqKeyInput);
              toast.success(groqKeyInput.trim() ? "Groq key saved" : "Groq key cleared");
            }}
            className="border border-text bg-inverse text-text-inverse py-2.5 mono-label-strong text-[11px]"
          >
            SAVE KEY
          </button>
          <button
            type="button"
            onClick={() => {
              clearGroqKey();
              setGroqKeyInput("");
              toast.success("Groq key removed");
            }}
            className="border border-border py-2.5 mono-label-strong text-[11px] hover:border-text"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* Reset profile data — wipes back to defaults */}
      <div className="mt-10">
        <div className="border-b border-text pb-2 mono-label-strong">RESET PROFILE</div>
        <p className="text-text-muted text-xs mt-3 leading-relaxed">
          Wipes name, handle, goal, age, sex, level, XP, streak, cached workouts, meals, and chat history back to defaults. Cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm("Reset all profile data to defaults?")) return;
            const blank = {
              name: "",
              handle: "",
              age: undefined,
              sex: undefined,
              pronouns: undefined,
              goal: undefined,
              avatar_url: undefined,
              level: 1,
              xp: 0,
              streak: 0,
              last_streak_date: undefined,
            } as typeof profile;
            setProfile(blank);
            setDraft(blank);
            [
              "arc_workout","arc_diet","arc_chat","arc_tasks","arc_health",
              "arc_workout_history","arc_diet_history",
            ].forEach((k) => { try { localStorage.removeItem(k); } catch {} });
            window.dispatchEvent(new Event("arc:profile-changed"));
            toast.success("Profile reset to defaults");
          }}
          className="mt-3 w-full border border-destructive text-destructive py-3 mono-label-strong text-[11px] hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          RESET ALL PROFILE DATA
        </button>
      </div>


      {/* Account */}
      <div className="mt-10">
        <div className="border-b border-text pb-2 mono-label-strong">ACCOUNT</div>
        <div className="border-b border-border py-4 flex justify-between items-center">
          <div>
            <div className="text-text">{user ? "Signed in" : "Guest"}</div>
            <div className="text-text-muted text-sm">{user?.email || "no sync"}</div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="mt-10">
        <button onClick={handleSignOut} aria-label="Log out of Arc"
          className="group relative w-full overflow-hidden border border-destructive bg-transparent py-4 px-4 flex items-center justify-center gap-3 font-mono text-xs tracking-[0.3em] font-semibold text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-[0.99]">
          <LogOut size={16} />
          {user ? "LOG OUT" : "EXIT GUEST MODE"}
        </button>
      </div>

      {/* GOAL MODAL */}
      <AnimatePresence>
        {goalOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setGoalOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" />
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
              transition={{ type: "spring", damping: 24 }}
              className="relative w-full max-w-md bg-surface border-t border-border p-6">
              <div className="flex justify-between items-center mb-5">
                <span className="mono-label-strong">CHANGE GOAL</span>
                <button onClick={() => setGoalOpen(false)}><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {GOALS.map(({ key, label, Icon }) => {
                  const active = profile.goal === key;
                  return (
                    <button key={key} onClick={() => updateGoal(key)}
                      className={["flex items-center gap-3 border px-4 py-3 text-left transition-all",
                        active ? "bg-text text-text-inverse border-text" : "border-border hover:border-text"].join(" ")}>
                      <Icon size={18} />
                      <span className="font-mono text-xs tracking-[0.2em] font-semibold flex-1">{label.toUpperCase()}</span>
                      {active && <Check size={16} className="text-[hsl(var(--accent))]" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)}
        name={displayName} handle={profile.handle || "@arc"} streak={profile.streak ?? 0} level={profile.level} />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mono-label">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent border-b border-border outline-none py-2 text-text" />
    </div>
  );
}

function ShareModal({ open, onClose, name, handle, streak, level }:
  { open: boolean; onClose: () => void; name: string; handle: string; streak: number; level: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const cacheRef = useRef<File | null>(null);

  // Resolve --accent to a concrete color so the captured PNG matches the preview
  // exactly across browsers/devices (html-to-image can drop CSS vars otherwise).
  const accent = useMemo(() => {
    if (typeof window === "undefined") return "#ff3366";
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return v ? `hsl(${v})` : "#ff3366";
  }, [open]);

  const renderPng = async (): Promise<{ blob: Blob; file: File } | null> => {
    if (!cardRef.current) return null;
    try {
      // Capture at fixed device size for consistent output everywhere.
      const TARGET = 1080;
      const node = cardRef.current;
      const rect = node.getBoundingClientRect();
      const pixelRatio = TARGET / Math.max(1, rect.width);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio,
        width: rect.width,
        height: rect.width, // square
        canvasWidth: TARGET,
        canvasHeight: TARGET,
        backgroundColor: "#0a0a0a",
        style: { transform: "none" },
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `arc-streak-${streak}d.png`, { type: "image/png" });
      return { blob, file };
    } catch (e) {
      console.error("[share] render error", e);
      toast.error("Couldn't render card. Try again.");
      return null;
    }
  };

  const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://arcfitnessio.app";
  const SHARE_TEXT = `🔥 ${streak}-day streak on Arc · LVL ${level}\n\nDownload Arc and start your streak ASAP 👉 ${APP_URL}\n\n#arcfitnessio`;

  // iOS / Android detection for fallback behavior
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  // Save the rendered PNG to disk so users can attach it manually
  // when a target app doesn't accept image files via deep link.
  const savePngLocally = async (file: File, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyTextToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  };

  const cacheRenderedImage = (file: File) => { cacheRef.current = file; };

  const tryTopNavigation = (url: string) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_top";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch {
      return false;
    }
  };

  const attemptDeepLinkWithFallback = async ({ deepLink, fallback }: { deepLink?: string; fallback: string }) => {
    if (!deepLink || (!isIOS && !isAndroid)) {
      return tryTopNavigation(fallback);
    }

    let hidden = false;
    const markHidden = () => { hidden = true; };
    document.addEventListener("visibilitychange", markHidden, { once: true });
    window.addEventListener("pagehide", markHidden, { once: true });

    tryTopNavigation(deepLink);

    await new Promise((resolve) => window.setTimeout(resolve, 850));
    document.removeEventListener("visibilitychange", markHidden);
    window.removeEventListener("pagehide", markHidden);

    if (!hidden) return tryTopNavigation(fallback);
    return true;
  };

  const openBestPlatformTarget = async (platform: "whatsapp" | "instagram" | "facebook" | "messenger", encoded: string) => {
    if (platform === "whatsapp") {
      return attemptDeepLinkWithFallback({
        deepLink: `whatsapp://send?text=${encoded}`,
        fallback: isIOS || isAndroid ? `https://wa.me/?text=${encoded}` : `https://web.whatsapp.com/send?text=${encoded}`,
      });
    }

    if (platform === "instagram") {
      return attemptDeepLinkWithFallback({
        deepLink: "instagram://library",
        fallback: "https://www.instagram.com/",
      });
    }

    if (platform === "facebook") {
      return attemptDeepLinkWithFallback({
        deepLink: `fb://facewebmodal/f?href=${encodeURIComponent(`https://www.facebook.com/sharer/sharer.php?u=${APP_URL}&quote=${encoded}`)}`,
        fallback: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}&quote=${encoded}`,
      });
    }

    return attemptDeepLinkWithFallback({
      deepLink: `fb-messenger://share?link=${encodeURIComponent(APP_URL)}&app_id=0`,
      fallback: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(APP_URL)}&app_id=0&redirect_uri=${encodeURIComponent(APP_URL)}`,
    });
  };

  const handleSavedPhotoFallback = async (platform: "whatsapp" | "instagram" | "facebook" | "messenger", file: File, blob: Blob) => {
    await savePngLocally(file, blob);
    await copyTextToClipboard(SHARE_TEXT);
    const opened = await openBestPlatformTarget(platform, encodeURIComponent(SHARE_TEXT));
    toast.success("Photo saved + caption copied", {
      description: opened
        ? "Your app is opening now — attach the saved photo and paste the caption."
        : "Open your app, attach the saved photo, then paste the caption.",
    });
  };

  // Native share — primary path (best on iOS/Android, sends as photo file)
  const shareImage = async () => {
    if (busy) return;
    setBusy("share");
    const out = await renderPng();
    if (!out) { setBusy(null); return; }

    const nav = navigator as any;
    if (nav.share && nav.canShare && nav.canShare({ files: [out.file] })) {
      try {
        await nav.share({ files: [out.file], title: "Arc streak", text: SHARE_TEXT });
        cacheRenderedImage(out.file);
        setBusy(null);
        return;
      } catch (e: any) {
        if (e?.name !== "AbortError") console.warn(e);
      }
    }
    // Fallback — save photo + copy caption
    cacheRenderedImage(out.file);
    await savePngLocally(out.file, out.blob);
    await copyTextToClipboard(SHARE_TEXT);
    toast.success("Photo saved + caption copied", {
      description: "Attach the photo and paste the caption.",
    });
    setBusy(null);
  };

  // Platform-specific share — tries Web Share with files first (sends as photo),
  // then falls back to opening the app with the caption pre-filled while the
  // photo is saved to the device so the user can attach it.
  const shareToPlatform = async (
    platform: "whatsapp" | "instagram" | "facebook" | "messenger"
  ) => {
    if (busy) return;
    setBusy(platform);
    const out = await renderPng();
    if (!out) { setBusy(null); return; }

    const nav = navigator as any;

    // 1. Try native share-with-files (iOS/Android Web Share Level 2).
    //    User picks the target app from the system sheet — photo is attached.
    if (nav.share && nav.canShare && nav.canShare({ files: [out.file] })) {
      try {
        await nav.share({ files: [out.file], title: "Arc streak", text: SHARE_TEXT });
        cacheRenderedImage(out.file);
        setBusy(null);
        return;
      } catch (e: any) {
        if (e?.name !== "AbortError") console.warn(e);
      }
    }

    cacheRenderedImage(out.file);
    await handleSavedPhotoFallback(platform, out.file, out.blob);
    setBusy(null);
  };

  const downloadImage = async () => {
    if (busy) return;
    setBusy("dl");
    const out = await renderPng();
    if (!out) { setBusy(null); return; }
    cacheRenderedImage(out.file);
    await savePngLocally(out.file, out.blob);
    toast.success("Saved to downloads.");
    setBusy(null);
  };

  const copyImage = async () => {
    if (busy) return;
    setBusy("copy");
    const out = await renderPng();
    if (!out) { setBusy(null); return; }
    try {
      // @ts-ignore — ClipboardItem may not be in all TS libs
      await navigator.clipboard.write([new ClipboardItem({ "image/png": out.blob })]);
      toast.success("Image copied — paste anywhere.");
    } catch {
      toast.error("Image copy not supported. Use Save instead.");
    }
    setBusy(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div onClick={(e) => e.stopPropagation()}
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="relative w-full max-w-md bg-surface border-t border-border p-6 max-h-[92vh] overflow-auto">
            <div className="flex justify-between items-center mb-5">
              <span className="mono-label-strong">SHARE STREAK</span>
              <button onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>

            {/* The capturable card */}
            <div
              ref={cardRef}
              className="relative overflow-hidden p-7 mb-6"
              style={{
                background: "linear-gradient(135deg, #0a0a0a 0%, #1a0a14 50%, #2a0f1a 100%)",
                color: "#ffffff",
                width: "100%",
                aspectRatio: "1 / 1",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute", top: -40, right: -40, width: 200, height: 200,
                  borderRadius: "50%", background: accent, opacity: 0.35, filter: "blur(50px)",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute", bottom: -50, left: -30, width: 180, height: 180,
                  borderRadius: "50%", background: accent, opacity: 0.2, filter: "blur(60px)",
                }}
              />

              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, background: accent }} />
                  <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.3em", fontWeight: 700 }}>ARC</span>
                </div>
                <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", opacity: 0.6 }}>STREAK CARD</span>
              </div>

              <div style={{ position: "relative", marginTop: 38 }}>
                <Flame size={56} color={accent} fill={accent} />
                <div style={{ fontSize: 110, lineHeight: 0.95, fontWeight: 900, letterSpacing: "-0.04em", marginTop: 8 }}>
                  {streak}
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 12, letterSpacing: "0.3em", opacity: 0.7, marginTop: 4 }}>
                  DAY STREAK 🔥
                </div>
              </div>

              <div style={{
                position: "absolute", left: 28, right: 28, bottom: 26,
                paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.18)",
                display: "flex", justifyContent: "space-between", alignItems: "flex-end",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{name}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, opacity: 0.65 }}>{handle}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.2em", opacity: 0.65 }}>LEVEL</div>
                  <div style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color: accent }}>
                    {String(level).padStart(2, "0")}
                  </div>
                </div>
              </div>
            </div>

            {/* Platform picker */}
            <div className="mb-2 mono-label text-[9px] text-text-muted">SHARE TO</div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <ShareBtn label="WHATSAPP" Icon={MessageCircle} onClick={() => shareToPlatform("whatsapp")} loading={busy === "whatsapp"} accent="#25D366" />
              <ShareBtn label="INSTAGRAM" Icon={Instagram} onClick={() => shareToPlatform("instagram")} loading={busy === "instagram"} accent="#E1306C" />
              <ShareBtn label="FACEBOOK" Icon={Facebook} onClick={() => shareToPlatform("facebook")} loading={busy === "facebook"} accent="#1877F2" />
              <ShareBtn label="MESSENGER" Icon={Send} onClick={() => shareToPlatform("messenger")} loading={busy === "messenger"} accent="#0084FF" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ShareBtn label="MORE" Icon={Share2} onClick={shareImage} loading={busy === "share"} primary />
              <ShareBtn label="SAVE" Icon={Download} onClick={downloadImage} loading={busy === "dl"} />
              <ShareBtn label="COPY" Icon={ImageIcon} onClick={copyImage} loading={busy === "copy"} />
            </div>
            <p className="mono-label text-[9px] text-text-muted mt-3 text-center">
              PHOTO + #ARCFITNESSIO CAPTION
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShareBtn({ label, Icon, onClick, loading, primary, accent }:
  { label: string; Icon: any; onClick: () => void; loading?: boolean; primary?: boolean; accent?: string }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={onClick} disabled={loading}
      style={accent ? { color: accent, borderColor: accent } : undefined}
      className={`border py-3 px-2 font-mono text-[10px] tracking-[0.2em] font-semibold flex flex-col items-center gap-1.5 transition disabled:opacity-60 ${
        primary ? "bg-text text-text-inverse border-text" : accent ? "" : "border-border hover:border-text"
      }`}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </motion.button>
  );
}
