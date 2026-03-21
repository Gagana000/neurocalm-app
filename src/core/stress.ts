export type SymptomKey =
  | "headache"
  | "fast_heartbeat"
  | "stomach_discomfort"
  | "sweating"
  | "muscle_tension"
  | "fatigue"
  | "overthinking"
  | "irritability"
  | "overwhelmed"
  | "difficulty_focusing"
  | "anxiety"
  | "low_motivation";

export type StressLevel = "Low" | "Medium" | "High";
export type EnergyLevel = "Low" | "Normal" | "High";
export type EnjoymentLevel = "No" | "Somewhat" | "Yes";

export const SYMPTOMS: { key: SymptomKey; label: string; weight: number }[] = [
  // Physical
  { key: "headache", label: "Headache", weight: 2 },
  { key: "fast_heartbeat", label: "Fast heartbeat", weight: 3 },
  { key: "stomach_discomfort", label: "Stomach discomfort", weight: 2 },
  { key: "sweating", label: "Sweating", weight: 2 },
  { key: "muscle_tension", label: "Muscle tension", weight: 2 },
  { key: "fatigue", label: "Fatigue", weight: 2 },

  // Mental / emotional
  { key: "overthinking", label: "Overthinking", weight: 3 },
  { key: "irritability", label: "Irritability", weight: 2 },
  { key: "overwhelmed", label: "Feeling overwhelmed", weight: 3 },
  { key: "difficulty_focusing", label: "Difficulty focusing", weight: 2 },
  { key: "anxiety", label: "Anxiety", weight: 3 },
  { key: "low_motivation", label: "Low motivation", weight: 2 },
];

export type StressInput = {
  symptoms: SymptomKey[];
  sleepHours: number;
  mood: number; // 1-5
  selfStress: number; // 0-5
  stressfulEvent: boolean | null;
  intentionalSleepLoss: boolean | null;
  energyLevel: EnergyLevel;
  enjoyment: EnjoymentLevel;
};

export function scoreStress(input: StressInput): {
  score: number;
  level: StressLevel;
  breakdown: {
    symptoms: number;
    sleep: number;
    mood: number;
    selfStress: number;
    stressfulEvent: number;
    intentionalSleepLoss: number;
    energy: number;
    enjoyment: number;
  };
} {
  const {
    symptoms,
    sleepHours,
    mood,
    selfStress,
    stressfulEvent,
    intentionalSleepLoss,
    energyLevel,
    enjoyment,
  } = input;

  // 1) Symptoms: strongest signal
  const symptomScore = symptoms.reduce((sum, key) => {
    const item = SYMPTOMS.find((s) => s.key === key);
    return sum + (item?.weight || 0);
  }, 0);

  // 2) Sleep: useful, but not dominant
  // Important: if low sleep was intentional, reduce penalty.
  let sleepScore = 0;
  if (sleepHours < 3) sleepScore = 4;
  else if (sleepHours < 5) sleepScore = 3;
  else if (sleepHours < 6.5) sleepScore = 2;
  else if (sleepHours < 8) sleepScore = 1;
  else sleepScore = 0;

  if (intentionalSleepLoss === true) {
    // Example: party, gaming night, travel, celebration
    sleepScore = Math.max(0, sleepScore - 2);
  }

  // 3) Mood: lower mood = higher score
  let moodScore = 0;
  if (mood <= 1) moodScore = 4;
  else if (mood === 2) moodScore = 3;
  else if (mood === 3) moodScore = 2;
  else if (mood === 4) moodScore = 1;
  else moodScore = 0;

  // 4) Self-rated stress: strong signal because user knows how they feel
  const selfStressScore = selfStress * 2; // 0 to 10

  // 5) Stressful event today
  const eventScore = stressfulEvent === true ? 3 : 0;

  // 6) Energy level
  let energyScore = 0;
  if (energyLevel === "Low") energyScore = 3;
  else if (energyLevel === "Normal") energyScore = 1;
  else energyScore = 0;

  // 7) Enjoyment: if user enjoyed the day, reduce false positives
  let enjoymentScore = 0;
  if (enjoyment === "No") enjoymentScore = 2;
  else if (enjoyment === "Somewhat") enjoymentScore = 1;
  else enjoymentScore = -1;

  // 8) Intentional sleep loss also slightly reduces score overall
  const intentionalSleepAdjust = intentionalSleepLoss === true ? -2 : 0;

  // Final total
  const rawScore =
    symptomScore +
    sleepScore +
    moodScore +
    selfStressScore +
    eventScore +
    energyScore +
    enjoymentScore +
    intentionalSleepAdjust;

  const score = Math.max(0, rawScore);

  let level: StressLevel = "Low";
  if (score >= 19) level = "High";
  else if (score >= 10) level = "Medium";
  else level = "Low";

  return {
    score,
    level,
    breakdown: {
      symptoms: symptomScore,
      sleep: sleepScore,
      mood: moodScore,
      selfStress: selfStressScore,
      stressfulEvent: eventScore,
      intentionalSleepLoss: intentionalSleepAdjust,
      energy: energyScore,
      enjoyment: enjoymentScore,
    },
  };
}

export function recommendations(level: StressLevel): string[] {
  if (level === "High") {
    return [
      "Pause and take 10 slow breaths.",
      "Try the grounding or body scan tool.",
      "Reduce stimulation for 10–15 minutes.",
      "Reach out to someone you trust if needed.",
      "If you feel unsafe, contact emergency services.",
    ];
  }

  if (level === "Medium") {
    return [
      "Take a short break and reset your body.",
      "Try 2 minutes of breathing.",
      "Drink water and stretch your shoulders or neck.",
      "Notice one thing causing stress and reduce it.",
    ];
  }

  return [
    "You seem relatively stable right now.",
    "Keep a healthy routine with sleep, movement, and breaks.",
    "Use a wellness tool if you want a quick reset.",
  ];
}