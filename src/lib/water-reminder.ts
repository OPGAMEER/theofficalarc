// Full-day hydration schedule + reminder.
// Generates evenly spaced slots between wake & sleep, sized to hit the daily goal.
import { toast } from "sonner";

const KEY_GOAL = "arc_water_goal_ml";
const KEY_REMINDER = "arc_water_reminder_min"; // 0 = off
const KEY_WAKE = "arc_water_wake_hr";          // e.g. 7
const KEY_SLEEP = "arc_water_sleep_hr";        // e.g. 22
const KEY_SPACING = "arc_water_spacing_min";   // e.g. 90 (1.5h)

export const DEFAULT_GOAL_ML = 2500;
export const DEFAULT_WAKE = 7;
export const DEFAULT_SLEEP = 22;
export const DEFAULT_SPACING = 90; // minutes between slots

const num = (k: string, d: number) => {
  if (typeof window === "undefined") return d;
  const v = Number(localStorage.getItem(k));
  return Number.isFinite(v) && v > 0 ? v : d;
};

export const getWaterGoal  = () => num(KEY_GOAL, DEFAULT_GOAL_ML);
export const getReminderMin = () => (typeof window === "undefined" ? 0 : Number(localStorage.getItem(KEY_REMINDER)) || 0);
export const getWakeHr     = () => num(KEY_WAKE, DEFAULT_WAKE);
export const getSleepHr    = () => num(KEY_SLEEP, DEFAULT_SLEEP);
export const getSpacingMin = () => num(KEY_SPACING, DEFAULT_SPACING);

export function setWaterGoal(ml: number)   { localStorage.setItem(KEY_GOAL, String(Math.max(500, Math.min(8000, Math.round(ml))))); }
export function setReminderMin(min: number){ localStorage.setItem(KEY_REMINDER, String(Math.max(0, Math.round(min)))); }
export function setWakeHr(h: number)       { localStorage.setItem(KEY_WAKE, String(Math.max(0, Math.min(23, Math.round(h))))); }
export function setSleepHr(h: number)      { localStorage.setItem(KEY_SLEEP, String(Math.max(1, Math.min(24, Math.round(h))))); }
export function setSpacingMin(m: number)   { localStorage.setItem(KEY_SPACING, String(Math.max(30, Math.min(240, Math.round(m))))); }

export type WaterSlot = {
  /** minutes from midnight */
  at: number;
  /** mL recommended at this slot */
  ml: number;
  /** "07:00" */
  label: string;
};

export function buildSchedule(opts?: {
  goalMl?: number; wake?: number; sleep?: number; spacingMin?: number;
}): WaterSlot[] {
  const goal = opts?.goalMl ?? getWaterGoal();
  const wake = opts?.wake ?? getWakeHr();
  const sleep = opts?.sleep ?? getSleepHr();
  const spacing = opts?.spacingMin ?? getSpacingMin();

  const startMin = wake * 60;
  const endMin = sleep * 60;
  if (endMin <= startMin) return [];

  const slots: number[] = [];
  for (let t = startMin; t <= endMin; t += spacing) slots.push(t);
  if (slots.length === 0) return [];

  // Round per-slot ml to nearest 50 mL, distribute remainder to first slots.
  const base = Math.round((goal / slots.length) / 50) * 50;
  let remainder = goal - base * slots.length;

  return slots.map((at, i) => {
    let ml = base;
    if (remainder !== 0) {
      const step = remainder > 0 ? 50 : -50;
      if (Math.abs(remainder) >= 50 && i < Math.abs(remainder) / 50) {
        ml += step;
        remainder -= step;
      }
    }
    const hh = String(Math.floor(at / 60)).padStart(2, "0");
    const mm = String(at % 60).padStart(2, "0");
    return { at, ml: Math.max(50, ml), label: `${hh}:${mm}` };
  });
}

export function nextSlot(schedule: WaterSlot[], nowDate = new Date()): WaterSlot | null {
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
  return schedule.find(s => s.at >= nowMin) ?? null;
}

let timerId: number | null = null;

export async function startWaterReminder(min: number, getProgress: () => { ml: number; goal: number }) {
  stopWaterReminder();
  if (min <= 0) return;
  if ("Notification" in window && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch {}
  }
  timerId = window.setInterval(() => {
    const { ml, goal } = getProgress();
    if (ml >= goal) return;
    const remaining = Math.max(0, goal - ml);
    const body = `You're at ${(ml/1000).toFixed(1)}L of ${(goal/1000).toFixed(1)}L. ${(remaining/1000).toFixed(1)}L to go.`;
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("💧 Time to hydrate", { body, tag: "arc-water" }); } catch {}
    }
    toast("💧 Time to hydrate", { description: body });
  }, min * 60 * 1000);
}

export function stopWaterReminder() {
  if (timerId !== null) { window.clearInterval(timerId); timerId = null; }
}
