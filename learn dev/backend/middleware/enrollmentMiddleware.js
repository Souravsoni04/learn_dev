import Enrollment from "../models/Enrollment.js";
import mongoose from "mongoose";

export const requireEnrollment = async (req, res, next) => {
  try {
    // Admins have full access to all courses
    if (req.user && req.user.role === "admin") {
      return next();
    }

    const courseId = req.params.courseId || req.body.courseId;

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const exists = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      paymentStatus: "paid"
    });

    if (!exists) {
      return res
        .status(403)
        .json({ message: "You are not enrolled in this course" });
    }

    next();
  } catch (error) {
    console.error("Enrollment check error:", error);
    res.status(500).json({ message: "Error checking enrollment" });
  }
};
