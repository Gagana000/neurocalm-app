// src/chatbot/enhancedBrain.ts

export type StressLevel = "Low" | "Medium" | "High";
export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export type SessionContext = {
  userId: string;
  stressLevel?: StressLevel;
  userName?: string;
  sessionStart: Date;
  messageCount: number;
  topicsDiscussed: string[];
  riskLevel: RiskLevel;
  lastAssessment?: {
    phq9Score?: number;
    gad7Score?: number;
    date: Date;
  };
  moodTrend?: string[];
  copingStrategiesUsed?: string[];
};

// Clinical Assessment Questions
export const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things?",
  "Feeling down, depressed, or hopeless?",
  "Trouble falling/staying asleep or sleeping too much?",
  "Feeling tired or having little energy?",
  "Poor appetite or overeating?",
  "Feeling bad about yourself?",
  "Trouble concentrating on things?",
  "Moving/speaking slowly or being fidgety/restless?",
  "Thoughts of self-harm?",
];

export const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge?",
  "Not being able to stop worrying?",
  "Worrying too much about different things?",
  "Trouble relaxing?",
  "Being so restless it's hard to sit still?",
  "Becoming easily annoyed or irritable?",
  "Feeling afraid as if something awful might happen?",
];

// Professional Responses with Clinical Tone
const PROFESSIONAL_RESPONSES = {
  greeting: [
    "Hello. I'm your mental health support assistant. How are you feeling today?",
    "Welcome. I'm here to provide professional support. What would you like to discuss?",
    "Good to see you. Let's work together on your mental wellness journey.",
  ],

  // Clinical Assessment
  phq9_intro: [
    "I'd like to ask you a few questions to better understand how you've been feeling. This is the PHQ-9 assessment, which helps evaluate depression symptoms. Please rate each on a scale of 0-3 (0=not at all, 3=nearly every day).",
  ],

  gad7_intro: [
    "Let's assess your anxiety levels using the GAD-7 scale. For each question, rate 0-3 (0=not at all, 3=nearly every day).",
  ],

  // Risk Levels
  critical_risk: [
    "🚨 I'm very concerned about your safety. Please contact emergency services immediately:\n\n• Emergency: 911\n• Crisis Lifeline: 988\n• Text HOME to 741741\n\nYour safety is the priority right now. Please reach out to someone who can help.",
    "What you're sharing is very serious. Please reach out to professional support immediately. Would you like me to help you find resources in your area?",
  ],

  high_risk: [
    "⚠️ I hear that you're struggling significantly. It's important to connect with professional support. Can we work together to create a safety plan?",
    "These feelings can be overwhelming. Let's focus on keeping you safe right now. What support systems do you have available? Who can you reach out to?",
  ],

  moderate_risk: [
    "Thank you for sharing. These feelings are challenging but manageable with support. Would you like to try some coping strategies together?",
    "I appreciate your honesty. Let's explore what might help you feel more stable right now. What usually helps when you feel this way?",
  ],

  // Evidence-Based Interventions
  cbt_thought_record: [
    "🧠 Let's try a CBT thought record:\n\n1. What thought is causing distress?\n2. What evidence supports this thought?\n3. What evidence contradicts it?\n4. What's a more balanced perspective?",
    "Cognitive Behavioral Therapy can help. Can you identify one automatic negative thought you're having right now? Let's examine it together.",
  ],

  dbt_skills: [
    "🎯 Let's practice a DBT skill: STOP\n\n• Stop - Pause before reacting\n• Take a step back - Breathe\n• Observe - What's happening inside and out?\n• Proceed mindfully - What's the most effective choice?",
    "Dialectical Behavior Therapy suggests: When overwhelmed, try ACCEPTS:\n• Activities\n• Contributing\n• Comparisons\n• Emotions (opposite)\n• Pushing away\n• Thoughts\n• Sensations",
  ],

  mindfulness_exercise: [
    "🧘 Mindfulness exercise: Notice your breath for 1 minute. Observe the sensation of air moving in and out. When your mind wanders, gently return to your breath.",
    "Try this 3-minute breathing space:\n\n1. Observe: What's happening right now?\n2. Focus: On your breath\n3. Expand: Awareness to your whole body",
  ],

  // Psychoeducation
  psychoeducation_stress: [
    "📚 Stress is your body's response to demands. When managed well, it can be motivating. When chronic, it can impact physical and mental health. Let's explore healthy coping strategies.",
    "Understanding your stress triggers is key. What situations tend to increase your stress levels?",
  ],

  psychoeducation_anxiety: [
    "📚 Anxiety is your brain's alarm system. Sometimes it's overactive. We can work on calming this response through grounding techniques and cognitive restructuring.",
    "Anxiety often involves catastrophic thinking. Let's examine if your fears are likely or if anxiety is distorting your perception.",
  ],

  psychoeducation_depression: [
    "📚 Depression affects thoughts, feelings, and behaviors. Small actions can help break the cycle. What's one small thing you could do today?",
    "Depression can make things feel impossible. But small steps matter. What's one manageable activity you could try right now?",
  ],

  // Coping Strategies
  coping_strategies: [
    "🛠️ Evidence-based coping strategies:\n\n• Progressive muscle relaxation\n• 5-4-3-2-1 grounding\n• Physical activity\n• Social connection\n• Creative expression\n\nWhich appeals to you?",
    "Let's build your coping toolkit. What's worked for you in the past? What would you like to try?",
  ],

  safety_planning: [
    "📋 Let's create a safety plan:\n\n1. Warning signs: What tells you you're struggling?\n2. Coping strategies: What helps you feel better?\n3. Social support: Who can you reach out to?\n4. Professional support: Who can you contact?\n5. Emergency: 911 or 988",
    "A safety plan can help during difficult moments. Would you like to work on one together?",
  ],

  // Progress Tracking
  progress_check: [
    "📊 Let's check your progress. Compared to last week, how are you feeling? What's improved? What still needs work?",
    "Tracking progress helps identify what's working. What coping strategies have you used this week? How have they helped?",
  ],

  relapse_prevention: [
    "🛡️ Preventing relapse involves maintaining healthy habits. What routines have helped you stay stable? What warning signs should you watch for?",
    "Let's review your relapse prevention plan. What situations might trigger a setback? How will you respond?",
  ],

  // Professional Recommendations
  recommendations: [
    "💡 Based on our discussion, I recommend:\n\n• Continuing regular check-ins\n• Practicing daily mindfulness\n• Maintaining sleep hygiene\n• Connecting with social support\n\nWould you like to focus on one of these?",
    "Professional recommendations:\n\n1. Consider scheduling a therapy appointment\n2. Discuss medication options with a psychiatrist\n3. Join a support group\n4. Increase physical activity\n\nWhich feels most actionable?",
  ],

  // Follow-up
  follow_up: [
    "📅 I'd like to check in with you soon. How does tomorrow sound?",
    "Let's schedule another conversation to track your progress. When would work for you?",
    "I'll be here when you need support. Take care until next time.",
  ],

  // Positive reinforcement
  positive_reinforcement: [
    "🌟 You're showing great strength by reaching out. That takes courage.",
    "💪 I can see you're working hard on your mental health. That's commendable.",
    "✨ Every small step forward matters. You're making progress.",
  ],

  // Fallback
  fallback: [
    "I hear you. Let's explore that further. What specifically is concerning you?",
    "Thank you for sharing. Can you tell me more about that?",
    "I'm listening. What else is on your mind?",
  ],
};

