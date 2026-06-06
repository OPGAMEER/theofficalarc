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

const KNOWN_FOODS = [
  "chicken breast", "greek yogurt", "turkey slices", "turkey mince", "sweet potato", "black beans", "rice cakes",
  "eggs", "oats", "berries", "yogurt", "toast", "avocado", "fruit", "banana", "tofu", "spinach", "tomato",
  "potato", "chicken", "rice", "broccoli", "olive oil", "salmon", "green beans", "lemon", "chickpeas", "quinoa",
  "cucumber", "feta", "edamame", "greens", "beef", "peppers", "wrap", "salad", "pasta", "cod", "asparagus",
  "lentils", "coconut milk", "corn", "salsa", "noodles", "vegetables", "ginger", "protein shake", "apple", "honey",
  "cottage cheese", "pineapple", "hummus", "carrots", "pita", "cheese", "tuna", "bread", "milk", "peanut butter",
];

const ALLERGY_GROUPS: { trigger: RegExp; avoid: string[] }[] = [
  { trigger: /lactose|dairy|milk|cheese|yogurt|whey|butter|cream/i, avoid: ["milk", "cheese", "yogurt", "Greek yogurt", "cottage cheese", "feta", "butter", "cream", "whey"] },
  { trigger: /gluten|celiac|wheat|bread|pasta|toast|wrap|pita/i, avoid: ["wheat", "bread", "pasta", "toast", "wrap", "pita", "noodles"] },
  { trigger: /nut|peanut|almond|cashew|walnut|pistachio|hazelnut/i, avoid: ["nuts", "peanut", "peanut butter", "almond", "cashew", "walnut", "pistachio", "hazelnut"] },
  { trigger: /shellfish|shrimp|prawn|crab|lobster|oyster|mussel|clam|scallop/i, avoid: ["shrimp", "prawns", "crab", "lobster", "oysters", "mussels", "clams", "scallops"] },
  { trigger: /egg|eggs|mayonnaise/i, avoid: ["egg", "eggs", "mayonnaise"] },
  { trigger: /soy|tofu|tempeh|edamame|soy sauce/i, avoid: ["soy", "tofu", "tempeh", "edamame", "soy sauce"] },
  { trigger: /fish|salmon|tuna|cod|anchov/i, avoid: ["fish", "salmon", "tuna", "cod", "anchovies"] },
  { trigger: /pork|ham|bacon|prosciutto|lard|halal|kosher/i, avoid: ["pork", "ham", "bacon", "prosciutto", "lard"] },
  { trigger: /sugar|diabetic/i, avoid: ["honey", "sugar", "syrup"] },
];

