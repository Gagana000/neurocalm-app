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
import {
  getEnhancedBotReply,
  getGreeting,
  SessionContext,
  generateClinicalSummary,
  RiskLevel
} from "../src/chatbot/enhancedBrain";
import { QuickReplies } from "../src/ui/QuickReplies";
import { auth } from "../src/firebase/firebaseConfig";
import { collection, query, where, getDocs, orderBy, limit, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/firebaseConfig";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  riskLevel?: RiskLevel;
};

// Simplified Session Manager (without Firestore saves to avoid errors)
class SimpleSessionManager {
  private currentSession: SessionContext | null = null;

  createSession(userId: string, userName?: string): SessionContext {
    this.currentSession = {
      userId,
      userName,
      sessionStart: new Date(),
      messageCount: 0,
      topicsDiscussed: [],
      riskLevel: "Low",
    };
    return this.currentSession;
  }

  getSession(): SessionContext | null {
    return this.currentSession;
  }

  updateSession(updates: Partial<SessionContext>): SessionContext {
    if (!this.currentSession) {
      this.currentSession = {
        userId: "unknown",
        sessionStart: new Date(),
        messageCount: 0,
        topicsDiscussed: [],
        riskLevel: "Low",
      };
    }
    this.currentSession = { ...this.currentSession, ...updates };
    return this.currentSession;
  }

  addTopic(topic: string) {
    if (this.currentSession && !this.currentSession.topicsDiscussed.includes(topic)) {
      this.currentSession.topicsDiscussed.push(topic);
    }
  }

  incrementMessageCount() {
    if (this.currentSession) {
      this.currentSession.messageCount++;
    }
  }

  endSession(): string {
    if (!this.currentSession) return "";
    const summary = generateClinicalSummary(this.currentSession);
    this.currentSession = null;
    return summary;
  }

  getRiskAlert(): { severity: string; action: string } | null {
    if (!this.currentSession) return null;

    switch (this.currentSession.riskLevel) {
      case "Critical":
        return {
          severity: "🚨 IMMEDIATE ACTION REQUIRED",
          action: "Please contact emergency services immediately. Your safety is the priority.\n\n• Emergency: 911\n• Crisis Lifeline: 988\n• Text HOME to 741741"
        };
      case "High":
        return {
          severity: "⚠️ HIGH RISK",
          action: "You're experiencing significant distress. Please consider reaching out to a mental health professional. Would you like help finding resources?"
        };
      default:
        return null;
    }
  }
}

const sessionManager = new SimpleSessionManager();

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
            text: "Hello. I'm your mental health support assistant. Please log in to continue. 👋",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      // Get user name
      let name = "";
      try {
        const userQuery = query(collection(db, "users"), where("uid", "==", uid));
        const userSnap = await getDocs(userQuery);
        userSnap.forEach((doc) => {
          name = doc.data().name || "";
        });
        setUserName(name);
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
          }
        }
      } catch (error) {
        console.log("Error loading stress data:", error);
      }

      // Initialize session
      const session = sessionManager.createSession(uid, name);
      sessionManager.updateSession({ stressLevel: stressLevel as any });

      // Set welcome message
      const greeting = getGreeting(name || "");
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
          text: "Hello. I'm your mental health support assistant. How are you feeling today? 💙",
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

    console.log("Sending message:", messageToSend); // Debug log

    const session = sessionManager.getSession();
    if (!session) {
      console.log("No session, creating new one");
      const newSession = sessionManager.createSession(uid || "unknown", userName);
      sessionManager.updateSession({ stressLevel: userStressData?.stressLevel || "Low" });
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

    sessionManager.incrementMessageCount();

    // Detect topics
    const topics = ["depression", "anxiety", "stress", "sleep", "coping", "safety"];
    topics.forEach(topic => {
      if (messageToSend.toLowerCase().includes(topic)) {
        sessionManager.addTopic(topic);
      }
    });

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Get bot reply
    setTimeout(() => {
      const currentSession = sessionManager.getSession();
      const replyText = getEnhancedBotReply(messageToSend, currentSession || undefined);

      console.log("Bot reply:", replyText); // Debug log

      // Update risk level based on reply content
      if (replyText.includes("emergency") || replyText.includes("crisis") || replyText.includes("911")) {
        sessionManager.updateSession({ riskLevel: "High" });
      }

      const updatedSession = sessionManager.getSession();

      const assistantMsg: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        text: replyText,
        timestamp: new Date(),
        riskLevel: updatedSession?.riskLevel,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);

      // Check for risk alert
      const alert = sessionManager.getRiskAlert();
      if (alert) {
        setRiskAlert(alert);
        setShowRiskAlert(true);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 500); // Reduced delay for better response
  };

  const endSession = () => {
    const summary = sessionManager.endSession();
    setClinicalSummary(summary);
    setShowSummary(true);
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    // Auto-send after setting input
    setTimeout(() => sendMessage(text), 50);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";

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
            Processing...
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
          <AppText style={{ fontWeight: "900", fontSize: 20 }}>Wellness Assistant</AppText>
          <AppText variant="small" style={{ opacity: 0.7 }}>
            Professional mental health support
          </AppText>
        </View>
        <Pressable
          onPress={endSession}
          style={({ pressed }) => ({
            backgroundColor: "rgba(255,90,106,0.2)",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.colors.danger,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <AppText variant="small" style={{ fontWeight: "700", color: theme.colors.danger }}>
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
          <AppText variant="sub">Loading your wellness assistant...</AppText>
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
              placeholder="Type your message..."
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
              fontSize: 11,
            }}
          >
            I'm here to help, not replace professional care. For emergencies, contact emergency services.
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
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: theme.space.xl }}>
          <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: theme.space.xl }}>
            <AppText style={{ fontWeight: "900", fontSize: 20, color: theme.colors.danger, marginBottom: 16 }}>
              {riskAlert.severity}
            </AppText>
            <AppText style={{ marginBottom: 24, lineHeight: 22 }}>{riskAlert.action}</AppText>
            <Pressable
              onPress={() => setShowRiskAlert(false)}
              style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: 14, alignItems: "center" }}
            >
              <AppText style={{ fontWeight: "900" }}>I Understand</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Clinical Summary Modal */}
      <Modal
        visible={showSummary}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSummary(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: theme.space.xl }}>
          <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.xl, padding: theme.space.xl, maxHeight: "80%" }}>
            <AppText style={{ fontWeight: "900", fontSize: 20, marginBottom: 16 }}>Session Summary</AppText>
            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText style={{ fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 12, lineHeight: 18 }}>
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