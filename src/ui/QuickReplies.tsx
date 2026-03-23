// src/ui/QuickReplies.tsx
import React from "react";
import { View, Pressable, Platform, ScrollView } from "react-native";
import { AppText } from "./AppText";
import { theme } from "./theme";

type QuickReplyProps = {
  onSelect: (text: string) => void;
};

const QUICK_REPLIES = [
  { text: "😊 I'm feeling good", category: "positive" },
  { text: "😐 I'm okay", category: "neutral" },
  { text: "😟 I'm stressed", category: "stressed" },
  { text: "😰 I'm anxious", category: "anxious" },
  { text: "😴 I'm tired", category: "tired" },
  { text: "🌙 Sleep help", category: "sleep" },
  { text: "🧘 Breathing exercise", category: "breathing" },
  { text: "💪 Positive affirmation", category: "affirmation" },
  { text: "🎯 Grounding technique", category: "grounding" },
  { text: "📝 Need to vent", category: "vent" },
];

export function QuickReplies({ onSelect }: QuickReplyProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 4,
        gap: 8,
      }}
    >
      {QUICK_REPLIES.map((reply) => (
        <Pressable
          key={reply.text}
          onPress={() => onSelect(reply.text)}
          style={({ pressed }) => ({
            backgroundColor: "rgba(108,140,255,0.12)",
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 24,
            paddingVertical: 8,
            paddingHorizontal: 16,
            opacity: pressed ? 0.7 : 1,
            ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
          })}
        >
          <AppText style={{ fontWeight: "600", fontSize: 13 }}>
            {reply.text}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}