import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Review from "../models/Review.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";

const router = express.Router();

// Get all reviews for a course
router.get("/course/:courseId", async (req, res) => {
  try {
    const reviews = await Review.find({ course: req.params.courseId })
      .populate("student", "name")
      .sort("-createdAt");
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// Add or update a review
router.post("/course/:courseId", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { courseId } = req.params;

    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      paymentStatus: "paid"
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You must be enrolled to review this course" });
    }

    // Check if review already exists
    let review = await Review.findOne({ student: req.user._id, course: courseId });

    if (review) {
      review.rating = rating;
      review.comment = comment;
      await review.save();
    } else {
      review = await Review.create({
        student: req.user._id,
        course: courseId,
        rating,
        comment
      });
    }

    // Update course average rating and review count
    const reviews = await Review.find({ course: courseId });
    const avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;
    
    await Course.findByIdAndUpdate(courseId, {
      averageRating: avgRating,
      reviewCount: reviews.length
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({ message: "Error submitting review" });
  }
});

export default router;
