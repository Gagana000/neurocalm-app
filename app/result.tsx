import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, Timestamp } from "firebase/firestore";

import { db } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppHeader } from "../src/ui/AppHeader";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { recommendations, scoreStress, SymptomKey } from "../src/core/stress";

type StressLevel = "Low" | "Medium" | "High";
type EnergyLevel = "Low" | "Normal" | "High";
type EnjoymentLevel = "No" | "Somewhat" | "Yes";

type LogDoc = {
  uid: string;
  symptoms: SymptomKey[];
  sleepHours: number;
  mood: number;
  selfStress?: number;
  stressfulEvent?: boolean | null;
  intentionalSleepLoss?: boolean | null;
  energyLevel?: EnergyLevel;
  enjoyment?: EnjoymentLevel;
  stressScore: number;
  stressLevel: StressLevel;
  recommendations?: string[];
  createdAt?: Timestamp;
};

export default function ResultScreen() {
  const params = useLocalSearchParams<{ logId?: string }>();
  const logId = params.logId;

  const [data, setData] = useState<LogDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!logId || typeof logId !== "string") {
      router.replace("/home");
      return;
    }

    (async () => {
      try {
        const snap = await getDoc(doc(db, "symptomLogs", logId));
        if (!snap.exists()) {
          router.replace("/home");
          return;
        }

        const d: any = snap.data();

        setData({
          uid: d.uid,
          symptoms: Array.isArray(d.symptoms) ? d.symptoms : [],
          sleepHours: Number(d.sleepHours || 0),
          mood: Number(d.mood || 3),
          selfStress: typeof d.selfStress === "number" ? d.selfStress : 0,
          stressfulEvent:
            typeof d.stressfulEvent === "boolean" ? d.stressfulEvent : null,
          intentionalSleepLoss:
            typeof d.intentionalSleepLoss === "boolean"
              ? d.intentionalSleepLoss
              : null,
          energyLevel: (d.energyLevel || "Normal") as EnergyLevel,
          enjoyment: (d.enjoyment || "Somewhat") as EnjoymentLevel,
          stressScore: Number(d.stressScore || 0),
          stressLevel: (d.stressLevel || "Low") as StressLevel,
          recommendations: Array.isArray(d.recommendations)
            ? d.recommendations
            : [],
          createdAt: d.createdAt,
        });
      } catch (e) {
        router.replace("/home");
      } finally {
        setLoading(false);
      }
    })();
  }, [logId]);

  const analysis = useMemo(() => {
    if (!data) return null;

    return scoreStress({
      symptoms: data.symptoms,
      sleepHours: data.sleepHours,
      mood: data.mood,
      selfStress: data.selfStress ?? 0,
      stressfulEvent: data.stressfulEvent ?? null,
      intentionalSleepLoss: data.intentionalSleepLoss ?? null,
      energyLevel: data.energyLevel ?? "Normal",
      enjoyment: data.enjoyment ?? "Somewhat",
    });
  }, [data]);

  const finalRecommendations = useMemo(() => {
    if (!data) return [];
    if (data.recommendations?.length) return data.recommendations;
    return recommendations(data.stressLevel);
  }, [data]);

  const levelStyle = useMemo(() => {
    const level = data?.stressLevel || "Low";

    if (level === "High") {
      return {
        bg: "rgba(255,80,80,0.18)",
        border: theme.colors.danger,
      };
    }

    if (level === "Medium") {
      return {
        bg: "rgba(255,190,90,0.18)",
        border: theme.colors.primary2,
      };
    }

    return {
      bg: "rgba(80,200,255,0.14)",
      border: theme.colors.border,
    };
  }, [data]);

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Result" />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <ActivityIndicator />
          <AppText variant="sub">Loading result...</AppText>
        </View>
      </Screen>
    );
  }

  if (!data || !analysis) {
    return (
      <Screen>
        <AppHeader title="Result" />
        <View style={{ gap: theme.space.lg }}>
          <AppText>Result not found.</AppText>
          <PrimaryButton title="Go Home" onPress={() => router.replace("/home")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Your Result" />

      <View style={{ gap: theme.space.xl }}>
        {/* Main score card */}
        <View
          style={{
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            padding: theme.space.xl,
            gap: theme.space.md,
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: levelStyle.bg,
              borderWidth: 1,
              borderColor: levelStyle.border,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
            }}
          >
            <AppText style={{ fontWeight: "900" }}>
              {data.stressLevel} Stress
            </AppText>
          </View>

          <AppText style={{ fontWeight: "900", fontSize: 40 }}>
            {data.stressScore}
          </AppText>

          <AppText variant="sub">
            This score is based on symptoms, sleep, mood, self-rated stress, and daily context.
          </AppText>
        </View>

        {/* Breakdown */}
        <SectionCard title="Score Breakdown" subtitle="How the app estimated your stress today.">
          <BreakdownRow label="Symptoms" value={analysis.breakdown.symptoms} />
          <BreakdownRow label="Sleep" value={analysis.breakdown.sleep} />
          <BreakdownRow label="Mood" value={analysis.breakdown.mood} />
          <BreakdownRow label="Self-rated stress" value={analysis.breakdown.selfStress} />
          <BreakdownRow label="Stressful event" value={analysis.breakdown.stressfulEvent} />
          <BreakdownRow label="Energy" value={analysis.breakdown.energy} />
          <BreakdownRow label="Enjoyment" value={analysis.breakdown.enjoyment} />
          <BreakdownRow label="Intentional sleep adjust" value={analysis.breakdown.intentionalSleepLoss} />
        </SectionCard>

        {/* Context summary */}
        <SectionCard title="Today’s Context">
          <ContextRow label="Sleep" value={`${data.sleepHours.toFixed(1)} hours`} />
          <ContextRow label="Mood" value={`${data.mood}/5`} />
          <ContextRow label="Self-rated stress" value={`${data.selfStress ?? 0}/5`} />
          <ContextRow
            label="Stressful event"
            value={data.stressfulEvent === null ? "Not answered" : data.stressfulEvent ? "Yes" : "No"}
          />
          <ContextRow
            label="Intentional sleep loss"
            value={
              data.intentionalSleepLoss === null
                ? "Not answered"
                : data.intentionalSleepLoss
                ? "Yes"
                : "No"
            }
          />
          <ContextRow label="Energy level" value={data.energyLevel || "Normal"} />
          <ContextRow label="Enjoyment" value={data.enjoyment || "Somewhat"} />
        </SectionCard>

        {/* Symptoms */}
        <SectionCard title="Symptoms Selected">
          {data.symptoms.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {data.symptoms.map((s) => (
                <Pill key={s} label={formatSymptom(s)} />
              ))}
            </View>
          ) : (
            <AppText variant="sub">No symptoms selected.</AppText>
          )}
        </SectionCard>

        {/* Recommendations */}
        <SectionCard title="Recommendations" subtitle="Small actions you can do now.">
          <View style={{ gap: 10 }}>
            {finalRecommendations.map((r, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                <AppText style={{ fontWeight: "900" }}>•</AppText>
                <View style={{ flex: 1 }}>
                  <AppText>{r}</AppText>
                </View>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* Actions */}
        <View style={{ gap: theme.space.sm }}>
          <PrimaryButton title="Back to Dashboard" onPress={() => router.replace("/home")} />
          <GhostButton title="View History" onPress={() => router.push("/history")} />
          <GhostButton title="New Check-in" onPress={() => router.replace("/symptom-log")} />
        </View>

        <AppText variant="small">
          This result is guidance only and not a medical diagnosis.
        </AppText>
      </View>
    </Screen>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: theme.space.md,
      }}
    >
      <View style={{ gap: 6 }}>
        <AppText style={{ fontWeight: "900" }}>{title}</AppText>
        {subtitle ? <AppText variant="sub">{subtitle}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  const sign = value > 0 ? "+" : "";
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <AppText variant="sub">{label}</AppText>
      <AppText style={{ fontWeight: "900" }}>
        {sign}
        {value}
      </AppText>
    </View>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <AppText variant="sub">{label}</AppText>
      <AppText style={{ fontWeight: "900", textAlign: "right", flexShrink: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.05)",
      }}
    >
      <AppText style={{ fontWeight: "900" }}>{label}</AppText>
    </View>
  );
}

function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radius.md,
        paddingVertical: 14,
        alignItems: "center",
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{title}</AppText>
    </Pressable>
  );
}

function GhostButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingVertical: 14,
        alignItems: "center",
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{title}</AppText>
    </Pressable>
  );
}

function formatSymptom(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}