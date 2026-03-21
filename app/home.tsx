import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, Platform, ScrollView } from "react-native";
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

import { seedSampleData } from "../src/dev/seedSampleData";

type LogDoc = {
  id: string;
  uid: string;
  createdAt?: Timestamp;a
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
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const latest = logs[0] || null;
  const streak = useMemo(() => computeStreak(logs), [logs]);
  const avg7 = useMemo(() => averageInLastDays(logs, 7), [logs]);
  const trend7 = useMemo(() => computeTrend7(logs), [logs]);
  const topSymptoms = useMemo(() => getTopSymptoms(logs, 5), [logs]);
  const insight = useMemo(() => buildDashboardInsight(logs), [logs]);

  const statusPill = useMemo(() => {
    const level = latest?.stressLevel || "Low";
    const bg =
      level === "High"
        ? "rgba(255,80,80,0.20)"
        : level === "Medium"
        ? "rgba(255,200,80,0.18)"
        : "rgba(80,200,255,0.16)";
    return { level, bg };
  }, [latest]);

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
        {/* Header */}
        <View style={{ gap: theme.space.sm }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ gap: 4 }}>
              <AppText variant="sub">{greeting}</AppText>
              <AppText variant="h2">{name ? name : "Welcome"} 👋</AppText>
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
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
              })}
            >
              <AppText style={{ fontWeight: "900" }}>Logout</AppText>
            </Pressable>
          </View>

          <AppText variant="sub">
            Track your patterns, manage stress, and use tools when you need them.
          </AppText>
        </View>

        {/* Top stats */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
          <MiniStat
            title="Your current state"
            value={
              loading
                ? "..."
                : latest
                ? `${latest.stressLevel}`
                : "No data"
            }
            color={
              latest?.stressLevel === "High"
                ? "#ef4444"
                : latest?.stressLevel === "Medium"
                ? "#facc15"
                : "#22c55e"
            }
          />

          <MiniStat
            title="Trend"
            value={
              loading
                ? "..."
                : trend7 > 1
                ? "Rising"
                : trend7 < -1
                ? "Improving"
                : "Stable"
            }
          />

          <MiniStat
            title="7-day average"
            value={loading ? "..." : `${avg7.toFixed(1)} score`}
          />

          <MiniStat
            title="Consistency"
            value={loading ? "..." : `${streak} days`}
          />
        </View>

        {/* Main status card */}
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 6 }}>
              <AppText style={{ fontWeight: "900" }}>Today’s status</AppText>
              <AppText variant="sub">
                Your latest check-in summary and quick next action.
              </AppText>
            </View>

            <View
              style={{
                backgroundColor: statusPill.bg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
              }}
            >
              <AppText style={{ fontWeight: "900" }}>{statusPill.level}</AppText>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <AppText style={{ fontWeight: "900", fontSize: 34 }}>
              {latest ? latest.stressScore : "—"}
            </AppText>

            <AppText variant="small" style={{ opacity: 0.8 }}>
              {latest?.createdAt ? `Last check-in: ${formatDateTime(latest.createdAt)}` : "No check-in yet"}
            </AppText>
          </View>

          <View style={{ flexDirection: "row", gap: theme.space.sm }}>
            <PrimaryAction title={latest ? "Log again" : "Log now"} onPress={() => router.push("/symptom-log")} />
            <GhostAction title="History" onPress={() => router.push("/history")} />
          </View>
        </View>

        {/* Insight + trend */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
          <HalfCard title="Quick insight">
            <AppText variant="sub">{loading ? "Loading..." : insight}</AppText>
          </HalfCard>

          <HalfCard title="7-day trend">
            <AppText style={{ fontWeight: "900", fontSize: 26 }}>
              {loading ? "..." : `${trend7 >= 0 ? "+" : ""}${trend7}`}
            </AppText>
            <AppText variant="sub">
              Compared with the previous week.
            </AppText>
          </HalfCard>
        </View>

        {/* Latest context */}
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
          <AppText style={{ fontWeight: "900" }}>Latest check-in context</AppText>

          {latest ? (
            <View style={{ gap: 10 }}>
              <Row label="Sleep" value={`${latest.sleepHours}h`} />
              <Row label="Mood" value={`${latest.mood}/5`} />
              <Row label="Self stress" value={`${latest.selfStress ?? 0}/5`} />
              <Row label="Energy" value={latest.energyLevel || "Normal"} />
              <Row label="Enjoyment" value={latest.enjoyment || "Somewhat"} />
              <Row
                label="Stressful event"
                value={
                  latest.stressfulEvent === null
                    ? "Not answered"
                    : latest.stressfulEvent
                    ? "Yes"
                    : "No"
                }
              />
              <Row
                label="Intentional sleep loss"
                value={
                  latest.intentionalSleepLoss === null
                    ? "Not answered"
                    : latest.intentionalSleepLoss
                    ? "Yes"
                    : "No"
                }
              />
            </View>
          ) : (
            <AppText variant="sub">No check-in data available yet.</AppText>
          )}
        </View>

        {/* Top symptoms */}
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
          <AppText style={{ fontWeight: "900" }}>Top symptoms</AppText>

          {topSymptoms.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {topSymptoms.map((s) => (
                <Chip key={s} label={formatSymptom(s)} />
              ))}
            </View>
          ) : (
            <AppText variant="sub">No symptom patterns yet.</AppText>
          )}
        </View>

        {/* Quick actions */}
        <View style={{ gap: theme.space.md }}>
          <AppText style={{ fontWeight: "900" }}>Quick Actions</AppText>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
            <Tile title="Symptom Log" subtitle="Check-in" onPress={() => router.push("/symptom-log")} />
            <Tile title="Wellness" subtitle="Breathing" onPress={() => router.push("/wellness")} />
            <Tile title="Chat" subtitle="Support" onPress={() => router.push("/chat")} />
            <Tile title="History" subtitle="Trends" onPress={() => router.push("/history")} />
          </View>
        </View>

        <AppText variant="small">
          This app supports self-management. If you feel unsafe or in crisis, contact emergency services.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

