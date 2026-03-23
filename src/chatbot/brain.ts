type StressLevel = "Low" | "Medium" | "High";

const stressKeywords = {
  High: ["panic", "overwhelmed", "can't handle", "breaking down", "stressed out"],
  Medium: ["tired", "worried", "pressure", "busy", "anxious"],
  Low: ["okay", "fine", "good", "relaxed", "calm"],
};

const topics = {
  sleep: ["sleep", "insomnia", "tired", "awake"],
  anxiety: ["anxiety", "nervous", "panic", "fear"],
  study: ["exam", "study", "assignment", "deadline"],
  mood: ["sad", "happy", "angry", "low"],
};

const blockedWords = ["suicide", "kill", "self-harm"];

export function getBotReply(message: string): string {
  const text = message.toLowerCase();

  // 🚫 Safety filter
  if (blockedWords.some(w => text.includes(w))) {
    return "I'm really sorry you're feeling this way. Please talk to someone you trust or a professional.";
  }

  // 🔍 Detect stress level
  let level: StressLevel = "Low";

  if (stressKeywords.High.some(w => text.includes(w))) level = "High";
  else if (stressKeywords.Medium.some(w => text.includes(w))) level = "Medium";

  // 🧠 Topic detection
  if (topics.sleep.some(w => text.includes(w))) {
    return sleepResponse(level);
  }

  if (topics.anxiety.some(w => text.includes(w))) {
    return anxietyResponse(level);
  }

  if (topics.study.some(w => text.includes(w))) {
    return studyResponse(level);
  }

  if (topics.mood.some(w => text.includes(w))) {
    return moodResponse(level);
  }

  // 💬 fallback
  return generalResponse(level);
}

function sleepResponse(level: StressLevel) {
  if (level === "High") {
    return "It sounds like your sleep is really affecting you. Try relaxing your mind before bed and avoid screens.";
  }
  return "Getting good sleep is important. Try to keep a consistent sleep schedule.";
}

function anxietyResponse(level: StressLevel) {
  if (level === "High") {
    return "It seems you're feeling very anxious. Try slow breathing exercises to calm your body.";
  }
  return "A little anxiety is normal. Take a short break and breathe slowly.";
}

function studyResponse(level: StressLevel) {
  return "Study stress is common. Try breaking tasks into small parts and take short breaks.";
}

function moodResponse(level: StressLevel) {
  if (level === "High") {
    return "I'm sorry you're feeling this way. Try talking to someone you trust or doing something you enjoy.";
  }
  return "Your mood matters. Try doing something small that makes you feel better.";
}

function generalResponse(level: StressLevel) {
  if (level === "High") {
    return "You seem stressed. Take a moment to breathe slowly and reset your mind.";
  }
  if (level === "Medium") {
    return "Try taking a short break. Small steps can help reduce stress.";
  }
  return "You're doing okay. Keep taking care of yourself.";
}