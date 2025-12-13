import mongoose from "mongoose";

export interface IMeet {
  slug: string;
  adminId: object;
  createdAt: Date;
}

const meetSchema = new mongoose.Schema<IMeet, mongoose.Model<IMeet>>({
  slug: {
    type: String,
    required: true,
    unique: true
  },
  adminId: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400
  }
});

const Meet = mongoose.model('Meet', meetSchema);
export { Meet };