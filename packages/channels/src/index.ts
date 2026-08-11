export interface InboundMessage {
  channel: string;
  sender: string;
  sourceMessageId?: string;
  rawText: string;
  receivedAt: string;
  metadata?: Record<string, string>;
}

export interface InboundChannel {
  parse(payload: unknown): Promise<InboundMessage>;
}

export interface OutboundChannel {
  sendReminder(input: { userId: string; message: string }): Promise<void>;
}

export class SmsChannelScaffold {
  static readonly featureFlag = 'THOUGHTROUTER_SMS_ENABLED';
}
