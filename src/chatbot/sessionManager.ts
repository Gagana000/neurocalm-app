// src/chatbot/sessionManager.ts
import { SessionContext, generateClinicalSummary } from "./professionalBrain";
import { db } from "../firebase/firebaseConfig";
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";

export class ProfessionalSessionManager {
  private sessions: Map<string, SessionContext> = new Map();

  createSession(userId: string, userName?: string): SessionContext {
    const session: SessionContext = {
      userId,
      userName,
      sessionStart: new Date(),
      messageCount: 0,
      topicsDiscussed: [],
      riskLevel: "Low",
    };

    this.sessions.set(userId, session);
    this.saveSessionToFirestore(userId);
    return session;
  }

  getSession(userId: string): SessionContext | undefined {
    return this.sessions.get(userId);
  }

  updateSession(userId: string, updates: Partial<SessionContext>): SessionContext {
    const session = this.sessions.get(userId);
    if (!session) {
      return this.createSession(userId);
    }

    const updated = { ...session, ...updates };
    this.sessions.set(userId, updated);
    this.saveSessionToFirestore(userId);
    return updated;
  }

  addTopic(userId: string, topic: string) {
    const session = this.getSession(userId);
    if (session && !session.topicsDiscussed.includes(topic)) {
      session.topicsDiscussed.push(topic);
      this.updateSession(userId, { topicsDiscussed: session.topicsDiscussed });
    }
  }

  async saveSessionToFirestore(userId: string) {
    const session = this.getSession(userId);
    if (!session) return;

    try {
      const sessionRef = doc(db, "clinicalSessions", userId);
      await setDoc(sessionRef, {
        userId: session.userId,
        userName: session.userName,
        sessionStart: session.sessionStart,
        messageCount: session.messageCount,
        topicsDiscussed: session.topicsDiscussed,
        riskLevel: session.riskLevel,
        stressLevel: session.stressLevel,
        lastAssessment: session.lastAssessment,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.log("Error saving session:", error);
    }
  }

  async endSession(userId: string): Promise<string> {
    const session = this.getSession(userId);
    if (!session) return "";

    const summary = generateClinicalSummary(session);

    // Save to Firestore
    const sessionRef = doc(db, "clinicalSessions", userId);
    await updateDoc(sessionRef, {
      endedAt: serverTimestamp(),
      clinicalSummary: summary,
      sessionDuration: Math.floor((Date.now() - session.sessionStart.getTime()) / 60000),
    });

    this.sessions.delete(userId);
    return summary;
  }

  getRiskAlert(riskLevel: string): { severity: string; action: string } {
    switch (riskLevel) {
      case "Critical":
        return {
          severity: "🚨 IMMEDIATE ACTION REQUIRED",
          action: "Contact emergency services immediately. User expressed suicidal thoughts or intent."
        };
      case "High":
        return {
          severity: "⚠️ HIGH RISK",
          action: "Schedule immediate follow-up. Create safety plan. Consider professional referral."
        };
      case "Moderate":
        return {
          severity: "📌 MODERATE RISK",
          action: "Monitor closely. Encourage coping strategies. Follow up within 24-48 hours."
        };
      default:
        return {
          severity: "✅ LOW RISK",
          action: "Continue monitoring. Maintain regular check-ins."
        };
    }
  }
}

export const sessionManager = new ProfessionalSessionManager();