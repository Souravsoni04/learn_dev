import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    paymentId: String,
    orderId: String,
    amount: Number,
    currency: { type: String, default: "INR" },
    completedMaterials: [{ type: String }],
    videoProgress: [{
      materialId: String,
      watchedSeconds: { type: Number, default: 0 },
      durationSeconds: { type: Number, default: 0 },
      updatedAt: { type: Date, default: Date.now }
    }],
    progress: { type: Number, default: 0 },
    notes: [{
      materialId: String,
      content: String,
      updatedAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
export default Enrollment;
