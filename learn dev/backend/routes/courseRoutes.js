import express from "express";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireEnrollment } from "../middleware/enrollmentMiddleware.js";
import { getAuthParams } from "../utils/imagekit.js";
import { sendPurchaseEmail } from "../utils/email.js";

const router = express.Router();

// Get ImageKit authentication parameters
router.get("/imagekit-auth", protect, (req, res) => {
  try {
    const authParams = getAuthParams();
    res.json({
      ...authParams,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching ImageKit auth parameters" });
  }
});

// Public - get stats (student count, course count)
router.get("/stats", async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: "student" });
    const courseCount = await Course.countDocuments();
    res.json({ students: studentCount, courses: courseCount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// Public - get all courses
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    const ids = courses.map((course) => course._id);
    const reviewStats = await Review.aggregate([
      { $match: { course: { $in: ids } } },
      {
        $group: {
          _id: "$course",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 }
        }
      }
    ]);

    const statsMap = new Map(
      reviewStats.map((item) => [
        String(item._id),
        {
          averageRating: Number(item.averageRating || 0),
          reviewCount: Number(item.reviewCount || 0)
        }
      ])
    );

    const enriched = courses.map((course) => {
      const plain = course.toObject();
      const stats = statsMap.get(String(course._id)) || { averageRating: 0, reviewCount: 0 };
      return {
        ...plain,
        averageRating: stats.averageRating,
        reviewCount: stats.reviewCount
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses" });
  }
});

// Student - list own enrollments with course info
router.get("/enrollments/my", protect, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate("course", "title subtitle thumbnail category level price materials")
      .sort({ createdAt: -1 });
    res.json(enrollments);
  } catch (error) {
    console.error("Error fetching my enrollments:", error);
    res.status(500).json({ message: "Error fetching enrollments" });
  }
});

// Public - get single course
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const [reviewCount, avgResult] = await Promise.all([
      Review.countDocuments({ course: course._id }),
      Review.aggregate([
        { $match: { course: course._id } },
        { $group: { _id: null, averageRating: { $avg: "$rating" } } }
      ])
    ]);

    const averageRating = Number(avgResult[0]?.averageRating || 0);
    res.json({
      ...course.toObject(),
      averageRating,
      reviewCount
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching course" });
  }
});

// Enrolled only - get content
router.get("/:courseId/content", protect, requireEnrollment, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course.materials || []);
  } catch (error) {
    res.status(500).json({ message: "Error fetching content" });
  }
});

// Enroll free course without payment
router.post("/enroll/free/:courseId", protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    let enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });
    if (enrollment && enrollment.paymentStatus === "paid") {
      return res.json({ enrolled: true });
    }
    if (enrollment) {
      enrollment.paymentStatus = "paid";
      enrollment.amount = 0;
      enrollment.currency = "INR";
      await enrollment.save();
    } else {
      await Enrollment.create({
        student: req.user._id,
        course: courseId,
        amount: 0,
        currency: "INR",
        paymentStatus: "paid"
      });
    }

    // Increment enrolledCount in Course
    const course = await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });

    // Send confirmation email
    if (course) {
      try {
        console.log(`📧 Triggering purchase email for free enrollment: ${req.user.email}`);
        await sendPurchaseEmail(req.user.email, req.user.name, course.title);
      } catch (emailError) {
        console.error("❌ Email notification failed for free course:", emailError);
      }
    } else {
      console.warn("⚠️ Could not find course for email notification:", courseId);
    }

    res.json({ enrolled: true });
  } catch (error) {
    console.error("Error enrolling free course:", error);
    res.status(500).json({ message: "Error enrolling free course" });
  }
});

// Update progress from video watch time
router.post("/:courseId/progress", protect, requireEnrollment, async (req, res) => {
  try {
    const { materialId, watchedSeconds, durationSeconds } = req.body;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      paymentStatus: "paid"
    });

    if (!enrollment) {
      return res.status(403).json({ message: "Not enrolled" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const videoMaterials = (course.materials || []).filter((material) => material.type === "video");
    const progressIndex = enrollment.videoProgress.findIndex((item) => item.materialId === materialId);
    const safeDuration = Math.max(0, Number(durationSeconds) || 0);
    const safeWatched = Math.max(0, Math.min(Number(watchedSeconds) || 0, safeDuration || Number(watchedSeconds) || 0));

    if (progressIndex > -1) {
      enrollment.videoProgress[progressIndex].watchedSeconds = Math.max(
        Number(enrollment.videoProgress[progressIndex].watchedSeconds || 0),
        safeWatched
      );
      enrollment.videoProgress[progressIndex].durationSeconds = Math.max(
        Number(enrollment.videoProgress[progressIndex].durationSeconds || 0),
        safeDuration
      );
      enrollment.videoProgress[progressIndex].updatedAt = Date.now();
    } else {
      enrollment.videoProgress.push({
        materialId,
        watchedSeconds: safeWatched,
        durationSeconds: safeDuration
      });
    }

    const durationMap = new Map(
      enrollment.videoProgress.map((item) => [
        item.materialId,
        {
          watchedSeconds: Number(item.watchedSeconds || 0),
          durationSeconds: Number(item.durationSeconds || 0)
        }
      ])
    );

    const totals = videoMaterials.reduce(
      (sum, material, index) => {
        const key = String(material.fileId || material.videoId || material.url || `${material.title}_${index}`);
        const item = durationMap.get(key);
        if (!item?.durationSeconds) return sum;
        sum.duration += item.durationSeconds;
        sum.watched += Math.min(item.watchedSeconds || 0, item.durationSeconds);
        return sum;
      },
      { watched: 0, duration: 0 }
    );

    enrollment.progress = totals.duration > 0 ? Math.round((totals.watched / totals.duration) * 100) : 0;

    if (safeDuration > 0 && safeWatched / safeDuration >= 0.95 && !enrollment.completedMaterials.includes(materialId)) {
      enrollment.completedMaterials.push(materialId);
    }

    await enrollment.save();

    res.json({
      progress: enrollment.progress,
      completedMaterials: enrollment.completedMaterials,
      videoProgress: enrollment.videoProgress
    });
  } catch (error) {
    console.error("Progress error:", error);
    res.status(500).json({ message: "Error updating progress" });
  }
});

// Update personal notes for a material
router.post("/:courseId/notes", protect, requireEnrollment, async (req, res) => {
  try {
    const { materialId, content } = req.body;
    const { courseId } = req.params;

    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      paymentStatus: "paid"
    });

    if (!enrollment) {
      return res.status(403).json({ message: "Not enrolled" });
    }

    const noteIndex = enrollment.notes.findIndex(n => n.materialId === materialId);
    if (noteIndex > -1) {
      enrollment.notes[noteIndex].content = content;
      enrollment.notes[noteIndex].updatedAt = Date.now();
    } else {
      enrollment.notes.push({ materialId, content });
    }

    await enrollment.save();
    res.json({ notes: enrollment.notes });
  } catch (error) {
    console.error("Notes error:", error);
    res.status(500).json({ message: "Error updating notes" });
  }
});

// Get personal notes for a course
router.get("/:courseId/notes", protect, requireEnrollment, async (req, res) => {
  try {
    const { courseId } = req.params;
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: courseId,
      paymentStatus: "paid"
    });
    
    // If no enrollment record found (e.g. for Admin), return empty array instead of 403
    if (!enrollment) return res.json([]);
    
    res.json(enrollment.notes || []);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notes" });
  }
});

export default router;
