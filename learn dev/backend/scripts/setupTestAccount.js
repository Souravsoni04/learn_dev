import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";

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

const setupTestAccount = async () => {
  try {
    await connectDB();

    const studentEmail = "test@student.com";
    const studentPassword = "password123";
    const studentName = "Test Student";

    // 1. Create or Update Student User
    let student = await User.findOne({ email: studentEmail });
    if (student) {
      student.password = studentPassword;
      await student.save();
      console.log(`✅ Student updated: ${studentEmail}`);
    } else {
      student = await User.create({
        name: studentName,
        email: studentEmail,
        password: studentPassword,
        role: "student"
      });
      console.log(`✅ Student created: ${studentEmail}`);
    }

    // 2. Create a Test Course with ImageKit Video
    const courseTitle = "ImageKit Video Test Course";
    let course = await Course.findOne({ title: courseTitle });
    
    const testMaterials = [
      {
        type: "video",
        title: "Test ImageKit Video",
        url: "https://ik.imagekit.io/demo/sample-video.mp4", // Sample public video from ImageKit
        fileId: "test_file_id_123"
      }
    ];

    if (course) {
      course.materials = testMaterials;
      await course.save();
      console.log(`✅ Course updated: ${courseTitle}`);
    } else {
      course = await Course.create({
        title: courseTitle,
        subtitle: "Testing ImageKit streaming",
        description: "This course contains a test video hosted on ImageKit.",
        level: "Beginner",
        category: "Test",
        duration: "1h",
        lessons: 1,
        price: 99,
        materials: testMaterials
      });
      console.log(`✅ Course created: ${courseTitle}`);
    }

    // 3. Enroll Student in Course (Mark as Paid)
    let enrollment = await Enrollment.findOne({ student: student._id, course: course._id });
    if (enrollment) {
      enrollment.paymentStatus = "paid";
      await enrollment.save();
      console.log(`✅ Enrollment updated for: ${studentEmail}`);
    } else {
      enrollment = await Enrollment.create({
        student: student._id,
        course: course._id,
        paymentStatus: "paid"
      });
      console.log(`✅ Enrollment created for: ${studentEmail}`);
    }

    console.log("\n🚀 Setup Complete!");
    console.log(`Login Email: ${studentEmail}`);
    console.log(`Login Password: ${studentPassword}`);
    console.log(`Course: ${courseTitle}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up test account:", error.message);
    process.exit(1);
  }
};

setupTestAccount();
