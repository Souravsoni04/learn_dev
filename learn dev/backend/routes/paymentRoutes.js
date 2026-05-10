import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { protect } from "../middleware/authMiddleware.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { sendPurchaseEmail } from "../utils/email.js";

const router = express.Router();

// Lazily initialize Razorpay so .env is respected even if loaded after import
let razorpay = null;
const ensureRazorpay = () => {
  if (!razorpay && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    try {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });
    } catch (error) {
      console.warn("Razorpay initialization failed:", error.message);
    }
  }
  return razorpay;
};

router.post("/create-order", protect, async (req, res) => {
  try {
    const rp = ensureRazorpay();
    if (!rp) {
      return res.status(503).json({ 
        message: "Payment service is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables." 
      });
    }

    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const amount = (course.price || 0) * 100;

    if (amount <= 0) {
      let enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });
      if (enrollment) {
        enrollment.paymentStatus = "paid";
        enrollment.amount = 0;
        enrollment.currency = "INR";
        await enrollment.save();
      } else {
        enrollment = await Enrollment.create({
          student: req.user._id,
          course: courseId,
          amount: 0,
          currency: "INR",
          paymentStatus: "paid"
        });
      }

      // For free courses we don't require a Payment row; enrollment is enough
      
      // Increment enrolledCount in Course
      await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

      // Send confirmation email
      try {
        console.log(`📧 Triggering purchase confirmation for free course: ${req.user.email}`);
        await sendPurchaseEmail(req.user.email, req.user.name, course.title);
      } catch (emailError) {
        console.error("❌ Email notification failed for free course:", emailError);
      }

      return res.status(200).json({ free: true, courseId });
    }

    const options = {
      amount,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        courseId: courseId.toString(),
        userId: req.user._id.toString()
      }
    };

    const order = await rp.orders.create(options);

    let enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (enrollment) {
      enrollment.amount = amount / 100;
      enrollment.currency = "INR";
      enrollment.orderId = order.id;
      enrollment.paymentStatus = "pending";
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        student: req.user._id,
        course: courseId,
        amount: amount / 100,
        currency: "INR",
        orderId: order.id,
        paymentStatus: "pending"
      });
    }

    let payment = await Payment.findOne({ orderId: order.id });
    if (!payment) {
      await Payment.create({
        enrollment: enrollment._id,
        student: req.user._id,
        course: courseId,
        amount: amount / 100,
        currency: "INR",
        orderId: order.id,
        paymentStatus: "pending",
        gateway: "razorpay"
      });
    }

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      courseId
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Error creating order", error: error.message });
  }
});

router.post("/verify", protect, async (req, res) => {
  try {
    const rp = ensureRazorpay();
    if (!rp || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ 
        message: "Payment service is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables." 
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const enrollment = await Enrollment.findOne({ orderId: razorpay_order_id });
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    enrollment.paymentStatus = "paid";
    enrollment.paymentId = razorpay_payment_id;
    await enrollment.save();

    // Increment enrolledCount in Course
    await Course.findByIdAndUpdate(enrollment.course, { $inc: { enrolledCount: 1 } });

    const payment = await Payment.findOne({ orderId: razorpay_order_id });
    if (payment) {
      payment.paymentStatus = "paid";
      payment.paymentId = razorpay_payment_id;
      payment.enrollment = enrollment._id;
      await payment.save();
    }

    // Send confirmation email
    try {
      const course = await Course.findById(enrollment.course);
      
      if (course && req.user) {
        console.log(`📧 Triggering purchase email for: ${req.user.email}`);
        await sendPurchaseEmail(req.user.email, req.user.name, course.title);
      } else {
        console.warn("⚠️ Could not find course or student for email notification:", { 
          courseId: enrollment.course, 
          studentId: req.user?._id 
        });
      }
    } catch (emailError) {
      console.error("❌ Email notification failed:", emailError);
    }

    res.json({ message: "Payment verified successfully" });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
});

export default router;
