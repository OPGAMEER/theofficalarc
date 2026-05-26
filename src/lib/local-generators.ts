// On-device fallback generators used when the Supabase Edge Functions
// (generate-workout / generate-diet) are unreachable on a custom backend.
import type { WorkoutPlan, DietPlan } from "@/lib/arc-store";

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Workout ----------
type ExPool = Record<string, { name: string; reps: string; rest_sec: number; cue?: string }[]>;

const GYM_POOL: ExPool = {
  PUSH:   [
    { name: "Barbell Bench Press", reps: "4x6-8", rest_sec: 120, cue: "Tight scaps, controlled descent" },
    { name: "Incline Dumbbell Press", reps: "3x8-10", rest_sec: 90 },
    { name: "Overhead Press", reps: "4x6", rest_sec: 120 },
    { name: "Cable Triceps Pushdown", reps: "3x12", rest_sec: 60 },
    { name: "Lateral Raises", reps: "3x15", rest_sec: 45 },
  ],
  PULL:   [
    { name: "Deadlift", reps: "4x5", rest_sec: 180, cue: "Brace, push the floor away" },
    { name: "Pull-Ups", reps: "4xAMRAP", rest_sec: 120 },
    { name: "Barbell Row", reps: "4x8", rest_sec: 90 },
    { name: "Face Pulls", reps: "3x15", rest_sec: 60 },
    { name: "Hammer Curl", reps: "3x10", rest_sec: 60 },
  ],
  LOWER:  [
    { name: "Back Squat", reps: "4x6", rest_sec: 150, cue: "Knees track over toes" },
    { name: "Romanian Deadlift", reps: "3x8", rest_sec: 120 },
    { name: "Walking Lunges", reps: "3x12/leg", rest_sec: 90 },
    { name: "Leg Press", reps: "3x10", rest_sec: 90 },
    { name: "Standing Calf Raise", reps: "4x15", rest_sec: 45 },
  ],
  UPPER:  [
    { name: "Bench Press", reps: "4x6-8", rest_sec: 120 },
    { name: "Pull-Ups", reps: "3xAMRAP", rest_sec: 120 },
    { name: "Seated DB Shoulder Press", reps: "3x10", rest_sec: 90 },
    { name: "Chest-Supported Row", reps: "3x10", rest_sec: 90 },
    { name: "Cable Curl", reps: "3x12", rest_sec: 60 },
  ],
  GLUTES: [
    { name: "Hip Thrust", reps: "4x8", rest_sec: 120, cue: "Squeeze glutes at lockout" },
    { name: "Bulgarian Split Squat", reps: "3x10/leg", rest_sec: 90 },
    { name: "Cable Kickback", reps: "3x15/leg", rest_sec: 60 },
    { name: "Sumo Deadlift", reps: "3x8", rest_sec: 120 },
  ],
  ARMS:   [
    { name: "Barbell Curl", reps: "4x8", rest_sec: 75 },
    { name: "Skullcrushers", reps: "4x10", rest_sec: 75 },
    { name: "Hammer Curl", reps: "3x12", rest_sec: 60 },
    { name: "Rope Pushdown", reps: "3x12", rest_sec: 60 },
  ],
  CORE:   [
    { name: "Hanging Leg Raise", reps: "4x10", rest_sec: 60 },
    { name: "Cable Woodchopper", reps: "3x12/side", rest_sec: 60 },
    { name: "Plank", reps: "3x60s", rest_sec: 45 },
    { name: "Ab Wheel Rollout", reps: "3x10", rest_sec: 75 },
  ],
  ATHLETIC: [
    { name: "Box Jumps", reps: "5x3", rest_sec: 90 },
    { name: "Med Ball Slams", reps: "4x8", rest_sec: 60 },
    { name: "KB Swings", reps: "4x15", rest_sec: 60 },
    { name: "Sled Push", reps: "4x20m", rest_sec: 120 },
  ],
};

