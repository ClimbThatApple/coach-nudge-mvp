export interface NudgeCardData {
  readonly superviseeId: string;
  readonly superviseeName: string;
  readonly nudgeId: string;
  readonly nudgeType: 'reflection' | 'coaching';
  readonly content: string;
}

export function createReflectionCard(data: NudgeCardData) {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'Container',
                style: 'accent',
                bleed: false,
                items: [
                  {
                    type: 'TextBlock',
                    text: getInitials(data.superviseeName),
                    color: 'light',
                    size: 'small',
                    weight: 'bolder',
                    horizontalAlignment: 'center',
                  },
                ],
                minHeight: '32px',
                verticalContentAlignment: 'center',
              },
            ],
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: `Reflection: ${data.superviseeName}`,
                weight: 'bolder',
                size: 'medium',
              },
              {
                type: 'TextBlock',
                text: data.content,
                wrap: true,
                spacing: 'small',
              },
            ],
          },
        ],
      },
      {
        type: 'Input.Text',
        id: 'response',
        placeholder: 'Quick observation...',
        isMultiline: true,
        style: 'text',
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Save',
        style: 'positive',
        data: {
          action: 'complete',
          nudgeId: data.nudgeId,
          superviseeId: data.superviseeId,
        },
      },
      {
        type: 'Action.Submit',
        title: 'Later',
        data: {
          action: 'snooze',
          nudgeId: data.nudgeId,
          superviseeId: data.superviseeId,
        },
      },
      {
        type: 'Action.Submit',
        title: 'Skip',
        data: {
          action: 'dismiss',
          nudgeId: data.nudgeId,
          superviseeId: data.superviseeId,
        },
      },
    ],
  };
}

export function createCoachingCard(data: NudgeCardData) {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'Container',
                style: 'good',
                bleed: false,
                items: [
                  {
                    type: 'TextBlock',
                    text: getInitials(data.superviseeName),
                    color: 'light',
                    size: 'small',
                    weight: 'bolder',
                    horizontalAlignment: 'center',
                  },
                ],
                minHeight: '32px',
                verticalContentAlignment: 'center',
              },
            ],
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: `Coaching Suggestion: ${data.superviseeName}`,
                weight: 'bolder',
                size: 'medium',
                color: 'good',
              },
              {
                type: 'TextBlock',
                text: data.content,
                wrap: true,
                spacing: 'small',
              },
            ],
          },
        ],
      },
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Got it',
        style: 'positive',
        data: {
          action: 'complete',
          nudgeId: data.nudgeId,
          superviseeId: data.superviseeId,
        },
      },
      {
        type: 'Action.Submit',
        title: 'Later',
        data: {
          action: 'snooze',
          nudgeId: data.nudgeId,
          superviseeId: data.superviseeId,
        },
      },
      {
        type: 'Action.Submit',
        title: 'Skip',
        data: {
          action: 'dismiss',
          nudgeId: data.nudgeId,
          superviseeId: data.superviseeId,
        },
      },
    ],
  };
}

export function createConfirmationCard(message: string) {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: message,
        wrap: true,
        color: 'good',
      },
    ],
  };
}

export function createSuperviseeListCard(
  supervisees: ReadonlyArray<{ readonly id: string; readonly name: string }>,
) {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: 'Your Supervisees',
        weight: 'bolder',
        size: 'medium',
      },
      ...supervisees.map((s) => ({
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: s.name,
              },
            ],
          },
          {
            type: 'Column',
            width: 'auto',
            items: [
              {
                type: 'ActionSet',
                actions: [
                  {
                    type: 'Action.Submit',
                    title: 'Nudge',
                    data: {
                      action: 'requestNudge',
                      superviseeId: s.id,
                    },
                  },
                ],
              },
            ],
          },
        ],
      })),
    ],
  };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
