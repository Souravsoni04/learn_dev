import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

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

const createAdmin = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.log("Usage: node createAdmin.js <name> <email> <password>");
      console.log("Example: node createAdmin.js Admin admin@example.com password123");
      process.exit(1);
    }

    const [name, email, password] = args;

    // Check if admin already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === "admin") {
        console.log("❌ Admin with this email already exists!");
        process.exit(1);
      } else {
        // Update existing user to admin
        existingUser.role = "admin";
        existingUser.password = password; // Will be hashed by pre-save hook
        await existingUser.save();
        console.log("✅ Existing user updated to admin!");
        console.log(`   Email: ${email}`);
        console.log(`   Name: ${existingUser.name}`);
        process.exit(0);
      }
    }

    // Create new admin user
    const admin = await User.create({
      name,
      email,
      password,
      role: "admin"
    });

    console.log("✅ Admin account created successfully!");
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log("\n📝 You can now login with these credentials at http://localhost:5173/login");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();