// Crisis Keywords for Risk Assessment
const CRISIS_KEYWORDS = {
  critical: [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "hurt myself", "can't go on", "no reason to live",
    "better off dead", "ending it", "stop the pain", "take my life"
  ],
  high: [
    "overwhelmed", "can't cope", "hopeless", "worthless",
    "trapped", "desperate", "alone", "unbearable", "giving up"
  ],
  moderate: [
    "struggling", "difficult", "hard", "tough",
    "challenging", "anxious", "depressed", "stressed"
  ]
};

// Clinical Keywords
const CLINICAL_KEYWORDS = {
  depression: ["depressed", "hopeless", "worthless", "empty", "sad", "no energy", "can't sleep", "nothing matters"],
  anxiety: ["anxious", "panic", "worry", "nervous", "fear", "racing thoughts", "can't relax"],
  stress: ["stressed", "pressure", "deadline", "workload", "too much", "overwhelming", "burnout"],
  sleep: ["sleep", "insomnia", "tired", "exhausted", "fatigue", "can't sleep"],
  coping: ["cope", "deal with", "handle", "manage", "strategy", "tool"]
};

// Assessment tracking
let pendingAssessment: {
  type: "phq9" | "gad7" | null;
  currentQuestion: number;
  answers: number[];
} = {
  type: null,
  currentQuestion: 0,
  answers: []
};

// Helper Functions
function assessRiskLevel(message: string): RiskLevel {
  const lowerMsg = message.toLowerCase();

  for (const keyword of CRISIS_KEYWORDS.critical) {
    if (lowerMsg.includes(keyword)) return "Critical";
  }

  for (const keyword of CRISIS_KEYWORDS.high) {
    if (lowerMsg.includes(keyword)) return "High";
  }

  for (const keyword of CRISIS_KEYWORDS.moderate) {
    if (lowerMsg.includes(keyword)) return "Moderate";
  }

  return "Low";
}

function detectClinicalTopic(message: string): string | null {
  const lowerMsg = message.toLowerCase();

  for (const [topic, keywords] of Object.entries(CLINICAL_KEYWORDS)) {
    if (keywords.some(kw => lowerMsg.includes(kw))) {
      return topic;
    }
  }
  return null;
}

