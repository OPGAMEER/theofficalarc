import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const wordCycle = ["MOVE.", "EAT.", "FOCUS.", "BECOME ARC."];

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);

  // Motion values avoid re-rendering the whole tree on every pointer move
  const px = useMotionValue(50);
  const py = useMotionValue(50);
  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${px}% ${py}%, hsl(var(--primary) / 0.18), transparent 70%)`;

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % wordCycle.length), 1800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    let nx = 50, ny = 50;
    const onMove = (e: PointerEvent) => {
      nx = (e.clientX / (window.innerWidth || 1)) * 100;
      ny = (e.clientY / (window.innerHeight || 1)) * 100;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          px.set(nx);
          py.set(ny);
          raf = 0;
        });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [px, py]);

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: String(error), variant: "destructive" });
      setLoading(false);
    }
  };

  // Particle ring positions for burst
  const burstParticles = Array.from({ length: 18 }, (_, i) => {
    const angle = (i / 18) * Math.PI * 2;
    return { x: Math.cos(angle) * 180, y: Math.sin(angle) * 180, i };
  });

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Pointer-tracking spotlight */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: spotlight }}
      />

      {/* Big animated orbs */}
      <motion.div
        aria-hidden
        className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-primary/30 blur-3xl"
        animate={{ x: [0, 40, -30, 0], y: [0, -30, 40, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-40 -left-20 h-[380px] w-[380px] rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, -40, 30, 0], y: [0, 40, -30, 0], scale: [1, 0.85, 1.15, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-1/3 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating conic gradient ring */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full opacity-30"
        style={{
          background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.6), transparent, hsl(var(--primary) / 0.4), transparent)",
          maskImage: "radial-gradient(closest-side, transparent 60%, black 62%, black 70%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(closest-side, transparent 60%, black 62%, black 70%, transparent 72%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating sparkles */}
      {[...Array(14)].map((_, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute h-1 w-1 rounded-full bg-primary/70"
          style={{ left: `${(i * 13 + 7) % 100}%`, top: `${(i * 23 + 11) % 100}%` }}
          animate={{ y: [-14, 14, -14], opacity: [0.15, 1, 0.15], scale: [0.4, 1.6, 0.4] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
        />
      ))}

      {/* Scanlines */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        animate={{ y: ["-10%", "110vh"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      />


      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="relative h-9 w-9 border border-foreground arc-corner overflow-hidden"
              whileHover={{ rotate: 90, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <motion.div
                className="absolute inset-0 bg-primary"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="absolute inset-[3px] arc-corner border border-background" />
            </motion.div>
            <span className="text-lg font-bold tracking-[0.2em]">ARC</span>
          </div>
          <motion.span
            className="text-[10px] tracking-[0.3em] text-muted-foreground"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            EST · 2025
          </motion.span>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.6 }} className="mb-6">
          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance text-5xl font-black leading-[0.95] tracking-tight"
            >
              YOUR DAILY<br />
              <span className="inline-flex items-baseline gap-2">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIdx}
                    initial={{ y: 30, opacity: 0, rotateX: -90 }}
                    animate={{ y: 0, opacity: 1, rotateX: 0 }}
                    exit={{ y: -30, opacity: 0, rotateX: 90 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="text-primary inline-block"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {wordCycle[wordIdx]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.h1>
          </div>
        </motion.div>

        <motion.section
          layout
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative border border-foreground bg-card/80 backdrop-blur-xl p-6 arc-corner noise overflow-hidden"
          whileHover={{ scale: 1.01 }}
        >
          {/* Animated corner accents */}
          <motion.div
            className="pointer-events-none absolute -top-px -right-px h-12 w-12 border-l border-b border-primary arc-corner"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute -bottom-px -left-px h-12 w-12 border-r border-t border-primary arc-corner"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 1.25 }}
          />

          {/* Sweep shimmer */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
          />

          <motion.p
            className="mb-5 flex items-center justify-center gap-2 text-[11px] tracking-[0.25em] text-muted-foreground"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Sparkles className="h-3 w-3 text-primary" />
            SIGN IN TO CONTINUE
            <Sparkles className="h-3 w-3 text-primary" />
          </motion.p>

          <motion.button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            whileHover={{ scale: 1.03, y: -3 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="group relative w-full overflow-hidden border border-foreground bg-background py-3.5 px-4 flex items-center justify-center gap-3 transition-colors hover:bg-foreground hover:text-background disabled:opacity-60"
          >

            {/* Hover sweep */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-primary/25"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.6 }}
            />


            <AnimatePresence mode="wait">
              {loading ? (
                <motion.span
                  key="load"
                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="relative z-10"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.span>
              ) : (
                <motion.span
                  key="g"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  className="relative z-10"
                >
                  <GoogleIcon className="h-4 w-4" />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="relative z-10 text-sm font-semibold tracking-wide">
              {loading ? "Connecting…" : "Continue with Google"}
            </span>
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-5 text-center text-[10px] tracking-[0.2em] text-muted-foreground/70"
          >
            BY CONTINUING YOU AGREE TO ARC TERMS
          </motion.p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-auto pt-8 flex items-center justify-center gap-2 text-[10px] tracking-[0.3em] text-muted-foreground"
        >
          <motion.span
            className="block h-1 w-1 rounded-full bg-primary"
            animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          SECURED BY GOOGLE
        </motion.div>
      </div>
    </main>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-1.7 4.1-5.4 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.1-1.5H12z"/>
    </svg>
  );
}
