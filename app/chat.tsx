// app/chat.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
} from "react-native";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { QuickReplies } from "../src/ui/QuickReplies";
import { auth } from "../src/firebase/firebaseConfig";
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/firebaseConfig";

// Import the advanced emotional intelligence chatbot
import {
  getAdvancedBotReply,
  EmotionalSessionManager,
  getGreeting,
  UserProfile
} from "../src/chatbot/emotionalIntelligence";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  riskLevel?: string;
  emotion?: string;
};

// Session Manager Instance
const sessionManager = new EmotionalSessionManager();

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userStressData, setUserStressData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [showRiskAlert, setShowRiskAlert] = useState(false);
  const [riskAlert, setRiskAlert] = useState({ severity: "", action: "" });
  const [userEmotion, setUserEmotion] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      if (!uid) {
        setIsLoading(false);
        setMessages([
          {
            id: "1",
            role: "assistant",
            text: "Hello! I'm your emotional wellness companion. Please log in to continue. 👋",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Initialize session
      sessionManager.createSession(uid, userName);

      // Get user name from Firestore
      let name = "";
      try {
        const userQuery = query(collection(db, "users"), where("uid", "==", uid));
        const userSnap = await getDocs(userQuery);
        userSnap.forEach((doc) => {
          name = doc.data().name || "";
        });
        setUserName(name);
        sessionManager.updateSession(uid, { name });
      } catch (error) {
        console.log("Error loading user name:", error);
      }

      // Get recent stress data
      let stressLevel = "Low";
      try {
        const stressQuery = query(
          collection(db, "symptomLogs"),
          where("uid", "==", uid),
          orderBy("createdAt", "desc"),
          limit(7)
        );
        const stressSnap = await getDocs(stressQuery);

        if (!stressSnap.empty) {
          const latest = stressSnap.docs[0]?.data();
          if (latest) {
            stressLevel = latest.stressLevel || "Low";
            setUserStressData({
              stressLevel: latest.stressLevel || "Low",
              recentScore: latest.stressScore || 0,
            });
            sessionManager.updateSession(uid, { stressLevel: stressLevel as any });
          }
        }
      } catch (error) {
        console.log("Error loading stress data:", error);
      }

      // Set welcome message with personalized greeting
      const greeting = getGreeting(name || undefined);
      setMessages([
        {
          id: "1",
          role: "assistant",
          text: greeting,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.log("Error loading user data:", error);
      setMessages([
        {
          id: "1",
          role: "assistant",
          text: "Hello! I'm your emotional wellness companion. How are you feeling today? 💙",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input;
    if (!messageToSend.trim()) {
      return;
    }

    if (!uid) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        text: "Please log in to continue the conversation.",
        timestamp: new Date(),
      }]);
      return;
    }

    const session = sessionManager.getSession(uid);
    if (!session) {
      sessionManager.createSession(uid, userName);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: messageToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) {
      setInput("");
    }
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Get bot reply with emotional intelligence
    setTimeout(() => {
      const currentSession = sessionManager.getSession(uid);
      const replyText = getAdvancedBotReply(messageToSend, currentSession);

      // Update session after response
      const updatedSession = sessionManager.getSession(uid);

      // Detect if this is a crisis response
      const isCrisisResponse = replyText.includes("emergency") ||
                               replyText.includes("988") ||
                               replyText.includes("911") ||
                               replyText.includes("Crisis Lifeline");

      const assistantMsg: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        text: replyText,
        timestamp: new Date(),
        riskLevel: updatedSession?.riskLevel,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);

      // Show risk alert if needed
      if (isCrisisResponse && (updatedSession?.riskLevel === "Critical" || updatedSession?.riskLevel === "High")) {
        const alert = {
          severity: updatedSession?.riskLevel === "Critical"
            ? "🚨 IMMEDIATE ACTION REQUIRED"
            : "⚠️ HIGH RISK DETECTED",
          action: updatedSession?.riskLevel === "Critical"
            ? "Please contact emergency services immediately.\n\n• Emergency: 911\n• Crisis Lifeline: 988\n• Text HOME to 741741\n\nYour safety is the priority."
            : "You're experiencing significant distress. Please consider reaching out to a mental health professional.\n\n• Crisis Lifeline: 988\n• Crisis Text Line: Text HOME to 741741"
        };
        setRiskAlert(alert);
        setShowRiskAlert(true);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
  };

  const endSession = () => {
    if (!uid) return;
    const summary = sessionManager.endSession(uid);
    setClinicalSummary(summary);
    setShowSummary(true);
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    setTimeout(() => sendMessage(text), 50);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

    // Get emotion emoji for bot messages
    const getEmotionEmoji = () => {
      if (isUser) return null;
      if (item.text.includes("😊") || item.text.includes("happy") || item.text.includes("great")) return "😊";
      if (item.text.includes("😢") || item.text.includes("sad")) return "😢";
      if (item.text.includes("😠") || item.text.includes("angry")) return "😠";
      if (item.text.includes("😫") || item.text.includes("stressed")) return "😫";
      if (item.text.includes("😰") || item.text.includes("anxious")) return "😰";
      if (item.text.includes("😴") || item.text.includes("tired")) return "😴";
      return "💙";
    };

    return (
      <View
        style={{
          alignSelf: isUser ? "flex-end" : "flex-start",
          backgroundColor: isUser ? theme.colors.primary : theme.colors.card,
          borderRadius: 20,
          padding: 14,
          marginBottom: 12,
          maxWidth: "85%",
          borderWidth: isUser ? 0 : 1,
          borderColor: theme.colors.border,
        }}
      >
        {!isUser && (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
            <AppText style={{ fontSize: 14, marginRight: 6 }}>{getEmotionEmoji()}</AppText>
            <AppText variant="small" style={{ opacity: 0.6, fontSize: 10 }}>
              Wellness Assistant
            </AppText>
          </View>
        )}

        <AppText
          style={{
            fontWeight: "500",
            lineHeight: 20,
            fontSize: 15,
          }}
        >
          {item.text}
        </AppText>

        {item.riskLevel && item.riskLevel !== "Low" && (
          <View
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <AppText
              variant="small"
              style={{
                color: item.riskLevel === "Critical" ? theme.colors.danger : "#facc15",
                fontWeight: "700",
              }}
            >
              ⚠️ {item.riskLevel} Risk Level
            </AppText>
          </View>
        )}

        <AppText
          variant="small"
          style={{
            opacity: 0.5,
            fontSize: 10,
            marginTop: 6,
            textAlign: isUser ? "right" : "left",
          }}
        >
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </AppText>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    return (
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: theme.colors.card,
          borderRadius: 20,
          padding: 14,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <AppText variant="small" style={{ opacity: 0.7 }}>
            Listening...
          </AppText>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: theme.space.md,
          paddingTop: theme.space.md,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          marginBottom: theme.space.md,
        }}
      >
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 24 }}>🤖</AppText>
            <View>
              <AppText style={{ fontWeight: "900", fontSize: 18 }}>Emotional Companion</AppText>
              <AppText variant="small" style={{ opacity: 0.6, fontSize: 11 }}>
                Here for all your feelings
              </AppText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={endSession}
          style={({ pressed }) => ({
            backgroundColor: "rgba(255,90,106,0.15)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(255,90,106,0.3)",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <AppText variant="small" style={{ fontWeight: "600", color: theme.colors.danger }}>
            End Session
          </AppText>
        </Pressable>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="sub">Loading your emotional companion...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={{ flex: 1, paddingHorizontal: theme.space.xl }}>
          {renderHeader()}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListFooterComponent={renderTypingIndicator}
            contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          {/* Quick Replies */}
          {!isTyping && input.length === 0 && messages.length > 0 && (
            <View style={{ marginBottom: theme.space.sm }}>
              <QuickReplies onSelect={handleQuickReply} />
            </View>
          )}

          {/* Input Area */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              paddingTop: theme.space.md,
              paddingBottom: theme.space.md,
              borderTopWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.bg,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="How are you feeling today?"
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              style={{
                flex: 1,
                backgroundColor: theme.colors.card,
                borderRadius: 24,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: theme.colors.text,
                fontWeight: "500",
                maxHeight: 100,
                fontSize: 15,
                outlineStyle: "none" as any,
              }}
              onSubmitEditing={() => sendMessage()}
            />

            <Pressable
              onPress={() => sendMessage()}
              disabled={!input.trim()}
              style={({ pressed }) => ({
                backgroundColor: input.trim() ? theme.colors.primary : "rgba(108,140,255,0.3)",
                borderRadius: 24,
                paddingHorizontal: 20,
                justifyContent: "center",
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
                ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
              })}
            >
              <AppText style={{ fontWeight: "900" }}>
                Send
              </AppText>
            </Pressable>
          </View>

          {/* Disclaimer */}
          <AppText
            variant="small"
            style={{
              opacity: 0.5,
              textAlign: "center",
              marginBottom: theme.space.md,
              fontSize: 10,
            }}
          >
            I'm here to support you, not replace professional care.
            For emergencies, contact 911 or 988.
          </AppText>
        </View>
      </KeyboardAvoidingView>

      {/* Risk Alert Modal */}
      <Modal
        visible={showRiskAlert}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRiskAlert(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: theme.space.xl }}>
          <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: theme.space.xl }}>
            <AppText style={{ fontWeight: "900", fontSize: 20, color: theme.colors.danger, marginBottom: 16 }}>
              {riskAlert.severity}
            </AppText>
            <AppText style={{ marginBottom: 24, lineHeight: 22, fontSize: 15 }}>
              {riskAlert.action}
            </AppText>
            <Pressable
              onPress={() => setShowRiskAlert(false)}
              style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: 14, alignItems: "center" }}
            >
              <AppText style={{ fontWeight: "900" }}>I Understand</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Session Summary Modal */}
      <Modal
        visible={showSummary}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", padding: theme.space.xl }}>
          <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: theme.space.xl, maxHeight: "80%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <AppText style={{ fontSize: 24 }}>📊</AppText>
              <AppText style={{ fontWeight: "900", fontSize: 20 }}>Session Summary</AppText>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText style={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 12, lineHeight: 18, whiteSpace: "pre-wrap" as any }}>
                {clinicalSummary}
              </AppText>
            </ScrollView>
            <Pressable
              onPress={() => setShowSummary(false)}
              style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: 14, alignItems: "center", marginTop: 16 }}
            >
              <AppText style={{ fontWeight: "900" }}>Close</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}