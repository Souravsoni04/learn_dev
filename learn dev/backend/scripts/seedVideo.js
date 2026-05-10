import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Course from "../models/Course.js";
import { uploadVideo } from "../utils/gridfs.js";

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

const seedVideo = async () => {
  await connectDB();

  const course = (await Course.findOne({ title: "MERN Basics" })) || (await Course.findOne());
  if (!course) {
    console.error("No course found to attach video");
    process.exit(1);
  }

  const filePath = path.resolve("sample.mp4");
  if (!fs.existsSync(filePath)) {
    console.error("sample.mp4 not found in backend directory");
    process.exit(1);
  }

  const fileStream = fs.createReadStream(filePath);
  const filename = `demo-${Date.now()}.mp4`;
  const videoId = await uploadVideo(fileStream, filename, {
    courseTitle: course.title,
    uploadedBy: "seed-script",
    contentType: "video/mp4"
  });

  const material = {
    type: "video",
    title: "Demo Video",
    videoId
  };

  course.materials = [...(course.materials || []), material];
  await course.save();

  console.log("Attached video to course:", course.title);
  console.log("VideoId:", videoId.toString());
  process.exit(0);
};

seedVideo();
