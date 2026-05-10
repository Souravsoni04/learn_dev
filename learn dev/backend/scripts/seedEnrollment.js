import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";

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

const seed = async () => {
  await connectDB();

  const args = process.argv.slice(2);
  const email = args[0] || "student@example.com";
  const password = args[1] || "password123";
  const name = args[2] || "Demo Student";
  const courseTitleArg = args[3] || null;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, password, role: "student" });
    console.log("Created student:", email);
  } else {
    console.log("Student already exists:", email);
  }

  let course = null;
  if (courseTitleArg) {
    course = await Course.findOne({ title: courseTitleArg });
  }
  if (!course) {
    course = (await Course.findOne({ title: "MERN Basics" })) || (await Course.findOne());
  }
  if (!course) {
    console.error("No course found to enroll");
    process.exit(1);
  }

  const exists = await Enrollment.findOne({ student: user._id, course: course._id, paymentStatus: "paid" });
  if (exists) {
    console.log("Enrollment already exists for course:", course.title);
    process.exit(0);
  }

  await Enrollment.create({
    student: user._id,
    course: course._id,
    amount: course.price || 0,
    currency: "INR",
    orderId: `seed_${Date.now()}`,
    paymentId: `seed_${Date.now()}`,
    paymentStatus: "paid"
  });

  console.log("Created paid enrollment for:", course.title);
  console.log("Login credentials:", email, password);
  process.exit(0);
};

seed();
