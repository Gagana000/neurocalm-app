import React, { useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { AppHeader } from "../src/ui/AppHeader";
import { toast } from "../src/ui/toast";

const steps = [
  { title: "Settle", text: "Sit comfortably. Unclench jaw. Drop shoulders." },
  { title: "Face", text: "Relax eyes, forehead, jaw. Let the tongue rest." },
  { title: "Neck", text: "Soften the neck. Let shoulders fall away from ears." },
  { title: "Chest", text: "Slow breath. Feel chest rise and fall naturally." },
  { title: "Stomach", text: "Release belly. No need to hold tension here." },
  { title: "Hands", text: "Unclench fists. Let hands feel heavy." },
  { title: "Legs", text: "Relax thighs, calves, and ankles." },
  { title: "Finish", text: "Take 2 deep breaths. You’re done." },
];

export default function WellnessBodyScan() {
  const [i, setI] = useState(0);
  const lastIndex = steps.length - 1;
  const step = steps[i];

  const progress = useMemo(
    () => Math.round(((i + 1) / steps.length) * 100),
    [i]
  );

  const onNext = () => {
    if (i >= lastIndex) {
      toast("Done", "Nice. You can do this anytime.");
      router.back(); // go back to Wellness Hub
      return;
    }
    setI((x) => Math.min(lastIndex, x + 1));
  };

  return (
    <Screen>
      <AppHeader title="Body Scan" />

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
            Step {i + 1}/{steps.length} • {progress}%
          </AppText>

          <AppText style={{ fontWeight: "900", fontSize: 22 }}>
            {step.title}
          </AppText>
          <AppText variant="sub">{step.text}</AppText>
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
              ...(Platform.OS === "web"
                ? ({ cursor: "pointer" } as any)
                : null),
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
              ...(Platform.OS === "web"
                ? ({ cursor: "pointer" } as any)
                : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>
              {i === lastIndex ? "Done" : "Next"}
            </AppText>
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
            ...(Platform.OS === "web"
              ? ({ cursor: "pointer" } as any)
              : null),
          })}
        >
          <AppText style={{ fontWeight: "900" }}>Back to Wellness</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}