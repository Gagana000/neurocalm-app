// src/chatbot/emotionalIntelligence.ts

export type Emotion =
  | "stressed"
  | "anxious"
  | "sad"
  | "angry"
  | "happy"
  | "neutral"
  | "excited"
  | "tired"
  | "overwhelmed"
  | "hopeful"
  | "grateful"
  | "lonely";

export type StressLevel = "Low" | "Medium" | "High";
export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

export type UserProfile = {
  userId: string;
  name?: string;
  preferredStyle?: "gentle" | "direct" | "encouraging" | "calm";
  recentEmotions: Emotion[];
  stressLevel?: StressLevel;
  sessionStart: Date;
  messageCount: number;
  topicsDiscussed: string[];
  riskLevel: RiskLevel;
  riskDetected: boolean;
  riskMessageCount: number;
  lastRiskTime?: Date;
  copingStrategiesUsed: string[];
  positiveMoments: string[];
};

// ============================================
// EMOTION DETECTION ENGINE
// ============================================

const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  stressed: [
    "stressed", "pressure", "deadline", "workload", "too much",
    "overwhelming", "burnout", "can't keep up", "behind", "busy"
  ],
  anxious: [
    "anxious", "anxiety", "nervous", "worry", "worried", "panic",
    "scared", "fear", "dread", "uneasy", "restless"
  ],
  sad: [
    "sad", "depressed", "hopeless", "empty", "lonely", "grief",
    "lost", "heartbroken", "tears", "crying", "miserable"
  ],
  angry: [
    "angry", "mad", "frustrated", "annoyed", "irritated", "rage",
    "furious", "hate", "upset", "resentful"
  ],
  happy: [
    "happy", "joy", "wonderful", "amazing", "great", "fantastic",
    "excited", "blessed", "grateful", "thankful"
  ],
  excited: [
    "excited", "thrilled", "can't wait", "looking forward", "pumped",
    "energized", "enthusiastic"
  ],
  tired: [
    "tired", "exhausted", "fatigue", "drained", "sleepy", "no energy",
    "worn out", "depleted"
  ],
  overwhelmed: [
    "overwhelmed", "can't handle", "too much", "spinning", "lost",
    "drowning", "suffocating"
  ],
  hopeful: [
    "hopeful", "optimistic", "looking up", "better", "improving",
    "light at the end", "positive"
  ],
  grateful: [
    "grateful", "thankful", "appreciate", "blessed", "fortunate",
    "lucky", "counting blessings"
  ],
  lonely: [
    "lonely", "alone", "isolated", "abandoned", "unwanted",
    "forgotten", "no one cares"
  ],
  neutral: [
    "okay", "fine", "alright", "so-so", "meh", "not bad", "normal"
  ]
};

// ============================================
// EMOTION-SPECIFIC RESPONSES
// ============================================