/* ---------------- UI ---------------- */

function MiniStat({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color?: string;
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
      <AppText variant="small" style={{ opacity: 0.7 }}>
        {title}
      </AppText>

      <AppText
        style={{
          fontWeight: "900",
          fontSize: 20,
          color: color || theme.colors.text,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function HalfCard({ title, children }: { title: string; children: React.ReactNode }) {
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
      <AppText style={{ fontWeight: "900" }}>{title}</AppText>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <AppText variant="sub">{label}</AppText>
      <AppText style={{ fontWeight: "900", textAlign: "right", flexShrink: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <AppText style={{ fontWeight: "900" }}>{label}</AppText>
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
        paddingVertical: 12,
        alignItems: "center",
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{title}</AppText>
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
        paddingVertical: 12,
        alignItems: "center",
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{title}</AppText>
    </Pressable>
  );
}

function Tile({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.space.lg,
        gap: 6,
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{title}</AppText>
      <AppText variant="sub">{subtitle}</AppText>
    </Pressable>
  );
}

/* ---------------- helpers ---------------- */

function formatDateTime(ts: Timestamp) {
  const d = ts.toDate();
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
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
    return "Log a few more check-ins to unlock more meaningful insights.";
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const eventYes = logs.filter((l) => l.stressfulEvent === true).map((l) => l.stressScore);
  const eventNo = logs.filter((l) => l.stressfulEvent === false).map((l) => l.stressScore);

  if (eventYes.length >= 2 && eventNo.length >= 2) {
    const diff = Math.round(avg(eventYes) - avg(eventNo));
    return `Stressful-event days are about ${diff} points higher than non-event days.`;
  }

  const lowEnergy = logs.filter((l) => l.energyLevel === "Low").map((l) => l.stressScore);
  const highEnergy = logs.filter((l) => l.energyLevel === "High").map((l) => l.stressScore);

  if (lowEnergy.length >= 2 && highEnergy.length >= 2) {
    const diff = Math.round(avg(lowEnergy) - avg(highEnergy));
    return `Low-energy days are about ${diff} points higher in stress than high-energy days.`;
  }

  const intentional = logs
    .filter((l) => l.intentionalSleepLoss === true)
    .map((l) => l.stressScore);

  const notIntentional = logs
    .filter((l) => l.intentionalSleepLoss === false)
    .map((l) => l.stressScore);

  if (intentional.length >= 2 && notIntentional.length >= 2) {
    const diff = Math.round(avg(notIntentional) - avg(intentional));
    return `Unintentional poor sleep tends to raise stress about ${diff} points more than intentional sleep loss.`;
  }

  return "Your dashboard is starting to show useful patterns. Keep logging consistently.";
}