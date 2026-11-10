import { AgentProfile, UserDto, UserRole, UserStatus } from '@chirag/types';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IUserDocument extends Document {
  fullName: string;
  email?: string;
  mobile: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  agentProfile?: AgentProfile;
  refreshTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  toDto(): UserDto;
}

const AgentProfileSchema = new Schema<AgentProfile>(
  {
    agencyName: { type: String, trim: true },
    city: { type: String, trim: true },
    maxDiscountPercent: { type: Number, default: 100, min: 0, max: 100 },
    maxMarkupPercent: { type: Number, default: 100, min: 0, max: 100 },
    canApproveFinalPrice: { type: Boolean, default: true },
    commissionRatePercent: { type: Number, min: 0, max: 100 },
    rateSheetTier: { type: String, default: 'Standard Wholesale B2B' },
    pricingModel: { type: String, default: 'WHOLESALE_NET' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
      match: [/\S+@\S+\.\S+/, 'Invalid email address'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      unique: true,
      index: true,
      match: [/^(\+[1-9]\d{6,14}|[6-9]\d{9})$/, 'Invalid phone number format'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never returned in normal queries
    },
    role: {
      type: String,
      enum: ['ADMIN', 'AGENT', 'CUSTOMER'],
      default: 'CUSTOMER',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      required: true,
      index: true,
    },
    agentProfile: {
      type: AgentProfileSchema,
      required: false,
    },
    refreshTokenHash: {
      type: String,
      default: null,
      select: false, // Never returned in normal queries
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UserSchema.methods.toDto = function (): UserDto {
  return {
    id: this._id ? this._id.toString() : '',
    fullName: this.fullName,
    email: this.email,
    mobile: this.mobile,
    role: this.role,
    status: this.status,
    agentProfile: this.agentProfile,
    createdAt: (this.createdAt instanceof Date ? this.createdAt : new Date()).toISOString(),
    updatedAt: (this.updatedAt instanceof Date ? this.updatedAt : new Date()).toISOString(),
  };
};

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
