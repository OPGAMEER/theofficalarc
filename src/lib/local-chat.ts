// On-device fallback for the Arc chat when the chat-with-arc Edge Function
// is unavailable on a custom Supabase project. Keeps Arc helpful offline.

type Msg = { role: "user" | "assistant"; content: string };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const WORKOUT_TIPS = [
  "Quick session:\n• 5 min warm-up (jog in place, arm circles)\n• 4 rounds: 10 push-ups · 15 squats · 10 rows · 30s plank\n• 90s rest between rounds\n• 5 min stretch",
  "Upper-body focus:\n• Push-ups 4x12\n• Pike push-ups 3x10\n• Doorframe rows 4x12\n• Chair dips 3x12\n• Plank 3x60s",
  "Lower-body focus:\n• Bodyweight squats 4x20\n• Reverse lunges 3x12/leg\n• Glute bridge 3x15\n• Calf raises 3x20",
];

const NUTRITION_TIPS = [
  "Post-workout meal:\n• 30–40g protein (chicken, tofu, whey)\n• Carbs equal to your fist (rice, oats, potato)\n• Veg and a drizzle of olive oil\n• Water + a pinch of salt",
  "Simple plate rule:\n• ½ plate vegetables\n• ¼ plate protein\n• ¼ plate carbs\n• Thumb of healthy fat",
  "Hydration: aim for 30–35 ml per kg bodyweight. Add electrolytes if you sweat hard.",
];

const ROUTINE_TIPS = [
  "Morning anchor:\n• 10 min sunlight + walk\n• Glass of water\n• 5 min plan the day's 3 priorities\n• Breakfast with protein",
  "Evening wind-down:\n• Screens off 45 min before bed\n• Dim lights\n• 5 min journal — wins, lessons, tomorrow\n• Cool room, dark, quiet",
];

const SLEEP_TIPS = [
  "Sleep stack:\n• Fixed wake time, 7 days/week\n• No caffeine after 2pm\n• Cool, dark room\n• 10 min reading before bed",
];

const FOCUS_TIPS = [
  "Focus block:\n• 50 min work · 10 min walk\n• Phone in another room\n• One tab, one task\n• Capture distractions on paper, return later",
];

const STRESS_TIPS = [
  "Reset in 90 seconds:\n• Box breath 4-4-4-4 × 6\n• Roll shoulders back\n• Name one thing you can control right now",
];

const FALLBACKS = [
  "I'm offline right now, but I'm here. Try asking about workouts, meals, sleep, focus, or your daily routine.",
  "The cloud brain is unreachable. I can still help — ask me for a quick workout, meal idea, or routine.",
];

export function localChatReply(messages: Msg[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content?.toLowerCase() ?? "";

  if (/workout|exercise|gym|train|lift|push.?up|squat|cardio/.test(last)) return pick(WORKOUT_TIPS);
  if (/meal|eat|food|diet|nutrition|protein|calorie|breakfast|lunch|dinner|snack/.test(last)) return pick(NUTRITION_TIPS);
  if (/morning|evening|routine|schedule|plan.*day|habit/.test(last)) return pick(ROUTINE_TIPS);
  if (/sleep|rest|tired|insomnia|bed/.test(last)) return pick(SLEEP_TIPS);
  if (/focus|concentrat|deep work|distract|productiv/.test(last)) return pick(FOCUS_TIPS);
  if (/stress|anxious|anxiety|overwhelm|calm|breath/.test(last)) return pick(STRESS_TIPS);
  if (/hi|hello|hey|yo|sup/.test(last)) return "Hey. I'm Arc — workouts, meals, planning, mindset. What's on your mind?";
  if (/who.*you|what.*you/.test(last)) return "I'm Arc — your wellness + productivity companion. Ask me for a workout, a meal, or a plan for your day.";

  return pick(FALLBACKS);
}