function normalizeFood(item: string) {
  return item.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function parseFoods(text = "") {
  const lower = text.toLowerCase();
  const found = KNOWN_FOODS.filter((food) => lower.includes(food.toLowerCase()));
  const listed = /[,;\n]/.test(text) ? text.split(/[\n,;]+/).map(normalizeFood).filter((x) => x.length > 1 && x.length < 36) : [];
  return Array.from(new Set([...found, ...listed].map(normalizeFood))).slice(0, 10);
}

function avoidTerms(text = "") {
  const avoid = new Set<string>();
  ALLERGY_GROUPS.forEach((group) => {
    if (group.trigger.test(text)) group.avoid.forEach((item) => avoid.add(normalizeFood(item)));
  });
  return avoid;
}

function hasAvoidedFood(items: readonly string[], avoid: Set<string>) {
  return items.some((item) => {
    const n = normalizeFood(item);
    return Array.from(avoid).some((bad) => n.includes(bad) || bad.includes(n));
  });
}

const PROTEIN_FOODS = ["chicken", "chicken breast", "turkey", "turkey slices", "turkey mince", "beef", "lean beef", "salmon", "tuna", "cod", "fish", "eggs", "egg", "tofu", "tempeh", "chickpeas", "lentils", "black beans", "beans", "greek yogurt", "yogurt", "cottage cheese", "cheese", "protein shake", "whey", "paneer", "shrimp"];
const CARB_FOODS = ["rice", "oats", "quinoa", "pasta", "noodles", "potato", "potatoes", "sweet potato", "bread", "toast", "wrap", "pita", "rice cakes", "tortilla"];
const VEG_FOODS = ["broccoli", "spinach", "greens", "salad", "peppers", "tomato", "cucumber", "asparagus", "green beans", "carrots", "corn", "vegetables", "edamame"];
const FAT_FOODS = ["olive oil", "avocado", "peanut butter", "nuts", "butter", "coconut milk", "feta"];
const FRUIT_FOODS = ["banana", "apple", "berries", "pineapple", "fruit", "lemon"];

function categorize(items: string[]) {
  const inList = (list: string[], item: string) => list.some((x) => item.includes(x) || x.includes(item));
  return {
    protein: items.filter((i) => inList(PROTEIN_FOODS, i)),
    carb: items.filter((i) => inList(CARB_FOODS, i)),
    veg: items.filter((i) => inList(VEG_FOODS, i)),
    fat: items.filter((i) => inList(FAT_FOODS, i)),
    fruit: items.filter((i) => inList(FRUIT_FOODS, i)),
  };
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function customMeal(slot: string, time: string, foods: string[], kcal: number) {
  const safeFoods = foods.length ? foods : ["rice", "greens"];
  const { protein, carb, veg, fat, fruit } = categorize(safeFoods);
  const hero = protein[0] ?? carb[0] ?? safeFoods[0];
  const partner = carb.find((c) => c !== hero) ?? veg[0] ?? fruit[0] ?? "";
  const styleByCarb: Record<string, string> = { rice: "Bowl", pasta: "Plate", noodles: "Stir-Fry", oats: "Bowl", quinoa: "Bowl", potato: "Plate", "sweet potato": "Plate", bread: "Toast", toast: "Toast", wrap: "Wrap", pita: "Pocket", tortilla: "Wrap" };
  const carbStyle = carb[0] ? styleByCarb[carb[0]] ?? "Plate" : slot === "Snack" ? "Box" : "Plate";
  const name = `${titleCase(hero)}${partner ? ` & ${titleCase(partner)}` : ""} ${carbStyle}`;
  const recipe: string[] = [];
  if (slot === "Snack") {
    recipe.push(`Use only: ${safeFoods.join(", ")}.`);
    if (protein[0]) recipe.push(`Portion ${protein[0]} for ~20g protein.`);
    if (fruit[0] || veg[0]) recipe.push(`Pair with ${(fruit[0] ?? veg[0])} on the side.`);
    recipe.push(`Stop at ~${kcal} kcal — no extras.`);
  } else {
    if (protein[0]) recipe.push(`Cook ${protein[0]} simply — pan-sear, bake, or boil. Season with salt, pepper, and any safe spice.`);
    else recipe.push(`Build a protein base from what you have (${safeFoods.slice(0, 2).join(" / ")}).`);
    if (carb[0]) recipe.push(`Prepare ${carb[0]} as the base — ${kcal > 600 ? "generous" : "moderate"} portion.`);
    if (veg[0]) recipe.push(`Add ${veg.slice(0, 2).join(" + ")} — steam, roast, or quick stir-fry.`);
    if (fat[0]) recipe.push(`Finish with ${fat[0]} for healthy fats and flavor.`);
    if (fruit[0] && slot !== "Dinner") recipe.push(`Add ${fruit[0]} on the side or as dessert.`);
    recipe.push(`Plate it — target ~${kcal} kcal. Eat slowly.`);
  }
  return {
    name,
    time,
    kcal,
    items: safeFoods,
    prep_min: slot === "Snack" ? 2 : 6,
    cook_min: slot === "Snack" ? 0 : 14,
    recipe,
  };
}

function chooseMeal(slot: keyof typeof MEALS, diet: DietChoice, seed: number): MealRow {
  const key = diet === "veg" || diet === "nonveg" ? diet : "any";
  return rotate([...MEALS[slot][key]], seed)[0] as MealRow;
}

export function createMealPlan(opts: { diet: DietChoice; calorie_target: number; ingredients?: string; restrictions?: string; seed?: number }): DietPlan {
  const target = safeNumber(opts.calorie_target, 2200, 1300, 4200);
  const seed = opts.seed ?? Date.now();
  const avoid = avoidTerms(opts.restrictions);
  const availableFoods = parseFoods(opts.ingredients).filter((item) => !hasAvoidedFood([item], avoid));
  if (availableFoods.length > 0) {
    const calories = [0.24, 0.34, 0.12, 0.3].map((share) => Math.max(180, Math.round((target * share) / 10) * 10));
    const slots = [["Breakfast", "08:00"], ["Lunch", "13:00"], ["Snack", "16:30"], ["Dinner", "19:30"]] as const;
    const meals = slots.map(([slot, time], index) => customMeal(slot, time, rotate(availableFoods, seed + index).slice(0, Math.min(4, availableFoods.length)), calories[index]));
    const total = meals.reduce((sum, meal) => sum + meal.kcal, 0);
    return { date: todayISO(), kcal: total, protein_g: Math.round((total * 0.3) / 4), carbs_g: Math.round((total * 0.42) / 4), fat_g: Math.round((total * 0.28) / 9), meals };
  }
  const rows = [
    ["Breakfast", "08:00", chooseMeal("breakfast", opts.diet, seed + 1)],
    ["Lunch", "13:00", chooseMeal("lunch", opts.diet, seed + 2)],
    ["Snack", "16:30", chooseMeal("snack", opts.diet, seed + 3)],
    ["Dinner", "19:30", chooseMeal("dinner", opts.diet, seed + 4)],
  ] as const;
  const rawTotal = rows.reduce((sum, row) => sum + row[2][2], 0);
  const scale = target / rawTotal;
  const meals = rows.map(([slot, time, row]) => hasAvoidedFood(row[1], avoid)
    ? customMeal(slot, time, ["rice", "greens", "olive oil"].filter((item) => !hasAvoidedFood([item], avoid)), Math.max(180, Math.round((row[2] * scale) / 10) * 10))
    : ({
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

function pick<T>(arr: T[], seed = Date.now()): T {
  return arr[Math.abs(Math.floor(seed)) % arr.length];
}
function stripPunct(s: string) {
  return s.toLowerCase().replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();
}

function directQuestionAnswer(lastRaw: string, last: string): string | null {
  const has = (re: RegExp) => re.test(last);
  const foods = parseFoods(last).filter((item) => !hasAvoidedFood([item], avoidTerms(last)));

  if (has(/\b(what is|what are|explain|meaning of)\b.*\b(protein|carb|carbohydrate|fat|calorie|kcal|deficit|surplus|creatine|hypertrophy|progressive overload|metabolism|bmi)\b/)) {
    if (has(/protein/)) return "Protein helps repair and build muscle. Aim for 1.6–2.2g per kg bodyweight daily from chicken, eggs, fish, Greek yogurt, tofu, lentils, or whey.";
    if (has(/carb|carbohydrate/)) return "Carbs are your main training fuel. Choose rice, oats, potatoes, fruit, whole-grain bread, or quinoa and adjust portions based on your goal.";
    if (has(/\bfat\b/)) return "Dietary fat supports hormones and joints. Keep it moderate from olive oil, avocado, nuts, eggs, fish, or dairy if you tolerate it.";
    if (has(/calorie|kcal/)) return "A calorie is energy from food. Weight changes mostly come from average calories: deficit loses weight, surplus gains weight, maintenance stays stable.";
    if (has(/deficit/)) return "A calorie deficit means eating slightly less energy than you burn. Keep it small, high-protein, and sustainable so you lose fat without crashing.";
    if (has(/surplus/)) return "A calorie surplus means eating slightly more than you burn. Use a small surplus with hard strength training to gain muscle without too much fat.";
    if (has(/creatine/)) return "Creatine helps strength and power. Most people take 3–5g daily, any time. Drink enough water. Avoid it only if your doctor told you to.";
    if (has(/hypertrophy/)) return "Hypertrophy means muscle growth. Train close to failure, use 6–15 reps often, add volume over time, eat enough protein, and sleep well.";
    if (has(/progressive overload/)) return "Progressive overload means slowly making training harder: more reps, more weight, better form, extra sets, or shorter rest over weeks.";
    if (has(/metabolism/)) return "Metabolism is how your body uses energy. Muscle, body size, movement, food intake, sleep, and hormones all affect it.";
    return "BMI is weight compared with height. It can be useful for population ranges, but it does not measure muscle, body fat, or fitness quality.";
  }

  if (has(/\b(how many|how much).*(calorie|kcal).*(banana|egg|rice|chicken|oats|milk|bread|potato|apple)/)) {
    const table: Record<string, string> = { banana: "~105 kcal per medium banana", egg: "~70 kcal per large egg", rice: "~200 kcal per cooked cup", chicken: "~165 kcal per 100g cooked chicken breast", oats: "~150 kcal per 40g dry oats", milk: "~120 kcal per cup of milk", bread: "~80–110 kcal per slice", potato: "~160 kcal per medium potato", apple: "~95 kcal per medium apple" };
    const item = Object.keys(table).find((key) => last.includes(key));
    return item ? `${titleCase(item)} has ${table[item]}. Exact calories depend on portion size and cooking method.` : null;
  }

  if (has(/\b(can i|should i|is it ok to).*(eat|drink)\b/) || has(/\b(is|are).*(healthy|good|bad)\b/)) {
    const named = foods.length ? foods.join(" + ") : "that food";
    return `Yes, you can usually include ${named}. The key is portion size, your total calories, protein target, and allergies. If it fits your goal and does not trigger a restriction, it can stay.`;
  }

  if (has(/(what|when).*(eat|meal|food).*(before|pre).*(workout|gym|train)/)) return "Before training, eat easy fuel: carbs + a little protein 60–120 minutes before. Example: banana + yogurt, rice + eggs, oats + whey, or toast + peanut butter.";
  if (has(/(what|when).*(eat|meal|food).*(after|post).*(workout|gym|train)/)) return "After training, get protein + carbs within a few hours. Example: chicken rice bowl, eggs and toast, tofu rice bowl, Greek yogurt with fruit, or a protein shake plus banana.";
  if (has(/belly fat|lower belly|abs|six pack/)) return "You cannot spot-reduce belly fat. Build abs with core work, but reveal them with overall fat loss: calorie deficit, high protein, lifting, steps, sleep.";
  if (has(/sore|doms|muscle pain|aching/)) return "If it is normal soreness, move lightly, hydrate, eat protein, sleep, and train the area gently after 24–48h. Sharp pain, swelling, or joint pain means stop and get checked.";
  if (has(/warm ?up|stretch before|mobility/)) return "Warm up for 5–8 minutes: light cardio, joint circles, then 2 easy sets of your first exercise. Stretch hard after training, not before heavy lifts.";
  if (has(/cardio.*weights|weights.*cardio|lift.*cardio/)) return "For fat loss or muscle, lift first, cardio after. For endurance priority, cardio first. If possible, separate hard cardio and heavy leg training by several hours.";
  if (has(/beginner|start fitness|start gym|new to gym/)) return "Start simple: 3 full-body sessions weekly, 6–8 exercises, 2–3 sets each, easy cardio or walking on off days, and repeat for 4 weeks before changing everything.";
  if (has(/push ?up|pushup/)) return "For better push-ups: hands under shoulders, body straight, elbows about 30–45° from your ribs, chest close to floor, push the floor away. Use incline push-ups if needed.";
  if (has(/squat/)) return "For squats: feet around shoulder-width, brace your core, knees track over toes, sit between your hips, keep heels down, and stop at the depth you can control.";
  if (has(/deadlift/)) return "For deadlifts: hinge at hips, keep bar close, brace hard, neutral spine, push the floor away, then lock out with glutes — do not yank with your back.";
  if (has(/bench press|benching/)) return "For bench press: shoulder blades back, feet planted, wrists stacked, lower with control to mid-chest, then press up and slightly back. Use a spotter for heavy sets.";
  if (has(/how many.*(set|rep)|sets.*reps|reps.*sets/)) return "General rule: strength 3–5 sets of 3–6 reps, muscle 3–4 sets of 8–12 reps, endurance 2–4 sets of 15–25 reps. Stop 1–2 reps before failure most sets.";
  if (has(/why.*(tired|low energy|sleepy)|always tired|no energy/)) return "Low energy usually comes from poor sleep, low calories, dehydration, stress, too much training, or low iron/vitamin D. Fix sleep + food + water first; if it continues, get bloodwork.";
  if (has(/how long.*(workout|train|gym)|workout.*duration/)) return "Most sessions should be 35–70 minutes. Quality matters more than living in the gym: warm-up, main lifts, accessories, then leave with energy to recover.";
  if (has(/how often.*(workout|train|gym)|times.*week/)) return "A strong default is 3–5 workouts per week. Beginners: 3 full-body days. Intermediate: 4 days upper/lower. Advanced: 5 days if recovery is good.";

  if (/^(what|why|how|when|where|can|should|do|does|is|are|will|which)\b/.test(last) || lastRaw.includes("?")) {
    return `Short answer: yes, I can help with that. For "${lastRaw.slice(0, 80)}", the best next step is to give me your goal, your current situation, and any limits like time, equipment, ingredients, or allergies — then I’ll answer directly and keep it practical.`;
  }

  return null;
}

export function createCoachReply(messages: Pick<ChatMessage, "role" | "content">[]): string {
  const lastRaw = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const last = stripPunct(lastRaw);
  const seed = lastRaw.length + Date.now();
  if (!last) return normalReply("I'm here. What do you want to work on — workout, meal, sleep, or just talk it out?");

  if (/^(hi+|hey+|hello+|yo|sup|hola|howdy|namaste|salaam|hiya)\b/.test(last)) {
    return normalReply(pick([
      "Hey! Good to see you. What are we doing today — workout, meal, or just a quick chat?",
      "Hi there. How can I help — training, food, sleep, or something else on your mind?",
      "Hello! I'm Arc. Tell me what you want to tackle and I'll keep it simple.",
    ], seed));
  }
  if (/\bhow (are|r) (you|u)\b|how('?s| is) it going|what'?s up|how you doing/.test(last)) {
    return normalReply(pick([
      "Doing well — running smooth. More importantly, how are you feeling today? Energy, sleep, mood?",
      "All good on my end. How's your day going? Anything I can help you push through?",
    ], seed));
  }
  if (/your name|who are you|what are you|who('?s| is) this/.test(last)) {
    return normalReply("I'm Arc — your training, nutrition, and routine coach inside this app. Ask me anything: a workout, a meal, a calorie target, or just how to start.");
  }
  if (/\b(thanks|thank you|thx|ty|appreciate)\b/.test(last)) {
    return normalReply(pick(["Anytime. I'm here whenever you need the next push.", "You got it. Tell me when you want the next step."], seed));
  }
  if (/^(bye|goodbye|cya|see ya|gn|good night|gtg)\b/.test(last)) {
    return normalReply("Catch you later. Hydrate, sleep well, and come back tomorrow stronger.");
  }
  if (/help|what can you do|how do you work|features|capabilities/.test(last)) {
    return normalReply("I can build a workout (home or gym, your equipment only), a meal plan (your ingredients, your allergies), explain calories, suggest a daily routine, and answer fitness or food questions. Just ask in plain words.");
  }
  if (/\b(lazy|unmotivated|tired|sad|stress(ed)?|anxious|down|depress|burn(ed|t)? out|give up|quit)\b/.test(last)) {
    return normalReply(pick([
      "Heard. Lower the bar today — 10 minutes of movement, one solid meal, water. Showing up beats doing nothing. What's the smallest thing you can do in the next hour?",
      "Rough days happen. Don't aim for perfect — aim for one rep, one walk, one glass of water. Tell me your day and I'll shape it small.",
    ], seed));
  }
  if (/lose (weight|fat)|fat loss|cut(ting)?|slim down|get lean/.test(last)) {
    return normalReply("Fat loss = small daily calorie deficit + high protein + strength training 3–5x/week + steps. Don't crash diet. Open Diet, set goal to Fat Loss, and Arc will set calories for you.");
  }
  if (/gain (weight|muscle)|bulk|get big|build mass/.test(last)) {
    return normalReply("Muscle gain = slight calorie surplus + 1.6–2.2g protein per kg + progressive overload 4–5x/week + 7–9h sleep. Open Diet, set goal to Bulk, and follow the workout plan consistently.");
  }
  if (/how much protein|protein per|protein intake/.test(last)) {
    return normalReply("Aim for ~1.6–2.2g protein per kg of bodyweight per day. Split across 3–4 meals. Best sources: chicken, eggs, fish, Greek yogurt, tofu, lentils, whey.");
  }
  if (/calorie|kcal|maintenance|tdee/.test(last)) {
    return normalReply("Your maintenance depends on weight, height, age, sex, and activity. Open Diet — enter your stats and Arc calculates it (Mifflin-St Jeor) and sets a target based on your goal.");
  }
  if (/meal|food|recipe|eat|breakfast|lunch|dinner|snack|diet|cook/.test(last)) {
    const foods = parseFoods(last).filter((item) => !hasAvoidedFood([item], avoidTerms(last)));
    if (foods.length) return normalReply(`Got it — I'll stick to: ${foods.join(", ")}. Build the plate with ${foods.slice(0, 3).join(" + ")}, protein first, then carbs, then veg. Open Diet, paste these into "ingredients" and tap Generate.`);
    return normalReply("For meals: protein first, one carb, one veg, a splash of fat. Tell me the foods you have and any allergy and I'll work only with those. Or open Diet and tap Generate.");
  }
  if (/workout|gym|train|exercise|push|pull|legs?|cardio|muscle|reps?|sets?|lift|squat|deadlift|bench/.test(last)) {
    const location = /\bhome\b/.test(last) ? "home" : /\bgym\b/.test(last) ? "gym" : "your selected place";
    const eq = equipmentKey(last)?.toLowerCase();
    return normalReply(`For ${location}${eq ? ` with ${eq}` : ""}: 5 min warm-up, 4–6 exercises for your focus, 3–4 sets of 8–12 reps, 60–90s rest, 5 min cool-down. Open Workout, set location + equipment, Arc gives only matching exercises.`);
  }
  if (/routine|schedule|morning|habit|productiv/.test(last)) {
    return normalReply("Simple winning day: water + 10 min movement on wake-up, top 3 tasks written before phone, protein at first meal, train before scrolling, lights down 45 min before bed. Repeat.");
  }
  if (/sleep|insomnia|nap|rest\b/.test(last)) {
    return normalReply("Sleep fix: fixed wake-up time, no caffeine after 2pm, dim lights 45 min before bed, cool dark room, phone out of arm's reach. Aim 7–9h.");
  }
  if (/water|hydrat|drink/.test(last)) {
    return normalReply("Target ~30–40 ml per kg bodyweight per day, more if training or hot weather. Keep a bottle in sight — that's 80% of the battle.");
  }
  const questionReply = directQuestionAnswer(lastRaw, last);
  if (questionReply) return normalReply(questionReply);
  if (/what time|what day|what date|today.*date/.test(last)) {
    return normalReply(`It's ${new Date().toLocaleString()} on your device. Now — what are we doing with it?`);
  }
  if (/^(yes|yeah|yep|ok|okay|sure|alright|cool|nice)\b/.test(last)) {
    return normalReply("Good. Tell me the next thing — workout, meal, or a question.");
  }
  if (/^(no|nope|nah)\b/.test(last)) {
    return normalReply("All good. What would you rather work on?");
  }
  return normalReply(pick([
    `Got you. Tell me more about "${lastRaw.slice(0, 60)}" — goal, time, what you have — and I'll give a clear next step.`,
    "I'm listening. Share your goal and what you have (food, equipment, time) and I'll keep the answer tight.",
    "Tell me more. The clearer your message, the more useful I am — goal, situation, what's blocking you.",
  ], seed));
}