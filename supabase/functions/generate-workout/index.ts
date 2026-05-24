// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are Arc, an elite strength coach. Generate a single, varied, high-quality workout plan.
CRITICAL: Each call must produce DIFFERENT exercises. Avoid repeating templates. Reach into a wide library:
calisthenics, plyometrics, unilateral, isometrics, kettlebell, dumbbell, barbell, bands, machine, gymnastics, strongman (sled, farmer carry, sandbag), Olympic lifts (clean, snatch, jerk variants), loaded carries, mobility-strength hybrids.
Match the location and equipment exactly. If equipment is empty/none, use BODYWEIGHT-ONLY movements (no dumbbells,
no bands, no machines) — e.g. push-ups, pike push-ups, pistol squats, lunges, burpees, mountain climbers,
plank, hollow hold, bear crawl, jumping jacks, high knees, superman, glute bridge, wall sit, inverted rows
(only if a sturdy table is implied). Use realistic volumes and RPE.
For popular focuses like upper/lower/full body, rotate in overlooked but excellent movements (landmine press, JM press, Jefferson curl, Cossack squat, Zercher squat, ATG split squat, Kang squat, Pendlay row, meadows row, Z-press, Anderson press, sissy squat, Nordic curl, copenhagen plank, half-kneeling chops, dead-stop variants) and AVOID defaulting to the exact same big-5 template.
Each generated plan must feel like a NEW template — vary the structure (push-pull-legs, upper-lower split, full-body strength, conditioning circuit, gymnastics-strength hybrid, athletic power day, posterior-chain focus, anterior-chain focus, unilateral-only day, tempo day, density day).
Return ONLY via the create_workout tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      location = "GYM",
      equipment = "",
      focus = "FULL BODY",
      duration_min = 45,
      gender = "OTHER",
      exclude = [] as string[],
      variety = "fresh",
      client_seed,
    } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mix server randomness with client-provided seed so identical inputs
    // never collapse to the same plan even if the model caches.
    const seed =
      (Number(client_seed) || 0) ^
      Math.floor(Math.random() * 1_000_000) ^
      Date.now();
    const styles = ["EMOM", "AMRAP-finish", "pyramid", "supersets", "straight sets", "circuit", "drop sets", "tempo-focused", "cluster sets", "ladder", "death-by reps", "every 90s", "rest-pause", "myo-reps", "giant set", "complex chain", "wave loading", "5x5 strength", "10x10 GVT-style"];
    const vibes = ["raw and heavy", "explosive and athletic", "high-volume hypertrophy", "metabolic conditioning", "strength-skill blend", "unilateral focus", "isometric grind", "plyometric power", "gymnastics-inspired", "old-school bodybuilding", "functional athletic", "posterior-chain dominant", "anti-rotation core", "loaded-carry heavy"];
    const templates = ["push-pull-legs day", "upper-lower split", "full-body strength", "conditioning circuit", "gymnastics-strength hybrid", "athletic power day", "posterior-chain focus", "unilateral-only day", "tempo day", "density block", "5/3/1 inspired", "antagonist supersets"];
    const style = styles[Math.abs(seed) % styles.length];
    const vibe = vibes[Math.abs(seed >> 4) % vibes.length];
    const template = templates[Math.abs(seed >> 8) % templates.length];

    const noEquipment = !equipment || /^(none|nothing|no\s*equipment|bodyweight)/i.test(String(equipment).trim());
    const equipLine = noEquipment
      ? "Available equipment: NONE — strictly bodyweight only. Do NOT prescribe dumbbells, kettlebells, bands, or machines."
      : `Available equipment: ${equipment || (location === "HOME" ? "bodyweight only" : "full commercial gym")}.`;

    const excludeList = Array.isArray(exclude) ? exclude.filter(Boolean).slice(0, 40) : [];
    const excludeLine = excludeList.length
      ? `FORBIDDEN — Do NOT include any of these exercises (recently shown to user): ${excludeList.join(", ")}. Pick alternatives.`
      : "No prior exercises to avoid.";

    const g = String(gender || "OTHER").toUpperCase();
    const genderLine =
      g === "MALE"
        ? "Athlete profile: MALE. Tailor selection to a male athlete — emphasize compound strength, upper-body push/pull volume (bench, OHP, weighted dips, pull-ups, rows), heavier posterior-chain pulls (deadlift variants, RDLs), explosive movements (power cleans, sprints, box jumps). Programming should reflect MALE-FOCUSED training norms. Title should hint at this (e.g., 'Iron Push', 'Brute Force')."
        : g === "FEMALE"
        ? "Athlete profile: FEMALE. Tailor selection to a female athlete — emphasize glute-dominant lower-body work (hip thrusts, glute bridges, Bulgarian split squats, sumo deadlifts, cable kickbacks, step-ups), core stability (dead bugs, bird dogs, hollow holds), shapely upper-body toning (lateral raises, face pulls, banded rows, push-ups), and metabolic conditioning. Programming should reflect FEMALE-FOCUSED training norms. Title should hint at this (e.g., 'Glute Forge', 'Sculpt Flow')."
        : "Athlete profile: UNSPECIFIED. Use a balanced, gender-neutral selection.";

    const varietyLine = variety === "familiar"
      ? "VARIETY MODE: FAMILIAR — stick to classic, well-known exercises the user has likely done before (squats, deadlifts, bench, rows, push-ups, pull-ups, lunges, planks). Keep it simple and confidence-building."
      : "VARIETY MODE: FRESH — actively pick NEW, less common exercises. Avoid the obvious go-tos. Surprise the user with movements they probably haven't tried recently.";

    const focusGuide: Record<string, string> = {
      "UPPER":     "UPPER BODY — push + pull balance: 1 horizontal press, 1 vertical press, 1 horizontal pull, 1 vertical pull, plus arms/shoulders accessory.",
      "LOWER":     "LOWER BODY — quad + hamstring + glute balance: 1 squat pattern, 1 hinge pattern, 1 unilateral, 1 calf/posterior accessory.",
      "FULL BODY": "FULL BODY — hit every major pattern: squat, hinge, push, pull, carry/core. No body part skipped.",
      "PUSH":      "PUSH DAY — chest, shoulders, triceps. Mix horizontal + vertical pressing angles.",
      "PULL":      "PULL DAY — back, rear delts, biceps. Mix vertical + horizontal pulls and direct biceps work.",
      "GLUTES":    "GLUTE-DOMINANT — hip thrusts, hinges, abductions, step-ups, glute-focused unilaterals.",
      "ARMS":      "ARMS DAY — biceps + triceps from multiple angles, plus forearm/grip work.",
      "CORE":      "CORE DAY — anti-extension, anti-rotation, anti-lateral-flexion, plus dynamic flexion.",
      "ATHLETIC":  "ATHLETIC POWER — plyometrics, sprints, med-ball throws, explosive lifts, agility work.",
    };
    const focusKey = String(focus || "FULL BODY").toUpperCase();
    const focusLine = focusGuide[focusKey] || `${focusKey} focus — pick exercises that clearly target this area.`;

    const userPrompt = `Build a ${duration_min}-minute ${focus} workout for ${location}.
TEMPLATE FLAVOR: ${template}.
FOCUS GUIDE: ${focusLine}
${equipLine}
${genderLine}
${varietyLine}
Style: ${style}. Vibe: ${vibe}. Variation seed: ${seed} (timestamp ${Date.now()}).
${excludeLine}
Generate 6-8 DISTINCT exercises${variety === "fresh" ? " that I have NOT seen before" : ""}. ${variety === "fresh" ? "Do NOT default to the obvious template — surprise me with movement selection. Each exercise must be UNIQUE — no two exercises that train the same pattern with the same equipment." : "Use solid, classic movements."}
Required structure: 1 primer/activation, 2-3 main compound lifts, 2 accessories, 1 finisher OR core closer.
Subtitle MUST be a clear focus tag (e.g., "UPPER BODY", "LOWER BODY · GLUTE FOCUS", "FULL BODY POWER", "PUSH DAY", "ATHLETIC CONDITIONING").
Cues should be 4-6 words. Title should be punchy (2-4 words).`;

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
            name: "create_workout",
            description: "Return a structured workout plan.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                subtitle: { type: "string" },
                duration_min: { type: "number" },
                rpe: { type: "number", description: "1-10 perceived exertion" },
                volume_kg: { type: "number" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      reps: { type: "string", description: "e.g., 5x5, 3x10, 4xAMRAP" },
                      rest_sec: { type: "number" },
                      cue: { type: "string" },
                    },
                    required: ["name", "reps", "rest_sec", "cue"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "subtitle", "duration_min", "rpe", "volume_kg", "exercises"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_workout" } },
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

    // De-duplicate exercises by normalized name to enforce uniqueness
    if (Array.isArray(plan?.exercises)) {
      const seen = new Set<string>();
      plan.exercises = plan.exercises.filter((e: any) => {
        const key = String(e?.name || "").toLowerCase().replace(/\s+/g, " ").trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-workout error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
