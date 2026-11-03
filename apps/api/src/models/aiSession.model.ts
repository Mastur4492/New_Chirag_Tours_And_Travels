import mongoose, { Document, Model, Schema } from 'mongoose';

export type AiPortalType = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export interface IGeminiFunctionCallPart {
  name: string;
  args: Record<string, unknown>;
}

export interface IGeminiFunctionResponsePart {
  name: string;
  response: Record<string, unknown>;
}

export interface IGeminiPart {
  text?: string;
  functionCall?: IGeminiFunctionCallPart;
  functionResponse?: IGeminiFunctionResponsePart;
}

export interface IAiMessage {
  role: 'user' | 'model';
  parts: IGeminiPart[];
  textSummary?: string;
  timestamp: Date;
}

export interface IAiSessionDocument extends Document {
  sessionId: string;
  sessionSecret?: string; // Cryptographic secret for anonymous session ownership verification
  portal: AiPortalType;
  userId?: mongoose.Types.ObjectId;
  customerMobile?: string;
  messages: IAiMessage[];
  totalTokensUsed: number;
  tokenBudget: number;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isExpired(): boolean;
}

const GeminiPartSchema = new Schema<IGeminiPart>(
  {
    text: { type: String },
    functionCall: {
      name: { type: String },
      args: { type: Schema.Types.Mixed },
    },
    functionResponse: {
      name: { type: String },
      response: { type: Schema.Types.Mixed },
    },
  },
  { _id: false }
);

const AiMessageSchema = new Schema<IAiMessage>(
  {
    role: { type: String, enum: ['user', 'model'], required: true },
    parts: { type: [GeminiPartSchema], required: true },
    textSummary: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AiSessionSchema = new Schema<IAiSessionDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sessionSecret: {
      type: String,
      required: false,
      index: true,
    },
    portal: {
      type: String,
      enum: ['CUSTOMER', 'AGENT', 'ADMIN'],
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: false,
    },
    customerMobile: {
      type: String,
      index: true,
      required: false,
    },
    messages: [AiMessageSchema],
    totalTokensUsed: {
      type: Number,
      default: 0,
    },
    tokenBudget: {
      type: Number,
      default: 60000, // 60,000 tokens default per session
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically purge inactive sessions after 14 days
AiSessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

AiSessionSchema.methods.isExpired = function (this: IAiSessionDocument): boolean {
  // Session considered expired after 24 hours of inactivity for anonymous, 7 days for authenticated
  const maxInactivityMs = this.userId ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  return Date.now() - new Date(this.lastActiveAt).getTime() > maxInactivityMs;
};

export const AiSessionModel: Model<IAiSessionDocument> =
  mongoose.models.AiSession || mongoose.model<IAiSessionDocument>('AiSession', AiSessionSchema);
