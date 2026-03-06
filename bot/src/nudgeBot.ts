import {
  TeamsActivityHandler,
  TurnContext,
  CardFactory,
  ConversationReference,
} from 'botbuilder';
import {
  createReflectionCard,
  createCoachingCard,
  createConfirmationCard,
  createSuperviseeListCard,
  type NudgeCardData,
} from './adaptiveCards.js';
import { generateNudge } from './nudgeService.js';
import { store } from './store.js';

export class NudgeBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    this.onConversationUpdate(async (context, next) => {
      await this.handleConversationUpdate(context);
      await next();
    });
  }

  private async handleMessage(context: TurnContext): Promise<void> {
    const text = (context.activity.text ?? '').trim().toLowerCase();
    const value = context.activity.value;

    // Handle Adaptive Card submit actions
    if (value) {
      await this.handleCardAction(context, value);
      return;
    }

    // Handle text commands
    if (text === 'list' || text === 'supervisees') {
      await this.handleListCommand(context);
    } else if (text.startsWith('nudge')) {
      await this.handleNudgeCommand(context, text);
    } else if (text.startsWith('synthesis')) {
      await this.handleSynthesisCommand(context, text);
    } else {
      await context.sendActivity(
        "Hi! I'm Coach Nudge. Try:\n\n" +
          '- **list** - See your supervisees\n' +
          '- **nudge [name]** - Get a coaching nudge\n' +
          '- **synthesis [name]** - Get a coaching synthesis',
      );
    }
  }

  private async handleConversationUpdate(context: TurnContext): Promise<void> {
    const membersAdded = context.activity.membersAdded ?? [];
    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient.id) {
        // Save conversation reference for proactive messaging
        const ref = TurnContext.getConversationReference(context.activity);
        const userId = member.aadObjectId ?? member.id;
        store.saveConversationRef(userId, ref as ConversationReference);

        await context.sendActivity(
          "Welcome to Coach Nudge! I'll send you coaching nudges and reflection prompts " +
            'to help you stay on top of your supervisee relationships.\n\n' +
            'Type **list** to see your supervisees.',
        );
      }
    }
  }

  private async handleCardAction(
    context: TurnContext,
    value: Record<string, string>,
  ): Promise<void> {
    const { action, nudgeId, superviseeId, response } = value;

    switch (action) {
      case 'complete': {
        if (response) {
          store.addNote(superviseeId, response, 'nudge');
        }
        store.updateNudgeStatus(nudgeId, 'completed');
        const card = createConfirmationCard(
          response
            ? 'Observation saved! Keep up the great coaching.'
            : 'Marked as done.',
        );
        await context.updateActivity({
          ...context.activity,
          attachments: [CardFactory.adaptiveCard(card)],
        });
        break;
      }
      case 'snooze': {
        store.updateNudgeStatus(nudgeId, 'snoozed');
        const card = createConfirmationCard(
          "Snoozed. I'll remind you in 4 hours.",
        );
        await context.updateActivity({
          ...context.activity,
          attachments: [CardFactory.adaptiveCard(card)],
        });
        break;
      }
      case 'dismiss': {
        store.updateNudgeStatus(nudgeId, 'dismissed');
        const card = createConfirmationCard('Dismissed.');
        await context.updateActivity({
          ...context.activity,
          attachments: [CardFactory.adaptiveCard(card)],
        });
        break;
      }
      case 'requestNudge': {
        await this.sendNudgeForSupervisee(context, superviseeId);
        break;
      }
    }
  }

  private async handleListCommand(context: TurnContext): Promise<void> {
    const userId = context.activity.from.aadObjectId ?? context.activity.from.id;
    const supervisees = store.getSupervisees(userId);

    if (supervisees.length === 0) {
      await context.sendActivity(
        "You don't have any supervisees yet. Set them up in the Coach Nudge tab.",
      );
      return;
    }

    const card = createSuperviseeListCard(supervisees);
    await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(card)],
    });
  }

  private async handleNudgeCommand(
    context: TurnContext,
    text: string,
  ): Promise<void> {
    const name = text.replace('nudge', '').trim();
    const userId = context.activity.from.aadObjectId ?? context.activity.from.id;

    if (!name) {
      // Nudge the least-recently-nudged supervisee
      const supervisees = store.getSupervisees(userId);
      if (supervisees.length === 0) {
        await context.sendActivity('No supervisees found. Set them up in the Coach Nudge tab.');
        return;
      }
      const sorted = [...supervisees].sort(
        (a, b) => (a.lastNudgeAt ?? 0) - (b.lastNudgeAt ?? 0),
      );
      await this.sendNudgeForSupervisee(context, sorted[0].id);
      return;
    }

    const supervisees = store.getSupervisees(userId);
    const match = supervisees.find(
      (s) => s.name.toLowerCase().includes(name),
    );
    if (!match) {
      await context.sendActivity(`Couldn't find a supervisee matching "${name}".`);
      return;
    }
    await this.sendNudgeForSupervisee(context, match.id);
  }

  private async handleSynthesisCommand(
    context: TurnContext,
    text: string,
  ): Promise<void> {
    const name = text.replace('synthesis', '').trim();
    const userId = context.activity.from.aadObjectId ?? context.activity.from.id;

    if (!name) {
      await context.sendActivity('Usage: **synthesis [name]**');
      return;
    }

    const supervisees = store.getSupervisees(userId);
    const match = supervisees.find(
      (s) => s.name.toLowerCase().includes(name),
    );
    if (!match) {
      await context.sendActivity(`Couldn't find a supervisee matching "${name}".`);
      return;
    }

    await context.sendActivity(`Generating synthesis for ${match.name}...`);
    const synthesis = await generateNudge(match, 'synthesis');
    await context.sendActivity(synthesis);
  }

  private async sendNudgeForSupervisee(
    context: TurnContext,
    superviseeId: string,
  ): Promise<void> {
    const userId = context.activity.from.aadObjectId ?? context.activity.from.id;
    const supervisee = store
      .getSupervisees(userId)
      .find((s) => s.id === superviseeId);

    if (!supervisee) {
      await context.sendActivity('Supervisee not found.');
      return;
    }

    await context.sendActivity(`Generating nudge for ${supervisee.name}...`);

    const content = await generateNudge(supervisee, 'coaching');
    const nudgeId = crypto.randomUUID();

    store.addNudge({
      id: nudgeId,
      superviseeId,
      type: 'coaching',
      content,
      status: 'pending',
      createdAt: Date.now(),
    });

    const cardData: NudgeCardData = {
      superviseeId,
      superviseeName: supervisee.name,
      nudgeId,
      nudgeType: 'coaching',
      content,
    };
    const card = createCoachingCard(cardData);
    await context.sendActivity({
      attachments: [CardFactory.adaptiveCard(card)],
    });
  }

  /**
   * Send a proactive nudge to a user via their saved conversation reference.
   * Called by the scheduler, not by direct user interaction.
   */
  async sendProactiveNudge(
    adapter: import('botbuilder').BotFrameworkAdapter,
    userId: string,
    cardData: NudgeCardData,
  ): Promise<void> {
    const ref = store.getConversationRef(userId);
    if (!ref) return;

    const card =
      cardData.nudgeType === 'reflection'
        ? createReflectionCard(cardData)
        : createCoachingCard(cardData);

    await adapter.continueConversation(ref, async (context) => {
      await context.sendActivity({
        attachments: [CardFactory.adaptiveCard(card)],
      });
    });
  }
}