const HOME_POOL: ExPool = {
  PUSH:   [
    { name: "Push-Ups", reps: "4x12-15", rest_sec: 60 },
    { name: "Pike Push-Ups", reps: "3x10", rest_sec: 75 },
    { name: "Diamond Push-Ups", reps: "3x10", rest_sec: 60 },
    { name: "Chair Dips", reps: "3x12", rest_sec: 60 },
  ],
  PULL:   [
    { name: "Doorframe Rows", reps: "4x12", rest_sec: 60 },
    { name: "Reverse Snow Angels", reps: "3x15", rest_sec: 45 },
    { name: "Towel Curls", reps: "3x12", rest_sec: 60 },
    { name: "Superman Hold", reps: "3x30s", rest_sec: 45 },
  ],
  LOWER:  [
    { name: "Bodyweight Squats", reps: "4x20", rest_sec: 60 },
    { name: "Reverse Lunges", reps: "3x12/leg", rest_sec: 60 },
    { name: "Glute Bridge", reps: "3x15", rest_sec: 45 },
    { name: "Calf Raises", reps: "3x20", rest_sec: 45 },
  ],
  UPPER:  [
    { name: "Push-Ups", reps: "4x15", rest_sec: 60 },
    { name: "Doorframe Rows", reps: "3x12", rest_sec: 60 },
    { name: "Pike Push-Ups", reps: "3x8", rest_sec: 75 },
    { name: "Chair Dips", reps: "3x12", rest_sec: 60 },
  ],
  GLUTES: [
    { name: "Glute Bridge", reps: "4x15", rest_sec: 60 },
    { name: "Single-Leg Hip Thrust", reps: "3x12/leg", rest_sec: 60 },
    { name: "Side-Lying Leg Lifts", reps: "3x15/leg", rest_sec: 45 },
    { name: "Reverse Lunges", reps: "3x12/leg", rest_sec: 60 },
  ],
  ARMS:   [
    { name: "Chair Dips", reps: "4x12", rest_sec: 60 },
    { name: "Diamond Push-Ups", reps: "3x10", rest_sec: 60 },
    { name: "Towel Curls", reps: "3x12", rest_sec: 60 },
  ],
  CORE:   [
    { name: "Plank", reps: "3x60s", rest_sec: 45 },
    { name: "Bicycle Crunches", reps: "3x20", rest_sec: 45 },
    { name: "Hollow Hold", reps: "3x30s", rest_sec: 45 },
    { name: "Mountain Climbers", reps: "3x30s", rest_sec: 45 },
  ],
  ATHLETIC: [
    { name: "Burpees", reps: "5x10", rest_sec: 75 },
    { name: "Jump Squats", reps: "4x12", rest_sec: 60 },
    { name: "High Knees", reps: "4x30s", rest_sec: 45 },
    { name: "Skater Hops", reps: "4x16", rest_sec: 60 },
  ],
};

const FOCUS_GROUPS: Record<string, string[]> = {
  "FULL BODY": ["LOWER", "PUSH", "PULL", "CORE"],
  "UPPER":     ["PUSH", "PULL", "ARMS"],
  "LOWER":     ["LOWER", "GLUTES", "CORE"],
  "PUSH":      ["PUSH", "PUSH", "ARMS", "CORE"],
  "PULL":      ["PULL", "PULL", "ARMS", "CORE"],
  "GLUTES":    ["GLUTES", "LOWER", "GLUTES", "CORE"],
  "ARMS":      ["ARMS", "ARMS", "PUSH", "PULL"],
  "CORE":      ["CORE", "CORE", "CORE", "LOWER"],
  "ATHLETIC":  ["ATHLETIC", "ATHLETIC", "LOWER", "CORE"],
};

export function generateLocalWorkout(opts: {
  location: "HOME" | "GYM";
  focus: string;
  duration_min: number;
  gender?: string;
  exclude?: string[];
  seed?: number;
}): WorkoutPlan {
  const rng = mulberry32((opts.seed ?? Date.now()) | 0);
  const pool = opts.location === "HOME" ? HOME_POOL : GYM_POOL;
  const groups = FOCUS_GROUPS[opts.focus] || FOCUS_GROUPS["FULL BODY"];
  const exclude = new Set((opts.exclude || []).map((n) => n.toLowerCase()));

  const exCount = Math.max(4, Math.min(8, Math.round(opts.duration_min / 8)));
  const picks: { name: string; reps: string; rest_sec: number; cue?: string }[] = [];
  const seen = new Set<string>();
  let safety = 0;
  while (picks.length < exCount && safety < 80) {
    safety++;
    const group = groups[picks.length % groups.length];
    const candidates = shuffle(pool[group] || pool.PUSH, rng);
    const c = candidates.find((x) => !seen.has(x.name) && !exclude.has(x.name.toLowerCase()))
      || candidates.find((x) => !seen.has(x.name));
    if (c) { picks.push(c); seen.add(c.name); }
  }

  const volume = picks.reduce((acc, e) => {
    const m = e.reps.match(/(\d+)x(\d+)/);
    const sets = m ? Number(m[1]) : 3;
    const reps = m ? Number(m[2]) : 10;
    return acc + sets * reps * (opts.location === "GYM" ? 40 : 12);
  }, 0);

  const titlePool = [
    `${opts.focus} Forge`,
    `${opts.focus} Ignition`,
    `${opts.focus} Protocol`,
    `${opts.focus} Surge`,
    `${opts.focus} Crucible`,
  ];

  return {
    title: pick(titlePool, rng),
    subtitle: `${opts.location} · ${opts.focus}`,
    duration_min: opts.duration_min,
    rpe: 7 + Math.floor(rng() * 3),
    volume_kg: volume,
    exercises: picks,
  };
}

