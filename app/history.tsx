// app/history.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  Alert,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";

import { auth, db } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { AppHeader } from "../src/ui/AppHeader";
import { toast } from "../src/ui/toast";

type StressLevel = "Low" | "Medium" | "High";
type LevelFilter = "All" | StressLevel;
type SortKey = "Latest" | "Highest" | "Lowest";
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

const ranges = [
  { key: "7", label: "7d", days: 7 },
  { key: "14", label: "14d", days: 14 },
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
] as const;

const PAGE_SIZE = 30;

const ALL_SYMPTOMS = [
  "headache",
  "fast_heartbeat",
  "stomach_discomfort",
  "sweating",
  "muscle_tension",
  "fatigue",
  "overthinking",
  "irritability",
  "overwhelmed",
  "difficulty_focusing",
  "anxiety",
  "low_motivation",
] as const;

export default function HistoryScreen() {
  const { width: screenW } = useWindowDimensions();

  const SCREEN_PAD = 20;
  const CARD_PAD = theme.space.lg;
  const CHART_SIDE_PAD = 10;

  const chartW = Math.max(
    260,
    screenW - SCREEN_PAD * 2 - CARD_PAD * 2 + CHART_SIDE_PAD * 2
  );

  const [rangeKey, setRangeKey] = useState<(typeof ranges)[number]["key"]>("14");
  const [logs, setLogs] = useState<LogDoc[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const [levelFilter, setLevelFilter] = useState<LevelFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("Latest");
  const [symptomFilter, setSymptomFilter] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [openHigh, setOpenHigh] = useState(true);
  const [openMedium, setOpenMedium] = useState(true);
  const [openLow, setOpenLow] = useState(true);

  const selectedRange = ranges.find((r) => r.key === rangeKey)!;
  const uid = auth.currentUser?.uid;

  const fromTs = useMemo(() => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - selectedRange.days);
    return Timestamp.fromDate(fromDate);
  }, [selectedRange.days]);

  const baseQuery = useMemo(() => {
    if (!uid) return null;
    return query(
      collection(db, "symptomLogs"),
      where("uid", "==", uid),
      where("createdAt", ">=", fromTs),
      orderBy("createdAt", "desc")
    );
  }, [uid, fromTs]);

  useEffect(() => {
    if (!uid) {
      router.replace("/login");
      return;
    }
    if (!baseQuery) return;

    setLogs([]);
    setCursor(null);
    setHasMore(true);

    const q = query(baseQuery, limit(PAGE_SIZE));

    (async () => {
      try {
        const snap = await getDocs(q);
        const rows = snap.docs.map(mapDoc);
        setLogs(rows);
        setCursor(snap.docs.length ? snap.docs[snap.docs.length - 1] : null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err: any) {
        console.log("History getDocs error:", err?.message || err);
        toast("Error", "Could not load history. Check rules/network.");
      }
    })();
  }, [rangeKey, baseQuery, uid]);

  const loadMore = async () => {
    if (!baseQuery || !cursor || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const q = query(baseQuery, startAfter(cursor), limit(PAGE_SIZE));
      const snap = await getDocs(q);
      const next = snap.docs.map(mapDoc);
      setLogs((prev) => [...prev, ...next]);
      setCursor(snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e: any) {
      toast("Load failed", e?.message || "Unknown error");
    } finally {
      setLoadingMore(false);
    }
  };

  const stats = useMemo(() => computeStats(logs), [logs]);
  const insight = useMemo(() => buildInsight(logs), [logs]);

  // Get descriptive metrics with emojis and colors
  const getAverageRating = () => {
    const score = stats.avgScore;
    if (score <= 15) return { emoji: "🌟", text: "Excellent", description: "Your stress is well managed", color: "#22c55e" };
    if (score <= 30) return { emoji: "👍", text: "Good", description: "Managing stress effectively", color: "#6C8CFF" };
    if (score <= 45) return { emoji: "😐", text: "Moderate", description: "Room for improvement", color: "#facc15" };
    return { emoji: "⚠️", text: "Elevated", description: "Stress levels need attention", color: "#ef4444" };
  };

  const getHighestRating = () => {
    const score = stats.maxScore;
    if (score <= 20) return { emoji: "😊", text: "Mild", description: "Occasional stress spikes", color: "#22c55e" };
    if (score <= 40) return { emoji: "😐", text: "Moderate", description: "Noticeable stress peaks", color: "#facc15" };
    if (score <= 60) return { emoji: "⚠️", text: "High", description: "Significant stress episodes", color: "#ef4444" };
    return { emoji: "🚨", text: "Very High", description: "Frequent high stress", color: "#ef4444" };
  };

  const getCheckInsRating = () => {
    const count = stats.count;
    if (count === 0) return { emoji: "🌱", text: "Just Starting", description: "Begin your journey", color: "#22C3A6" };
    if (count < 7) return { emoji: "🌿", text: "Building", description: `${count} days • Keep going`, color: "#22C3A6" };
    if (count < 14) return { emoji: "🌻", text: "Consistent", description: `${count} days • Great habit`, color: "#22C3A6" };
    if (count < 30) return { emoji: "🏆", text: "Dedicated", description: `${count} days • Excellent`, color: "#22C3A6" };
    return { emoji: "💪", text: "Champion", description: `${count} days • Unstoppable`, color: "#22C3A6" };
  };

  const getBestMoodRating = () => {
    const mood = stats.bestMood;
    if (mood <= 2) return { emoji: "😔", text: "Low", description: "Mood needs attention", color: "#ef4444" };
    if (mood === 3) return { emoji: "😐", text: "Neutral", description: "Stable but could improve", color: "#facc15" };
    if (mood === 4) return { emoji: "🙂", text: "Good", description: "Positive mood days", color: "#6C8CFF" };
    return { emoji: "😊", text: "Excellent", description: "Great mood peaks", color: "#22c55e" };
  };

  const averageRating = getAverageRating();
  const highestRating = getHighestRating();
  const checkInsRating = getCheckInsRating();
  const bestMoodRating = getBestMoodRating();

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let out = logs.slice();

    if (levelFilter !== "All") out = out.filter((l) => l.stressLevel === levelFilter);

    if (symptomFilter.length) {
      out = out.filter((l) => symptomFilter.every((s) => (l.symptoms || []).includes(s)));
    }

    if (q) {
      out = out.filter((l) => {
        const sym = (l.symptoms || []).join(" ").toLowerCase();
        const date = formatDate(l.createdAt).toLowerCase();
        const energy = String(l.energyLevel || "").toLowerCase();
        const enjoy = String(l.enjoyment || "").toLowerCase();

        return (
          sym.includes(q) ||
          date.includes(q) ||
          String(l.stressScore).includes(q) ||
          l.stressLevel.toLowerCase().includes(q) ||
          energy.includes(q) ||
          enjoy.includes(q)
        );
      });
    }

    if (sortKey === "Highest") out.sort((a, b) => b.stressScore - a.stressScore);
    if (sortKey === "Lowest") out.sort((a, b) => a.stressScore - b.stressScore);

    return out;
  }, [logs, levelFilter, symptomFilter, searchText, sortKey]);

  const groups = useMemo(() => groupByLevel(filtered), [filtered]);

  // Chart Data
  const lineData = useMemo(() => buildLineSeries(logs), [logs]);
  const pieData = useMemo(() => buildPieChart(logs), [logs]);
  const sleepVsStressData = useMemo(() => buildSleepVsStressBars(logs), [logs]);
  const selfStressVsScoreData = useMemo(() => buildSelfStressBars(logs), [logs]);
  const moodVsStressData = useMemo(() => buildMoodVsStressBars(logs), [logs]);
  const energyVsStressData = useMemo(() => buildEnergyVsStressBars(logs), [logs]);
  const symptomFrequencyData = useMemo(() => buildSymptomFrequencyBars(logs), [logs]);

  const openLog = (id: string) => {
    router.push({ pathname: "/result", params: { logId: id } });
  };

  const confirmDelete = (logId: string) => {
    Alert.alert("Delete log?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "symptomLogs", logId));
            toast("Deleted");
            setLogs((prev) => prev.filter((x) => x.id !== logId));
          } catch (e: any) {
            toast("Delete failed", e?.message || "Unknown error");
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title="History & Analytics" />

      <InfoCard />

      <View style={{ flexDirection: "row", gap: theme.space.sm, marginBottom: theme.space.lg, flexWrap: "wrap" }}>
        {ranges.map((r) => (
          <ChipButton
            key={r.key}
            label={r.label}
            active={r.key === rangeKey}
            onPress={() => setRangeKey(r.key)}
          />
        ))}
      </View>

      {/* Stats Grid with Descriptive Metrics */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
        <DescriptiveStatCard
          title="📊 Average Stress"
          emoji={averageRating.emoji}
          value={averageRating.text}
          description={`${stats.avgScore.toFixed(1)} score • ${averageRating.description}`}
          color={averageRating.color}
        />
        <DescriptiveStatCard
          title="📈 Highest Peak"
          emoji={highestRating.emoji}
          value={highestRating.text}
          description={`${stats.maxScore} score • ${highestRating.description}`}
          color={highestRating.color}
        />
        <DescriptiveStatCard
          title="📅 Check-ins"
          emoji={checkInsRating.emoji}
          value={checkInsRating.text}
          description={checkInsRating.description}
          color={checkInsRating.color}
        />
        <DescriptiveStatCard
          title="😊 Best Mood"
          emoji={bestMoodRating.emoji}
          value={bestMoodRating.text}
          description={`${stats.bestMood}/5 • ${bestMoodRating.description}`}
          color={bestMoodRating.color}
        />
      </View>

      <View style={{ marginTop: theme.space.lg }}>
        <InsightCard text={insight} />
      </View>

      <View style={{ gap: theme.space.xl, marginTop: theme.space.xl }}>
        {/* Line Chart - Stress Trend Over Time */}
        <ChartCard
          title="📈 Stress Trend"
          subtitle="X-axis: Date • Y-axis: Stress Score (0-100)"
        >
          {lineData.length >= 2 ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <LineChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={lineData}
                curved
                thickness={3}
                color={theme.colors.primary}
                startFillColor={theme.colors.primary}
                endFillColor="transparent"
                startOpacity={0.25}
                endOpacity={0}
                areaChart
                hideDataPoints={false}
                dataPointsColor={theme.colors.primary}
                dataPointsRadius={3}
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                initialSpacing={8}
                endSpacing={8}
                yAxisLabelPrefix=""
                yAxisLabelSuffix=""
              />
            </View>
          ) : (
            <EmptyHint text="Need at least 2 check-ins to show trend" />
          )}
        </ChartCard>

        {/* Pie Chart - Stress Level Distribution */}
        <ChartCard
          title="🥧 Stress Distribution"
          subtitle="Percentage breakdown by stress level"
        >
          {pieData.length > 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <PieChart
                data={pieData}
                donut
                showGradient
                sectionAutoFocus
                radius={100}
                innerRadius={60}
                innerCircleColor={theme.colors.card}
                centerLabelComponent={() => (
                  <View style={{ alignItems: "center" }}>
                    <AppText style={{ fontSize: 20, fontWeight: "800", color: theme.colors.text }}>
                      {logs.length}
                    </AppText>
                    <AppText variant="small" style={{ fontSize: 10 }}>total</AppText>
                  </View>
                )}
                textColor="white"
                textSize={12}
                focusOnPress
                showValuesAsLabels
              />
            </View>
          ) : (
            <EmptyHint text="No data available" />
          )}
        </ChartCard>

        {/* Bar Chart - Sleep vs Stress */}
        <ChartCard
          title="😴 Sleep vs Stress"
          subtitle="X-axis: Sleep Hours • Y-axis: Average Stress Score"
        >
          {sleepVsStressData.some((b) => b.value > 0) ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={sleepVsStressData}
                barWidth={32}
                spacing={28}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...sleepVsStressData.map((d) => d.value), 10)}
                initialSpacing={12}
                endSpacing={12}
                yAxisLabelPrefix=""
                yAxisLabelSuffix=""
              />
            </View>
          ) : (
            <EmptyHint text="Need more sleep data" />
          )}
        </ChartCard>

        {/* Bar Chart - Self-rated Stress vs Actual Score */}
        <ChartCard
          title="📊 Self-Stress vs Score"
          subtitle="X-axis: Self Rating (0-5) • Y-axis: Actual Stress Score"
        >
          {selfStressVsScoreData.some((b) => b.value > 0) ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={selfStressVsScoreData}
                barWidth={32}
                spacing={22}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...selfStressVsScoreData.map((d) => d.value), 10)}
                initialSpacing={12}
                endSpacing={12}
              />
            </View>
          ) : (
            <EmptyHint text="Need more self-stress data" />
          )}
        </ChartCard>

        {/* Bar Chart - Mood vs Stress */}
        <ChartCard
          title="😊 Mood vs Stress"
          subtitle="X-axis: Mood (1-5) • Y-axis: Average Stress Score"
        >
          {moodVsStressData.some((b) => b.value > 0) ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={moodVsStressData}
                barWidth={32}
                spacing={28}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...moodVsStressData.map((d) => d.value), 10)}
                initialSpacing={12}
                endSpacing={12}
              />
            </View>
          ) : (
            <EmptyHint text="Need more mood data" />
          )}
        </ChartCard>

        {/* Bar Chart - Energy vs Stress */}
        <ChartCard
          title="⚡ Energy vs Stress"
          subtitle="X-axis: Energy Level • Y-axis: Average Stress Score"
        >
          {energyVsStressData.some((b) => b.value > 0) ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={energyVsStressData}
                barWidth={32}
                spacing={50}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...energyVsStressData.map((d) => d.value), 10)}
                initialSpacing={20}
                endSpacing={20}
              />
            </View>
          ) : (
            <EmptyHint text="Need more energy data" />
          )}
        </ChartCard>

        {/* Bar Chart - Top Symptoms Frequency */}
        <ChartCard
          title="🔍 Common Symptoms"
          subtitle="X-axis: Symptom • Y-axis: Frequency"
        >
          {symptomFrequencyData.length > 0 ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={symptomFrequencyData}
                barWidth={24}
                spacing={16}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...symptomFrequencyData.map((d) => d.value), 1)}
                initialSpacing={10}
                endSpacing={10}
                yAxisLabelPrefix=""
                yAxisLabelSuffix=""
              />
            </View>
          ) : (
            <EmptyHint text="No symptom data yet" />
          )}
        </ChartCard>
      </View>

      <View style={{ marginTop: theme.space.xl, gap: theme.space.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 20 }}>📋</AppText>
            <AppText style={{ fontWeight: "900" }}>All Check-ins</AppText>
          </View>

          <Pressable
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 999,
              paddingVertical: 8,
              paddingHorizontal: 12,
              opacity: pressed ? 0.9 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>🔍 Filters</AppText>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setSearchOpen((s) => !s)}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            padding: theme.space.lg,
            opacity: pressed ? 0.92 : 1,
            ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 16 }}>🔎</AppText>
            <AppText style={{ fontWeight: "900" }}>{searchOpen ? "Hide Search" : "Search Check-ins"}</AppText>
          </View>
          <AppText variant="small" style={{ opacity: 0.8, marginTop: 4 }}>
            Search by symptom, date, stress level, energy, or enjoyment
          </AppText>
        </Pressable>

        {searchOpen ? <SearchBox value={searchText} onChange={setSearchText} /> : null}

        <Accordion title={`⚠️ High (${groups.High.length})`} open={openHigh} onToggle={() => setOpenHigh((s) => !s)}>
          {groups.High.map((l) => (
            <LogRow key={l.id} log={l} onOpen={openLog} onDelete={confirmDelete} />
          ))}
        </Accordion>

        <Accordion
          title={`😐 Medium (${groups.Medium.length})`}
          open={openMedium}
          onToggle={() => setOpenMedium((s) => !s)}
        >
          {groups.Medium.map((l) => (
            <LogRow key={l.id} log={l} onOpen={openLog} onDelete={confirmDelete} />
          ))}
        </Accordion>

        <Accordion title={`😊 Low (${groups.Low.length})`} open={openLow} onToggle={() => setOpenLow((s) => !s)}>
          {groups.Low.map((l) => (
            <LogRow key={l.id} log={l} onOpen={openLog} onDelete={confirmDelete} />
          ))}
        </Accordion>

        {hasMore ? (
          <Pressable
            onPress={loadMore}
            style={({ pressed }) => ({
              marginTop: theme.space.md,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.md,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.9 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>{loadingMore ? "Loading..." : "Load More"}</AppText>
          </Pressable>
        ) : (
          <AppText variant="small" style={{ opacity: 0.8, textAlign: "center" }}>
            End of results
          </AppText>
        )}
      </View>

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        level={levelFilter}
        onSetLevel={setLevelFilter}
        sortKey={sortKey}
        onSetSort={setSortKey}
        symptoms={symptomFilter}
        onSetSymptoms={setSymptomFilter}
      />
    </Screen>
  );
}

/* ---------------- UI Components ---------------- */

function InfoCard() {
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: 10,
        marginBottom: theme.space.lg,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText style={{ fontSize: 20 }}>📊</AppText>
        <AppText style={{ fontWeight: "900" }}>Analytics Dashboard</AppText>
      </View>
      <AppText variant="sub">
        Track your stress patterns across different metrics. Lower scores indicate better stress management.
      </AppText>
    </View>
  );
}

