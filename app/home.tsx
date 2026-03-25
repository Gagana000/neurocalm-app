// app/home.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform, ScrollView, Dimensions } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, Timestamp } from "firebase/firestore";

import { auth, db } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { toast } from "../src/ui/toast";

type StressLevel = "Low" | "Medium" | "High";
type EnergyLevel = "Low" | "Normal" | "High";
type EnjoymentLevel = "No" | "Somewhat" | "Yes";

type LogDoc = {
  id: string;
  uid: string;
  createdAt?: Timestamp;
  stressScore: number;
  stressLevel: StressLevel;
  sleepHours: number;
  mood: number;
  selfStress?: number;
  stressfulEvent?: boolean | null;
  intentionalSleepLoss?: boolean | null;
  energyLevel?: EnergyLevel;
  enjoyment?: EnjoymentLevel;
  symptoms: string[];
};

export default function HomeScreen() {
  const [name, setName] = useState<string>("");
  const [logs, setLogs] = useState<LogDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) {
          router.replace("/login");
          return;
        }

        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          setName((userSnap.data()?.name as string) || "");
        }

        const q = query(
          collection(db, "symptomLogs"),
          where("uid", "==", uid),
          orderBy("createdAt", "desc"),
          limit(60)
        );

        const snap = await getDocs(q);

        const rows: LogDoc[] = snap.docs.map((d) => {
          const data: any = d.data();
          return {
            id: d.id,
            uid: data.uid,
            createdAt: data.createdAt,
            stressScore: Number(data.stressScore || 0),
            stressLevel: (data.stressLevel || "Low") as StressLevel,
            sleepHours: Number(data.sleepHours || 0),
            mood: Number(data.mood || 3),
            selfStress: typeof data.selfStress === "number" ? data.selfStress : 0,
            stressfulEvent:
              typeof data.stressfulEvent === "boolean" ? data.stressfulEvent : null,
            intentionalSleepLoss:
              typeof data.intentionalSleepLoss === "boolean"
                ? data.intentionalSleepLoss
                : null,
            energyLevel: (data.energyLevel || "Normal") as EnergyLevel,
            enjoyment: (data.enjoyment || "Somewhat") as EnjoymentLevel,
            symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
          };
        });

        setLogs(rows);
      } catch (e: any) {
        console.log("Home load error:", e?.message || e);
        toast("Error", "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return { text: "Good morning", emoji: "🌅" };
    if (h < 17) return { text: "Good afternoon", emoji: "☀️" };
    return { text: "Good evening", emoji: "🌙" };
  }, []);

  const latest = logs[0] || null;
  const streak = useMemo(() => computeStreak(logs), [logs]);
  const avg7 = useMemo(() => averageInLastDays(logs, 7), [logs]);
  const trend7 = useMemo(() => computeTrend7(logs), [logs]);
  const topSymptoms = useMemo(() => getTopSymptoms(logs, 5), [logs]);
  const insight = useMemo(() => buildDashboardInsight(logs), [logs]);

  // Get trend message with emoji and color
  const getTrendInfo = () => {
    if (loading) return { message: "Loading...", emoji: "🔄", color: theme.colors.subtext };
    if (trend7 > 1) return { message: "Trending Up", emoji: "📈", color: "#ef4444", description: "Stress increased recently" };
    if (trend7 < -1) return { message: "Trending Down", emoji: "📉", color: "#22c55e", description: "Stress decreasing" };
    return { message: "Stable", emoji: "➡️", color: "#facc15", description: "Your stress is consistent" };
  };

  // Get stress level status with emoji and color
  const getStressStatus = () => {
    const level = latest?.stressLevel || "Low";
    switch (level) {
      case "High":
        return { emoji: "⚠️", color: "#ef4444", message: "High Stress", action: "Take a break now" };
      case "Medium":
        return { emoji: "😐", color: "#facc15", message: "Moderate Stress", action: "Try a breathing exercise" };
      default:
        return { emoji: "😊", color: "#22c55e", message: "Low Stress", action: "Keep up the good work!" };
    }
  };

  // Get weekly average rating
  const getWeeklyRating = () => {
    const score = avg7;
    if (score <= 10) return { emoji: "🌟", text: "Excellent", description: "Your stress is well managed" };
    if (score <= 20) return { emoji: "👍", text: "Good", description: "Managing stress effectively" };
    if (score <= 35) return { emoji: "😐", text: "Moderate", description: "Room for improvement" };
    return { emoji: "⚠️", text: "High", description: "Stress levels need attention" };
  };

  // Get streak message
  const getStreakMessage = () => {
    if (streak === 0) return { emoji: "🌱", message: "Start your journey", description: "Log your first check-in" };
    if (streak < 3) return { emoji: "🌿", message: `${streak} day streak`, description: "Building momentum" };
    if (streak < 7) return { emoji: "🌻", message: `${streak} day streak`, description: "Great consistency!" };
    return { emoji: "🏆", message: `${streak} day streak`, description: "Amazing dedication!" };
  };

  const status = getStressStatus();
  const trend = getTrendInfo();
  const weeklyRating = getWeeklyRating();
  const streakInfo = getStreakMessage();

  const onLogout = async () => {
    await signOut(auth);
    toast("Signed out");
    router.replace("/login");
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.space.xl, paddingBottom: theme.space.xl }}
      >
        {/* Header Section */}
        <View style={{ gap: theme.space.sm }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText variant="sub" style={{ fontSize: 14 }}>
                {greeting.emoji} {greeting.text}
              </AppText>
              <AppText variant="h2" style={{ fontSize: 24, fontWeight: "800" }}>
                {name ? name : "Welcome"} 👋
              </AppText>
            </View>

            <Pressable
              onPress={onLogout}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 999,
                paddingVertical: 10,
                paddingHorizontal: 14,
                opacity: pressed ? 0.9 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
              })}
            >
              <AppText style={{ fontWeight: "900", fontSize: 14 }}>🚪</AppText>
              <AppText style={{ fontWeight: "600" }}>Logout</AppText>
            </Pressable>
          </View>

          <AppText variant="sub" style={{ opacity: 0.8, fontSize: 14 }}>
            Track your patterns, manage stress, and build resilience
          </AppText>
        </View>

        {/* Stats Grid - 2x2 */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
          <MiniStat
            title="Current State"
            value={status.message}
            description={status.action}
            color={status.color}
            icon={status.emoji}
          />
          <MiniStat
            title="Weekly Trend"
            value={trend.message}
            description={trend.description}
            color={trend.color}
            icon={trend.emoji}
          />
          <MiniStat
            title="Weekly Average"
            value={weeklyRating.text}
            description={`${avg7.toFixed(1)} score • ${weeklyRating.description}`}
            color="#6C8CFF"
            icon={weeklyRating.emoji}
          />
          <MiniStat
            title="Consistency"
            value={streakInfo.message}
            description={streakInfo.description}
            color="#22C3A6"
            icon={streakInfo.emoji}
          />
        </View>

        {/* Main Status Card - Improved with proper border and alignment */}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ gap: 4 }}>
              <AppText style={{ fontWeight: "700", fontSize: 18 }}>Today's Status</AppText>
              <AppText variant="sub" style={{ fontSize: 13, opacity: 0.7 }}>
                {latest ? "Your latest check-in summary" : "Ready to check in?"}
              </AppText>
            </View>

            <View
              style={{
                backgroundColor: `${status.color}15`,
                borderWidth: 1,
                borderColor: status.color,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
              }}
            >
              <AppText style={{ fontWeight: "600", fontSize: 12, color: status.color }}>
                {status.message}
              </AppText>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
            <View>
              <AppText style={{ fontWeight: "800", fontSize: 48, color: status.color }}>
                {latest ? latest.stressScore : "—"}
              </AppText>
              <AppText variant="small" style={{ opacity: 0.6, fontSize: 12, marginTop: 2 }}>
                Stress Score (0-50)
              </AppText>
            </View>

            {latest?.createdAt && (
              <AppText variant="small" style={{ opacity: 0.5, fontSize: 11 }}>
                {formatDateTime(latest.createdAt)}
              </AppText>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: theme.space.sm, marginTop: theme.space.sm }}>
            <PrimaryAction
              title={latest ? "Log New Check-in" : "Start Check-in"}
              onPress={() => router.push("/symptom-log")}
            />
            <GhostAction title="View History" onPress={() => router.push("/history")} />
          </View>
        </View>

        {/* Insight Cards Row */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
          <InsightCard
            title="Quick Insight"
            emoji="💡"
          >
            <AppText variant="sub" style={{ lineHeight: 20 }}>
              {loading ? "Loading insights..." : insight}
            </AppText>
          </InsightCard>

          <InsightCard
            title="Weekly Goal"
            emoji="🎯"
          >
            <AppText style={{ fontWeight: "900", fontSize: 20, color: "#22C3A6" }}>
              {streak >= 7 ? "Keep Going!" : `${7 - streak} days to goal`}
            </AppText>
            <AppText variant="sub" style={{ fontSize: 12, marginTop: 4 }}>
              {streak >= 7
                ? "Amazing consistency! You're building healthy habits."
                : "Log daily to build a 7-day streak"}
            </AppText>
          </InsightCard>
        </View>

        {/* Latest Check-in Context */}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 24 }}>📋</AppText>
            <AppText style={{ fontWeight: "900", fontSize: 18 }}>Latest Check-in Details</AppText>
          </View>

          {latest ? (
            <View style={{ gap: 12 }}>
              <ContextRow
                label="Sleep"
                value={`${latest.sleepHours}h`}
                icon="😴"
                color="#A7B4D0"
              />
              <ContextRow
                label="Mood"
                value={`${latest.mood}/5`}
                icon={getMoodIcon(latest.mood)}
                color={getMoodColor(latest.mood)}
              />
              <ContextRow
                label="Energy"
                value={latest.energyLevel || "Normal"}
                icon={getEnergyIcon(latest.energyLevel || "Normal")}
                color={getEnergyColor(latest.energyLevel || "Normal")}
              />
              <ContextRow
                label="Enjoyment"
                value={latest.enjoyment || "Somewhat"}
                icon={getEnjoymentIcon(latest.enjoyment || "Somewhat")}
                color={getEnjoymentColor(latest.enjoyment || "Somewhat")}
              />
              <ContextRow
                label="Self Stress"
                value={`${latest.selfStress ?? 0}/5`}
                icon="📊"
                color="#6C8CFF"
              />
              {latest.stressfulEvent !== null && (
                <ContextRow
                  label="Stressful Event"
                  value={latest.stressfulEvent ? "Yes" : "No"}
                  icon={latest.stressfulEvent ? "⚠️" : "✅"}
                  color={latest.stressfulEvent ? "#ef4444" : "#22c55e"}
                />
              )}
            </View>
          ) : (
            <View style={{ alignItems: "center", padding: theme.space.xl, gap: 8 }}>
              <AppText style={{ fontSize: 48 }}>📭</AppText>
              <AppText variant="sub" style={{ textAlign: "center" }}>
                No check-in data yet. Start your journey today!
              </AppText>
              <Pressable
                onPress={() => router.push("/symptom-log")}
                style={{ marginTop: 8 }}
              >
                <AppText style={{ color: theme.colors.primary, fontWeight: "700" }}>
                  Create your first check-in →
                </AppText>
              </Pressable>
            </View>
          )}
        </View>

        {/* Top Symptoms */}
        {topSymptoms.length > 0 && (
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText style={{ fontSize: 24 }}>🔍</AppText>
              <AppText style={{ fontWeight: "900", fontSize: 18 }}>Common Symptoms</AppText>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {topSymptoms.map((s) => (
                <SymptomChip key={s} label={formatSymptom(s)} />
              ))}
            </View>
            <AppText variant="small" style={{ opacity: 0.6, marginTop: 4 }}>
              Most frequent symptoms in your recent check-ins
            </AppText>
          </View>
        )}

        {/* Quick Actions */}
        <View style={{ gap: theme.space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 24 }}>⚡</AppText>
            <AppText style={{ fontWeight: "900", fontSize: 18 }}>Quick Actions</AppText>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
            <Tile
              title="Log Symptoms"
              subtitle="Track how you feel"
              onPress={() => router.push("/symptom-log")}
              color="#6C8CFF"
            />
            <Tile
              title="Wellness Tools"
              subtitle="Breathing & relaxation"
              onPress={() => router.push("/wellness")}
              color="#22C3A6"
            />
            <Tile
              title="Chat Support"
              subtitle="Talk about your feelings"
              onPress={() => router.push("/chat")}
              color="#8B5CF6"
            />
            <Tile
              title="View History"
              subtitle="See your progress"
              onPress={() => router.push("/history")}
              color="#F59E0B"
            />
          </View>
        </View>

        {/* Footer Disclaimer */}
        <View
          style={{
            backgroundColor: "rgba(255,90,106,0.1)",
            borderRadius: theme.radius.lg,
            padding: theme.space.md,
            borderWidth: 1,
            borderColor: "rgba(255,90,106,0.3)",
          }}
        >
          <AppText variant="small" style={{ textAlign: "center", opacity: 0.8 }}>
            🛡️ This app supports self-management. If you feel unsafe or in crisis,
            contact emergency services immediately.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

