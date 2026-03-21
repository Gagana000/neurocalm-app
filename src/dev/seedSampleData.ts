import { addDoc, collection, Timestamp } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

const symptomSets = [
  ["anxiety", "overthinking", "difficulty_focusing"],
  ["fatigue", "low_motivation"],
  ["headache", "muscle_tension", "irritability"],
  ["fast_heartbeat", "anxiety", "overwhelmed"],
  ["stomach_discomfort", "sweating", "overthinking"],
  ["fatigue", "headache"],
  ["anxiety", "irritability"],
  ["low_motivation", "difficulty_focusing", "fatigue"],
];

const energyLevels = ["Low", "Normal", "High"] as const;
const enjoymentLevels = ["No", "Somewhat", "Yes"] as const;

type EnergyLevel = (typeof energyLevels)[number];
type EnjoymentLevel = (typeof enjoymentLevels)[number];
type StressLevel = "Low" | "Medium" | "High";

export async function seedSampleData() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("User not logged in");

  const logs: any[] = [];

  for (let i = 0; i < 28; i++) {
    const daysAgo = 27 - i;

    const sleepHours = Number((Math.random() * 5 + 4).toFixed(1)); // 4 - 9
    const mood = Math.floor(Math.random() * 5) + 1; // 1 - 5
    const selfStress = Math.floor(Math.random() * 6); // 0 - 5
    const stressfulEvent = Math.random() > 0.55;
    const intentionalSleepLoss = Math.random() > 0.8;
    const energyLevel = energyLevels[Math.floor(Math.random() * energyLevels.length)] as EnergyLevel;
    const enjoyment = enjoymentLevels[Math.floor(Math.random() * enjoymentLevels.length)] as EnjoymentLevel;
    const symptoms = symptomSets[Math.floor(Math.random() * symptomSets.length)];

    let score =
      symptoms.length * 2 +
      (sleepHours < 5 ? 3 : sleepHours < 6.5 ? 2 : 0) +
      (5 - mood) +
      selfStress * 2 +
      (stressfulEvent ? 3 : 0) +
      (energyLevel === "Low" ? 3 : energyLevel === "Normal" ? 1 : 0) +
      (enjoyment === "No" ? 2 : enjoyment === "Somewhat" ? 1 : -1) +
      (intentionalSleepLoss ? -2 : 0);

    if (score < 0) score = 0;

    let stressLevel: StressLevel = "Low";
    if (score >= 19) stressLevel = "High";
    else if (score >= 10) stressLevel = "Medium";

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(8 + (i % 10), 10 + (i % 40), 0, 0);

    logs.push({
      uid,
      symptoms,
      sleepHours,
      mood,
      selfStress,
      stressfulEvent,
      intentionalSleepLoss,
      energyLevel,
      enjoyment,
      stressScore: score,
      stressLevel,
      recommendations:
        stressLevel === "High"
          ? ["Take a break", "Try breathing", "Reduce stimulation"]
          : stressLevel === "Medium"
          ? ["Drink water", "Take 10 breaths", "Stretch"]
          : ["Keep your routine", "Stay active"],
      createdAt: Timestamp.fromDate(createdAt),
    });
  }

  for (const log of logs) {
    await addDoc(collection(db, "symptomLogs"), log);
  }

  return logs.length;
}