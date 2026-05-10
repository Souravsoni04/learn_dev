import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import { sendOTPEmail } from "../utils/email.js";

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Register - students only from frontend
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "student"
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      notificationSettings: user.notificationSettings,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login - students & admins
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        notificationSettings: user.notificationSettings,
        token: generateToken(user._id)
      });
    }

    res.status(401).json({ message: "Invalid email or password" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
  console.log("-----------------------------------------");
  console.log(`📩 RECEIVED FORGOT PASSWORD REQUEST: ${req.body.email}`);
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      console.log("-----------------------------------------");
      console.log(`⚠️  EMAIL FAILED: OTP for ${email} is: ${otp}`);
      console.log("-----------------------------------------");
      return res.json({ 
        message: "OTP generated (Sent to server console since email config is missing)", 
        devMode: true 
      });
    }

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password - Verify OTP & Change Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email,
      resetPasswordOTP: otp,
      resetPasswordOTPExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Change Password - for logged in users
router.post("/change-password", protect, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(oldPassword))) {
      user.password = newPassword;
      await user.save();
      return res.json({ message: "Password updated successfully" });
    }

    res.status(401).json({ message: "Invalid old password" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile - for logged in users
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new email is already taken by someone else
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      notificationSettings: user.notificationSettings,
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update notification settings
router.put("/notifications", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.notificationSettings = {
      ...user.notificationSettings,
      ...req.body
    };
    
    await user.save();

    res.json({
      notificationSettings: user.notificationSettings,
      message: "Notification preferences updated"
    });
  } catch (error) {
    console.error("Update notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