function getRandomResponse(category: string): string {
  const responses = PROFESSIONAL_RESPONSES[category as keyof typeof PROFESSIONAL_RESPONSES];
  if (!responses || responses.length === 0) {
    return PROFESSIONAL_RESPONSES.fallback[Math.floor(Math.random() * PROFESSIONAL_RESPONSES.fallback.length)];
  }
  return responses[Math.floor(Math.random() * responses.length)];
}

function calculatePHQ9Score(responses: number[]): { score: number; severity: string } {
  const total = responses.reduce((a, b) => a + b, 0);
  let severity = "";
  if (total <= 4) severity = "Minimal depression";
  else if (total <= 9) severity = "Mild depression";
  else if (total <= 14) severity = "Moderate depression";
  else if (total <= 19) severity = "Moderately severe depression";
  else severity = "Severe depression";

  return { score: total, severity };
}

function calculateGAD7Score(responses: number[]): { score: number; severity: string } {
  const total = responses.reduce((a, b) => a + b, 0);
  let severity = "";
  if (total <= 4) severity = "Minimal anxiety";
  else if (total <= 9) severity = "Mild anxiety";
  else if (total <= 14) severity = "Moderate anxiety";
  else severity = "Severe anxiety";

  return { score: total, severity };
}

function handleAssessmentResponse(message: string, context: SessionContext): string | null {
  const numberMatch = message.match(/\d/);
  if (!numberMatch) return null;

  const response = parseInt(numberMatch[0]);
  if (response < 0 || response > 3) return null;

  pendingAssessment.answers.push(response);
  pendingAssessment.currentQuestion++;

  const questions = pendingAssessment.type === "phq9" ? PHQ9_QUESTIONS : GAD7_QUESTIONS;

  if (pendingAssessment.currentQuestion >= questions.length) {
    // Assessment complete
    const result = pendingAssessment.type === "phq9"
      ? calculatePHQ9Score(pendingAssessment.answers)
      : calculateGAD7Score(pendingAssessment.answers);

    // Save to context
    if (pendingAssessment.type === "phq9") {
      context.lastAssessment = {
        ...context.lastAssessment,
        phq9Score: result.score,
        date: new Date()
      };
    } else {
      context.lastAssessment = {
        ...context.lastAssessment,
        gad7Score: result.score,
        date: new Date()
      };
    }

    const assessmentType = pendingAssessment.type === "phq9" ? "depression" : "anxiety";
    const resultText = `Assessment complete. Your ${assessmentType} score is ${result.score} (${result.severity}).\n\n${getRecommendationBasedOnScore(result.score, assessmentType)}`;

    // Reset assessment
    pendingAssessment = { type: null, currentQuestion: 0, answers: [] };

    return resultText;
  }

  // Next question
  return `${questions[pendingAssessment.currentQuestion]}\n\nRate 0-3 (0=not at all, 3=nearly every day):`;
}

function getRecommendationBasedOnScore(score: number, type: string): string {
  if (score >= 15) {
    return "This score indicates significant symptoms. I strongly recommend speaking with a mental health professional. Would you like me to help you find resources?";
  } else if (score >= 10) {
    return "This score suggests moderate symptoms. Regular check-ins and practicing coping strategies may help. Would you like to try some exercises together?";
  } else if (score >= 5) {
    return "This score indicates mild symptoms. Continuing with self-care and monitoring is recommended. What coping strategies have helped you?";
  } else {
    return "Your score is in the minimal range. Keep up with your healthy habits! What's working well for you?";
  }
}

