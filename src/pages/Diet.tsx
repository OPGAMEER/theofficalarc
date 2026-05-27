import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowRight, Loader2, ChefHat, ChevronDown, Sparkles, Repeat, ShieldCheck, Info, History as HistoryIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDietPlan, useProfile, type DietPlan } from "@/lib/arc-store";
import { saveDietToHistory } from "@/lib/plan-history";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { foodEmoji } from "@/lib/food-emoji";
import { generateLocalDiet } from "@/lib/local-generators";
import { runInBackground, withTimeout } from "@/lib/resilient-actions";

const CUISINES: { id: string; label: string; emoji: string }[] = [
  { id: "auto",        label: "Arc decides",   emoji: "✨" },
  { id: "mixed",       label: "Mixed / Normal", emoji: "🍽️" },
  { id: "indian",      label: "Indian",        emoji: "🇮🇳" },
  { id: "british",     label: "British",       emoji: "🇬🇧" },
  { id: "italian",     label: "Italian",       emoji: "🍝" },
  { id: "mexican",     label: "Mexican",       emoji: "🌮" },
  { id: "chinese",     label: "Chinese",       emoji: "🥡" },
  { id: "japanese",    label: "Japanese",      emoji: "🍱" },
  { id: "korean",      label: "Korean",        emoji: "🍜" },
  { id: "thai",        label: "Thai",          emoji: "🌶️" },
  { id: "vietnamese",  label: "Vietnamese",    emoji: "🍲" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { id: "greek",       label: "Greek",         emoji: "🥙" },
  { id: "french",      label: "French",        emoji: "🥐" },
  { id: "spanish",     label: "Spanish",       emoji: "🥘" },
  { id: "american",    label: "American",      emoji: "🍔" },
  { id: "middleeastern", label: "Middle Eastern", emoji: "🧆" },
  { id: "turkish",     label: "Turkish",       emoji: "🥟" },
  { id: "lebanese",    label: "Lebanese",      emoji: "🌯" },
  { id: "moroccan",    label: "Moroccan",      emoji: "🍛" },
  { id: "ethiopian",   label: "Ethiopian",     emoji: "🍞" },
  { id: "caribbean",   label: "Caribbean",     emoji: "🥥" },
  { id: "brazilian",   label: "Brazilian",     emoji: "🥩" },
  { id: "vegan",       label: "Vegan",         emoji: "🌱" },
  { id: "keto",        label: "Keto",          emoji: "🥑" },
];

type Diet = "any" | "veg" | "nonveg";
// Cuisines that are inherently vegetarian-only
const VEG_ONLY = new Set(["vegan"]);
// Cuisines that are inherently non-veg-leaning (filtered out for veg)
const NONVEG_ONLY = new Set<string>([]);

const MEAL_IMAGES: { match: RegExp; url: string }[] = [
  { match: /breakfast|oats|pancake|omelet|egg|toast|granola|cereal|smoothie/i,
    url: "https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /salad|bowl|greens|veggie|vegetable/i,
    url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /chicken|poultry|turkey/i,
    url: "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /beef|steak|burger/i,
    url: "https://images.pexels.com/photos/1565982/pexels-photo-1565982.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /fish|salmon|tuna|seafood|shrimp/i,
    url: "https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /pasta|noodle|spaghetti/i,
    url: "https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /rice|stir.?fry|asian/i,
    url: "https://images.pexels.com/photos/1410235/pexels-photo-1410235.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /snack|nuts|fruit|yogurt|protein/i,
    url: "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /soup|stew|curry/i,
    url: "https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400" },
  { match: /wrap|sandwich|burrito|taco/i,
    url: "https://images.pexels.com/photos/1647163/pexels-photo-1647163.jpeg?auto=compress&cs=tinysrgb&w=400" },
];
const FALLBACK_MEAL = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400";
function mealImage(name: string, items: string[]): string {
  const hay = `${name} ${items.join(" ")}`;
  for (const m of MEAL_IMAGES) if (m.match.test(hay)) return m.url;
  return FALLBACK_MEAL;
}

type Goal = "bulk" | "cut" | "fatloss" | "maintain";

function calculateNutritionTarget({
  heightCm,
  weightKg,
  age,
  sex,
  goal,
}: {
  heightCm: number;
  weightKg: number;
  age?: number;
  sex?: string;
  goal: Goal;
}) {
  const safeHeight = Math.min(230, Math.max(130, heightCm || 178));
  const safeWeight = Math.min(260, Math.max(35, weightKg || 76));
  const safeAge = Math.min(80, Math.max(16, age || 24));
  const sexKey = String(sex || "OTHER").toUpperCase();
  const sexOffset = sexKey === "MALE" ? 5 : sexKey === "FEMALE" ? -161 : -78;
  const bmr = (10 * safeWeight) + (6.25 * safeHeight) - (5 * safeAge) + sexOffset;
  const maintenance = Math.round((bmr * 1.45) / 25) * 25;
  const bmi = safeWeight / ((safeHeight / 100) ** 2);

  let target = maintenance;
  if (goal === "bulk") target += bmi < 21 ? 350 : 275;
  if (goal === "cut") target -= bmi >= 30 ? 600 : bmi >= 25 ? 450 : 300;
  if (goal === "fatloss") target -= bmi >= 30 ? 800 : bmi >= 25 ? 650 : 500;

  const floor = sexKey === "MALE" ? 1600 : sexKey === "FEMALE" ? 1300 : 1450;
  const proteinFloor = Math.round(safeWeight * (goal === "fatloss" ? 2.4 : goal === "cut" ? 2.2 : 2));
  const bmiLabel = bmi >= 30 ? "HIGHER-WEIGHT" : bmi >= 25 ? "OVERWEIGHT" : bmi >= 18.5 ? "BALANCED" : "UNDERWEIGHT";

  return {
    target: Math.max(floor, Math.round(target / 25) * 25),
    maintenance,
    proteinFloor,
    bmiLabel,
  };
}

export default function Diet() {
  const { plan, setPlan } = useDietPlan();
  const { profile } = useProfile();
  const [height, setHeight] = useState("178");
  const [openRecipe, setOpenRecipe] = useState<number | null>(null);
  const [weight, setWeight] = useState("76");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [cuisine, setCuisine] = useState<string>("auto");
  const [ingredients, setIngredients] = useState("");
  const [healthIssues, setHealthIssues] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [diet, setDiet] = useState<Diet>("any");
  const [variety, setVariety] = useState<"fresh" | "familiar">("fresh");
  const [allergyChips, setAllergyChips] = useState<string[]>([]);

  const ALLERGY_PRESETS: { id: string; label: string; emoji: string; rule: string }[] = [
    { id: "lactose", label: "LACTOSE-FREE", emoji: "🥛", rule: "lactose intolerant — no milk, cheese, butter, cream, yogurt, whey" },
    { id: "gluten",  label: "GLUTEN-FREE",  emoji: "🌾", rule: "celiac / gluten-free — no wheat, barley, rye, regular bread/pasta/flour, soy sauce" },
    { id: "nuts",    label: "NUT-FREE",     emoji: "🥜", rule: "tree-nut + peanut allergy — no almonds, cashews, walnuts, peanuts, pistachios, hazelnuts, pecans, peanut butter, nut oils" },
    { id: "shellfish", label: "NO SHELLFISH", emoji: "🦐", rule: "shellfish allergy — no shrimp, prawns, crab, lobster, oysters, mussels, clams, scallops, squid" },
    { id: "egg",     label: "EGG-FREE",     emoji: "🥚", rule: "egg allergy — no eggs, mayonnaise, egg-based pasta or baked goods" },
    { id: "soy",     label: "SOY-FREE",     emoji: "🫘", rule: "soy allergy — no tofu, tempeh, edamame, soy sauce, soy milk, soy protein" },
    { id: "fish",    label: "NO FISH",      emoji: "🐟", rule: "fish allergy — no fish, anchovies, fish sauce, worcestershire" },
    { id: "porkfree", label: "NO PORK",     emoji: "🐖", rule: "no pork, ham, bacon, prosciutto, lard" },
    { id: "halal",   label: "HALAL",        emoji: "☪️", rule: "halal — no pork, no alcohol; meats must be halal" },
    { id: "kosher",  label: "KOSHER",       emoji: "✡️", rule: "kosher — no pork, no shellfish; do not mix dairy with meat" },
    { id: "lowsodium", label: "LOW SODIUM", emoji: "🧂", rule: "low sodium — minimize added salt, no cured meats, no soy sauce, no processed broths" },
    { id: "lowsugar", label: "LOW SUGAR",   emoji: "🍭", rule: "low sugar / diabetic-friendly — no added sugar, syrups, sweetened drinks; favor low-glycemic carbs" },
  ];

  const toggleChip = (id: string) =>
    setAllergyChips((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const allergyRulesText = allergyChips
    .map((id) => ALLERGY_PRESETS.find((c) => c.id === id)?.rule)
    .filter(Boolean)
    .join("; ");

  const nutritionTarget = useMemo(
    () => calculateNutritionTarget({
      heightCm: Number(height) || 178,
      weightKg: Number(weight) || 76,
      age: profile.age,
      sex: profile.sex,
      goal,
    }),
    [goal, height, profile.age, profile.sex, weight],
  );

  const visibleCuisines = CUISINES.filter((c) => {
    if (c.id === "auto") return true;
    if (diet === "veg") return c.id === "vegan" || !NONVEG_ONLY.has(c.id);
    if (diet === "nonveg") return !VEG_ONLY.has(c.id);
    return true;
  });

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    const useLocalFallback = (reason?: string) => {
      const local = generateLocalDiet({
        diet,
        calorie_target: nutritionTarget.target,
        exclude: plan?.meals?.map((m) => m.name) ?? [],
        health_issues: [allergyRulesText, healthIssues.trim()].filter(Boolean).join(". "),
        seed: Math.floor(Math.random() * 1_000_000) ^ Date.now(),
      });
      setPlan(local);
      runInBackground("diet-history", saveDietToHistory(local));
      toast.success(`Offline meal plan ready · ${local.kcal}/${nutritionTarget.target} kcal${reason ? ` (${reason})` : ""}`);
    };

    try {
      let newPlan: DietPlan | undefined;
      let lastStatus: number | undefined;

      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const { data, error } = await withTimeout(
          supabase.functions.invoke("generate-diet", {
            body: {
              height_cm: Number(height) || 178,
              weight_kg: Number(weight) || 76,
              goal,
              cuisine,
              diet,
              calorie_target: nutritionTarget.target,
              variety,
              exclude: plan?.meals?.map((m) => m.name) ?? [],
              ingredients: ingredients.trim().slice(0, 500),
              health_issues: [allergyRulesText, healthIssues.trim()].filter(Boolean).join(". ").slice(0, 1000),
            },
          }),
          2500,
          "Diet generation",
        );

        if (!error) {
          const candidate = (data as any)?.plan as DietPlan | undefined;
          if (candidate?.kcal && Number(candidate.kcal) > nutritionTarget.target && attempt < MAX_ATTEMPTS - 1) {
            console.warn(`[diet] plan over target (${candidate.kcal}/${nutritionTarget.target}), retrying…`);
            toast.message("Recalibrating to fit your calorie cap…");
            continue;
          }
          newPlan = candidate;
          break;
        }

        lastStatus = (error as any)?.context?.status;
        if (lastStatus !== 422 || attempt === MAX_ATTEMPTS - 1) {
          if (lastStatus === 429) toast.error("Rate limited — using on-device generator.");
          else if (lastStatus === 402) toast.error("AI credits exhausted — using on-device generator.");
          else if (lastStatus === 422) toast.error("Plan missed target — using on-device generator.");
          useLocalFallback("offline");
          return;
        }
      }

      if (!newPlan?.meals?.length) {
        useLocalFallback("empty response");
        return;
      }

      setPlan(newPlan);
      runInBackground("diet-history", saveDietToHistory(newPlan));
      if (Number(newPlan.kcal) > nutritionTarget.target) {
        toast.warning(`Plan is ${Number(newPlan.kcal) - nutritionTarget.target} kcal over target. Tap regenerate to retry.`);
      } else {
        toast.success(`Fresh meals · ${newPlan.kcal}/${nutritionTarget.target} kcal.`);
      }
    } catch (e: any) {
      console.error(e);
      useLocalFallback("offline");
    } finally {
      setLoading(false);
    }
  };

  const p = plan;

  return (
    <div className="px-6 pt-6 pb-24 animate-fade-up">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="mono-label-strong">02 · DIET</span>
        <div className="flex items-center gap-3">
          <Link to="/history" className="flex items-center gap-1.5 mono-label hover:text-text" aria-label="View plan history">
            <HistoryIcon size={11} className="text-[hsl(var(--accent))]" /> HISTORY
          </Link>
          <span className="mono-label">{(profile?.name || "you").toLowerCase()}</span>
        </div>
      </div>

      <h1 className="hero-text text-text mt-8" style={{ fontSize: "clamp(48px,13vw,64px)" }}>
        Eat<br />
        <span className="text-text-muted">like the</span><br />
        <span className="text-[hsl(var(--accent))]">future you.</span>
      </h1>

      {/* Metrics */}
      <div className="mt-10 grid grid-cols-2 gap-6">
        <div>
          <label className="mono-label">HEIGHT (CM)</label>
          <input
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-transparent border-b border-text outline-none mono-num text-text py-2"
            style={{ fontSize: 32 }}
          />
        </div>
        <div>
          <label className="mono-label">WEIGHT (KG)</label>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-transparent border-b border-text outline-none mono-num text-text py-2"
            style={{ fontSize: 32 }}
          />
        </div>
      </div>

      {/* Goal */}
      <div className="mt-8">
        <label className="mono-label">GOAL</label>
        <div className="mt-2 grid grid-cols-4 border border-border">
          {([
            ["cut", "CUT"],
            ["fatloss", "FAT LOSS"],
            ["maintain", "MAINTAIN"],
            ["bulk", "BULK"],
          ] as [Goal, string][]).map(([val, label], i, arr) => {
            const active = goal === val;
            return (
              <button
                key={val}
                onClick={() => setGoal(val)}
                className={`py-3 mono-label-strong text-[11px] transition-colors ${i < arr.length - 1 ? "border-r border-border" : ""} ${
                  active
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--background))]"
                    : "text-text hover:bg-surface"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 border border-border bg-surface p-4">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-3">
          <div>
            <div className="mono-label">ARC CALORIE TARGET</div>
            <div className="text-text-muted text-xs mt-1">Meal plans are generated to stay inside this daily budget.</div>
          </div>
          <div className="text-right">
            <div className="mono-num text-[hsl(var(--accent))]" style={{ fontSize: 32, lineHeight: 1 }}>
              {nutritionTarget.target}
            </div>
            <div className="mono-label text-text-muted">KCAL / DAY</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <div className="mono-label text-[9px]">MAINTAIN</div>
            <div className="mono-num text-text" style={{ fontSize: 16 }}>{nutritionTarget.maintenance}</div>
          </div>
          <div>
            <div className="mono-label text-[9px]">PROTEIN FLOOR</div>
            <div className="mono-num text-text" style={{ fontSize: 16 }}>{nutritionTarget.proteinFloor}g</div>
          </div>
          <div>
            <div className="mono-label text-[9px]">BODY RANGE</div>
            <div className="mono-num text-text" style={{ fontSize: 16 }}>{nutritionTarget.bmiLabel}</div>
          </div>
        </div>
      </div>

      {/* Nutritionist disclaimer + rationale */}
      <div className="mt-3 border border-border bg-background p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[hsl(var(--accent))]" />
          <span className="mono-label-strong text-[10px]">NUTRITIONIST NOTE</span>
        </div>
        <p className="text-text text-sm mt-2 leading-relaxed">
          {(() => {
            const t = nutritionTarget.target;
            const m = nutritionTarget.maintenance;
            const delta = t - m;
            const goalCopy =
              goal === "fatloss" ? `we set an aggressive ${Math.abs(delta)} kcal deficit below your ${m} kcal maintenance to drive fat loss while protecting lean mass`
              : goal === "cut" ? `we use a moderate ${Math.abs(delta)} kcal deficit below your ${m} kcal maintenance for steady, sustainable cutting`
              : goal === "bulk" ? `we add a ${Math.abs(delta)} kcal surplus over your ${m} kcal maintenance to fuel lean mass without excess fat gain`
              : `we sit at your ${m} kcal maintenance for body recomposition and steady performance`;
            return `Based on Mifflin-St Jeor (height, weight, age, sex) calibrated to your ${nutritionTarget.bmiLabel.toLowerCase()} body range, ${goalCopy}. Every meal Arc generates is portioned so the day's total stays at or under ${t} kcal, with a ${nutritionTarget.proteinFloor}g protein floor to preserve muscle.`;
          })()}
        </p>
        <div className="mt-3 pt-3 border-t border-border flex items-start gap-2">
          <Info size={11} className="text-text-muted mt-0.5 flex-shrink-0" />
          <p className="text-text-muted text-[10px] leading-relaxed">
            Arc validates each plan server-side and auto-regenerates if the day exceeds your cap. This is general guidance, not medical advice — consult a registered dietitian for clinical conditions.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <label className="mono-label flex items-center gap-2">
          <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
          CUISINE STYLE
        </label>

        {/* Veg / Non-veg filter */}
        <div className="mt-3 grid grid-cols-3 border border-border">
          {([
            ["any", "ANY", "🍽️"],
            ["veg", "VEG", "🥬"],
            ["nonveg", "NON-VEG", "🍗"],
          ] as [Diet, string, string][]).map(([val, label, emoji], i) => {
            const active = diet === val;
            return (
              <button
                key={val}
                onClick={() => {
                  setDiet(val);
                  // reset cuisine if it's no longer visible
                  if (val === "veg" && NONVEG_ONLY.has(cuisine)) setCuisine("auto");
                  if (val === "nonveg" && VEG_ONLY.has(cuisine)) setCuisine("auto");
                }}
                className={`py-2.5 mono-label-strong text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
                  i < 2 ? "border-r border-border" : ""
                } ${
                  active
                    ? "bg-[hsl(var(--accent))] text-[hsl(var(--background))]"
                    : "text-text hover:bg-surface"
                }`}
              >
                <span aria-hidden>{emoji}</span>
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 -mx-6 px-6 overflow-x-auto no-scrollbar">
          <div className="flex w-max gap-3 pb-2 pr-6 snap-x snap-mandatory">
            {visibleCuisines.map((c, idx) => {
              const active = cuisine === c.id;
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => setCuisine(c.id)}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.025, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative snap-start shrink-0 overflow-hidden border px-4 py-3 text-left min-w-[148px] max-w-[148px] transition-colors ${
                    active
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--background))]"
                      : "border-border bg-surface text-text hover:border-text"
                  }`}
                >
                  {active && (
                    <motion.span
                      aria-hidden
                      layoutId="cuisine-scroll-glow"
                      className="absolute inset-0 bg-[hsl(var(--accent))]"
                      transition={{ type: "spring", stiffness: 360, damping: 28 }}
                    />
                  )}
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        aria-hidden
                        initial={{ opacity: 0.4, scale: 0.75 }}
                        animate={{ opacity: 0, scale: 1.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.55 }}
                        className="absolute inset-0 border border-[hsl(var(--background))]/30"
                      />
                    )}
                  </AnimatePresence>
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <motion.span
                      className="text-2xl leading-none"
                      animate={active ? { y: [0, -4, 0], rotate: [0, -8, 8, 0], scale: [1, 1.14, 1] } : {}}
                      transition={{ duration: 0.55 }}
                      aria-hidden
                    >
                      {c.emoji}
                    </motion.span>
                    {active && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="mono-label text-[hsl(var(--background))]/80"
                      >
                        LIVE
                      </motion.span>
                    )}
                  </div>
                  <div className="relative z-10 mt-5">
                    <div className="mono-label-strong text-[10px] leading-4">
                      {c.label.toUpperCase()}
                    </div>
                    <div className={`mt-1 text-[11px] ${active ? "text-[hsl(var(--background))]/80" : "text-text-muted"}`}>
                      {c.id === "auto" ? "AI picks the best fit" : "Tap to lock this style"}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
        <p className="text-text-muted text-xs mt-2">
          {cuisine === "auto"
            ? "✨ Arc will surprise you with the best mix for your goals."
            : `Arc will lean into ${CUISINES.find((c) => c.id === cuisine)?.label} flavors.`}
        </p>
      </div>

      {/* Protein boost removed */}
      {/* Variety toggle */}
      <div className="mt-8">
        <label className="mono-label flex items-center gap-2">
          <Repeat size={11} className="text-[hsl(var(--accent))]" />
          MEAL STYLE
        </label>
        <div className="mt-2 grid grid-cols-2 border border-border">
          {([
            ["fresh", "NEW DISHES"],
            ["familiar", "FAMILIAR"],
          ] as const).map(([val, label], i) => {
            const active = variety === val;
            return (
              <button
                key={val}
                onClick={() => setVariety(val as any)}
                className={`py-2.5 mono-label-strong text-[11px] flex items-center justify-center gap-1.5 transition-colors ${
                  i === 0 ? "border-r border-border" : ""
                } ${active ? "bg-[hsl(var(--accent))] text-[hsl(var(--background))]" : "text-text hover:bg-surface"}`}
              >
                {val === "fresh" ? <Sparkles size={12} /> : <Repeat size={12} />}
                {label}
              </button>
            );
          })}
        </div>
        <p className="text-text-muted text-xs mt-2">
          {variety === "fresh" ? "Arc will try meals you probably haven't had recently." : "Arc will stick to comfort-zone staples."}
        </p>
      </div>

      {/* Ingredients on hand */}
      <div className="mt-8">
        <label className="mono-label">INGREDIENTS YOU HAVE (OPTIONAL)</label>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value.slice(0, 500))}
          placeholder="e.g. eggs, oats, chicken breast, rice, broccoli, peanut butter…"
          rows={3}
          className="mt-2 w-full bg-transparent border border-border outline-none focus:border-text text-text p-3 text-sm resize-none"
        />
        <div className="mono-label text-[9px] mt-1 text-right">{ingredients.length}/500</div>
      </div>

      {/* Quick allergy / dietary chips */}
      <div className="mt-6">
        <label className="mono-label flex items-center gap-2">
          <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
          QUICK EXCLUSIONS · TAP TO TOGGLE
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALLERGY_PRESETS.map((c) => {
            const active = allergyChips.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleChip(c.id)}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] mono-label-strong transition-colors ${
                  active
                    ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent))] text-[hsl(var(--background))]"
                    : "border-border text-text hover:border-text"
                }`}
              >
                <span aria-hidden>{c.emoji}</span>
                {c.label}
              </button>
            );
          })}
        </div>
        <p className="text-text-muted text-xs mt-2">
          Arc will strictly avoid every ingredient and hidden source for what you select.
          {allergyChips.length > 0 && ` · ${allergyChips.length} active`}
        </p>
      </div>

      {/* Health issues / allergies */}
      <div className="mt-6">
        <label className="mono-label flex items-center gap-2">
          <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />
          ANY HEALTH ISSUES OR ALLERGIES (OPTIONAL)
        </label>
        <textarea
          value={healthIssues}
          onChange={(e) => setHealthIssues(e.target.value.slice(0, 500))}
          placeholder="e.g. lactose intolerant, peanut allergy, diabetic, gluten-free, low sodium…"
          rows={3}
          className="mt-2 w-full bg-transparent border border-border outline-none focus:border-text text-text p-3 text-sm resize-none"
        />
        <div className="mono-label text-[9px] mt-1 text-right">{healthIssues.length}/500</div>
        <p className="text-text-muted text-xs mt-1">Arc will avoid foods that conflict with what you list.</p>
      </div>

      {/* Macros */}
      {p && (() => {
        const within = Number(p.kcal) <= nutritionTarget.target;
        const headroom = nutritionTarget.target - Number(p.kcal);
        return (
          <div className="mt-8">
            <div className={`mb-3 flex items-center justify-between border px-4 py-3 ${within ? "border-[hsl(var(--accent))] bg-surface" : "border-destructive bg-destructive/10"}`}>
              <div className="flex items-center gap-2">
                {within ? <ShieldCheck size={14} className="text-[hsl(var(--accent))]" /> : <Info size={14} className="text-destructive" />}
                <span className="mono-label-strong text-[10px]">
                  {within ? `WITHIN TARGET · ${headroom} KCAL HEADROOM` : `OVER TARGET BY ${Math.abs(headroom)} KCAL`}
                </span>
              </div>
              <span className="mono-num text-text" style={{ fontSize: 18 }}>
                {p.kcal}/{nutritionTarget.target}
              </span>
            </div>
            <div className="grid grid-cols-4 border-t border-l border-border">
              {[
                ["KCAL", p.kcal],
                ["PROTEIN", `${p.protein_g}g`],
                ["CARBS", `${p.carbs_g}g`],
                ["FAT", `${p.fat_g}g`],
              ].map(([l, v]) => (
                <div key={l as string} className="border-r border-b border-border p-3">
                  <div className="mono-label text-[9px]">{l}</div>
                  <div className="mono-num text-text" style={{ fontSize: 18 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Generate */}
      <button
        onClick={generate}
        disabled={loading}
        className="mt-8 w-full flex items-center justify-between border border-text px-5 py-4 disabled:opacity-60"
      >
        <div className="flex items-center gap-2.5">
          {loading
            ? <Loader2 size={14} className="animate-spin text-[hsl(var(--accent))]" />
            : <span className="block w-1.5 h-1.5 bg-[hsl(var(--accent))]" />}
          <span className="mono-label-strong">
            {loading ? "ARC IS THINKING…" : (plan ? "REGENERATE MEAL PLAN" : "GENERATE A MEAL PLAN")}
          </span>
        </div>
        <ArrowRight size={16} />
      </button>

      {/* Meals */}
      <div className="mt-10 flex items-center justify-between border-b border-text pb-2">
        <span className="mono-label-strong">TODAY · MEALS</span>
        <span className="mono-label">{p?.meals.length ?? 0}</span>
      </div>
      {!p && <p className="text-text-muted py-6">Tap "Generate a meal plan" — Arc will draft your day.</p>}
      {p?.meals.map((m, i) => {
        const isOpen = openRecipe === i;
        const totalMin = (m.prep_min ?? 0) + (m.cook_min ?? 0);
        const hasRecipe = (m.recipe?.length ?? 0) > 0;
        return (
          <div key={i} className="border-b border-border py-5">
            <div className="flex gap-4">
              <img
                src={mealImage(m.name, m.items)}
                alt={m.name}
                loading="lazy"
                className="w-20 h-20 object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-text text-base truncate">{m.name}</span>
                  <span className="mono-label flex-shrink-0">{m.time}</span>
                </div>
                <div className="mono-num text-[hsl(var(--accent))]" style={{ fontSize: 22 }}>{m.kcal} kcal</div>
                {(() => {
                  const cap = nutritionTarget.target;
                  const pct = cap > 0 ? Math.min(100, Math.round((Number(m.kcal) / cap) * 100)) : 0;
                  const headroomShare = cap - Number(m.kcal);
                  // Color: green under 35% of cap (light meal), amber 35-50%, red over 50%
                  const tone = pct > 50 ? "destructive" : pct > 35 ? "amber" : "accent";
                  const fill = tone === "destructive"
                    ? "hsl(var(--destructive))"
                    : tone === "amber"
                    ? "#f59e0b"
                    : "hsl(var(--accent))";
                  return (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-border overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${pct}%`, background: fill }} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] mono-label">
                        <span className="text-text-muted">{pct}% OF DAILY CAP</span>
                        <span className={tone === "destructive" ? "text-destructive" : "text-text-muted"}>
                          {headroomShare >= 0 ? `${headroomShare} KCAL HEADROOM` : `${Math.abs(headroomShare)} OVER`}
                        </span>
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.items.map((item, k) => (
                    <span
                      key={k}
                      className="inline-flex items-center gap-1 border border-border px-2 py-0.5 text-xs text-text-muted"
                    >
                      <span aria-hidden="true">{foodEmoji(item)}</span>
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Recipe — How to make it */}
            {hasRecipe && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setOpenRecipe(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-2 border border-border bg-surface hover:border-text transition-colors px-3 py-2.5 group"
                >
                  <span className="flex items-center gap-2">
                    <ChefHat size={14} className="text-[hsl(var(--accent))]" />
                    <span className="mono-label-strong">HOW TO MAKE IT</span>
                    {totalMin > 0 && (
                      <span className="mono-label text-text-muted">· {totalMin} MIN</span>
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180 text-text" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="border-x border-b border-border bg-background p-4 animate-fade-up">
                    {(m.prep_min || m.cook_min) && (
                      <div className="flex gap-4 mb-3 pb-3 border-b border-border">
                        {m.prep_min ? (
                          <div>
                            <div className="mono-label text-[9px]">PREP</div>
                            <div className="mono-num text-text" style={{ fontSize: 16 }}>{m.prep_min}m</div>
                          </div>
                        ) : null}
                        {m.cook_min ? (
                          <div>
                            <div className="mono-label text-[9px]">COOK</div>
                            <div className="mono-num text-text" style={{ fontSize: 16 }}>{m.cook_min}m</div>
                          </div>
                        ) : null}
                      </div>
                    )}
                    <ol className="flex flex-col gap-2.5">
                      {m.recipe!.map((step, k) => (
                        <li key={k} className="flex gap-3 text-sm text-text">
                          <span
                            className="mono-num text-[hsl(var(--accent))] flex-shrink-0"
                            style={{ fontSize: 14, lineHeight: "20px" }}
                          >
                            {String(k + 1).padStart(2, "0")}
                          </span>
                          <span className="leading-snug">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Photo dropzone */}
      <div className="mt-10">
        <span className="mono-label-strong">LOG A MEAL</span>
        <label className="mt-3 block aspect-square w-full border border-dashed border-border bg-surface flex items-center justify-center cursor-pointer relative overflow-hidden">
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Plus size={28} className="text-text-muted" />
              <span className="mono-label">UPLOAD MEAL PHOTO</span>
            </div>
          )}
          <input
            type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(URL.createObjectURL(f));
            }}
          />
        </label>
      </div>
    </div>
  );
}



