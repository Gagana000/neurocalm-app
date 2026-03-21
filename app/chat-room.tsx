import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Pressable, Platform, TextInput, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../src/firebase/firebaseConfig";
import { Screen } from "../src/ui/Screen";
import { AppHeader } from "../src/ui/AppHeader";
import { AppText } from "../src/ui/AppText";
import { theme } from "../src/ui/theme";
import { toast } from "../src/ui/toast";

type Mode = "vent" | "reframe" | "plan";
type Role = "user" | "coach";

type ChatDoc = {
  uid: string;
  mode: Mode;
  role: Role;
  text: string;
  createdAt: any;
};

export default function ChatRoom() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = (params.mode as Mode) || "vent";

  const uid = auth.currentUser?.uid;

  const [messages, setMessages] = useState<Array<{ id: string; role: Role; text: string }>>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const title = useMemo(() => {
    if (mode === "vent") return "Vent";
    if (mode === "reframe") return "Reframe";
    return "Action plan";
  }, [mode]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "chatMessages"),
      where("uid", "==", uid),
      where("mode", "==", mode),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data: any = d.data();
          return { id: d.id, role: data.role as Role, text: String(data.text || "") };
        });
        setMessages(rows);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      },
      (err) => {
        console.log("Chat snapshot error:", err);
        toast("Chat blocked", "Check Firestore rules / network.");
      }
    );

    return () => unsub();
  }, [uid, mode]);

  // On first open, insert a single welcome message if chat is empty.
  useEffect(() => {
    if (!uid) return;
    if (messages.length !== 0) return;

    const seed = getWelcome(mode);

    (async () => {
      try {
        await addDoc(collection(db, "chatMessages"), {
          uid,
          mode,
          role: "coach",
          text: seed,
          createdAt: serverTimestamp(),
        } satisfies ChatDoc);
      } catch (e: any) {
        // ignore; rules might block
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, mode]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!uid) {
      toast("Login required");
      return;
    }

    setText("");

    try {
      // 1) save user message
      await addDoc(collection(db, "chatMessages"), {
        uid,
        mode,
        role: "user",
        text: trimmed,
        createdAt: serverTimestamp(),
      } satisfies ChatDoc);

      // 2) save app reply (prompt-based)
      const reply = buildReply(mode, trimmed);

      await addDoc(collection(db, "chatMessages"), {
        uid,
        mode,
        role: "coach",
        text: reply,
        createdAt: serverTimestamp(),
      } satisfies ChatDoc);
    } catch (e: any) {
      console.log("Send chat error:", e?.message || e);
      toast("Send failed", "Check Firestore rules.");
    }
  };

  return (
    <Screen>
      <AppHeader title={title} />

      <View style={{ flex: 1, gap: theme.space.md }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ gap: theme.space.sm, paddingBottom: theme.space.lg }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} text={m.text} />
          ))}
        </ScrollView>

        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.xl,
            padding: theme.space.md,
            backgroundColor: theme.colors.card,
            gap: theme.space.sm,
          }}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={mode === "vent" ? "Type what’s on your mind..." : "Type your situation..."}
            placeholderTextColor="rgba(255,255,255,0.45)"
            multiline
            style={{
              color: theme.colors.text,
              fontSize: 14,
              fontWeight: "600",
              minHeight: 46,
              outlineStyle: "none" as any,
            }}
          />

          <Pressable
            onPress={send}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.md,
              paddingVertical: 12,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
              ...(Platform.OS === "web" ? ({ cursor: "pointer" } as any) : null),
            })}
          >
            <AppText style={{ fontWeight: "900" }}>Send</AppText>
          </Pressable>

          <AppText variant="small" style={{ opacity: 0.8 }}>
            Not for emergencies. If you feel unsafe, contact emergency services.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

function Bubble({ role, text }: { role: Role; text: string }) {
  const mine = role === "user";
  return (
    <View
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "88%",
        backgroundColor: mine ? "rgba(255,255,255,0.08)" : theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <AppText style={{ fontWeight: "700", lineHeight: 20 }}>{text}</AppText>
    </View>
  );
}

function getWelcome(mode: Mode) {
  if (mode === "vent") {
    return "You can vent here. Tell me what happened, and what you’re feeling right now.";
  }
  if (mode === "reframe") {
    return "Tell me the stressful thought in one sentence. I’ll help you reframe it into something more balanced.";
  }
  return "Tell me what you want to improve today. I’ll help you make a small plan you can actually do.";
}

// Not “AI”. Just structured, helpful prompts.
function buildReply(mode: Mode, userText: string) {
  if (mode === "vent") {
    return (
      "I hear you.\n\n" +
      "Quick check:\n" +
      "1) What part is hurting the most right now?\n" +
      "2) If this situation was 10/10 stress, what number is it?\n" +
      "3) What would help you feel 5% better in the next 10 minutes?"
    );
  }

  if (mode === "reframe") {
    return (
      "Let’s reframe it.\n\n" +
      "1) What’s the thought?\n" +
      `   “${short(userText)}”\n\n` +
      "2) Evidence FOR this thought?\n" +
      "3) Evidence AGAINST it?\n" +
      "4) A balanced version could be:\n" +
      "   “Even if this is hard, I can handle the next small step.”\n\n" +
      "Write your balanced version in your own words."
    );
  }

  // plan
  return (
    "Let’s make a simple plan.\n\n" +
    "Pick ONE:\n" +
    "A) 5 minutes: drink water + 10 slow breaths\n" +
    "B) 10 minutes: short walk + sunlight\n" +
    "C) 15 minutes: clean one small area + quick shower\n\n" +
    "Reply with A / B / C, and tell me what might stop you. I’ll help you make it easier."
  );
}

function short(s: string) {
  const t = s.trim();
  if (t.length <= 80) return t;
  return t.slice(0, 77) + "...";
}