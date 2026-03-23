// app/wellness.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Pressable,
  Platform,
  ScrollView,
  Modal,
  Animated,
  Vibration,
  Dimensions,
} from "react-native";
import { router } from "expo-router";

import { Screen } from "../src/ui/Screen";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { AppHeader } from "../src/ui/AppHeader";
import { toast } from "../src/ui/toast";

const { width, height } = Dimensions.get("window");

type Exercise = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  instructions: string[];
};

const EXERCISES: Exercise[] = [
  {
    id: "calm-breathing",
    title: "Calm Breathing",
    description: "Slow, deep breathing to activate relaxation response",
    icon: "🌊",
    color: "#22C3A6",
    instructions: [],
  },
  {
    id: "grounding",
    title: "5-4-3-2-1 Grounding",
    description: "Bring yourself to the present moment using your senses",
    icon: "👁️",
    color: "#8B5CF6",
    instructions: [],
  },
  {
    id: "muscle-relax",
    title: "Muscle Relaxation",
    description: "Release physical tension from head to toe",
    icon: "💆",
    color: "#F59E0B",
    instructions: [
      "Tense your shoulders up toward your ears... hold for 5 seconds... release",
      "Clench your fists tightly... hold... release",
      "Tighten your stomach muscles... hold... release",
      "Flex your feet upward... hold... release",
      "Take a deep breath and notice how relaxed your body feels",
    ],
  },
  {
    id: "panic-rescue",
    title: "Panic Rescue",
    description: "Quick relief when anxiety feels overwhelming",
    icon: "🛟",
    color: "#ef4444",
    instructions: [
      "Place your hand on your chest",
      "Breathe in for 3 seconds, out for 5 seconds (repeat 3 times)",
      "Name 3 things you can SEE right now",
      "Splash cold water on your face or hold an ice cube",
      "Tell yourself: 'This will pass. I am safe.'",
    ],
  },
];