// ---------- Diet ----------
type MealTemplate = {
  name: string;
  time: string;
  kcal: number;
  items: string[];
  prep_min?: number;
  cook_min?: number;
  recipe?: string[];
  tags?: string[]; // veg, nonveg, lactose, gluten, nuts, etc.
};

const BREAKFAST: MealTemplate[] = [
  { name: "Oats & Berries Bowl", time: "08:00", kcal: 420, items: ["oats", "blueberries", "banana", "almond butter"],
    prep_min: 3, cook_min: 5, tags: ["veg", "gluten"],
    recipe: ["Cook 60g oats with 250ml milk for 4 min", "Top with berries and banana", "Drizzle 1 tbsp almond butter"] },
  { name: "Greek Yogurt Parfait", time: "08:00", kcal: 380, items: ["greek yogurt", "granola", "honey", "strawberries"],
    prep_min: 5, tags: ["veg", "lactose"],
    recipe: ["Layer yogurt and granola in a glass", "Top with strawberries", "Drizzle honey"] },
  { name: "Veggie Scramble & Toast", time: "08:00", kcal: 450, items: ["eggs", "spinach", "tomato", "whole-grain toast"],
    prep_min: 5, cook_min: 7, tags: ["veg", "egg", "gluten"],
    recipe: ["Sauté spinach and tomato 2 min", "Whisk 3 eggs and scramble", "Serve with toasted bread"] },
  { name: "Protein Smoothie", time: "08:00", kcal: 360, items: ["whey", "banana", "oats", "milk"],
    prep_min: 3, tags: ["lactose"],
    recipe: ["Blend all ingredients with ice 30 sec", "Serve immediately"] },
];

const LUNCH: MealTemplate[] = [
  { name: "Grilled Chicken Bowl", time: "13:00", kcal: 620, items: ["chicken breast", "brown rice", "broccoli", "olive oil"],
    prep_min: 5, cook_min: 15, tags: ["nonveg"],
    recipe: ["Season 180g chicken, grill 6 min/side", "Steam broccoli 5 min", "Plate over 1 cup brown rice"] },
  { name: "Chickpea Power Salad", time: "13:00", kcal: 540, items: ["chickpeas", "quinoa", "cucumber", "feta", "lemon"],
    prep_min: 10, tags: ["veg"],
    recipe: ["Cook 60g quinoa, cool", "Toss with chickpeas, cucumber, feta", "Dress with lemon and olive oil"] },
  { name: "Salmon & Sweet Potato", time: "13:00", kcal: 640, items: ["salmon", "sweet potato", "asparagus"],
    prep_min: 5, cook_min: 20, tags: ["nonveg", "fish"],
    recipe: ["Roast sweet potato cubes 20 min at 200°C", "Pan-sear salmon 4 min/side", "Steam asparagus 4 min"] },
  { name: "Turkey Wrap", time: "13:00", kcal: 560, items: ["turkey", "whole-wheat wrap", "avocado", "mixed greens"],
    prep_min: 5, tags: ["nonveg", "gluten"],
    recipe: ["Spread avocado on wrap", "Layer turkey and greens", "Roll tightly and slice"] },
];

