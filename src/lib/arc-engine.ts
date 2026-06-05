import type { ChatMessage, DietPlan, WorkoutPlan } from "@/lib/arc-store";

type DietChoice = "any" | "veg" | "nonveg";

const REPLY_LIMIT = 520;

const normalReply = (text: string) => text.length <= REPLY_LIMIT ? text : `${text.slice(0, REPLY_LIMIT - 1).trim()}…`;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const safeNumber = (value: number, fallback: number, min: number, max: number) => {
  const n = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
};

function rotate<T>(items: T[], seed = Date.now()) {
  if (items.length === 0) return items;
  const offset = Math.abs(Math.floor(seed)) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

const WORKOUTS = {
  HOME: {
    PUSH: ["Push-Ups", "Pike Push-Ups", "Chair Dips", "Plank Shoulder Taps", "Incline Push-Ups"],
    PULL: ["Doorframe Rows", "Towel Rows", "Reverse Snow Angels", "Superman Hold", "Towel Curls"],
    LOWER: ["Bodyweight Squats", "Reverse Lunges", "Glute Bridge", "Split Squats", "Calf Raises"],
    CORE: ["Plank", "Dead Bug", "Bicycle Crunches", "Mountain Climbers", "Hollow Hold"],
    ATHLETIC: ["Burpees", "Jump Squats", "High Knees", "Skater Hops", "Fast Feet"],
  },
  GYM: {
    PUSH: ["Bench Press", "Incline Dumbbell Press", "Overhead Press", "Cable Triceps Pushdown", "Lateral Raises"],
    PULL: ["Lat Pulldown", "Seated Cable Row", "Barbell Row", "Face Pulls", "Hammer Curl"],
    LOWER: ["Back Squat", "Romanian Deadlift", "Leg Press", "Walking Lunges", "Standing Calf Raise"],
    CORE: ["Cable Woodchopper", "Hanging Leg Raise", "Ab Wheel Rollout", "Weighted Plank", "Pallof Press"],
    ATHLETIC: ["Box Jumps", "Kettlebell Swings", "Sled Push", "Med Ball Slams", "Battle Ropes"],
  },
} as const;

const EQUIPMENT_WORKOUTS = {
  HOME: {
    DUMBBELL: {
      PUSH: ["Dumbbell Floor Press", "Dumbbell Shoulder Press", "Dumbbell Push Press", "Dumbbell Triceps Extension"],
      PULL: ["One-Arm Dumbbell Row", "Dumbbell Reverse Fly", "Dumbbell Pullover", "Dumbbell Hammer Curl"],
      LOWER: ["Goblet Squat", "Dumbbell Romanian Deadlift", "Dumbbell Reverse Lunge", "Dumbbell Glute Bridge"],
      CORE: ["Dumbbell Dead Bug", "Dumbbell Russian Twist", "Dumbbell Side Bend", "Weighted Plank Pull-Through"],
      ATHLETIC: ["Dumbbell Thruster", "Dumbbell Clean", "Dumbbell Snatch", "Dumbbell Farmer March"],
    },
    BAND: {
      PUSH: ["Band Chest Press", "Band Shoulder Press", "Band Triceps Pressdown", "Band Push-Up"],
      PULL: ["Band Row", "Band Lat Pulldown", "Band Face Pull", "Band Curl"],
      LOWER: ["Band Squat", "Band Romanian Deadlift", "Band Lateral Walk", "Band Glute Bridge"],
      CORE: ["Band Pallof Press", "Band Woodchopper", "Band Dead Bug", "Band Plank Row"],
      ATHLETIC: ["Band Sprint Drive", "Band Squat to Press", "Band High Pull", "Band Fast Row"],
    },
    KETTLEBELL: {
      PUSH: ["Kettlebell Floor Press", "Kettlebell Strict Press", "Kettlebell Push Press", "Kettlebell Halo"],
      PULL: ["Kettlebell Row", "Kettlebell High Pull", "Kettlebell Curl", "Kettlebell Pullover"],
      LOWER: ["Kettlebell Goblet Squat", "Kettlebell Swing", "Kettlebell Romanian Deadlift", "Kettlebell Reverse Lunge"],
      CORE: ["Kettlebell Plank Drag", "Kettlebell Russian Twist", "Kettlebell Windmill", "Kettlebell Suitcase Carry"],
      ATHLETIC: ["Kettlebell Swing", "Kettlebell Clean", "Kettlebell Snatch", "Kettlebell Thruster"],
    },
  },
  GYM: {
    DUMBBELL: {
      PUSH: ["Dumbbell Bench Press", "Incline Dumbbell Press", "Dumbbell Shoulder Press", "Dumbbell Lateral Raise"],
      PULL: ["Chest-Supported Dumbbell Row", "One-Arm Dumbbell Row", "Dumbbell Rear Delt Fly", "Dumbbell Hammer Curl"],
      LOWER: ["Dumbbell Bulgarian Split Squat", "Dumbbell Romanian Deadlift", "Dumbbell Walking Lunge", "Dumbbell Step-Up"],
      CORE: ["Dumbbell Suitcase Carry", "Dumbbell Dead Bug", "Dumbbell Russian Twist", "Dumbbell Woodchopper"],
      ATHLETIC: ["Dumbbell Thruster", "Dumbbell Clean and Press", "Dumbbell Snatch", "Dumbbell Farmer Carry"],
    },
    MACHINE: {
      PUSH: ["Machine Chest Press", "Machine Shoulder Press", "Pec Deck", "Cable Triceps Pushdown"],
      PULL: ["Lat Pulldown", "Seated Cable Row", "Machine Row", "Cable Curl"],
      LOWER: ["Leg Press", "Leg Extension", "Lying Leg Curl", "Standing Calf Raise"],
      CORE: ["Cable Crunch", "Cable Woodchopper", "Pallof Press", "Machine Ab Crunch"],
      ATHLETIC: ["Sled Push", "Battle Ropes", "Cable High Pull", "SkiErg Intervals"],
    },
    BARBELL: {
      PUSH: ["Barbell Bench Press", "Overhead Press", "Close-Grip Bench Press", "Landmine Press"],
      PULL: ["Barbell Row", "Rack Pull", "Barbell Curl", "Pendlay Row"],
      LOWER: ["Back Squat", "Romanian Deadlift", "Front Squat", "Barbell Hip Thrust"],
      CORE: ["Barbell Rollout", "Landmine Rotation", "Zercher Carry", "Weighted Plank"],
      ATHLETIC: ["Power Clean", "Push Press", "Barbell Complex", "Landmine Thruster"],
    },
  },
} as const;

function equipmentKey(text = "") {
  const t = text.toLowerCase();
  if (/dumb\s?bells?|dumbell|db\b/.test(t)) return "DUMBBELL" as const;
  if (/band|resistance/.test(t)) return "BAND" as const;
  if (/kettle\s?bell|kb\b/.test(t)) return "KETTLEBELL" as const;
  if (/machine|cable|lat pulldown|leg press/.test(t)) return "MACHINE" as const;
  if (/barbell|squat rack|rack|bench press/.test(t)) return "BARBELL" as const;
  return null;
}

const FOCUS_MAP: Record<string, (keyof typeof WORKOUTS.HOME)[]> = {
  "FULL BODY": ["LOWER", "PUSH", "PULL", "CORE"],
  UPPER: ["PUSH", "PULL", "PUSH", "PULL"],
  LOWER: ["LOWER", "LOWER", "CORE", "ATHLETIC"],
  PUSH: ["PUSH", "PUSH", "CORE", "ATHLETIC"],
  PULL: ["PULL", "PULL", "CORE", "ATHLETIC"],
  GLUTES: ["LOWER", "LOWER", "CORE", "ATHLETIC"],
  ARMS: ["PUSH", "PULL", "PUSH", "PULL"],
  CORE: ["CORE", "CORE", "ATHLETIC", "LOWER"],
  ATHLETIC: ["ATHLETIC", "LOWER", "CORE", "PUSH"],
};

export function createWorkoutPlan(opts: {
  location: "HOME" | "GYM";
  focus: string;
  duration_min: number;
  gender?: string;
  equipment?: string;
  seed?: number;
}): WorkoutPlan {
  const location = opts.location === "HOME" ? "HOME" : "GYM";
  const focus = FOCUS_MAP[opts.focus] ? opts.focus : "FULL BODY";
  const duration = safeNumber(opts.duration_min, 45, 15, 90);
  const count = Math.min(8, Math.max(4, Math.round(duration / 8)));
  const seed = opts.seed ?? Date.now();
  const groups = FOCUS_MAP[focus];
  const exercises: WorkoutPlan["exercises"] = [];
  const used = new Set<string>();
  const equipment = equipmentKey(opts.equipment);

  for (let i = 0; exercises.length < count && i < count * 4; i++) {
    const group = groups[i % groups.length];
    const specialized = equipment === "DUMBBELL" ? EQUIPMENT_WORKOUTS[location].DUMBBELL[group]
      : equipment === "BAND" && location === "HOME" ? EQUIPMENT_WORKOUTS.HOME.BAND[group]
      : equipment === "KETTLEBELL" && location === "HOME" ? EQUIPMENT_WORKOUTS.HOME.KETTLEBELL[group]
      : equipment === "MACHINE" && location === "GYM" ? EQUIPMENT_WORKOUTS.GYM.MACHINE[group]
      : equipment === "BARBELL" && location === "GYM" ? EQUIPMENT_WORKOUTS.GYM.BARBELL[group]
      : undefined;
    const pool = rotate([...(specialized ?? WORKOUTS[location][group])], seed + i * 7);
    const name = pool.find((item) => !used.has(item)) ?? pool[0];
    if (!name || used.has(name)) continue;
    used.add(name);
    const strength = location === "GYM";
    exercises.push({
      name,
      reps: strength || equipment ? (i < 2 ? "4x8-10" : "3x10-12") : (i < 2 ? "4x12-15" : "3x30-45s"),
      rest_sec: strength ? (i < 2 ? 120 : 75) : 60,
      cue: i === 0 ? "Brace first, move with control" : i === 1 ? "Stop 1–2 reps before failure" : "Clean reps only",
    });
  }

  while (exercises.length < 4) {
    exercises.push({ name: "Plank", reps: "3x45s", rest_sec: 45, cue: "Ribs down, breathe slow" });
  }

  const volume = exercises.reduce((sum, ex) => {
    const match = ex.reps.match(/(\d+)x(\d+)/);
    return sum + (match ? Number(match[1]) * Number(match[2]) : 90) * (location === "GYM" ? 38 : 10);
  }, 0);

  return {
    title: `${focus} Engine`,
    subtitle: `${location}${equipment ? ` · ${equipment}` : ""} · READY NOW`,
    duration_min: duration,
    rpe: focus === "ATHLETIC" ? 8 : 7,
    volume_kg: volume,
    exercises,
  };
}

const MEALS = {
  breakfast: {
    any: [
      ["Egg & Oat Power Bowl", ["eggs", "oats", "berries", "Greek yogurt"], 520, ["Cook oats until thick", "Scramble eggs on low heat", "Top oats with berries and yogurt"]],
      ["Protein Toast Plate", ["eggs", "whole-grain toast", "avocado", "fruit"], 500, ["Toast bread", "Cook eggs to preference", "Add avocado and fruit on the side"]],
    ],
    veg: [
      ["Greek Yogurt Oat Bowl", ["Greek yogurt", "oats", "banana", "berries"], 480, ["Mix yogurt and oats", "Slice banana", "Top with berries"]],
      ["Tofu Breakfast Scramble", ["tofu", "spinach", "tomato", "toast"], 470, ["Crumble tofu", "Cook with spinach and tomato", "Serve with toast"]],
    ],
    nonveg: [
      ["Turkey Egg Breakfast", ["turkey slices", "eggs", "toast", "fruit"], 520, ["Warm turkey", "Scramble eggs", "Serve with toast and fruit"]],
      ["Chicken Omelet Plate", ["chicken", "eggs", "spinach", "potato"], 540, ["Cook potato cubes", "Fold chicken and spinach into eggs", "Serve hot"]],
    ],
  },
  lunch: {
    any: [
      ["Chicken Rice Performance Bowl", ["chicken breast", "rice", "broccoli", "olive oil"], 720, ["Grill chicken", "Steam broccoli", "Serve over rice with olive oil"]],
      ["Salmon Potato Plate", ["salmon", "potatoes", "green beans", "lemon"], 700, ["Bake salmon", "Roast potatoes", "Add green beans and lemon"]],
    ],
    veg: [
      ["Chickpea Quinoa Bowl", ["chickpeas", "quinoa", "cucumber", "feta"], 650, ["Cook quinoa", "Add chickpeas and cucumber", "Finish with feta"]],
      ["Tofu Rice Bowl", ["tofu", "rice", "edamame", "greens"], 660, ["Sear tofu", "Warm rice", "Add edamame and greens"]],
    ],
    nonveg: [
      ["Lean Beef Rice Bowl", ["lean beef", "rice", "peppers", "greens"], 730, ["Cook beef strips", "Add peppers", "Serve over rice with greens"]],
      ["Chicken Wrap Plate", ["chicken", "wrap", "avocado", "salad"], 690, ["Fill wrap with chicken", "Add avocado", "Serve with salad"]],
    ],
  },
  dinner: {
    any: [
      ["Turkey Pasta Recovery", ["turkey mince", "pasta", "tomato sauce", "salad"], 680, ["Boil pasta", "Cook turkey with sauce", "Serve with salad"]],
      ["Cod & Rice Dinner", ["cod", "rice", "asparagus", "olive oil"], 620, ["Bake cod", "Cook rice", "Add asparagus and olive oil"]],
    ],
    veg: [
      ["Lentil Curry Plate", ["lentils", "rice", "spinach", "coconut milk"], 640, ["Simmer lentils", "Add spinach", "Serve with rice"]],
      ["Bean Burrito Bowl", ["black beans", "rice", "corn", "salsa"], 610, ["Warm beans", "Add rice and corn", "Top with salsa"]],
    ],
    nonveg: [
      ["Chicken Sweet Potato Plate", ["chicken", "sweet potato", "greens", "olive oil"], 660, ["Roast sweet potato", "Cook chicken", "Serve with greens"]],
      ["Beef Stir-Fry Dinner", ["lean beef", "noodles", "vegetables", "ginger"], 700, ["Stir-fry beef", "Add vegetables", "Toss with noodles"]],
    ],
  },
  snack: {
    any: [
      ["Protein Snack Box", ["protein shake", "banana"], 260, ["Shake protein with water", "Eat banana on the side"]],
      ["Apple Yogurt Cup", ["Greek yogurt", "apple", "honey"], 250, ["Slice apple", "Add yogurt", "Drizzle honey"]],
    ],
    veg: [
      ["Cottage Cheese Fruit", ["cottage cheese", "pineapple"], 240, ["Spoon cottage cheese", "Top with pineapple"]],
      ["Hummus Snack Plate", ["hummus", "carrots", "pita"], 260, ["Slice carrots", "Serve with hummus and pita"]],
    ],
    nonveg: [
      ["Turkey Roll-Ups", ["turkey slices", "cheese", "cucumber"], 260, ["Roll turkey around cheese", "Serve with cucumber"]],
      ["Tuna Rice Cakes", ["tuna", "rice cakes", "cucumber"], 250, ["Mix tuna", "Top rice cakes", "Add cucumber"]],
    ],
  },
} as const;

type MealRow = readonly [string, readonly string[], number, readonly string[]];

function chooseMeal(slot: keyof typeof MEALS, diet: DietChoice, seed: number): MealRow {
  const key = diet === "veg" || diet === "nonveg" ? diet : "any";
  return rotate([...MEALS[slot][key]], seed)[0] as MealRow;
}

export function createMealPlan(opts: { diet: DietChoice; calorie_target: number; seed?: number }): DietPlan {
  const target = safeNumber(opts.calorie_target, 2200, 1300, 4200);
  const seed = opts.seed ?? Date.now();
  const rows = [
    ["Breakfast", "08:00", chooseMeal("breakfast", opts.diet, seed + 1)],
    ["Lunch", "13:00", chooseMeal("lunch", opts.diet, seed + 2)],
    ["Snack", "16:30", chooseMeal("snack", opts.diet, seed + 3)],
    ["Dinner", "19:30", chooseMeal("dinner", opts.diet, seed + 4)],
  ] as const;
  const rawTotal = rows.reduce((sum, row) => sum + row[2][2], 0);
  const scale = target / rawTotal;
  const meals = rows.map(([slot, time, row]) => ({
    name: row[0],
    time,
    kcal: Math.max(180, Math.round((row[2] * scale) / 10) * 10),
    items: [...row[1]],
    prep_min: slot === "Snack" ? 2 : 6,
    cook_min: slot === "Snack" ? 0 : 14,
    recipe: [...row[3]],
  }));
  const total = meals.reduce((sum, meal) => sum + meal.kcal, 0);

  return {
    date: todayISO(),
    kcal: total,
    protein_g: Math.round((total * 0.3) / 4),
    carbs_g: Math.round((total * 0.42) / 4),
    fat_g: Math.round((total * 0.28) / 9),
    meals,
  };
}

export function createCoachReply(messages: Pick<ChatMessage, "role" | "content">[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content.toLowerCase() ?? "";
  if (/meal|food|diet|eat|protein|calorie|breakfast|lunch|dinner/.test(last)) {
    return "Here is the move: build every meal around protein first, then add one carb and one color.\n\nFast plate:\n• Protein: chicken, eggs, tofu, fish, Greek yogurt\n• Carb: rice, oats, potato, wrap, fruit\n• Color: greens, peppers, berries, cucumber\n\nIf you want, tell me your goal and foods you have and I’ll make it tighter.";
  }
  if (/workout|gym|train|exercise|push|pull|legs|cardio|muscle/.test(last)) {
    return "Do this today:\n\n• Warm-up: 5 minutes easy movement\n• Squat or lunge: 4 sets\n• Push: 4 sets\n• Pull: 4 sets\n• Core: 3 sets\n• Finish: 8 minutes brisk walk\n\nKeep 1–2 reps in reserve. Clean form beats heavy ego reps.";
  }
  if (/routine|schedule|morning|habit|plan/.test(last)) {
    return "Simple routine:\n\n1. Drink water immediately\n2. 10 minutes sunlight or walking\n3. Write the top 3 tasks\n4. Train before scrolling\n5. Protein at the first meal\n\nMake it boring enough that you can repeat it.";
  }
  if (/sleep|tired|energy|rest/.test(last)) {
    return "Tonight: fixed bedtime, no caffeine late, dim lights for 45 minutes, and keep the room cool. If energy is low tomorrow, train lighter but still show up.";
  }
  if (/hi|hello|hey|yo/.test(last)) {
    return "I’m here. Ask me for a workout, meal plan, routine, calories, motivation, or a quick fix for today.";
  }
  return "I’ve got you. Send me your goal, time available, equipment, and any food limits. I’ll turn it into a clear next step.";
}