export default function WellnessHub() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breathCount, setBreathCount] = useState(0);
  const [showGroundingHint, setShowGroundingHint] = useState(false);
  const [groundingInput, setGroundingInput] = useState("");
  const [groundingItems, setGroundingItems] = useState<string[]>([]);

  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const breathingInterval = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const breathProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (breathingInterval.current) clearInterval(breathingInterval.current);
    };
  }, []);

  const startExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setStepIndex(0);
    setBreathCount(0);
    setGroundingItems([]);
    setGroundingInput("");
    setShowGroundingHint(false);
    setModalVisible(true);
    setIsActive(true);

    if (exercise.id === "calm-breathing") {
      startBreathingExercise();
    } else if (exercise.id === "grounding") {
      startGroundingExercise();
    } else if (exercise.id === "muscle-relax" || exercise.id === "panic-rescue") {
      startGuidedExercise(exercise);
    }
  };

  // ============= ENHANCED CALM BREATHING =============
  const startBreathingExercise = () => {
    setIsBreathing(true);
    let cycleCount = 0;
    let secondsLeft = 4;

    // Reset animations
    breathProgress.setValue(0);

    breathingInterval.current = setInterval(() => {
      secondsLeft--;

      // Update progress bar for current phase
      let progressValue = 0;
      if (breathingPhase === "inhale") {
        progressValue = (4 - secondsLeft) / 4;
      } else if (breathingPhase === "hold") {
        progressValue = (2 - secondsLeft) / 2;
      } else {
        progressValue = (6 - secondsLeft) / 6;
      }
      Animated.timing(breathProgress, {
        toValue: progressValue,
        duration: 100,
        useNativeDriver: false,
      }).start();

      // Animate the breathing circle
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: breathingPhase === "inhale" ? 1.3 : breathingPhase === "exhale" ? 0.85 : 1.1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(pulseAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      // Phase change logic
      if (secondsLeft === 0) {
        if (breathingPhase === "inhale") {
          setBreathingPhase("hold");
          secondsLeft = 2;
          // Gentle vibration for phase transition
          if (Platform.OS !== "web") Vibration.vibrate(30);
        } else if (breathingPhase === "hold") {
          setBreathingPhase("exhale");
          secondsLeft = 6;
        } else if (breathingPhase === "exhale") {
          setBreathingPhase("inhale");
          secondsLeft = 4;
          cycleCount++;
          setBreathCount(cycleCount);

          // Vibrate on breath completion
          if (Platform.OS !== "web") Vibration.vibrate(50);

          // Fade animation for completion
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();

          // Provide encouraging messages
          if (cycleCount === 3) {
            toast("You're doing great! 🌟", "Notice how your body feels");
          } else if (cycleCount === 6) {
            toast("Halfway there! 💪", "Keep breathing deeply");
          } else if (cycleCount === 10) {
            if (breathingInterval.current) clearInterval(breathingInterval.current);
            setIsBreathing(false);
            setIsActive(false);
            toast("Wonderful! ✨", "Take a moment to enjoy this calm feeling");
          }
        }
      }
    }, 1000);
  };

  // ============= ENHANCED GROUNDING EXERCISE =============
  const startGroundingExercise = () => {
    // Start with first sense: SEE
    setStepIndex(0);
    setShowGroundingHint(true);
  };

  const handleGroundingInput = () => {
    if (!groundingInput.trim()) {
      toast("Take a moment", "Look around and name something you notice");
      return;
    }

    const newItems = [...groundingItems, groundingInput];
    setGroundingItems(newItems);
    setGroundingInput("");

    // Move to next sense
    if (stepIndex === 0 && newItems.length >= 5) {
      // Completed SEE, move to FEEL
      setStepIndex(1);
      setGroundingItems([]);
      toast("Great! 👋", "Now let's notice what you can FEEL");
    } else if (stepIndex === 1 && newItems.length >= 4) {
      setStepIndex(2);
      setGroundingItems([]);
      toast("Well done! 👂", "Now let's notice what you can HEAR");
    } else if (stepIndex === 2 && newItems.length >= 3) {
      setStepIndex(3);
      setGroundingItems([]);
      toast("Wonderful! 👃", "Now let's notice what you can SMELL");
    } else if (stepIndex === 3 && newItems.length >= 2) {
      setStepIndex(4);
      setGroundingItems([]);
      toast("Almost there! 👅", "Now let's notice what you can TASTE");
    } else if (stepIndex === 4 && newItems.length >= 1) {
      completeExercise();
    }
  };

  const getGroundingTitle = () => {
    switch (stepIndex) {
      case 0: return "5 Things You Can SEE";
      case 1: return "4 Things You Can FEEL";
      case 2: return "3 Things You Can HEAR";
      case 3: return "2 Things You Can SMELL";
      case 4: return "1 Thing You Can TASTE";
      default: return "Grounding Exercise";
    }
  };

  const getGroundingExamples = () => {
    switch (stepIndex) {
      case 0: return ["a lamp", "a window", "your hands", "a plant", "a book"];
      case 1: return ["your clothes", "the chair", "the air", "your phone"];
      case 2: return ["birds singing", "a fan", "your breathing"];
      case 3: return ["fresh air", "coffee", "flowers"];
      case 4: return ["water", "mint", "tea"];
      default: return [];
    }
  };

  const getGroundingIcon = () => {
    switch (stepIndex) {
      case 0: return "👁️";
      case 1: return "✋";
      case 2: return "👂";
      case 3: return "👃";
      case 4: return "👅";
      default: return "🧘";
    }
  };

  const getGroundingRemaining = () => {
    const needed = [5, 4, 3, 2, 1];
    const current = groundingItems.length;
    const totalNeeded = needed[stepIndex];
    const remaining = totalNeeded - current;
    return `${remaining} more to go`;
  };

  const skipGroundingItem = () => {
    // Auto-fill with example if user is stuck
    const examples = getGroundingExamples();
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    setGroundingInput(randomExample);
    setTimeout(() => handleGroundingInput(), 100);
  };

  const startGuidedExercise = (exercise: Exercise) => {
    if (exercise.id === "muscle-relax") {
      let step = 0;
      timerInterval.current = setInterval(() => {
        if (step >= exercise.instructions.length - 1) {
          if (timerInterval.current) clearInterval(timerInterval.current);
          setIsActive(false);
          toast("Muscles relaxed! 🧘", "Feel the release of tension");
          return;
        }
        step++;
        setStepIndex(step);
      }, 8000);
    } else if (exercise.id === "panic-rescue") {
      let step = 0;
      timerInterval.current = setInterval(() => {
        if (step >= exercise.instructions.length - 1) {
          if (timerInterval.current) clearInterval(timerInterval.current);
          setIsActive(false);
          toast("You're safe 💙", "That feeling will pass");
          return;
        }
        step++;
        setStepIndex(step);
      }, 7000);
    }
  };

  const nextStep = () => {
    if (selectedExercise && stepIndex < selectedExercise.instructions.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      completeExercise();
    }
  };

  const previousStep = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  const completeExercise = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    if (breathingInterval.current) clearInterval(breathingInterval.current);
    setIsActive(false);
    setIsBreathing(false);
    setModalVisible(false);
    setSelectedExercise(null);
    toast("Beautiful work! 🌟", "You're building resilience");
  };

  const stopExercise = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    if (breathingInterval.current) clearInterval(breathingInterval.current);
    setIsActive(false);
    setIsBreathing(false);
    setModalVisible(false);
    setSelectedExercise(null);
    toast("Session ended", "You can always return when ready");
  };

  const getBreathingText = () => {
    switch (breathingPhase) {
      case "inhale": return "Breathe in...";
      case "hold": return "Hold...";
      case "exhale": return "Breathe out...";
    }
  };

  return (
    <Screen>
      <AppHeader title="Wellness Tools" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: theme.space.xl, paddingBottom: theme.space.xl }}>
          {/* Header Info */}
          <View
            style={{
              backgroundColor: `${theme.colors.primary}15`,
              borderRadius: theme.radius.xl,
              padding: theme.space.lg,
              gap: theme.space.sm,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <AppText style={{ fontSize: 32 }}>🧘</AppText>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontWeight: "900", fontSize: 18 }}>
                  Simple Tools That Work
                </AppText>
                <AppText variant="sub" style={{ fontSize: 13 }}>
                  Quick, effective techniques to calm your mind and body
                </AppText>
              </View>
            </View>
          </View>

          {/* Exercise Cards - 2x2 Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.md }}>
            {EXERCISES.map((exercise) => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onPress={() => startExercise(exercise)}
              />
            ))}
          </View>

          {/* Quick Tips */}
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
              <AppText style={{ fontSize: 20 }}>💡</AppText>
              <AppText style={{ fontWeight: "900", fontSize: 16 }}>Quick Tips</AppText>
            </View>

            <View style={{ gap: 10 }}>
              <TipItem text="Practice when you're calm to build the skill" />
              <TipItem text="Use these tools BEFORE stress becomes overwhelming" />
              <TipItem text="Even 1-2 minutes can make a difference" />
              <TipItem text="Find a quiet space where you won't be disturbed" />
            </View>
          </View>

          {/* Emergency Info */}
          <View
            style={{
              backgroundColor: `${theme.colors.danger}15`,
              borderRadius: theme.radius.xl,
              padding: theme.space.lg,
              gap: theme.space.sm,
              borderWidth: 1,
              borderColor: `${theme.colors.danger}30`,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppText style={{ fontSize: 20 }}>🆘</AppText>
              <AppText style={{ fontWeight: "900", fontSize: 16 }}>Need Immediate Help?</AppText>
            </View>
            <AppText variant="sub" style={{ fontSize: 13 }}>
              If you're in crisis or having thoughts of harming yourself:
            </AppText>
            <View style={{ gap: 8, marginTop: 4 }}>
              <AppText variant="small">• Call or text 988 (Crisis Lifeline)</AppText>
              <AppText variant="small">• Text HOME to 741741 (Crisis Text Line)</AppText>
              <AppText variant="small">• Go to your nearest emergency room</AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Exercise Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={stopExercise}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" }}>
          <View style={{ padding: theme.space.xl, alignItems: "center", width: "100%" }}>

            {/* CALM BREATHING UI - Enhanced */}
            {isBreathing && selectedExercise?.id === "calm-breathing" && (
              <View style={{ alignItems: "center", width: "100%" }}>
                <AppText style={{ fontSize: 48, marginBottom: 20 }}>🌊</AppText>
                <AppText style={{ fontSize: 28, fontWeight: "900", marginBottom: 8, color: theme.colors.primary }}>
                  Calm Breathing
                </AppText>

                {/* Animated Breathing Circle */}
                <Animated.View
                  style={{
                    width: 260,
                    height: 260,
                    borderRadius: 130,
                    backgroundColor: `${theme.colors.primary}15`,
                    justifyContent: "center",
                    alignItems: "center",
                    transform: [{ scale: pulseAnim }],
                    marginVertical: 30,
                  }}
                >
                  <View
                    style={{
                      width: 200,
                      height: 200,
                      borderRadius: 100,
                      backgroundColor: theme.colors.primary,
                      justifyContent: "center",
                      alignItems: "center",
                      shadowColor: theme.colors.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 20,
                    }}
                  >
                    <AppText style={{ fontSize: 48, fontWeight: "900", color: "white" }}>
                      {breathingPhase === "inhale" ? "🌬️" : breathingPhase === "hold" ? "⏸️" : "🌊"}
                    </AppText>
                    <AppText style={{ fontSize: 24, fontWeight: "900", color: "white", marginTop: 8 }}>
                      {breathingPhase === "inhale" ? "Inhale" : breathingPhase === "hold" ? "Hold" : "Exhale"}
                    </AppText>
                  </View>
                </Animated.View>

                {/* Progress Bar */}
                <View style={{ width: "80%", marginVertical: 20 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <AppText style={{ fontSize: 14, color: theme.colors.primary }}>
                      {getBreathingText()}
                    </AppText>
                    <AppText style={{ fontSize: 14, fontWeight: "700", color: theme.colors.primary }}>
                      Breath {breathCount}/10
                    </AppText>
                  </View>
                  <View style={{ height: 4, backgroundColor: `${theme.colors.primary}30`, borderRadius: 2 }}>
                    <Animated.View
                      style={{
                        height: 4,
                        width: breathProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: theme.colors.primary,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>

                {/* Guidance Text */}
                <AppText style={{ fontSize: 16, textAlign: "center", opacity: 0.7, marginTop: 10, lineHeight: 24 }}>
                  {breathingPhase === "inhale" && "Fill your lungs with fresh air..."}
                  {breathingPhase === "hold" && "Pause and notice the stillness..."}
                  {breathingPhase === "exhale" && "Release all tension..."}
                </AppText>
              </View>
            )}

            {/* GROUNDING EXERCISE UI - Enhanced Interactive */}
            {!isBreathing && selectedExercise?.id === "grounding" && (
              <View style={{ alignItems: "center", width: "100%" }}>
                <AppText style={{ fontSize: 56, marginBottom: 16 }}>{getGroundingIcon()}</AppText>
                <AppText style={{ fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 8 }}>
                  {getGroundingTitle()}
                </AppText>

                {/* Progress */}
                <View style={{ marginVertical: 16 }}>
                  <AppText style={{ fontSize: 14, opacity: 0.7 }}>
                    {groundingItems.length} / {stepIndex === 0 ? 5 : stepIndex === 1 ? 4 : stepIndex === 2 ? 3 : stepIndex === 3 ? 2 : 1} found
                  </AppText>
                  <AppText style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                    {getGroundingRemaining()}
                  </AppText>
                </View>

                {/* List of found items */}
                {groundingItems.length > 0 && (
                  <View
                    style={{
                      backgroundColor: `${selectedExercise.color}20`,
                      borderRadius: theme.radius.lg,
                      padding: theme.space.md,
                      marginBottom: 20,
                      width: "100%",
                    }}
                  >
                    {groundingItems.map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 }}>
                        <AppText style={{ fontSize: 14 }}>✓</AppText>
                        <AppText style={{ fontSize: 14 }}>{item}</AppText>
                      </View>
                    ))}
                  </View>
                )}

                {/* Input Area */}
                <View style={{ width: "100%", marginVertical: 20 }}>
                  <View
                    style={{
                      backgroundColor: theme.colors.card,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.xl,
                      padding: theme.space.md,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <AppText style={{ fontSize: 20 }}>{getGroundingIcon()}</AppText>
                    <input
                      type="text"
                      value={groundingInput}
                      onChange={(e: any) => setGroundingInput(e.target.value)}
                      onKeyPress={(e: any) => e.key === "Enter" && handleGroundingInput()}
                      placeholder={`Type what you ${stepIndex === 0 ? "see" : stepIndex === 1 ? "feel" : stepIndex === 2 ? "hear" : stepIndex === 3 ? "smell" : "taste"}...`}
                      style={{
                        flex: 1,
                        backgroundColor: "transparent",
                        color: theme.colors.text,
                        fontSize: 14,
                        outline: "none",
                        border: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                    <Pressable
                      onPress={handleGroundingInput}
                      style={({ pressed }) => ({
                        flex: 1,
                        backgroundColor: selectedExercise.color,
                        borderRadius: theme.radius.md,
                        paddingVertical: 12,
                        alignItems: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <AppText style={{ fontWeight: "700", color: "white" }}>Add</AppText>
                    </Pressable>
                    <Pressable
                      onPress={skipGroundingItem}
                      style={({ pressed }) => ({
                        flex: 1,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radius.md,
                        paddingVertical: 12,
                        alignItems: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <AppText style={{ fontWeight: "700" }}>Need help? →</AppText>
                    </Pressable>
                  </View>
                </View>

                <AppText style={{ fontSize: 12, opacity: 0.5, textAlign: "center", marginTop: 10 }}>
                  Examples: {getGroundingExamples().slice(0, 3).join(", ")}...
                </AppText>
              </View>
            )}

            {/* Other Exercises UI */}
            {!isBreathing && selectedExercise && selectedExercise.id !== "grounding" && selectedExercise.id !== "calm-breathing" && (
              <View style={{ alignItems: "center", width: "100%" }}>
                <AppText style={{ fontSize: 56, marginBottom: 16 }}>{selectedExercise.icon}</AppText>
                <AppText style={{ fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 24 }}>
                  {selectedExercise.title}
                </AppText>

                <View
                  style={{
                    backgroundColor: `${selectedExercise.color}15`,
                    borderRadius: theme.radius.xl,
                    padding: theme.space.xl,
                    width: "100%",
                    marginBottom: 24,
                  }}
                >
                  <AppText style={{ fontSize: 14, opacity: 0.7, marginBottom: 12 }}>
                    Step {stepIndex + 1} of {selectedExercise.instructions.length}
                  </AppText>
                  <AppText style={{ fontSize: 20, fontWeight: "800", lineHeight: 28, textAlign: "center" }}>
                    {selectedExercise.instructions[stepIndex]}
                  </AppText>
                </View>
              </View>
            )}

            {/* Control Buttons */}
            {!isBreathing && selectedExercise && selectedExercise.id !== "grounding" && (
              <View style={{ flexDirection: "row", gap: theme.space.md, marginTop: 20 }}>
                {stepIndex > 0 && (
                  <Pressable
                    onPress={previousStep}
                    style={({ pressed }) => ({
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.md,
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <AppText style={{ fontWeight: "700" }}>← Back</AppText>
                  </Pressable>
                )}

                {stepIndex < selectedExercise.instructions.length - 1 ? (
                  <Pressable
                    onPress={nextStep}
                    style={({ pressed }) => ({
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radius.md,
                      paddingVertical: 12,
                      paddingHorizontal: 32,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <AppText style={{ fontWeight: "700", color: "white" }}>Next →</AppText>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={completeExercise}
                    style={({ pressed }) => ({
                      backgroundColor: "#22c55e",
                      borderRadius: theme.radius.md,
                      paddingVertical: 12,
                      paddingHorizontal: 32,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <AppText style={{ fontWeight: "700", color: "white" }}>Complete ✓</AppText>
                  </Pressable>
                )}
              </View>
            )}

            {/* Exit Button */}
            <Pressable
              onPress={stopExercise}
              style={({ pressed }) => ({
                marginTop: 24,
                paddingVertical: 10,
                paddingHorizontal: 20,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <AppText variant="small" style={{ opacity: 0.5 }}>Exit</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48%",
        backgroundColor: `${exercise.color}15`,
        borderWidth: 1,
        borderColor: `${exercise.color}40`,
        borderRadius: theme.radius.xl,
        padding: theme.space.lg,
        gap: 8,
        opacity: pressed ? 0.9 : 1,
        ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
      })}
    >
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <AppText style={{ fontSize: 40, marginBottom: 8 }}>{exercise.icon}</AppText>
        <AppText style={{ fontWeight: "800", fontSize: 16, textAlign: "center" }}>
          {exercise.title}
        </AppText>
      </View>
      <AppText variant="small" style={{ fontSize: 11, opacity: 0.7, textAlign: "center", lineHeight: 14 }}>
        {exercise.description}
      </AppText>
      <View style={{ marginTop: 8, alignItems: "center" }}>
        <AppText style={{ fontSize: 12, color: exercise.color }}>Start →</AppText>
      </View>
    </Pressable>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <AppText style={{ fontSize: 14 }}>•</AppText>
      <AppText variant="sub" style={{ fontSize: 13, flex: 1, lineHeight: 18 }}>
        {text}
      </AppText>
    </View>
  );
}