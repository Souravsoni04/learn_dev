import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

const seed = async () => {
  await connectDB();

  const existing = await Course.countDocuments();
  if (existing > 0) {
    console.log(`ℹ️ Courses already exist (${existing}). Skipping seeding.`);
    process.exit(0);
  }

  const courses = [
    {
      title: "MERN Basics",
      subtitle: "Build your first full-stack app",
      description: "Learn MongoDB, Express, React, and Node by building a simple project.",
      level: "Beginner",
      category: "Web Development",
      duration: "8h",
      lessons: 12,
      thumbnail: "",
      price: 0,
      materials: []
    },
    {
      title: "Advanced React",
      subtitle: "Hooks, Context, and Performance",
      description: "Deep dive into modern React patterns and performance tuning.",
      level: "Intermediate",
      category: "Frontend",
      duration: "10h",
      lessons: 18,
      thumbnail: "",
      price: 499,
      materials: []
    },
    {
      title: "Node.js API Design",
      subtitle: "REST patterns with Express",
      description: "Design robust RESTful APIs with middleware, auth, and validation.",
      level: "Intermediate",
      category: "Backend",
      duration: "9h",
      lessons: 15,
      thumbnail: "",
      price: 399,
      materials: []
    }
  ];

  await Course.insertMany(courses);
  console.log("✅ Seeded demo courses.");
  process.exit(0);
};

seed();