// Main Professional Chatbot Function
export function getEnhancedBotReply(
  message: string,
  context?: SessionContext
): string {
  // Handle active assessments
  if (pendingAssessment.type && context) {
    const assessmentResponse = handleAssessmentResponse(message, context);
    if (assessmentResponse) return assessmentResponse;
  }

  const riskLevel = assessRiskLevel(message);
  const clinicalTopic = detectClinicalTopic(message);

  // Critical risk - immediate escalation
  if (riskLevel === "Critical") {
    return getRandomResponse("critical_risk");
  }

  // High risk - safety planning
  if (riskLevel === "High") {
    return getRandomResponse("high_risk");
  }

  // Moderate risk - check-in
  if (riskLevel === "Moderate") {
    return getRandomResponse("moderate_risk");
  }

  // Check if user wants assessment
  if (message.toLowerCase().includes("phq-9") ||
      message.toLowerCase().includes("depression assessment") ||
      message.toLowerCase().includes("assess depression")) {
    pendingAssessment = { type: "phq9", currentQuestion: 0, answers: [] };
    return getRandomResponse("phq9_intro") + "\n\n" + PHQ9_QUESTIONS[0] + "\n\nRate 0-3:";
  }

  if (message.toLowerCase().includes("gad-7") ||
      message.toLowerCase().includes("anxiety assessment") ||
      message.toLowerCase().includes("assess anxiety")) {
    pendingAssessment = { type: "gad7", currentQuestion: 0, answers: [] };
    return getRandomResponse("gad7_intro") + "\n\n" + GAD7_QUESTIONS[0] + "\n\nRate 0-3:";
  }

  // Clinical topic-specific responses
  if (clinicalTopic === "depression") {
    return getRandomResponse("psychoeducation_depression");
  }

  if (clinicalTopic === "anxiety") {
    return getRandomResponse("psychoeducation_anxiety");
  }

  if (clinicalTopic === "stress") {
    return getRandomResponse("psychoeducation_stress");
  }

  // Intervention based on stress level
  if (context?.stressLevel === "High") {
    return getRandomResponse("cbt_thought_record");
  }

  if (context?.stressLevel === "Medium") {
    return getRandomResponse("mindfulness_exercise");
  }

  // Check for specific coping strategy requests
  if (message.toLowerCase().includes("coping") ||
      message.toLowerCase().includes("strategy") ||
      message.toLowerCase().includes("help me")) {
    return getRandomResponse("coping_strategies");
  }

  if (message.toLowerCase().includes("safety") ||
      message.toLowerCase().includes("plan") ||
      message.toLowerCase().includes("crisis")) {
    return getRandomResponse("safety_planning");
  }

  // Progress tracking
  if (message.toLowerCase().includes("progress") ||
      message.toLowerCase().includes("improve") ||
      message.toLowerCase().includes("better")) {
    return getRandomResponse("progress_check");
  }

  // Check for positive emotions - give reinforcement
  if (message.toLowerCase().includes("good") ||
      message.toLowerCase().includes("great") ||
      message.toLowerCase().includes("better")) {
    return getRandomResponse("positive_reinforcement");
  }

  // Sleep issues
  if (clinicalTopic === "sleep") {
    return getRandomResponse("sleep_poor");
  }

  // Follow-up
  if (message.toLowerCase().includes("follow") ||
      message.toLowerCase().includes("next time") ||
      message.toLowerCase().includes("check in")) {
    return getRandomResponse("follow_up");
  }

  // Default professional response
  return getRandomResponse("recommendations");
}

// Generate clinical summary
export function generateClinicalSummary(context: SessionContext): string {
  const duration = Math.floor((Date.now() - context.sessionStart.getTime()) / 60000);
  const riskLevelText = context.riskLevel === "Critical" ? "🚨 CRITICAL - Immediate attention needed" :
                        context.riskLevel === "High" ? "⚠️ HIGH - Professional referral required" :
                        context.riskLevel === "Moderate" ? "📌 MODERATE - Monitor closely" :
                        "✅ LOW - Continue support";

  return `
📋 Clinical Session Summary
━━━━━━━━━━━━━━━━━━━━━━━━━

Session Duration: ${duration} minutes
Messages Exchanged: ${context.messageCount}
Current Risk Level: ${riskLevelText}
Stress Level: ${context.stressLevel || "Not assessed"}

Topics Discussed:
${context.topicsDiscussed.length > 0 ? context.topicsDiscussed.map(t => `• ${t}`).join("\n") : "• General check-in"}

${context.lastAssessment ? `
📊 Assessment Results:
${context.lastAssessment.phq9Score ? `• PHQ-9: ${context.lastAssessment.phq9Score} - ${calculatePHQ9Score([context.lastAssessment.phq9Score]).severity}` : ""}
${context.lastAssessment.gad7Score ? `• GAD-7: ${context.lastAssessment.gad7Score} - ${calculateGAD7Score([context.lastAssessment.gad7Score]).severity}` : ""}
` : ""}

⚠️ Clinical Notes:
${context.riskLevel === "High" || context.riskLevel === "Critical" ?
"• HIGH RISK - Immediate follow-up required\n• Safety plan needed\n• Professional referral strongly recommended" :
"• Continue monitoring\n• Encourage coping strategies\n• Schedule regular follow-up"}

💡 Recommendations:
• ${context.riskLevel === "High" ? "Contact mental health professional within 24 hours" : "Continue regular check-ins"}
• Practice identified coping strategies daily
• Maintain sleep hygiene and physical activity
• Reach out to support network

Next Steps:
${context.riskLevel === "High" ? "• Schedule professional consultation\n• Create detailed safety plan" : "• Follow up in 3-5 days\n• Track mood and coping strategies"}
  `;
}

// Get greeting with professional tone
export function getGreeting(userName?: string): string {
  const greetings = PROFESSIONAL_RESPONSES.greeting;
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  if (userName && userName.trim()) {
    return greeting.replace("Hello.", `Hello ${userName}.`);
  }
  return greeting;
}