const EMOTION_RESPONSES: Record<Emotion, {
  initial: string[];
  followUp: string[];
  interventions: string[];
  tone: "gentle" | "direct" | "encouraging" | "calm";
}> = {
  stressed: {
    tone: "calm",
    initial: [
      "🧘 I hear that you're feeling stressed. Let's pause for a moment. Would you like to try a quick breathing exercise together?",
      "💆 Stress can feel heavy. You're not alone in this. What's one small thing you could set aside right now to lighten your load?",
      "🌊 I notice your stress. Let's take a deep breath together. Inhale slowly... and exhale. Feel that release? You're doing great."
    ],
    followUp: [
      "How are you feeling now? Remember, small breaks can make a big difference.",
      "Stress doesn't define you. What usually helps you feel more grounded?",
      "You've handled stressful moments before. What helped you then?"
    ],
    interventions: [
      "box-breathing",
      "progressive-muscle-relaxation",
      "mindful-moment"
    ]
  },

  anxious: {
    tone: "gentle",
    initial: [
      "🤍 I hear your anxiety. Let's bring you back to the present moment. Look around and tell me 3 things you can see right now.",
      "🕊️ Anxiety can feel overwhelming, but it will pass. Let's breathe together. In for 4, hold for 4, out for 6...",
      "🌿 Your anxiety is valid, and you're safe right now. Let's ground ourselves. What can you feel beneath your feet?"
    ],
    followUp: [
      "You're doing really well. How does your body feel now?",
      "Anxiety is like a wave - it rises and falls. You're riding it beautifully.",
      "Would you like to try another grounding technique together?"
    ],
    interventions: [
      "5-4-3-2-1-grounding",
      "breathing-exercise",
      "cognitive-shift"
    ]
  },

  sad: {
    tone: "gentle",
    initial: [
      "💙 I hear your sadness. It's okay to not be okay. Would you like to share what's weighing on your heart?",
      "🌧️ Sadness is a natural part of being human. You're not alone in this. I'm here to listen without judgment.",
      "🕯️ I'm holding space for you. When you're ready, tell me what's been on your mind."
    ],
    followUp: [
      "Thank you for trusting me with your feelings. What would bring you even a small moment of comfort right now?",
      "You're showing incredible strength just by being here. What's one tiny thing you could do for yourself today?",
      "Healing isn't linear. Every small step counts. What's one kind thing you can tell yourself right now?"
    ],
    interventions: [
      "self-compassion",
      "gentle-movement",
      "gratitude-practice"
    ]
  },

  angry: {
    tone: "calm",
    initial: [
      "🔥 I can feel your anger. It's a powerful emotion. Let's channel that energy constructively. Want to try releasing it physically?",
      "⚡ Anger often signals something important. What's really bothering you? Let's explore it together.",
      "💪 Your anger is valid. Let's find a healthy way to express it. Have you tried tensing and releasing your muscles?"
    ],
    followUp: [
      "That took courage to share. How can I support you right now?",
      "Anger can be a teacher. What is it telling you about what you need?",
      "You're doing great expressing this. Would you like to try a quick physical release exercise?"
    ],
    interventions: [
      "progressive-muscle-relaxation",
      "physical-release",
      "cognitive-reframing"
    ]
  },

  happy: {
    tone: "encouraging",
    initial: [
      "😊 That's wonderful to hear! What's bringing you joy right now? Let's celebrate this moment together.",
      "🎉 I love this energy! Tell me more about what's making you happy. These moments are precious.",
      "✨ Your happiness is contagious! What's one thing you're grateful for today?"
    ],
    followUp: [
      "How can you carry this positive energy forward?",
      "Remember this feeling - it's always available to you.",
      "What's one way you could share this joy with someone else?"
    ],
    interventions: [
      "gratitude-amplification",
      "joy-anchoring",
      "positive-reflection"
    ]
  },

  excited: {
    tone: "encouraging",
    initial: [
      "🎊 I love your excitement! What's got you so pumped? Let's channel this energy!",
      "⚡ Your enthusiasm is electric! Tell me everything about what you're excited for.",
      "🌟 This energy is amazing! How can we make the most of this motivated feeling?"
    ],
    followUp: [
      "What's the first step toward that exciting thing?",
      "How can you capture this excitement and use it?",
      "You've got this! What's next on your adventure?"
    ],
    interventions: [
      "goal-setting",
      "action-planning",
      "momentum-building"
    ]
  },

  tired: {
    tone: "gentle",
    initial: [
      "😴 I hear you're tired. Rest is not a luxury - it's a necessity. When can you take a real break?",
      "🛌 Your body is asking for rest. Let's honor that. What's one small thing you can set down right now?",
      "🌙 Fatigue is your body's way of saying it needs care. What would true rest look like for you right now?"
    ],
    followUp: [
      "You deserve rest. What's one boundary you can set today to protect your energy?",
      "Rest is productive too. How can you give yourself permission to pause?",
      "You're doing so much. What can wait until tomorrow?"
    ],
    interventions: [
      "rest-guidance",
      "energy-conservation",
      "sleep-hygiene"
    ]
  },

  overwhelmed: {
    tone: "calm",
    initial: [
      "🌀 I hear you're feeling overwhelmed. Let's break this down. What's the ONE thing you could focus on right now?",
      "🌊 When everything feels like too much, let's zoom in. What's the smallest, easiest task you could do?",
      "💫 You don't have to do everything at once. Let's make a tiny list. What's the most important thing?"
    ],
    followUp: [
      "You're doing great. What's one thing you can let go of right now?",
      "Progress, not perfection. What small step can you take?",
      "You've got this. What support would help lighten your load?"
    ],
    interventions: [
      "task-prioritization",
      "micro-steps",
      "brain-dump"
    ]
  },

  hopeful: {
    tone: "encouraging",
    initial: [
      "🌈 Hope is powerful! What's giving you hope right now? Let's nurture that.",
      "✨ I can feel your hope - it's beautiful. What possibilities are opening up for you?",
      "🌱 Hope is the seed of change. What's growing in your life right now?"
    ],
    followUp: [
      "How can you water this hope and help it grow?",
      "What's one action that aligns with this hopeful feeling?",
      "You're creating momentum. What's next?"
    ],
    interventions: [
      "vision-boarding",
      "goal-setting",
      "gratitude-expansion"
    ]
  },

  grateful: {
    tone: "encouraging",
    initial: [
      "🙏 Gratitude is such a gift! What else are you grateful for today?",
      "💖 Thank you for sharing this. Gratitude multiplies when shared. What's one more thing you appreciate?",
      "✨ Your gratitude shines bright. How does it feel to focus on what's going well?"
    ],
    followUp: [
      "How can you carry this grateful energy forward?",
      "Who else could you share this gratitude with?",
      "What's one small thing you could do to express this gratitude?"
    ],
    interventions: [
      "gratitude-journal",
      "appreciation-expression",
      "mindfulness-practice"
    ]
  },

  lonely: {
    tone: "gentle",
    initial: [
      "💙 I hear your loneliness. You're not alone right now. I'm here with you. Would you like to talk about what's on your mind?",
      "🤝 Loneliness can feel heavy. Let's sit with this feeling together. What would connection look like for you right now?",
      "🕯️ You matter, even when you feel alone. What's one small way you could connect with someone today?"
    ],
    followUp: [
      "You're doing something brave by being here. What would help you feel more connected?",
      "Loneliness isn't permanent. What's one tiny step toward connection you could take?",
      "I'm grateful you're sharing this with me. You're not alone in this."
    ],
    interventions: [
      "connection-planning",
      "self-compassion",
      "community-resources"
    ]
  },

  neutral: {
    tone: "encouraging",
    initial: [
      "😌 Thanks for checking in. Even neutral days are part of the journey. What's one thing that could make today meaningful?",
      "🌿 Neutral is a perfectly good place to be. What would you like to explore together?",
      "💭 Sometimes 'just okay' is exactly right. What's on your mind today?"
    ],
    followUp: [
      "What would you like to focus on today?",
      "Is there anything you'd like to explore or work on?",
      "I'm here for whatever you need - big or small."
    ],
    interventions: [
      "gentle-check-in",
      "curiosity-prompt",
      "reflection"
    ]
  }
};

