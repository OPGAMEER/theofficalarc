// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are Arc, a precise nutrition coach. Build a varied, realistic single-day meal plan.
Vary cuisines and ingredients across calls — never repeat the same template.
EVERY meal plan you build is HIGH PROTEIN by default — aim for ~2g protein per kg of bodyweight regardless of cuisine or goal. Every meal must contain a clear, dense protein source (lean meat, fish, eggs, dairy, legumes, tofu/tempeh, or protein-rich grains). Adapt the cuisine authentically while keeping protein high.
Target macros should match user height/weight with a ~maintenance/+slight surplus profile unless told otherwise.
STRICT SAFETY: If the user lists health issues, allergies, intolerances, or dietary restrictions, you MUST exclude any conflicting ingredient (including hidden sources, e.g. butter for lactose intolerance, soy sauce for gluten-free, cured meats for low sodium). When in doubt, substitute a safe alternative.
Return ONLY via the create_diet tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      height_cm = 178,
      weight_kg = 76,
      goal = "maintain",
      cuisine = "auto",
      diet = "any",
      ingredients = "",
      health_issues = "",
      calorie_target,
      protein_boost = 0, // 0..40 (extra % above the goal-specific baseline)
      variety = "fresh", // "fresh" = new dishes, "familiar" = stick to comfort foods
      exclude = [] as string[],
    } = await req.json();
    const boost = Math.max(0, Math.min(40, Number(protein_boost) || 0));
    const targetCalories = Math.max(1200, Math.min(6000, Number(calorie_target) || 0));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seed = Math.floor(Math.random() * 1_000_000);
    const today = new Date().toISOString().slice(0, 10);
    const goalLine =
      goal === "bulk" ? "Goal: lean BULK — caloric surplus (~+15%), high protein (~2g/kg), prioritize muscle gain."
      : goal === "cut" ? "Goal: CUT — moderate deficit (~-15%), very high protein (~2.2g/kg) to preserve muscle while leaning out."
      : goal === "fatloss" ? "Goal: FAT LOSS — aggressive deficit (~-25%), very high protein (~2.4g/kg), high-volume low-calorie foods to maximize fat loss while preserving muscle. Emphasize lean proteins, fibrous veg, and minimize calorie-dense fats/oils."
      : "Goal: MAINTAIN — eat at maintenance, balanced macros with high protein (~2g/kg), recomposition friendly.";
    const cuisineLine =
      !cuisine || cuisine === "auto"
        ? `Cuisine: AUTO — pick the best mix of cuisines for variety and the user's goal.`
        : cuisine === "mixed"
        ? `Cuisine: mixed / everyday foods — no specific regional bias.`
      : `Cuisine: ${cuisine.toUpperCase()} — every meal should be authentic ${cuisine} cuisine (names, spices, techniques). Avoid foods from other cuisines unless absolutely necessary.`;
    const dietLine =
      diet === "veg"
        ? "DIETARY MODE: VEGETARIAN — absolutely no meat, poultry, fish, or seafood. Use eggs/dairy/legumes/tofu/tempeh/paneer/seitan as protein sources while keeping protein high."
        : diet === "nonveg"
        ? "DIETARY MODE: NON-VEGETARIAN — every meal should feature animal protein (meat, poultry, fish, seafood, or eggs) appropriate to the chosen cuisine."
        : "DIETARY MODE: ANY — mix vegetarian and non-vegetarian meals as fits the cuisine.";
    const proteinLine = boost > 0
      ? `PROTEIN BOOST: user requested an additional +${boost}% protein on top of the goal baseline. Push protein noticeably higher and add a second protein source to each meal where reasonable.`
      : `PROTEIN BOOST: none — keep at goal baseline (still high protein).`;
    const calorieLine = targetCalories > 0
      ? `CALORIE CAP: the full day MUST land at or below ${targetCalories} kcal. Keep each meal tight enough that the total never exceeds this cap.`
      : `No explicit calorie cap supplied — follow the goal calories.`;
    const varietyLine = variety === "familiar"
      ? `VARIETY MODE: FAMILIAR — stick to common, comfort-zone meals the user likely already knows. Repeat staples that are simple, popular, easy to cook.`
      : `VARIETY MODE: FRESH — actively pick NEW dishes the user probably hasn't had recently. Surprise them with creative but realistic meals.`;
    const excludeList = Array.isArray(exclude) ? exclude.filter(Boolean).slice(0, 30) : [];
    const excludeLine = excludeList.length
      ? `FORBIDDEN — Do NOT repeat these recently shown meals: ${excludeList.join(", ")}.`
      : `No prior meals to avoid.`;
    const ingLine = ingredients?.trim()
      ? `Use primarily these ingredients the user has on hand: ${ingredients}. Only add minimal pantry staples if needed.`
      : `User did not specify ingredients — pick varied, realistic foods.`;
    const healthLine = health_issues?.trim()
      ? `CRITICAL — User health issues / allergies / restrictions: ${health_issues}. You MUST NOT include any food, ingredient, or hidden source that conflicts with these. Substitute safe alternatives.`
      : `No reported health restrictions.`;
    const userPrompt = `Build today's meal plan for height ${height_cm}cm, weight ${weight_kg}kg.
${goalLine}
${cuisineLine}
${dietLine}
${proteinLine}
${calorieLine}
${varietyLine}
${excludeLine}
${ingLine}
${healthLine}
Variation seed: ${seed}. Use date ${today}. Include 4 meals (Breakfast, Lunch, Snack, Dinner) with realistic times.
Each meal: 3-5 short item strings (e.g., "Oats · 80g"). Hit reasonable kcal/protein/carbs/fat for the stated goal.
For EACH meal also write a short, beginner-friendly recipe: 3-6 imperative steps (≤14 words each), plus prep_min and cook_min in minutes. Assume the user has never cooked it before — be specific (temperatures, times, pan size).`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        temperature: 1.0,
        tools: [{
          type: "function",
          function: {
            name: "create_diet",
            description: "Return a structured one-day diet plan.",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string" },
                kcal: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                meals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      time: { type: "string", description: "HH:MM" },
                      kcal: { type: "number" },
                      items: { type: "array", items: { type: "string" } },
                      prep_min: { type: "number", description: "Prep time in minutes" },
                      cook_min: { type: "number", description: "Cook time in minutes" },
                      recipe: {
                        type: "array",
                        description: "Beginner-friendly numbered cooking steps",
                        items: { type: "string" },
                      },
                    },
                    required: ["name", "time", "kcal", "items", "prep_min", "cook_min", "recipe"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["date", "kcal", "protein_g", "carbs_g", "fat_g", "meals"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_diet" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("AI error", res.status, txt);
      const status = res.status === 429 ? 429 : res.status === 402 ? 402 : 500;
      const msg = status === 429
        ? "Rate limited. Try again in a moment."
        : status === 402
        ? "AI credits exhausted. Add funds in Lovable workspace settings."
        : "AI request failed";
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data: any = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "No plan generated" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const plan = JSON.parse(call.function.arguments);

    // ===== Server-side dietary validation =====
    // Catch any meat/fish leaking into a vegetarian plan, or pure-veg meals labeled as non-veg.
    const MEAT_RE =
      /\b(chicken|beef|pork|lamb|mutton|veal|bacon|ham|sausage|chorizo|salami|pepperoni|prosciutto|turkey|duck|goose|venison|rabbit|liver|kidney|tripe|gelatin|lard|fish|salmon|tuna|cod|trout|tilapia|haddock|sardine|mackerel|anchov|herring|shrimp|prawn|crab|lobster|squid|octopus|oyster|mussel|clam|scallop|caviar|seafood|meat|steak|burger|carne|jamon)\b/i;

    if (diet === "veg") {
      const violations: string[] = [];
      const cleaned = (plan.meals || []).map((m: any) => {
        const items: string[] = Array.isArray(m.items) ? m.items : [];
        const recipe: string[] = Array.isArray(m.recipe) ? m.recipe : [];
        const bad = items.filter((s) => MEAT_RE.test(s));
        if (bad.length || MEAT_RE.test(m.name || "") || recipe.some((s) => MEAT_RE.test(s))) {
          violations.push(m.name || "(unnamed meal)");
        }
        return m;
      });
      if (violations.length) {
        console.warn("[generate-diet] veg violation in:", violations);
        return new Response(
          JSON.stringify({
            error: "Plan contained non-vegetarian items. Please regenerate.",
            violations,
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      plan.meals = cleaned;
    }

    if (diet === "nonveg") {
      // Make sure at least 3 of the 4 meals contain animal protein
      const meals = Array.isArray(plan.meals) ? plan.meals : [];
      const ANIMAL_RE = /\b(chicken|beef|pork|lamb|mutton|turkey|duck|fish|salmon|tuna|cod|trout|tilapia|shrimp|prawn|crab|egg|eggs|whey|yogurt|cheese|paneer|milk|bacon|ham|sausage|seafood|meat|steak)\b/i;
      const animalCount = meals.filter((m: any) => {
        const hay = `${m.name} ${(m.items || []).join(" ")} ${(m.recipe || []).join(" ")}`;
        return ANIMAL_RE.test(hay);
      }).length;
      if (meals.length >= 3 && animalCount < Math.max(3, meals.length - 1)) {
        console.warn("[generate-diet] non-veg plan too vegetarian; animal meals:", animalCount);
        return new Response(
          JSON.stringify({ error: "Plan didn't include enough animal protein. Regenerate." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (targetCalories > 0 && Number(plan.kcal) > targetCalories) {
      console.warn("[generate-diet] calorie cap exceeded", { targetCalories, actual: plan.kcal });
      return new Response(
        JSON.stringify({ error: "Plan exceeded calorie target. Regenerate." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-diet error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
