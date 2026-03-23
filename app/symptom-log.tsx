// app/symptom-log.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, View, Pressable, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { Button } from "../src/ui/Button";
import { Chip } from "../src/ui/Chip";
import { theme } from "../src/ui/theme";
import { toast } from "../src/ui/toast";
import { AppHeader } from "../src/ui/AppHeader";

import {
  SYMPTOMS,
  SymptomKey,
  scoreStress,
  recommendations,
} from "../src/core/stress";

type EnergyLevel = "Low" | "Normal" | "High";
type EnjoymentLevel = "No" | "Somewhat" | "Yes";

export default function SymptomLog() {
  const [selected, setSelected] = useState<SymptomKey[]>([]);
  const [sleepHours, setSleepHours] = useState(7);
  const [mood, setMood] = useState(3);

  // NEW fields
  const [selfStress, setSelfStress] = useState(2); // 0-5
  const [stressfulEvent, setStressfulEvent] = useState<boolean | null>(null);
  const [intentionalSleepLoss, setIntentionalSleepLoss] = useState<boolean | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>("Normal");
  const [enjoyment, setEnjoyment] = useState<EnjoymentLevel>("Somewhat");

  const [loading, setLoading] = useState(false);

  const toggle = (k: SymptomKey) => {
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const preview = useMemo(() => {
    const { score, level } = scoreStress({
      symptoms: selected,
      sleepHours,
      mood,
      selfStress,
      stressfulEvent,
      intentionalSleepLoss,
      energyLevel,
      enjoyment,
    });
    return { score, level };
  }, [
    selected,
    sleepHours,
    mood,
    selfStress,
    stressfulEvent,
    intentionalSleepLoss,
    energyLevel,
    enjoyment,
  ]);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.03, duration: 140, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1.0, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [preview.level]);

  const levelColor =
    preview.level === "High"
      ? theme.colors.danger
      : preview.level === "Very High"
      ? theme.colors.danger
      : preview.level === "Medium"
      ? theme.colors.primary2
      : theme.colors.border;

  const onAnalyze = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Not logged in", "Please sign in again.");
      router.replace("/login");
      return;
    }

    if (selected.length === 0) {
      Alert.alert("Select symptoms", "Pick at least one symptom to get accurate analysis.");
      return;
    }

    if (stressfulEvent === null || intentionalSleepLoss === null) {
      Alert.alert("Complete check-in", "Please answer the context questions for better insights.");
      return;
    }

    const recs = recommendations(preview.level);

    try {
      setLoading(true);

      const docRef = await addDoc(collection(db, "symptomLogs"), {
        uid,
        symptoms: selected,
        sleepHours,
        mood,
        selfStress,
        stressfulEvent,
        intentionalSleepLoss,
        energyLevel,
        enjoyment,
        stressScore: preview.score,
        stressLevel: preview.level,
        recommendations: recs,
        createdAt: serverTimestamp(),
      });

      toast("Saved", `Stress: ${preview.level}`);
      router.push({ pathname: "/result", params: { logId: docRef.id } });
    } catch (e: any) {
      Alert.alert("Save failed", e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Quick Check-in" />

      <View style={{ gap: theme.space.xl }}>
        {/* Live preview */}
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
          <View style={{ gap: 10 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <AppText style={{ fontSize: 24 }}>📊</AppText>
                <AppText style={{ fontWeight: "900" }}>Live Stress Preview</AppText>
              </View>
              <AppText variant="sub">
                Your stress score updates as you answer
              </AppText>
            </View>

            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: levelColor,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AppText style={{ fontSize: 16 }}>
                  {preview.level === "High" ? "⚠️" : preview.level === "Medium" ? "😐" : "😊"}
                </AppText>
                <AppText style={{ fontWeight: "900" }}>
                  {preview.level} • {preview.score}
                </AppText>
              </View>
            </Animated.View>
          </View>
        </View>

        {/* Symptoms */}
        <SectionCard title="Symptoms" subtitle="Select what you noticed today">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {SYMPTOMS.map((s) => (
              <Chip
                key={s.key}
                label={s.label}
                selected={selected.includes(s.key)}
                onPress={() => toggle(s.key)}
              />
            ))}
          </View>

          <Pressable
            onPress={() => setSelected([])}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              opacity: pressed ? 0.9 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText variant="small" style={{ textDecorationLine: "underline", opacity: 0.7 }}>
              Clear all symptoms
            </AppText>
          </Pressable>
        </SectionCard>

        {/* Core sliders */}
        <View style={{ gap: theme.space.lg }}>
          <SliderField
            title="Sleep"
            emoji="😴"
            valueLabel={`${sleepHours.toFixed(1)} hours`}
            value={sleepHours}
            min={0}
            max={12}
            step={0.5}
            onChange={setSleepHours}
            hint="Quality sleep helps manage stress"
          />

          <SliderField
            title="Mood"
            emoji={getMoodEmoji(mood)}
            valueLabel={`${mood}/5`}
            value={mood}
            min={1}
            max={5}
            step={1}
            onChange={setMood}
            hint="How would you rate your overall mood today?"
          />

          <SliderField
            title="Self-rated Stress"
            emoji="📊"
            valueLabel={`${selfStress}/5`}
            value={selfStress}
            min={0}
            max={5}
            step={1}
            onChange={setSelfStress}
            hint="How stressed did you feel today?"
          />
        </View>

        {/* Context */}
        <SectionCard
          title="Context"
          subtitle="These help us understand your situation better"
        >
          <BinaryQuestion
            title="Did a stressful event happen today?"
            emoji="⚠️"
            value={stressfulEvent}
            onChange={setStressfulEvent}
          />

          <BinaryQuestion
            title="Was your poor sleep intentional?"
            emoji="🎮"
            value={intentionalSleepLoss}
            onChange={setIntentionalSleepLoss}
          />

          <ChoiceQuestion
            title="Energy level"
            emoji="⚡"
            options={[
              { value: "Low", emoji: "🪫", label: "Low" },
              { value: "Normal", emoji: "🔋", label: "Normal" },
              { value: "High", emoji: "⚡", label: "High" }
            ]}
            value={energyLevel}
            onChange={(v) => setEnergyLevel(v as EnergyLevel)}
          />

          <ChoiceQuestion
            title="Did you enjoy your activities today?"
            emoji="🎉"
            options={[
              { value: "No", emoji: "😞", label: "No" },
              { value: "Somewhat", emoji: "😐", label: "Somewhat" },
              { value: "Yes", emoji: "😊", label: "Yes" }
            ]}
            value={enjoyment}
            onChange={(v) => setEnjoyment(v as EnjoymentLevel)}
          />
        </SectionCard>

        <Button title="Analyze & Save" onPress={onAnalyze} loading={loading} />

        <AppText variant="small">
          Guidance only. If you feel unsafe or in crisis, contact emergency services.
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText style={{ fontSize: 20 }}>
            {title === "Symptoms" && "🔍"}
            {title === "Context" && "📋"}
          </AppText>
          <AppText style={{ fontWeight: "900" }}>{title}</AppText>
        </View>
        {subtitle ? <AppText variant="sub">{subtitle}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function SliderField({
  title,
  emoji,
  valueLabel,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  title: string;
  emoji: string;
  valueLabel: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: theme.space.sm,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText style={{ fontSize: 20 }}>{emoji}</AppText>
          <AppText style={{ fontWeight: "900" }}>{title}</AppText>
        </View>
        <AppText style={{ fontWeight: "900" }}>{valueLabel}</AppText>
      </View>

      {hint ? <AppText variant="sub">{hint}</AppText> : null}

      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.border}
        thumbTintColor={theme.colors.primary}
      />

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <AppText variant="small">{min}</AppText>
        <AppText variant="small">{max}</AppText>
      </View>
    </View>
  );
}

function BinaryQuestion({
  title,
  emoji,
  value,
  onChange,
}: {
  title: string;
  emoji: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
        <AppText style={{ fontWeight: "900" }}>{title}</AppText>
      </View>
      <View style={{ flexDirection: "row", gap: theme.space.sm, flexWrap: "wrap" }}>
        <ChoiceChip label="Yes" selected={value === true} onPress={() => onChange(true)} />
        <ChoiceChip label="No" selected={value === false} onPress={() => onChange(false)} />
      </View>
    </View>
  );
}

function ChoiceQuestion({
  title,
  emoji,
  options,
  value,
  onChange,
}: {
  title: string;
  emoji: string;
  options: Array<{ value: string; emoji: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
        <AppText style={{ fontWeight: "900" }}>{title}</AppText>
      </View>
      <View style={{ flexDirection: "row", gap: theme.space.sm, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <ChoiceChip
            key={opt.value}
            label={`${opt.emoji} ${opt.label}`}
            selected={value === opt.value}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? "transparent" : theme.colors.border,
        backgroundColor: selected ? theme.colors.primary : "rgba(255,255,255,0.04)",
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{label}</AppText>
    </Pressable>
  );
}

// Helper functions
function getMoodEmoji(mood: number): string {
  if (mood <= 2) return "😔";
  if (mood === 3) return "😐";
  return "😊";
}