// ============================================
// INTERVENTION TECHNIQUES
// ============================================

const INTERVENTIONS: Record<string, string[]> = {
  "box-breathing": [
    "Let's try box breathing:\n\n• Breathe in for 4 seconds\n• Hold for 4 seconds\n• Breathe out for 4 seconds\n• Hold for 4 seconds\n\nRepeat 4 times. How do you feel?"
  ],
  "5-4-3-2-1-grounding": [
    "Let's ground ourselves:\n\n• 5 things you can SEE\n• 4 things you can FEEL\n• 3 things you can HEAR\n• 2 things you can SMELL\n• 1 thing you can TASTE\n\nName them for me when you're ready."
  ],
  "progressive-muscle-relaxation": [
    "Let's release tension:\n\n• Tense your shoulders for 5 seconds... release\n• Clench your fists... release\n• Tighten your stomach... release\n• Flex your feet... release\n\nNotice how your body feels now."
  ],
  "mindful-moment": [
    "Take a mindful moment:\n\nNotice your breath. Notice the air moving in and out. If your mind wanders, gently bring it back to your breath. Stay here for 1 minute."
  ],
  "cognitive-shift": [
    "Let's shift perspective:\n\n1. What thought is causing distress?\n2. What evidence supports it?\n3. What evidence contradicts it?\n4. What's a more balanced thought?"
  ],
  "self-compassion": [
    "Let's practice self-compassion:\n\nRepeat after me:\n• 'This is a moment of suffering'\n• 'Suffering is part of life'\n• 'May I be kind to myself'\n\nHow does that feel?"
  ],
  "gentle-movement": [
    "Gentle movement can help:\n\n• Stretch your arms overhead\n• Roll your shoulders back\n• Turn your neck gently side to side\n• Take a slow walk around your space"
  ],
  "gratitude-practice": [
    "Let's find three things:\n\nName three things you're grateful for today - they can be small.\n\n1. \n2. \n3.\n\nNotice how this feels."
  ],
  "physical-release": [
    "Let's release that energy:\n\n• Shake out your hands\n• Jump in place for 10 seconds\n• Push against a wall\n• Take 5 deep breaths\n\nFeel the release?"
  ],
  "cognitive-reframing": [
    "Let's reframe:\n\nWhat's frustrating you right now?\n\nNow, what's one thing about this situation you can control?\n\nWhat's one thing you can learn from it?"
  ],
  "gratitude-amplification": [
    "Let's amplify that joy:\n\nWhy does this make you happy?\n\nWho could you share this joy with?\n\nHow can you create more moments like this?"
  ],
  "joy-anchoring": [
    "Let's anchor this joy:\n\nWhere do you feel this happiness in your body?\n\nWhat does it feel like?\n\nTake a mental picture of this moment to return to later."
  ],
  "positive-reflection": [
    "Let's reflect:\n\nWhat's working well in your life right now?\n\nWhat strengths are you using?\n\nWhat's one thing you're proud of?"
  ],
  "goal-setting": [
    "Let's set a goal:\n\nWhat's one thing you want to accomplish?\n\nWhat's the first small step?\n\nWhen will you take it?"
  ],
  "action-planning": [
    "Let's make a plan:\n\nWhat's exciting you?\n\nWhat needs to happen first?\n\nWhat support do you need?"
  ],
  "momentum-building": [
    "Let's build momentum:\n\nWhat's one small win you can have today?\n\nHow will you celebrate it?\n\nWhat's next?"
  ],
  "rest-guidance": [
    "Let's plan rest:\n\nWhen can you take a true break?\n\nWhat does rest look like for you?\n\nWhat can wait until you're rested?"
  ],
  "energy-conservation": [
    "Let's protect your energy:\n\nWhat's draining you?\n\nWhat can you say 'no' to today?\n\nWhat recharges you?"
  ],
  "sleep-hygiene": [
    "Let's improve sleep:\n\n• Same bedtime each night\n• No screens 1 hour before bed\n• Cool, dark room\n• Relaxing wind-down routine"
  ],
  "task-prioritization": [
    "Let's prioritize:\n\nList everything on your mind:\n\nNow, what's the ONE most important thing?\n\nWhat can wait?"
  ],
  "micro-steps": [
    "Let's take micro-steps:\n\nWhat's one 2-minute task you can do?\n\nJust start there.\n\nYou can do this."
  ],
  "brain-dump": [
    "Let's clear your mind:\n\nWrite down everything you're thinking about.\n\nDon't organize, just dump.\n\nHow does it feel to get it out?"
  ],
  "vision-boarding": [
    "Let's imagine possibilities:\n\nIf things were ideal, what would they look like?\n\nWhat's one thing you can do to move toward that?"
  ],
  "gratitude-expansion": [
    "Let's expand gratitude:\n\nWhat's something you often take for granted?\n\nWhat's something beautiful you noticed today?\n\nWhat's something you're looking forward to?"
  ],
  "gratitude-journal": [
    "Let's practice gratitude journaling:\n\nWrite down three things you're grateful for each day.\n\nThey can be small - a warm cup of tea, a kind word, a sunny window."
  ],
  "appreciation-expression": [
    "Let's express appreciation:\n\nWho's someone you appreciate?\n\nWhat would you want to thank them for?\n\nHow could you let them know?"
  ],
  "mindfulness-practice": [
    "Let's practice mindfulness:\n\nNotice your breath for 1 minute.\n\nWhen your mind wanders, gently return.\n\nThis is practicing being present."
  ],
  "connection-planning": [
    "Let's plan connection:\n\nWho's someone you feel comfortable with?\n\nWhen could you reach out?\n\nWhat's one small way to connect?"
  ],
  "community-resources": [
    "Here are ways to connect:\n\n• Local community centers\n• Support groups (in-person or online)\n• Volunteer opportunities\n• Interest-based clubs"
  ],
  "gentle-check-in": [
    "Let's check in:\n\nWhat's present for you right now?\n\nWhat would feel supportive?\n\nWhat's one thing you need?"
  ],
  "curiosity-prompt": [
    "What's something you've been curious about lately?\n\nWhat would you like to explore more?\n\nWhat brings you wonder?"
  ],
  "reflection": [
    "Take a moment to reflect:\n\nWhat's one thing you learned about yourself recently?\n\nWhat's something you'd like to understand better?"
  ]
};

