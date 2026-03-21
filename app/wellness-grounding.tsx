import React, { useMemo, useState } from "react";
import { View, Pressable, Platform, TextInput } from "react-native";
import { router } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { AppHeader } from "../src/ui/AppHeader";
import { toast } from "../src/ui/toast";

type Step = {
  title: string;
  prompt: string;
  count: number;
  key: string;
};

const flow: Step[] = [
  { title: "5 things you can SEE", prompt: "Type 5 things you see around you.", count: 5, key: "see" },
  { title: "4 things you can FEEL", prompt: "Type 4 things you can feel (clothes, chair, air).", count: 4, key: "feel" },
  { title: "3 things you can HEAR", prompt: "Type 3 sounds you can hear.", count: 3, key: "hear" },
  { title: "2 things you can SMELL", prompt: "Type 2 smells (or imagine a smell).", count: 2, key: "smell" },
  { title: "1 thing you can TASTE", prompt: "Type 1 taste (or sip water).", count: 1, key: "taste" },
];

export default function WellnessGrounding() {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const step = flow[i];

  const progress = useMemo(() => Math.round(((i + 1) / flow.length) * 100), [i]);

  const onNext = () => {
    if (!text.trim()) {
      toast("Add something", "Type at least one item.");
      return;
    }
    setText("");
    if (i === flow.length - 1) {
      toast("Done", "Nice. Your brain is back in the present.");
      router.back();
      return;
    }
    setI((x) => x + 1);
  };

  return (
    <Screen>
      <AppHeader title="Grounding" />

      <View style={{ gap: theme.space.xl }}>
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            padding: theme.space.xl,
            gap: theme.space.sm,
          }}
        >
          <AppText variant="small" style={{ opacity: 0.8 }}>
            Step {i + 1}/{flow.length} • {progress}%
          </AppText>

          <AppText style={{ fontWeight: "900", fontSize: 20 }}>{step.title}</AppText>
          <AppText variant="sub">{step.prompt}</AppText>

          <View
            style={{
              marginTop: theme.space.sm,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={`Example: "lamp, door, phone..."`}
              placeholderTextColor="rgba(255,255,255,0.45)"
              multiline
              style={{
                color: theme.colors.text,
                fontSize: 14,
                fontWeight: "600",
                minHeight: 80,
                outlineStyle: "none" as any,
              }}
            />
          </View>

          <AppText variant="small" style={{ opacity: 0.8 }}>
            Tip: separate with commas. You don’t need all {step.count}, just start.
          </AppText>
        </View>

        <View style={{ flexDirection: "row", gap: theme.space.sm }}>
          <Pressable
            onPress={() => setI((x) => Math.max(0, x - 1))}
            disabled={i === 0}
            style={({ pressed }) => ({
              flex: 1,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingVertical: 14,
              alignItems: "center",
              opacity: i === 0 ? 0.4 : pressed ? 0.92 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>Back</AppText>
          </Pressable>

          <Pressable
            onPress={onNext}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>{i === flow.length - 1 ? "Finish" : "Next"}</AppText>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            paddingVertical: 14,
            alignItems: "center",
            opacity: pressed ? 0.9 : 1,
            ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
          })}
        >
          <AppText style={{ fontWeight: "900" }}>Back to Wellness</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}