/* ---------------- UI Components ---------------- */

function MiniStat({ title, value, description, color, icon }: {
  title: string;
  value: string;
  description: string;
  color: string;
  icon: string;
}) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: theme.radius.lg,
        padding: theme.space.md,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <AppText style={{ fontSize: 14 }}>{icon}</AppText>
        <AppText variant="small" style={{ opacity: 0.7, fontSize: 12 }}>
          {title}
        </AppText>
      </View>

      <AppText
        style={{
          fontWeight: "900",
          fontSize: 18,
          color: color,
        }}
      >
        {value}
      </AppText>

      <AppText variant="small" style={{ opacity: 0.6, fontSize: 11, lineHeight: 14 }}>
        {description}
      </AppText>
    </View>
  );
}

function InsightCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
        <AppText style={{ fontWeight: "900", fontSize: 14 }}>{title}</AppText>
      </View>
      {children}
    </View>
  );
}

function ContextRow({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText style={{ fontSize: 16 }}>{icon}</AppText>
        <AppText variant="sub" style={{ fontSize: 14 }}>{label}</AppText>
      </View>
      <AppText style={{ fontWeight: "900", textAlign: "right", flexShrink: 1, color: color || theme.colors.text }}>
        {value}
      </AppText>
    </View>
  );
}