// ============================================
// EMOTION DETECTION FUNCTION
// ============================================

function detectEmotion(message: string): Emotion {
  const lowerMsg = message.toLowerCase();

  // Check each emotion's keywords
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword)) {
        return emotion as Emotion;
      }
    }
  }

  return "neutral";
}

// ============================================
// MAIN CHATBOT FUNCTION
// ============================================

export function getAdvancedBotReply(
  message: string,
  profile?: UserProfile
): string {
  // Create or use existing profile
  let userProfile = profile;
  if (!userProfile) {
    userProfile = {
      userId: "unknown",
      sessionStart: new Date(),
      messageCount: 0,
      recentEmotions: [],
      topicsDiscussed: [],
      riskLevel: "Low",
      riskDetected: false,
      riskMessageCount: 0,
      copingStrategiesUsed: [],
      positiveMoments: []
    };
  }

  // Detect emotion from message
  const detectedEmotion = detectEmotion(message);

  // Update user's emotional history
  userProfile.recentEmotions = [detectedEmotion, ...(userProfile.recentEmotions || [])].slice(0, 5);
  userProfile.messageCount++;

  // Check for crisis keywords first
  const crisisRisk = checkCrisisRisk(message);
  if (crisisRisk.isCrisis) {
    return getCrisisResponse(crisisRisk.level, userProfile);
  }

  // Get emotion-specific response
  const emotionData = EMOTION_RESPONSES[detectedEmotion];

  // Check if this is a new emotion or follow-up
  const isNewEmotion = userProfile.recentEmotions[1] !== detectedEmotion;

  let response = "";

  // Select appropriate response based on whether it's initial or follow-up
  if (isNewEmotion || userProfile.messageCount <= 2) {
    response = emotionData.initial[Math.floor(Math.random() * emotionData.initial.length)];
  } else {
    response = emotionData.followUp[Math.floor(Math.random() * emotionData.followUp.length)];
  }

  // Check if user wants an intervention
  if (message.toLowerCase().includes("yes") ||
      message.toLowerCase().includes("try") ||
      message.toLowerCase().includes("help me")) {

    const intervention = emotionData.interventions[
      Math.floor(Math.random() * emotionData.interventions.length)
    ];
    const interventionText = INTERVENTIONS[intervention];

    if (interventionText) {
      response += "\n\n" + interventionText[Math.floor(Math.random() * interventionText.length)];
      userProfile.copingStrategiesUsed.push(intervention);
    }
  }

  // Add personalized touch with name if available
  if (userProfile.name && !response.includes(userProfile.name)) {
    const nameInsert = Math.random() > 0.7;
    if (nameInsert) {
      response = response.replace(/^(.)/, `$1 ${userProfile.name}, `);
    }
  }

  // Store positive moments for future reference
  if (detectedEmotion === "happy" || detectedEmotion === "excited" || detectedEmotion === "grateful") {
    userProfile.positiveMoments.push(message.substring(0, 100));
    if (userProfile.positiveMoments.length > 5) userProfile.positiveMoments.shift();
  }

  return response;
}