const DINNER: MealTemplate[] = [
  { name: "Lean Beef Stir-Fry", time: "19:30", kcal: 580, items: ["lean beef", "bell peppers", "jasmine rice", "soy sauce"],
    prep_min: 8, cook_min: 12, tags: ["nonveg", "soy", "gluten"],
    recipe: ["Stir-fry beef 3 min", "Add peppers, cook 4 min", "Toss in soy, serve over rice"] },
  { name: "Tofu Coconut Curry", time: "19:30", kcal: 540, items: ["tofu", "coconut milk", "spinach", "basmati rice"],
    prep_min: 5, cook_min: 15, tags: ["veg", "vegan", "soy"],
    recipe: ["Sauté tofu cubes 5 min", "Add curry paste + coconut milk, simmer 8 min", "Wilt spinach, serve over rice"] },
  { name: "Baked Cod & Greens", time: "19:30", kcal: 480, items: ["cod", "potatoes", "green beans", "lemon"],
    prep_min: 5, cook_min: 20, tags: ["nonveg", "fish"],
    recipe: ["Bake cod with lemon 12 min at 200°C", "Roast potato wedges 25 min", "Steam beans 5 min"] },
  { name: "Chicken Pesto Pasta", time: "19:30", kcal: 620, items: ["chicken", "pasta", "pesto", "cherry tomatoes"],
    prep_min: 5, cook_min: 15, tags: ["nonveg", "gluten", "nuts"],
    recipe: ["Boil pasta to al dente", "Sear diced chicken 6 min", "Toss with pesto and tomatoes"] },
];

const SNACKS: MealTemplate[] = [
  { name: "Apple & Peanut Butter", time: "16:00", kcal: 220, items: ["apple", "peanut butter"], prep_min: 2, tags: ["veg", "vegan", "nuts"] },
  { name: "Cottage Cheese & Pineapple", time: "16:00", kcal: 200, items: ["cottage cheese", "pineapple"], prep_min: 2, tags: ["veg", "lactose"] },
  { name: "Protein Shake", time: "16:00", kcal: 180, items: ["whey", "water"], prep_min: 1, tags: ["lactose"] },
  { name: "Mixed Nuts", time: "16:00", kcal: 210, items: ["almonds", "cashews"], prep_min: 1, tags: ["veg", "vegan", "nuts"] },
];

function filterByDiet(meals: MealTemplate[], diet: "any" | "veg" | "nonveg", exclude: Set<string>, allergens: string[]) {
  return meals.filter((m) => {
    if (diet === "veg" && !m.tags?.includes("veg")) return false;
    if (diet === "nonveg" && m.tags?.includes("veg") && !m.tags?.includes("nonveg")) return false;
    if (exclude.has(m.name.toLowerCase())) return false;
    for (const a of allergens) if (m.tags?.includes(a)) return false;
    return true;
  });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generateLocalDiet(opts: {
  diet: "any" | "veg" | "nonveg";
  calorie_target: number;
  exclude?: string[];
  health_issues?: string;
  seed?: number;
}): DietPlan {
  const rng = mulberry32((opts.seed ?? Date.now()) | 0);
  const exclude = new Set((opts.exclude || []).map((n) => n.toLowerCase()));
  const issues = (opts.health_issues || "").toLowerCase();
  const allergens: string[] = [];
  if (/lactose|dairy|milk/.test(issues)) allergens.push("lactose");
  if (/gluten|celiac|wheat/.test(issues)) allergens.push("gluten");
  if (/nut|peanut|almond/.test(issues)) allergens.push("nuts");
  if (/shellfish|shrimp|prawn/.test(issues)) allergens.push("shellfish");
  if (/egg/.test(issues)) allergens.push("egg");
  if (/soy|tofu/.test(issues)) allergens.push("soy");
  if (/fish|seafood/.test(issues)) allergens.push("fish");

  const b = pick(filterByDiet(shuffle(BREAKFAST, rng), opts.diet, exclude, allergens).concat(BREAKFAST[0]), rng);
  const l = pick(filterByDiet(shuffle(LUNCH, rng), opts.diet, exclude, allergens).concat(LUNCH[1]), rng);
  const d = pick(filterByDiet(shuffle(DINNER, rng), opts.diet, exclude, allergens).concat(DINNER[1]), rng);
  const s = pick(filterByDiet(shuffle(SNACKS, rng), opts.diet, exclude, allergens).concat(SNACKS[3]), rng);

  let meals = [b, l, d, s];
  let total = meals.reduce((a, m) => a + m.kcal, 0);

  // Scale meals proportionally to hit the target (±5%)
  const scale = opts.calorie_target / total;
  meals = meals.map((m) => ({ ...m, kcal: Math.round((m.kcal * scale) / 10) * 10 }));
  total = meals.reduce((a, m) => a + m.kcal, 0);

  const protein_g = Math.round((total * 0.30) / 4);
  const carbs_g   = Math.round((total * 0.40) / 4);
  const fat_g     = Math.round((total * 0.30) / 9);

  return {
    date: todayISO(),
    kcal: total,
    protein_g,
    carbs_g,
    fat_g,
    meals: meals.map(({ tags, ...m }) => m),
  };
}
