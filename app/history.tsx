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

import { LineChart, BarChart } from "react-native-gifted-charts";

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

  const line = useMemo(() => buildLineSeries(logs), [logs]);
  const dist = useMemo(() => buildDist(logs), [logs]);
  const sleepBars = useMemo(() => buildSleepBars(logs), [logs]);
  const stressBars = useMemo(() => buildSelfStressBars(logs), [logs]);
  const symptomBars = useMemo(() => buildTopSymptomsBars(logs), [logs]);

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
      <AppHeader title="History" />

      <InfoCard />

      <View style={{ flexDirection: "row", gap: theme.space.sm, marginBottom: theme.space.lg }}>
        {ranges.map((r) => (
          <ChipButton
            key={r.key}
            label={r.label}
            active={r.key === rangeKey}
            onPress={() => setRangeKey(r.key)}
          />
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
        <StatCard title="Average score" value={stats.avgScore.toFixed(1)} />
        <StatCard title="Highest score" value={String(stats.maxScore)} />
        <StatCard title="Check-ins" value={String(logs.length)} />
        <StatCard title="7-day trend" value={stats.delta7 >= 0 ? `+${stats.delta7}` : String(stats.delta7)} />
      </View>

      <View style={{ marginTop: theme.space.lg }}>
        <InsightCard text={insight} />
      </View>

      <View style={{ gap: theme.space.xl, marginTop: theme.space.xl }}>
        <ChartCard title="Stress trend" subtitle="Daily average score">
          {line.length >= 2 ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <LineChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={line}
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
              />
            </View>
          ) : (
            <EmptyHint />
          )}
        </ChartCard>

        <ChartCard title="Stress distribution" subtitle="Low / Medium / High">
          {dist.length ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={dist}
                barWidth={26}
                spacing={30}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...dist.map((d) => d.value), 1)}
                initialSpacing={20}
                endSpacing={20}
              />
            </View>
          ) : (
            <EmptyHint />
          )}
        </ChartCard>

        <ChartCard title="Sleep vs Stress" subtitle="Average stress by sleep range">
          {sleepBars.some((b) => b.value > 0) ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={sleepBars}
                barWidth={22}
                spacing={20}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...sleepBars.map((d) => d.value), 1)}
                initialSpacing={12}
                endSpacing={12}
              />
            </View>
          ) : (
            <EmptyHint text="Need a few check-ins with sleep data." />
          )}
        </ChartCard>

        <ChartCard title="Self-rated stress" subtitle="How the user felt vs saved logs">
          {stressBars.some((b) => b.value > 0) ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={stressBars}
                barWidth={24}
                spacing={18}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...stressBars.map((d) => d.value), 1)}
                initialSpacing={12}
                endSpacing={12}
              />
            </View>
          ) : (
            <EmptyHint text="Not enough self-stress data yet." />
          )}
        </ChartCard>

        <ChartCard title="Top symptoms" subtitle="Most frequent in this range">
          {symptomBars.length ? (
            <View style={{ paddingHorizontal: CHART_SIDE_PAD }}>
              <BarChart
                width={chartW - CHART_SIDE_PAD * 2}
                data={symptomBars}
                barWidth={18}
                spacing={16}
                roundedTop
                rulesColor="rgba(255,255,255,0.06)"
                yAxisColor="rgba(255,255,255,0.20)"
                xAxisColor="rgba(255,255,255,0.20)"
                yAxisTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700" }}
                xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.75)", fontSize: 9, fontWeight: "800" }}
                noOfSections={4}
                maxValue={Math.max(...symptomBars.map((d) => d.value), 1)}
                initialSpacing={10}
                endSpacing={10}
              />
            </View>
          ) : (
            <EmptyHint text="No symptom data yet." />
          )}
        </ChartCard>
      </View>

      <View style={{ marginTop: theme.space.xl, gap: theme.space.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText style={{ fontWeight: "900" }}>All check-ins</AppText>

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
            <AppText style={{ fontWeight: "900" }}>Filters</AppText>
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
          <AppText style={{ fontWeight: "900" }}>{searchOpen ? "Hide search" : "Search (optional)"}</AppText>
          <AppText variant="small" style={{ opacity: 0.8 }}>
            Search by symptom, level, date, energy or enjoyment.
          </AppText>
        </Pressable>

        {searchOpen ? <SearchBox value={searchText} onChange={setSearchText} /> : null}

        <Accordion title={`High (${groups.High.length})`} open={openHigh} onToggle={() => setOpenHigh((s) => !s)}>
          {groups.High.map((l) => (
            <LogRow key={l.id} log={l} onOpen={openLog} onDelete={confirmDelete} />
          ))}
        </Accordion>

        <Accordion
          title={`Medium (${groups.Medium.length})`}
          open={openMedium}
          onToggle={() => setOpenMedium((s) => !s)}
        >
          {groups.Medium.map((l) => (
            <LogRow key={l.id} log={l} onOpen={openLog} onDelete={confirmDelete} />
          ))}
        </Accordion>

        <Accordion title={`Low (${groups.Low.length})`} open={openLow} onToggle={() => setOpenLow((s) => !s)}>
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
            <AppText style={{ fontWeight: "900" }}>{loadingMore ? "Loading..." : "Load more"}</AppText>
          </Pressable>
        ) : (
          <AppText variant="small" style={{ opacity: 0.8 }}>
            End of results.
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

/* ---------------- UI ---------------- */

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
      <AppText style={{ fontWeight: "900" }}>History & Insights</AppText>
      <AppText variant="sub">
        This section shows trends in stress score, sleep, symptoms, self-rated stress, and daily context.
      </AppText>
      <AppText variant="small" style={{ opacity: 0.85 }}>
        Lower scores over time usually mean better stress management.
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
      <AppText style={{ fontWeight: "900" }}>Quick Insight</AppText>
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

function StatCard({ title, value }: { title: string; value: string }) {
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
      <AppText style={{ fontWeight: "900", fontSize: 22 }}>{value}</AppText>
    </View>
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

function EmptyHint({ text = "Not enough data yet. Log a few check-ins first." }: { text?: string }) {
  return <AppText variant="sub">{text}</AppText>;
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
      }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search: symptom, date, level, energy..."
        placeholderTextColor="rgba(255,255,255,0.45)"
        style={{
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
          {count ? children : <AppText variant="sub" style={{ opacity: 0.75 }}>No results.</AppText>}
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
          }}
        >
          <AppText style={{ fontWeight: "900" }}>
            {log.stressLevel} • {log.stressScore}
          </AppText>
        </View>

        <AppText variant="small">{formatDate(log.createdAt)}</AppText>
      </View>

      <AppText variant="sub">
        Sleep {log.sleepHours}h • Mood {log.mood}/5 • Self-stress {log.selfStress ?? 0}/5
      </AppText>

      <AppText variant="small" style={{ opacity: 0.82 }}>
        {log.energyLevel || "Normal"} energy • {log.enjoyment || "Somewhat"} enjoyment • {log.symptoms.length} symptoms
      </AppText>

      <AppText variant="small" style={{ opacity: 0.7 }}>
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
          <AppText style={{ fontWeight: "900", fontSize: 18 }}>Filters</AppText>

          <Pressable onPress={clear}>
            <AppText style={{ fontWeight: "900", opacity: 0.9 }}>Clear</AppText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ gap: theme.space.lg }}>
          <View style={{ gap: 10 }}>
            <AppText style={{ fontWeight: "900" }}>Level</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {(["All", "Low", "Medium", "High"] as LevelFilter[]).map((x) => (
                <MiniChip key={x} label={x} active={x === level} onPress={() => onSetLevel(x)} />
              ))}
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <AppText style={{ fontWeight: "900" }}>Sort</AppText>
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
              Select one or more symptoms to narrow results.
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
            <AppText style={{ fontWeight: "900" }}>Apply</AppText>
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

/* ---------------- helpers ---------------- */

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
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
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
  if (count === 0) return { count: 0, avgScore: 0, maxScore: 0, delta7: 0 };

  const scores = logs.map((l) => l.stressScore);
  const avgScore = scores.reduce((a, b) => a + b, 0) / count;
  const maxScore = Math.max(...scores);

  const series = dailyAverageSeries(logs);
  const newest14 = series.slice(-14);
  const last7 = newest14.slice(-7).map((p) => p.y);
  const prev7 = newest14.slice(0, Math.max(0, newest14.length - 7)).slice(-7).map((p) => p.y);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const delta7 = Math.round(avg(last7) - avg(prev7));

  return { count, avgScore, maxScore, delta7 };
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

function buildDist(logs: LogDoc[]) {
  const c = { Low: 0, Medium: 0, High: 0 } as Record<StressLevel, number>;
  for (const l of logs) c[l.stressLevel] = (c[l.stressLevel] || 0) + 1;

  return [
    { value: c.Low, label: "Low", frontColor: theme.colors.primary },
    { value: c.Medium, label: "Med", frontColor: theme.colors.primary },
    { value: c.High, label: "High", frontColor: theme.colors.primary },
  ];
}

function buildSleepBars(logs: LogDoc[]) {
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

function buildTopSymptomsBars(logs: LogDoc[]) {
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
      label: shortSymptom(k),
      value: v,
      frontColor: theme.colors.primary,
    }));
}