function DescriptiveStatCard({ title, emoji, value, description, color }: {
  title: string;
  emoji: string;
  value: string;
  description: string;
  color: string;
}) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.space.lg,
        gap: 6,
      }}
    >
      <AppText variant="small">{title}</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <AppText style={{ fontSize: 20 }}>{emoji}</AppText>
        <AppText style={{ fontWeight: "900", fontSize: 20, color: color }}>
          {value}
        </AppText>
      </View>
      <AppText variant="small" style={{ opacity: 0.6, fontSize: 11 }}>
        {description}
      </AppText>
    </View>
  );
}

function InsightCard({ text }: { text: string }) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <AppText style={{ fontSize: 18 }}>💡</AppText>
        <AppText style={{ fontWeight: "900" }}>Key Insight</AppText>
      </View>
      <AppText variant="sub">{text}</AppText>
    </View>
  );
}

function ChipButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "transparent" : theme.colors.border,
        backgroundColor: active ? theme.colors.primary : "transparent",
        opacity: pressed ? 0.9 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{label}</AppText>
    </Pressable>
  );
}

function ChartCard({
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
        gap: theme.space.sm,
        overflow: "hidden",
      }}
    >
      <View style={{ gap: 6, marginBottom: 6 }}>
        <AppText style={{ fontWeight: "900" }}>{title}</AppText>
        {subtitle ? <AppText variant="sub">{subtitle}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function EmptyHint({ text = "Not enough data yet" }: { text?: string }) {
  return <AppText variant="sub" style={{ textAlign: "center", padding: theme.space.xl }}>{text}</AppText>;
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <AppText style={{ fontSize: 16 }}>🔎</AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search symptoms, date, level..."
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={{
          flex: 1,
          color: theme.colors.text,
          fontSize: 14,
          fontWeight: "600",
          outlineStyle: "none" as any,
        }}
      />
    </View>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const count = React.Children.count(children);

  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.xl,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => ({
          padding: theme.space.lg,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: pressed ? 0.92 : 1,
          ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
        })}
      >
        <AppText style={{ fontWeight: "900" }}>{title}</AppText>
        <AppText style={{ fontWeight: "900", opacity: 0.8 }}>{open ? "−" : "+"}</AppText>
      </Pressable>

      {open ? (
        <View style={{ padding: theme.space.lg, paddingTop: 0, gap: theme.space.sm }}>
          {count ? children : <AppText variant="sub" style={{ opacity: 0.75 }}>No results</AppText>}
        </View>
      ) : null}
    </View>
  );
}

