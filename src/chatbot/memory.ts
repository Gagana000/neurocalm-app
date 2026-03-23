// src/chatbot/memory.ts
type ConversationMemory = {
  lastTopic?: string;
  userName?: string;
  mentionedSleep?: boolean;
  mentionedWork?: boolean;
  mentionedRelationship?: boolean;
  moodTrend: string[];
};

const userMemories = new Map<string, ConversationMemory>();

export function getUserMemory(userId: string): ConversationMemory {
  if (!userMemories.has(userId)) {
    userMemories.set(userId, {
      moodTrend: [],
    });
  }
  return userMemories.get(userId)!;
}

export function updateUserMemory(
  userId: string,
  updates: Partial<ConversationMemory>
) {
  const current = getUserMemory(userId);
  userMemories.set(userId, { ...current, ...updates });
}

export function getPersonalizedResponse(
  userId: string,
  intent: string,
  message: string
): string | null {
  const memory = getUserMemory(userId);

  if (memory.lastTopic === "sleep" && intent === "sleep_poor") {
    return "We talked about sleep before. Have you tried the breathing exercise I suggested?";
  }

  return null;
}