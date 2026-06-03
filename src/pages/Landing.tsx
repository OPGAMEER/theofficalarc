import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HERO_BG = "https://images.pexels.com/photos/4498603/pexels-photo-4498603.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1100&w=900";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

  const continueAsGuest = () => {
    try { localStorage.setItem("arc_guest", "1"); } catch {}
    navigate("/onboarding", { replace: true });
  };

  return (
    <div className="theme-dark relative min-h-screen w-full bg-background overflow-hidden flex justify-center">
      <div className="relative w-full max-w-md min-h-screen overflow-hidden">
        {/* photo backdrop */}
        <img
          src={HERO_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(2px) grayscale(40%)" }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/85 to-transparent" />

        {/* rotating arc deco */}
        <div className="absolute -right-44 top-8 opacity-60 animate-spin-slow pointer-events-none">
          <svg width="520" height="520" viewBox="0 0 200 200">
            <path d="M 100,10 A 90,90 0 1 1 99.999,10" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" fill="none" />
            <path d="M 100,10 A 90,90 0 0 1 190,100" stroke="hsl(var(--accent))" strokeWidth="1.6" fill="none" />
          </svg>
        </div>

        <div className="relative flex flex-col justify-between min-h-screen px-6 pt-6 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <span className="mono-label-strong text-[#D4D4D8]">EST · 2026</span>
            <div className="flex items-center gap-2">
              <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
              <span className="mono-label-strong text-[#D4D4D8]">{dateStr}</span>
            </div>
          </div>

          {/* Hero */}
          <div className="animate-fade-up flex flex-col gap-4">
            <span className="mono-label-strong text-[#D4D4D8]">A WELLNESS INSTRUMENT</span>
            <div className="flex items-end gap-2">
              <h1
                className="hero-text text-white"
                style={{ fontSize: "clamp(120px,38vw,180px)", letterSpacing: "-0.08em", lineHeight: 0.85 }}
              >
                Arc
              </h1>
              <span className="mb-4 block w-4 h-4 bg-[hsl(var(--accent))]" />
            </div>
            <p className="text-white text-lg leading-relaxed max-w-xs">
              Train. Eat. Plan.
              <br />
              <span className="text-[#A1A1AA]">One quiet curve toward the person you intend to be.</span>
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => navigate("/auth")}
              className="flex items-center justify-center gap-3 bg-white text-black py-5 px-6 arc-tr active:opacity-80"
            >
              <span className="font-mono text-[13px] tracking-[0.3em] font-semibold">SIGN IN / SIGN UP</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={continueAsGuest}
              className="flex items-center justify-center gap-3 border border-white/30 text-white py-4 px-6 arc-tr active:opacity-80"
            >
              <span className="font-mono text-[12px] tracking-[0.3em] font-semibold">CONTINUE WITHOUT SIGN IN</span>
              <ArrowRight size={14} />
            </button>

            <p className="mono-label text-[#A1A1AA] text-center pt-3">
              Sign in to sync across devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