function LogRow({
  log,
  onOpen,
  onDelete,
}: {
  log: LogDoc;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const pillBg =
    log.stressLevel === "High"
      ? "rgba(255,80,80,0.20)"
      : log.stressLevel === "Medium"
      ? "rgba(255,200,80,0.18)"
      : "rgba(80,200,255,0.16)";

  return (
    <Pressable
      onPress={() => onOpen(log.id)}
      onLongPress={() => onDelete(log.id)}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.space.lg,
        gap: 6,
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View
          style={{
            backgroundColor: pillBg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <AppText style={{ fontSize: 12 }}>
            {log.stressLevel === "High" ? "⚠️" : log.stressLevel === "Medium" ? "😐" : "😊"}
          </AppText>
          <AppText style={{ fontWeight: "900" }}>
            {log.stressLevel} • {log.stressScore}
          </AppText>
        </View>

        <AppText variant="small">{formatDate(log.createdAt)}</AppText>
      </View>

      <AppText variant="sub">
        😴 Sleep {log.sleepHours}h • 😊 Mood {log.mood}/5 • 📊 Self-stress {log.selfStress ?? 0}/5
      </AppText>

      <AppText variant="small" style={{ opacity: 0.82 }}>
        {log.energyLevel === "Low" ? "🪫" : log.energyLevel === "High" ? "⚡" : "🔋"} {log.energyLevel || "Normal"} •
        {log.enjoyment === "No" ? " 😞" : log.enjoyment === "Yes" ? " 🎉" : " 😐"} {log.enjoyment || "Somewhat"} •
        🔍 {log.symptoms.length} symptoms
      </AppText>

      <AppText variant="small" style={{ opacity: 0.6 }}>
        Tap to view • Long-press to delete
      </AppText>
    </Pressable>
  );
}

function FilterModal({
  open,
  onClose,
  level,
  onSetLevel,
  sortKey,
  onSetSort,
  symptoms,
  onSetSymptoms,
}: {
  open: boolean;
  onClose: () => void;
  level: LevelFilter;
  onSetLevel: (v: LevelFilter) => void;
  sortKey: SortKey;
  onSetSort: (v: SortKey) => void;
  symptoms: string[];
  onSetSymptoms: (v: string[]) => void;
}) {
  const toggleSymptom = (s: string) => {
    if (symptoms.includes(s)) onSetSymptoms(symptoms.filter((x) => x !== s));
    else onSetSymptoms([...symptoms, s]);
  };

  const clear = () => {
    onSetLevel("All");
    onSetSort("Latest");
    onSetSymptoms([]);
    toast("Filters cleared");
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />

      <View
        style={{
          backgroundColor: theme.colors.bg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.space.lg,
          gap: theme.space.lg,
          maxHeight: "70%",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 20 }}>🔧</AppText>
            <AppText style={{ fontWeight: "900", fontSize: 18 }}>Filters</AppText>
          </View>

          <Pressable onPress={clear}>
            <AppText style={{ fontWeight: "900", opacity: 0.9 }}>Clear all</AppText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ gap: theme.space.lg }}>
          <View style={{ gap: 10 }}>
            <AppText style={{ fontWeight: "900" }}>Stress Level</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {(["All", "Low", "Medium", "High"] as LevelFilter[]).map((x) => (
                <MiniChip key={x} label={x === "Low" ? "😊 Low" : x === "Medium" ? "😐 Medium" : "⚠️ High"} active={x === level} onPress={() => onSetLevel(x)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <AppText style={{ fontWeight: "900" }}>Sort By</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {(["Latest", "Highest", "Lowest"] as SortKey[]).map((x) => (
                <MiniChip key={x} label={x} active={x === sortKey} onPress={() => onSetSort(x)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <AppText style={{ fontWeight: "900" }}>Symptoms</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {ALL_SYMPTOMS.map((s) => (
                <MiniChip
                  key={s}
                  label={formatSymptom(s)}
                  active={symptoms.includes(s)}
                  onPress={() => toggleSymptom(s)}
                />
              ))}
            </View>
            <AppText variant="small" style={{ opacity: 0.8 }}>
              Select one or more symptoms to filter results
            </AppText>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: 6,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <AppText style={{ fontWeight: "900" }}>Apply Filters</AppText>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function MiniChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "transparent" : theme.colors.border,
        backgroundColor: active ? theme.colors.primary : "rgba(255,255,255,0.06)",
        opacity: pressed ? 0.92 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <AppText style={{ fontWeight: "900" }}>{label}</AppText>
    </Pressable>
  );
}

/* ---------------- Helper Functions ---------------- */

function mapDoc(d: any): LogDoc {
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
}

function formatDate(ts?: Timestamp) {
  if (!ts) return "";
  const d = ts.toDate();
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  );
}

function formatSymptom(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupByLevel(logs: LogDoc[]) {
  const out: Record<StressLevel, LogDoc[]> = { Low: [], Medium: [], High: [] };
  for (const l of logs) out[l.stressLevel].push(l);
  return out;
}

function computeStats(logs: LogDoc[]) {
  const count = logs.length;
  if (count === 0) return { count: 0, avgScore: 0, maxScore: 0, bestMood: 0, delta7: 0 };

  const scores = logs.map((l) => l.stressScore);
  const moods = logs.map((l) => l.mood);
  const avgScore = scores.reduce((a, b) => a + b, 0) / count;
  const maxScore = Math.max(...scores);
  const bestMood = Math.max(...moods);

  const series = dailyAverageSeries(logs);
  const newest14 = series.slice(-14);
  const last7 = newest14.slice(-7).map((p) => p.y);
  const prev7 = newest14.slice(0, Math.max(0, newest14.length - 7)).slice(-7).map((p) => p.y);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const delta7 = Math.round(avg(last7) - avg(prev7));

  return { count, avgScore, maxScore, bestMood, delta7 };
}

function dailyAverageSeries(logs: LogDoc[]) {
  const map = new Map<string, { sum: number; n: number }>();

  for (const l of logs) {
    if (!l.createdAt) continue;
    const d = l.createdAt.toDate();
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const prev = map.get(key) || { sum: 0, n: 0 };
    map.set(key, { sum: prev.sum + l.stressScore, n: prev.n + 1 });
  }

  const points = Array.from(map.entries())
    .map(([key, v]) => ({ key, y: v.sum / v.n }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));

  return points.map((p) => {
    const parts = p.key.split("-");
    const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const label = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return { x: label, y: Number(p.y.toFixed(1)) };
  });
}

function buildLineSeries(logs: LogDoc[]) {
  const series = dailyAverageSeries(logs);
  return series.map((p) => ({ value: p.y, label: p.x }));
}

function buildPieChart(logs: LogDoc[]) {
  const counts = { Low: 0, Medium: 0, High: 0 };
  for (const l of logs) {
    counts[l.stressLevel]++;
  }

  return [
    { value: counts.Low, color: "#22c55e", text: "Low", label: "😊 Low" },
    { value: counts.Medium, color: "#facc15", text: "Medium", label: "😐 Medium" },
    { value: counts.High, color: "#ef4444", text: "High", label: "⚠️ High" },
  ].filter(item => item.value > 0);
}

function buildSleepVsStressBars(logs: LogDoc[]) {
  const buckets = [
    { label: "0-4h", min: 0, max: 4 },
    { label: "4-6h", min: 4, max: 6 },
    { label: "6-8h", min: 6, max: 8 },
    { label: "8-10h", min: 8, max: 10 },
    { label: "10h+", min: 10, max: 999 },
  ];

  const sums = buckets.map(() => ({ sum: 0, n: 0 }));

  for (const l of logs) {
    const h = Number(l.sleepHours || 0);
    const i = buckets.findIndex((b) => h >= b.min && h < b.max);
    if (i >= 0) {
      sums[i].sum += Number(l.stressScore || 0);
      sums[i].n += 1;
    }
  }

  return buckets.map((b, idx) => {
    const avg = sums[idx].n ? sums[idx].sum / sums[idx].n : 0;
    return {
      label: b.label,
      value: Number(avg.toFixed(1)),
      frontColor: theme.colors.primary,
    };
  });
}

function buildSelfStressBars(logs: LogDoc[]) {
  const buckets = [
    { label: "0", val: 0 },
    { label: "1", val: 1 },
    { label: "2", val: 2 },
    { label: "3", val: 3 },
    { label: "4", val: 4 },
    { label: "5", val: 5 },
  ];

  const sums = buckets.map(() => ({ sum: 0, n: 0 }));

  for (const l of logs) {
    const v = Number(l.selfStress ?? 0);
    const i = buckets.findIndex((b) => b.val === v);
    if (i >= 0) {
      sums[i].sum += Number(l.stressScore || 0);
      sums[i].n += 1;
    }
  }

  return buckets.map((b, idx) => {
    const avg = sums[idx].n ? sums[idx].sum / sums[idx].n : 0;
    return {
      label: b.label,
      value: Number(avg.toFixed(1)),
      frontColor: theme.colors.primary,
    };
  });
}

function buildMoodVsStressBars(logs: LogDoc[]) {
  const buckets = [
    { label: "1", val: 1 },
    { label: "2", val: 2 },
    { label: "3", val: 3 },
    { label: "4", val: 4 },
    { label: "5", val: 5 },
  ];

  const sums = buckets.map(() => ({ sum: 0, n: 0 }));

  for (const l of logs) {
    const v = Number(l.mood || 3);
    const i = buckets.findIndex((b) => b.val === v);
    if (i >= 0) {
      sums[i].sum += Number(l.stressScore || 0);
      sums[i].n += 1;
    }
  }

  return buckets.map((b, idx) => {
    const avg = sums[idx].n ? sums[idx].sum / sums[idx].n : 0;
    return {
      label: b.label,
      value: Number(avg.toFixed(1)),
      frontColor: theme.colors.primary,
    };
  });
}

function buildEnergyVsStressBars(logs: LogDoc[]) {
  const energyMap = { Low: 0, Normal: 0, High: 0 };
  const energyCounts = { Low: 0, Normal: 0, High: 0 };

  for (const l of logs) {
    const energy = l.energyLevel || "Normal";
    energyMap[energy] += l.stressScore;
    energyCounts[energy]++;
  }

  return [
    { label: "🪫 Low", value: energyCounts.Low ? Number((energyMap.Low / energyCounts.Low).toFixed(1)) : 0, frontColor: "#ef4444" },
    { label: "🔋 Normal", value: energyCounts.Normal ? Number((energyMap.Normal / energyCounts.Normal).toFixed(1)) : 0, frontColor: theme.colors.primary },
    { label: "⚡ High", value: energyCounts.High ? Number((energyMap.High / energyCounts.High).toFixed(1)) : 0, frontColor: "#22c55e" },
  ];
}

function buildSymptomFrequencyBars(logs: LogDoc[]) {
  const counts = new Map<string, number>();

  for (const l of logs) {
    for (const s of l.symptoms || []) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => ({
      label: formatSymptomShort(k),
      value: v,
      frontColor: theme.colors.primary,
    }));
}

function formatSymptomShort(key: string) {
  const m: Record<string, string> = {
    headache: "🤕 Head",
    fast_heartbeat: "💓 Heart",
    stomach_discomfort: "🤢 Stomach",
    sweating: "💦 Sweat",
    muscle_tension: "💪 Tension",
    fatigue: "😴 Fatigue",
    overthinking: "🤔 Think",
    irritability: "😤 Irrit",
    overwhelmed: "😵 Over",
    difficulty_focusing: "🎯 Focus",
    anxiety: "😰 Anx",
    low_motivation: "🪫 Motiv",
  };
  return m[key] || key.slice(0, 6);
}

function buildInsight(logs: LogDoc[]) {
  if (logs.length < 4) {
    return "Log more check-ins to see stronger pattern analysis";
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const eventYes = logs.filter((l) => l.stressfulEvent === true).map((l) => l.stressScore);
  const eventNo = logs.filter((l) => l.stressfulEvent === false).map((l) => l.stressScore);

  if (eventYes.length >= 2 && eventNo.length >= 2) {
    const diff = Math.round(avg(eventYes) - avg(eventNo));
    return `⚠️ Stressful events increase your score by ${diff} points on average`;
  }

  const lowEnergy = logs.filter((l) => l.energyLevel === "Low").map((l) => l.stressScore);
  const highEnergy = logs.filter((l) => l.energyLevel === "High").map((l) => l.stressScore);

  if (lowEnergy.length >= 2 && highEnergy.length >= 2) {
    const diff = Math.round(avg(lowEnergy) - avg(highEnergy));
    return `⚡ Low energy days show ${diff} points higher stress than high energy days`;
  }

  const lowMood = logs.filter((l) => l.mood <= 2).map((l) => l.stressScore);
  const highMood = logs.filter((l) => l.mood >= 4).map((l) => l.stressScore);

  if (lowMood.length >= 2 && highMood.length >= 2) {
    const diff = Math.round(avg(lowMood) - avg(highMood));
    return `😊 Mood matters - low mood days have ${diff} points higher stress`;
  }

  return "Keep logging consistently for deeper insights into your stress patterns";
}