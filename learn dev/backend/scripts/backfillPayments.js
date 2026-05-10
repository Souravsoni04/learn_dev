import mongoose from "mongoose";
import dotenv from "dotenv";
import Enrollment from "../models/Enrollment.js";
import Payment from "../models/Payment.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();
  const enrollments = await Enrollment.find();
  let created = 0;
  for (const e of enrollments) {
    const exists = await Payment.findOne({ orderId: e.orderId });
    if (exists) continue;
    await Payment.create({
      enrollment: e._id,
      student: e.student,
      course: e.course,
      paymentStatus: e.paymentStatus,
      amount: e.amount || 0,
      currency: e.currency || "INR",
      orderId: e.orderId,
      paymentId: e.paymentId || undefined,
      gateway: "razorpay"
    });
    created++;
  }
  console.log(`Backfilled payments: ${created}`);
  process.exit(0);
};

run();
