import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISequenceDocument extends Document<string> {
  _id: string;
  seq: number;
}

const SequenceSchema = new Schema<ISequenceDocument>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  {
    _id: false,
    versionKey: false,
    timestamps: true,
  }
);

export const SequenceModel: Model<ISequenceDocument> =
  mongoose.models.Sequence || mongoose.model<ISequenceDocument>('Sequence', SequenceSchema);

export async function getNextSequenceValue(name: string): Promise<number> {
  const result = await SequenceModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result?.seq ?? 1;
}