function SymptomChip({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(108,140,255,0.15)",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <AppText style={{ fontSize: 12 }}>🔹</AppText>
      <AppText style={{ fontWeight: "600", fontSize: 13 }}>{label}</AppText>
    </View>
  );
}

function PrimaryAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
      <AppText style={{ fontWeight: "700", fontSize: 15 }}>{title}</AppText>
    </Pressable>
  );
}

function GhostAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
      <AppText style={{ fontWeight: "700", fontSize: 15 }}>{title}</AppText>
    </Pressable>
  );
}

function Tile({ title, subtitle, onPress, color }: { title: string; subtitle: string; onPress: () => void; color: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        backgroundColor: `${color}15`,
        borderWidth: 1,
        borderColor: `${color}40`,
        borderRadius: theme.radius.lg,
        padding: theme.space.lg,
        gap: 6,
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "700", fontSize: 16 }}>{title}</AppText>
      <AppText variant="sub" style={{ fontSize: 12, opacity: 0.8 }}>{subtitle}</AppText>
    </Pressable>
  );
}

/* ---------------- Helper Functions ---------------- */

function formatDateTime(ts: Timestamp) {
  const d = ts.toDate();
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

function getMoodIcon(mood: number): string {
  if (mood <= 2) return "😔";
  if (mood === 3) return "😐";
  return "😊";
}

function getMoodColor(mood: number): string {
  if (mood <= 2) return "#ef4444";
  if (mood === 3) return "#facc15";
  return "#22c55e";
}

function getEnergyIcon(energy: string): string {
  switch (energy) {
    case "Low": return "🪫";
    case "High": return "⚡";
    default: return "🔋";
  }
}

function getEnergyColor(energy: string): string {
  switch (energy) {
    case "Low": return "#ef4444";
    case "High": return "#22c55e";
    default: return "#6C8CFF";
  }
}

function getEnjoymentIcon(enjoyment: string): string {
  switch (enjoyment) {
    case "No": return "😞";
    case "Yes": return "🎉";
    default: return "😐";
  }
}

function getEnjoymentColor(enjoyment: string): string {
  switch (enjoyment) {
    case "No": return "#ef4444";
    case "Yes": return "#22c55e";
    default: return "#facc15";
  }
}

function normalizeDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function computeStreak(logs: LogDoc[]) {
  if (!logs.length) return 0;

  const days = new Set<number>();
  for (const l of logs) {
    if (l.createdAt) {
      days.add(normalizeDay(l.createdAt.toDate()));
    }
  }

  let streak = 0;
  const today = normalizeDay(new Date());

  for (let i = 0; i < 365; i++) {
    const day = today - i * 24 * 60 * 60 * 1000;
    if (days.has(day)) streak++;
    else break;
  }

  return streak;
}

function averageInLastDays(logs: LogDoc[], days: number) {
  const from = Date.now() - days * 24 * 60 * 60 * 1000;
  const arr = logs
    .filter((l) => l.createdAt && l.createdAt.toDate().getTime() >= from)
    .map((l) => l.stressScore);

  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function averageBetween(logs: LogDoc[], fromDaysAgo: number, toDaysAgo: number) {
  const now = Date.now();
  const from = now - toDaysAgo * 24 * 60 * 60 * 1000;
  const to = now - fromDaysAgo * 24 * 60 * 60 * 1000;

  const arr = logs
    .filter((l) => l.createdAt)
    .filter((l) => {
      const t = l.createdAt!.toDate().getTime();
      return t >= from && t <= to;
    })
    .map((l) => l.stressScore);

  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeTrend7(logs: LogDoc[]) {
  const current = averageInLastDays(logs, 7);
  const previous = averageBetween(logs, 8, 14);
  return Math.round(current - previous);
}

function getTopSymptoms(logs: LogDoc[], take: number) {
  const counts = new Map<string, number>();

  for (const l of logs) {
    for (const s of l.symptoms || []) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([k]) => k);
}

function formatSymptom(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDashboardInsight(logs: LogDoc[]) {
  if (logs.length < 4) {
    return "✨ Log a few more check-ins to unlock personalized insights about your stress patterns.";
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const eventYes = logs.filter((l) => l.stressfulEvent === true).map((l) => l.stressScore);
  const eventNo = logs.filter((l) => l.stressfulEvent === false).map((l) => l.stressScore);

  if (eventYes.length >= 2 && eventNo.length >= 2) {
    const diff = Math.round(avg(eventYes) - avg(eventNo));
    return `📊 Stressful events increase your score by ${diff} points. Try coping strategies during tough days.`;
  }

  const lowEnergy = logs.filter((l) => l.energyLevel === "Low").map((l) => l.stressScore);
  const highEnergy = logs.filter((l) => l.energyLevel === "High").map((l) => l.stressScore);

  if (lowEnergy.length >= 2 && highEnergy.length >= 2) {
    const diff = Math.round(avg(lowEnergy) - avg(highEnergy));
    return `⚡ Energy matters! Low-energy days show ${diff} points higher stress. Rest and recharge.`;
  }

  const intentional = logs
    .filter((l) => l.intentionalSleepLoss === true)
    .map((l) => l.stressScore);

  const notIntentional = logs
    .filter((l) => l.intentionalSleepLoss === false)
    .map((l) => l.stressScore);

  if (intentional.length >= 2 && notIntentional.length >= 2) {
    const diff = Math.round(avg(notIntentional) - avg(intentional));
    return `😴 Sleep quality matters. Unintentional poor sleep raises stress by ${diff} points.`;
  }

  return "🎯 Your dashboard is building insights. Keep logging to discover your stress patterns!";
}