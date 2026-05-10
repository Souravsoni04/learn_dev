import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: "Enrollment" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    orderId: { type: String },
    paymentId: { type: String },
    gateway: { type: String, default: "razorpay" }
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
