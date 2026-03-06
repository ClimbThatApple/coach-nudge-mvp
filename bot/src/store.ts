import { ConversationReference } from 'botbuilder';

/**
 * In-memory store for the MVP.
 * Replace with a real database (Cosmos DB, PostgreSQL, etc.) for production.
 */

export interface StoredNote {
  readonly id: string;
  readonly content: string;
  readonly createdAt: number;
  readonly source: 'nudge' | 'manual';
}

export interface StoredSupervisee {
  readonly id: string;
  readonly name: string;
  readonly notes: readonly StoredNote[];
  readonly lastNudgeAt: number | null;
}

export interface StoredNudge {
  readonly id: string;
  readonly superviseeId: string;
  readonly type: 'reflection' | 'coaching';
  readonly content: string;
  readonly status: 'pending' | 'completed' | 'snoozed' | 'dismissed';
  readonly createdAt: number;
}

interface StoreState {
  // userId -> supervisees
  readonly superviseesByUser: Map<string, StoredSupervisee[]>;
  // nudgeId -> nudge
  readonly nudges: Map<string, StoredNudge>;
  // userId -> ConversationReference (for proactive messaging)
  readonly conversationRefs: Map<string, ConversationReference>;
}

class Store {
  private state: StoreState = {
    superviseesByUser: new Map(),
    nudges: new Map(),
    conversationRefs: new Map(),
  };

  // Conversation references
  saveConversationRef(userId: string, ref: ConversationReference): void {
    this.state = {
      ...this.state,
      conversationRefs: new Map(this.state.conversationRefs).set(userId, ref),
    };
  }

  getConversationRef(userId: string): ConversationReference | undefined {
    return this.state.conversationRefs.get(userId);
  }

  getAllConversationRefs(): ReadonlyMap<string, ConversationReference> {
    return this.state.conversationRefs;
  }

  // Supervisees
  getSupervisees(userId: string): StoredSupervisee[] {
    return this.state.superviseesByUser.get(userId) ?? [];
  }

  setSupervisees(userId: string, supervisees: StoredSupervisee[]): void {
    const newMap = new Map(this.state.superviseesByUser);
    newMap.set(userId, supervisees);
    this.state = { ...this.state, superviseesByUser: newMap };
  }

  addNote(superviseeId: string, content: string, source: 'nudge' | 'manual'): void {
    const note: StoredNote = {
      id: crypto.randomUUID(),
      content,
      createdAt: Date.now(),
      source,
    };

    const newMap = new Map(this.state.superviseesByUser);
    for (const [userId, supervisees] of newMap) {
      const updated = supervisees.map((s) =>
        s.id === superviseeId
          ? { ...s, notes: [...s.notes, note] }
          : s,
      );
      if (updated !== supervisees) {
        newMap.set(userId, updated);
      }
    }
    this.state = { ...this.state, superviseesByUser: newMap };
  }

  // Nudges
  addNudge(nudge: StoredNudge): void {
    const newNudges = new Map(this.state.nudges);
    newNudges.set(nudge.id, nudge);
    this.state = { ...this.state, nudges: newNudges };
  }

  updateNudgeStatus(
    nudgeId: string,
    status: StoredNudge['status'],
  ): void {
    const existing = this.state.nudges.get(nudgeId);
    if (!existing) return;

    const newNudges = new Map(this.state.nudges);
    newNudges.set(nudgeId, { ...existing, status });
    this.state = { ...this.state, nudges: newNudges };
  }
}

export const store = new Store();
