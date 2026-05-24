// Lightweight in-browser pedometer using DeviceMotion accelerometer.
// Counts steps via peak detection on the magnitude of linear acceleration.
// Persists today's steps to localStorage so reloads don't reset the count.

type Listener = (steps: number) => void;

const STORAGE_KEY = "arc.pedometer.v1";

interface DayState {
  date: string; // YYYY-MM-DD
  steps: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): DayState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DayState;
      if (parsed?.date === todayKey()) return parsed;
    }
  } catch {}
  return { date: todayKey(), steps: 0 };
}

function saveState(s: DayState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

class Pedometer {
  private state: DayState = loadState();
  private listeners = new Set<Listener>();
  private running = false;
  private handler: ((e: DeviceMotionEvent) => void) | null = null;

  // Peak-detection state
  private lastMag = 0;
  private lastPeakTs = 0;
  private rising = false;
  // Tunable thresholds — calibrated for a phone in a pocket / hand.
  // Magnitude is in m/s^2; gravity ≈ 9.81. We look at delta from gravity.
  private readonly THRESHOLD = 1.2;       // min spike above baseline
  private readonly MIN_STEP_MS = 280;     // anti-double-count (max ~3.5 steps/s)

  get steps(): number {
    if (this.state.date !== todayKey()) {
      this.state = { date: todayKey(), steps: 0 };
      saveState(this.state);
    }
    return this.state.steps;
  }

  get isSupported(): boolean {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }

  get isRunning(): boolean { return this.running; }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.steps);
    return () => { this.listeners.delete(fn); };
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state.steps);
  }

  async requestPermission(): Promise<"granted" | "denied" | "unsupported"> {
    if (!this.isSupported) return "unsupported";
    const anyEvt = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof anyEvt.requestPermission === "function") {
      try {
        const res = await anyEvt.requestPermission();
        return res;
      } catch {
        return "denied";
      }
    }
    return "granted";
  }

  start() {
    if (this.running || !this.isSupported) return;
    this.handler = (e: DeviceMotionEvent) => this.onMotion(e);
    window.addEventListener("devicemotion", this.handler);
    this.running = true;
  }

  stop() {
    if (!this.running) return;
    if (this.handler) window.removeEventListener("devicemotion", this.handler);
    this.handler = null;
    this.running = false;
  }

  reset() {
    this.state = { date: todayKey(), steps: 0 };
    saveState(this.state);
    this.emit();
  }

  private onMotion(e: DeviceMotionEvent) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
    // Subtract gravity baseline (~9.81). Use absolute deviation.
    const dev = Math.abs(mag - 9.81);

    const now = performance.now();
    // Detect upward crossings of THRESHOLD with a refractory window.
    if (dev > this.THRESHOLD && !this.rising && this.lastMag <= this.THRESHOLD) {
      if (now - this.lastPeakTs > this.MIN_STEP_MS) {
        this.lastPeakTs = now;
        this.rising = true;
        // Roll over date if midnight passed mid-session
        if (this.state.date !== todayKey()) {
          this.state = { date: todayKey(), steps: 0 };
        }
        this.state.steps += 1;
        saveState(this.state);
        this.emit();
      }
    } else if (dev < this.THRESHOLD * 0.5) {
      this.rising = false;
    }
    this.lastMag = dev;
  }
}

export const pedometer = new Pedometer();
