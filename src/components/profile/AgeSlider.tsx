import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

const MIN = 10;
const MAX = 99;

function clamp(n: number) {
  if (!Number.isFinite(n)) return MIN;
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

export default function AgeSlider({
  value,
  onChange,
}: {
  value?: number;
  onChange: (v: number) => void;
}) {
  const safe = clamp(typeof value === "number" ? value : 25);
  const [dragging, setDragging] = useState(false);
  const [bump, setBump] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const pct = ((safe - MIN) / (MAX - MIN)) * 100;

  useEffect(() => {
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 220);
    return () => window.clearTimeout(t);
  }, [safe]);

  const setFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const next = clamp(MIN + ratio * (MAX - MIN));
    if (next !== safe) onChange(next);
  };

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragging(false);
  };

  // Keyboard
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = safe;
    if (e.key === "ArrowRight" || e.key === "ArrowUp")   next = clamp(safe + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clamp(safe - 1);
    else if (e.key === "PageUp")   next = clamp(safe + 5);
    else if (e.key === "PageDown") next = clamp(safe - 5);
    else if (e.key === "Home") next = MIN;
    else if (e.key === "End")  next = MAX;
    else return;
    e.preventDefault();
    if (next !== safe) onChange(next);
  };

  // Numeric input with validation
  const [text, setText] = useState(String(safe));
  useEffect(() => { if (!dragging) setText(String(safe)); }, [safe, dragging]);
  const commitText = () => {
    const n = parseInt(text, 10);
    if (Number.isFinite(n)) onChange(clamp(n));
    else setText(String(safe));
  };

  const valid = safe >= MIN && safe <= MAX;

  return (
    <div>
      <div className="flex items-end justify-between">
        <label htmlFor={id} className="mono-label">AGE</label>
        <input
          aria-label="Age numeric input"
          inputMode="numeric"
          pattern="[0-9]*"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          onBlur={commitText}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-14 bg-transparent border-b border-border outline-none text-right py-1 mono-num text-text focus:border-text"
        />
      </div>

      <div className="mt-3 border border-border p-4">
        {/* Pill that follows thumb */}
        <div className="relative h-12">
          <div
            aria-hidden
            className={[
              "absolute -top-1 -translate-x-1/2 px-3 py-1 bg-text text-text-inverse",
              "font-mono text-xs tracking-[0.2em] shadow-[0_4px_12px_-4px_hsl(var(--accent)/0.5)]",
              "motion-safe:transition-[left,transform] motion-safe:duration-150 motion-safe:ease-out",
              dragging ? "motion-safe:scale-110" : "",
              bump && !dragging ? "motion-safe:animate-[age-pop_0.22s_ease-out]" : "",
            ].join(" ")}
            style={{ left: `${pct}%` }}
          >
            {safe}
            <span
              aria-hidden
              className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-text rotate-45"
            />
          </div>
        </div>

        {/* Track */}
        <div
          id={id}
          ref={trackRef}
          role="slider"
          aria-label="Age"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={safe}
          aria-invalid={!valid}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={onKey}
          className="relative h-8 cursor-pointer touch-none focus-visible:outline-none"
        >
          {/* base rail */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-divider" />
          {/* fill */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[hsl(var(--accent))] motion-safe:transition-[width] motion-safe:duration-150"
            style={{ width: `${pct}%` }}
          />
          {/* ticks */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5 pointer-events-none">
            {[10, 25, 40, 55, 70, 85, 99].map((t) => {
              const active = safe >= t;
              return (
                <span
                  key={t}
                  className={[
                    "block w-px h-2",
                    active ? "bg-text" : "bg-border",
                  ].join(" ")}
                />
              );
            })}
          </div>
          {/* thumb */}
          <div
            aria-hidden
            className={[
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-text border-2 border-background",
              "shadow-[0_2px_8px_hsl(var(--accent)/0.6)]",
              "motion-safe:transition-[left,transform] motion-safe:duration-150 motion-safe:ease-out",
              dragging ? "motion-safe:scale-125" : "motion-safe:hover:scale-110",
              "ring-2 ring-transparent group-focus-visible:ring-[hsl(var(--accent))]",
            ].join(" ")}
            style={{ left: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between mono-label opacity-60">
          <span>{MIN}</span>
          <span>{MAX}</span>
        </div>
      </div>

      {!valid && (
        <p className="mt-1 text-[11px] text-[hsl(var(--destructive))] font-mono">
          AGE MUST BE BETWEEN {MIN} AND {MAX}
        </p>
      )}

      <style>{`
        @keyframes age-pop {
          0%   { transform: translateX(-50%) scale(1); }
          50%  { transform: translateX(-50%) scale(1.18); }
          100% { transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