function shortSymptom(key: string) {
  const m: Record<string, string> = {
    headache: "Head",
    fast_heartbeat: "Heart",
    stomach_discomfort: "Stomach",
    sweating: "Sweat",
    muscle_tension: "Tension",
    fatigue: "Fatigue",
    overthinking: "Think",
    irritability: "Irrit",
    overwhelmed: "Over",
    difficulty_focusing: "Focus",
    anxiety: "Anx",
    low_motivation: "Motiv",
  };
  return m[key] || key.slice(0, 6);
}

function buildInsight(logs: LogDoc[]) {
  if (logs.length < 4) {
    return "Log a few more check-ins to unlock stronger pattern analysis.";
  }

  const eventYes = logs.filter((l) => l.stressfulEvent === true).map((l) => l.stressScore);
  const eventNo = logs.filter((l) => l.stressfulEvent === false).map((l) => l.stressScore);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const avgEventYes = avg(eventYes);
  const avgEventNo = avg(eventNo);

  if (eventYes.length >= 2 && eventNo.length >= 2) {
    const diff = Math.round(avgEventYes - avgEventNo);
    return `Stressful events seem to matter. Days marked with a stressful event are about ${diff} points higher on average.`;
  }

  const lowEnergy = logs.filter((l) => l.energyLevel === "Low").map((l) => l.stressScore);
  const highEnergy = logs.filter((l) => l.energyLevel === "High").map((l) => l.stressScore);

  if (lowEnergy.length >= 2 && highEnergy.length >= 2) {
    const diff = Math.round(avg(lowEnergy) - avg(highEnergy));
    return `Energy level is a strong signal. Low-energy days are about ${diff} points higher in stress than high-energy days.`;
  }

  return "Your recent history shows usable patterns. Keep logging consistently for stronger insights.";
}