// ============================================
// CRISIS DETECTION
// ============================================

const CRISIS_KEYWORDS = {
  critical: [
    "suicide", "kill myself", "end my life", "want to die",
    "self harm", "hurt myself", "can't go on", "no reason to live",
    "better off dead", "ending it", "stop the pain", "take my life",
    "want to end it", "should just die"
  ],
  high: [
    "hopeless", "worthless", "trapped", "desperate", "alone",
    "unbearable", "giving up", "no one cares", "nothing matters"
  ]
};

function checkCrisisRisk(message: string): { isCrisis: boolean; level: RiskLevel } {
  const lowerMsg = message.toLowerCase();

  for (const keyword of CRISIS_KEYWORDS.critical) {
    if (lowerMsg.includes(keyword)) {
      return { isCrisis: true, level: "Critical" };
    }
  }

  for (const keyword of CRISIS_KEYWORDS.high) {
    if (lowerMsg.includes(keyword)) {
      return { isCrisis: true, level: "High" };
    }
  }

  return { isCrisis: false, level: "Low" };
}

function getCrisisResponse(level: RiskLevel, profile: UserProfile): string {
  profile.riskDetected = true;
  profile.riskLevel = level;
  profile.riskMessageCount++;
  profile.lastRiskTime = new Date();

  if (level === "Critical") {
    return "🚨 I'm very concerned about what you're sharing. Your safety is the priority right now.\n\nPlease contact emergency services immediately:\n• Emergency: 911\n• Crisis Lifeline: 988\n• Text HOME to 741741\n\nYou matter, and there are people ready to help you.";
  }

  return "⚠️ I hear that you're struggling significantly. It's important to connect with professional support.\n\n• Crisis Lifeline: 988\n• Crisis Text Line: Text HOME to 741741\n\nWould you like to talk about what's going on?";
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export class EmotionalSessionManager {
  private sessions: Map<string, UserProfile> = new Map();

  createSession(userId: string, name?: string): UserProfile {
    const session: UserProfile = {
      userId,
      name,
      sessionStart: new Date(),
      messageCount: 0,
      recentEmotions: [],
      topicsDiscussed: [],
      riskLevel: "Low",
      riskDetected: false,
      riskMessageCount: 0,
      copingStrategiesUsed: [],
      positiveMoments: []
    };

    this.sessions.set(userId, session);
    return session;
  }

  getSession(userId: string): UserProfile | undefined {
    return this.sessions.get(userId);
  }

  updateSession(userId: string, updates: Partial<UserProfile>): UserProfile {
    const session = this.sessions.get(userId);
    if (!session) {
      return this.createSession(userId);
    }

    const updated = { ...session, ...updates };
    this.sessions.set(userId, updated);
    return updated;
  }

  getEmotionalSummary(userId: string): string {
    const session = this.sessions.get(userId);
    if (!session) return "";

    const emotions = session.recentEmotions.slice(0, 5);
    const uniqueEmotions = [...new Set(emotions)];
    const primaryEmotion = emotions[0] || "neutral";

    let summary = `📊 **Session Summary**\n\n`;
    summary += `Emotional journey: ${emotions.map(e => getEmotionEmoji(e)).join(" → ")}\n\n`;
    summary += `Primary emotion: ${getEmotionEmoji(primaryEmotion)} ${primaryEmotion}\n`;
    summary += `Coping strategies tried: ${session.copingStrategiesUsed.length}\n`;
    summary += `Positive moments captured: ${session.positiveMoments.length}\n\n`;

    if (session.positiveMoments.length > 0) {
      summary += `✨ **Moments of joy:**\n`;
      session.positiveMoments.slice(-3).forEach(moment => {
        summary += `• "${moment.substring(0, 60)}..."\n`;
      });
    }

    return summary;
  }

  endSession(userId: string): string {
    const summary = this.getEmotionalSummary(userId);
    this.sessions.delete(userId);
    return summary;
  }
}

function getEmotionEmoji(emotion: Emotion): string {
  const emojis: Record<Emotion, string> = {
    stressed: "😫",
    anxious: "😰",
    sad: "😔",
    angry: "😠",
    happy: "😊",
    excited: "🤩",
    tired: "😴",
    overwhelmed: "😵",
    hopeful: "🌈",
    grateful: "🙏",
    lonely: "💙",
    neutral: "😌"
  };
  return emojis[emotion] || "💭";
}

export function getGreeting(name?: string, emotion?: Emotion): string {
  const greetings = [
    `Hello${name ? ` ${name}` : ''}! 👋 I'm your emotional wellness companion. How are you feeling today?`,
    `Hi there${name ? ` ${name}` : ''}! 💙 I'm here to support you through whatever you're feeling. What's on your mind?`,
    `Welcome${name ? ` ${name}` : ''}! 🌟 I'm here to listen without judgment. How can I support you today?`
  ];

  return greetings[Math.floor(Math.random() * greetings.length)];
}