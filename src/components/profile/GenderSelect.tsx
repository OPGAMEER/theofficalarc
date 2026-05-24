import { useRef, useState, type KeyboardEvent } from "react";
import { User, UserRound, Users, type LucideIcon } from "lucide-react";

type Option = { value: string; label: string; Icon: LucideIcon };

const OPTIONS: Option[] = [
  { value: "MALE",   label: "MALE",   Icon: User },
  { value: "FEMALE", label: "FEMALE", Icon: UserRound },
  { value: "OTHER",  label: "OTHER",  Icon: Users },
];

export default function GenderSelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const [pulseKey, setPulseKey] = useState<string>("");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentIdx = Math.max(
    0,
    OPTIONS.findIndex((o) => o.value === (value ?? "").toUpperCase())
  );

  const select = (idx: number) => {
    const opt = OPTIONS[idx];
    onChange(opt.value);
    setPulseKey(opt.value);
    window.setTimeout(() => setPulseKey(""), 450);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let next = currentIdx;
    if (e.key === "ArrowRight") next = (currentIdx + 1) % OPTIONS.length;
    if (e.key === "ArrowLeft")  next = (currentIdx - 1 + OPTIONS.length) % OPTIONS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End")  next = OPTIONS.length - 1;
    select(next);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <span id="gender-label" className="mono-label">GENDER</span>
      <div
        role="radiogroup"
        aria-labelledby="gender-label"
        onKeyDown={onKeyDown}
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map(({ value: v, label, Icon }, i) => {
          const active = i === currentIdx && (value ?? "").toUpperCase() === v;
          const pulsing = pulseKey === v;
          return (
            <button
              key={v}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Gender ${label.toLowerCase()}`}
              tabIndex={active || (currentIdx === 0 && !value) ? 0 : -1}
              onClick={() => select(i)}
              className={[
                "group relative overflow-hidden border px-3 py-4 flex flex-col items-center justify-center gap-2",
                "transition-all duration-300 ease-out will-change-transform",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_8px_24px_-12px_hsl(var(--accent)/0.6)]",
                active
                  ? "bg-text text-text-inverse border-text motion-safe:scale-[1.02]"
                  : "border-border text-text hover:border-text",
              ].join(" ")}
            >
              {/* ripple */}
              <span
                aria-hidden
                className={[
                  "pointer-events-none absolute inset-0 rounded-sm motion-reduce:hidden",
                  pulsing ? "motion-safe:animate-[gender-ripple_0.45s_ease-out]" : "",
                ].join(" ")}
                style={{
                  background:
                    "radial-gradient(circle at center, hsl(var(--accent)/0.45), transparent 60%)",
                  opacity: pulsing ? 1 : 0,
                }}
              />
              {/* sweep on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-y-2 -left-1/2 w-1/2 rotate-12 bg-[hsl(var(--accent)/0.18)] blur-md opacity-0 motion-safe:group-hover:opacity-100 motion-safe:group-hover:translate-x-[300%] transition-all duration-700 motion-reduce:hidden"
              />
              <Icon
                size={22}
                aria-hidden
                className={[
                  "transition-transform duration-300",
                  active
                    ? "motion-safe:scale-110"
                    : "motion-safe:group-hover:scale-110 motion-safe:group-hover:rotate-[-6deg]",
                ].join(" ")}
              />
              <span className="font-mono text-[10px] tracking-[0.25em]">{label}</span>
              {active && (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[hsl(var(--accent))] motion-safe:animate-[gender-bar_0.4s_ease-out]"
                />
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes gender-ripple {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes gender-bar {
          0%   { transform: translateX(-50%) scaleX(0); }
          100% { transform: translateX(-50%) scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-gender-anim] { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}
