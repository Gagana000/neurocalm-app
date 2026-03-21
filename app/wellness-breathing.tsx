import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform } from "react-native";
import { router } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { AppHeader } from "../src/ui/AppHeader";
import { toast } from "../src/ui/toast";

type Phase = "Inhale" | "Hold" | "Exhale";

export default function WellnessBreathing() {
  // Simple 4-2-6 pattern
  const inhale = 4;
  const hold = 2;
  const exhale = 6;

  const cycleSeconds = inhale + hold + exhale;

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds since start
  const [minutes, setMinutes] = useState(3);

  const totalSeconds = minutes * 60;

  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => {
      setElapsed((t) => t + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (elapsed >= totalSeconds) {
      setRunning(false);
      toast("Done", "Nice work. Your nervous system will calm down over time.");
    }
  }, [elapsed, running, totalSeconds]);

  const phase: Phase = useMemo(() => {
    const t = elapsed % cycleSeconds;
    if (t < inhale) return "Inhale";
    if (t < inhale + hold) return "Hold";
    return "Exhale";
  }, [elapsed, cycleSeconds]);

  const phaseRemaining = useMemo(() => {
    const t = elapsed % cycleSeconds;
    if (t < inhale) return inhale - t;
    if (t < inhale + hold) return inhale + hold - t;
    return cycleSeconds - t;
  }, [elapsed, cycleSeconds]);

  const remaining = Math.max(0, totalSeconds - elapsed);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  return (
    <Screen>
      <AppHeader title="Breathing" />

      <View style={{ gap: theme.space.xl }}>
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            padding: theme.space.xl,
            gap: theme.space.sm,
            alignItems: "center",
          }}
        >
          <AppText variant="sub">Time left</AppText>
          <AppText style={{ fontWeight: "900", fontSize: 44 }}>
            {mm}:{ss}
          </AppText>

          <View
            style={{
              marginTop: theme.space.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 999,
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AppText style={{ fontWeight: "900", fontSize: 18 }}>
              {phase} • {phaseRemaining}s
            </AppText>
          </View>

          <AppText variant="small" style={{ opacity: 0.8, textAlign: "center", marginTop: theme.space.sm }}>
            Inhale {inhale}s, Hold {hold}s, Exhale {exhale}s.
          </AppText>
        </View>

        <View style={{ flexDirection: "row", gap: theme.space.sm }}>
          <Pressable
            onPress={() => setRunning((s) => !s)}
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
            <AppText style={{ fontWeight: "900" }}>{running ? "Pause" : "Start"}</AppText>
          </Pressable>

          <Pressable
            onPress={reset}
            style={({ pressed }) => ({
              flex: 1,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>Reset</AppText>
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: theme.space.sm }}>
          {[2, 3, 5].map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMinutes(m);
                setElapsed(0);
                setRunning(false);
              }}
              style={({ pressed }) => ({
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: m === minutes ? "transparent" : theme.colors.border,
                backgroundColor: m === minutes ? theme.colors.primary : "rgba(255,255,255,0.06)",
                opacity: pressed ? 0.92 : 1,
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
              })}
            >
              <AppText style={{ fontWeight: "900" }}>{m} min</AppText>
            </Pressable>
          ))}
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
          <AppText style={{ fontWeight: "900" }}>Back</AppText>
        </Pressable>
      </View>
    </Screen>
  );
}