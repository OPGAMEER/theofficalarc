// Maps exercise names to looping demo GIFs from fitnessprogramer.com.
// All URLs in this file are HTTP-200 verified. Unverified exercises map to a
// closely related verified demo so the user always gets useful form footage.
// Order matters — most specific patterns first.

const LIBRARY: { match: RegExp; url: string }[] = [
  // Chest
  { match: /incline.*(bench|press|dumbbell)/i,        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif" },
  { match: /decline.*(bench|press)/i,                 url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif" },
  { match: /dumbbell.*(bench|chest)\s*press/i,        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press-1.gif" },
  { match: /bench\s*press/i,                          url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif" },
  { match: /chest\s*fly|pec\s*fly|cable\s*fly|crossover/i, url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif" },
  { match: /diamond\s*push/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Diamond-Push-up.gif" },
  { match: /pike\s*push/i,                            url: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Pike-Push-up.gif" },
  { match: /push[-\s]?up/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif" },

  // Shoulders
  { match: /arnold\s*press/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Arnold-Press.gif" },
  { match: /(overhead|shoulder)\s*press|ohp/i,        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shoulder-Press.gif" },
  { match: /lateral\s*raise/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif" },
  { match: /front\s*raise/i,                          url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Front-Raise.gif" },
  { match: /rear\s*delt|reverse\s*fly/i,              url: "https://fitnessprogramer.com/wp-content/uploads/2022/01/Dumbbell-Rear-Delt-Row.gif" },
  { match: /face\s*pull/i,                            url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif" },
  { match: /shrug/i,                                  url: "https://fitnessprogramer.com/wp-content/uploads/2021/04/Dumbbell-Shrug.gif" },
  { match: /handstand/i,                              url: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Pike-Push-up.gif" },

  // Back
  { match: /pull[-\s]?up/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif" },
  { match: /chin[-\s]?up/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/03/Chin-Up.gif" },
  { match: /lat\s*pull|pulldown/i,                    url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif" },
  { match: /t[-\s]?bar\s*row/i,                       url: "https://fitnessprogramer.com/wp-content/uploads/2021/04/t-bar-rows.gif" },
  { match: /seated\s*(cable\s*)?row/i,                url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif" },
  { match: /one[-\s]?arm.*row|single[-\s]?arm.*row/i, url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif" },
  { match: /inverted\s*row/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Inverted-Row.gif" },
  { match: /(bent.*over\s*)?row/i,                    url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif" },
  { match: /superman/i,                               url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Superman-exercise.gif" },

  // Legs
  { match: /goblet\s*squat/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif" },
  { match: /front\s*squat/i,                          url: "https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif" },
  { match: /bulgarian\s*split/i,                      url: "https://fitnessprogramer.com/wp-content/uploads/2021/05/Dumbbell-Bulgarian-Split-Squat.gif" },
  { match: /pistol\s*squat/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pistol-Squat.gif" },
  { match: /jump\s*squat/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Pistol-Squat.gif" },
  { match: /sumo\s*deadlift/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2021/04/Barbell-Sumo-Deadlift.gif" },
  { match: /sumo\s*squat/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif" },
  { match: /squat/i,                                  url: "https://fitnessprogramer.com/wp-content/uploads/2023/01/Dumbbell-Goblet-Squat.gif" },
  { match: /romanian|rdl/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif" },
  { match: /deadlift/i,                               url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif" },
  { match: /walking\s*lunge/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif" },
  { match: /reverse\s*lunge/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2022/08/bodyweight-reverse-lunge.gif" },
  { match: /lunge/i,                                  url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif" },
  { match: /step[-\s]?up/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif" },
  { match: /leg\s*press/i,                            url: "https://fitnessprogramer.com/wp-content/uploads/2015/11/Leg-Press.gif" },
  { match: /leg\s*extension/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/LEG-EXTENSION.gif" },
  { match: /leg\s*curl|hamstring\s*curl/i,            url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Curl.gif" },
  { match: /hip\s*thrust/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif" },
  { match: /glute\s*bridge/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif" },
  { match: /calf\s*raise|calves/i,                    url: "https://fitnessprogramer.com/wp-content/uploads/2021/06/Standing-Calf-Raise.gif" },
  { match: /wall\s*sit/i,                             url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Glute-Bridge-.gif" },

  // Arms
  { match: /hammer\s*curl/i,                          url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif" },
  { match: /preacher\s*curl/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif" },
  { match: /barbell\s*curl/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif" },
  { match: /curl/i,                                   url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif" },
  { match: /skull\s*crusher|lying\s*tricep/i,         url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Dips.gif" },
  { match: /tricep\s*pushdown|rope\s*pushdown/i,      url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Dips.gif" },
  { match: /tricep|dip/i,                             url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Dips.gif" },

  // Core
  { match: /plank/i,                                  url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif" },
  { match: /russian\s*twist/i,                        url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif" },
  { match: /bicycle/i,                                url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Bicycle-Crunch.gif" },
  { match: /hanging.*knee|hanging.*leg/i,             url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif" },
  { match: /leg\s*raise/i,                            url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif" },
  { match: /v[-\s]?up/i,                              url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Sit-ups.gif" },
  { match: /sit[-\s]?up/i,                            url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Sit-ups.gif" },
  { match: /crunch|abs/i,                             url: "https://fitnessprogramer.com/wp-content/uploads/2015/11/Crunch.gif" },
  { match: /dead\s*bug/i,                             url: "https://fitnessprogramer.com/wp-content/uploads/2021/05/Dead-Bug.gif" },
  { match: /hollow\s*hold|hollow\s*body/i,            url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Raise.gif" },

  // Conditioning / cardio / olympic
  { match: /burpee/i,                                 url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/burpees.gif" },
  { match: /mountain\s*climber/i,                     url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Mountain-climber.gif" },
  { match: /jumping\s*jack/i,                         url: "https://fitnessprogramer.com/wp-content/uploads/2021/05/Jumping-jack.gif" },
  { match: /high\s*knee/i,                            url: "https://fitnessprogramer.com/wp-content/uploads/2021/05/Jumping-jack.gif" },
  { match: /(jump\s*rope|skip)/i,                     url: "https://fitnessprogramer.com/wp-content/uploads/2023/10/Skip-Jump-Rope.gif" },
  { match: /box\s*jump/i,                             url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/burpees.gif" },
  { match: /kettlebell\s*swing/i,                     url: "https://fitnessprogramer.com/wp-content/uploads/2021/09/Kettlebell-Swings.gif" },
  { match: /clean.*jerk|clean\s*and\s*jerk/i,         url: "https://fitnessprogramer.com/wp-content/uploads/2025/06/clean-and-jerk.gif" },
  { match: /power\s*clean|clean/i,                    url: "https://fitnessprogramer.com/wp-content/uploads/2021/04/Power-Clean-.gif" },
  { match: /snatch/i,                                 url: "https://fitnessprogramer.com/wp-content/uploads/2025/06/clean-and-jerk.gif" },
  { match: /thruster/i,                               url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shoulder-Press.gif" },
  { match: /farmer/i,                                 url: "https://fitnessprogramer.com/wp-content/uploads/2022/02/Farmers-walk_Cardio.gif" },
  { match: /bear\s*crawl/i,                           url: "https://fitnessprogramer.com/wp-content/uploads/2021/02/plank.gif" },
];

const FALLBACK = "https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif";

export function exerciseMedia(name: string): string {
  for (const entry of LIBRARY) {
    if (entry.match.test(name)) return entry.url;
  }
  return FALLBACK;
}
