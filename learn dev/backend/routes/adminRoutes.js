import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    const enriched = await Promise.all(
      users.map(async (u) => {
        const enrollmentCount = await Enrollment.countDocuments({ student: u._id, paymentStatus: "paid" });
        return { ...u.toObject(), enrollmentCount };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    const courseIds = courses.map((course) => course._id);
    const reviewStats = await Review.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: "$course",
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 }
        }
      }
    ]);
    const reviewMap = new Map(
      reviewStats.map((item) => [
        String(item._id),
        {
          averageRating: Number(item.averageRating || 0),
          reviewCount: Number(item.reviewCount || 0)
        }
      ])
    );

    const enriched = await Promise.all(
      courses.map(async (c) => {
        const enrolledCount = await Enrollment.countDocuments({ course: c._id, paymentStatus: "paid" });
        const videoCount = (c.materials || []).filter((m) => m.type === "video").length;
        const stats = reviewMap.get(String(c._id)) || { averageRating: 0, reviewCount: 0 };
        return {
          ...c.toObject(),
          enrolledCount,
          videoCount,
          averageRating: stats.averageRating,
          reviewCount: stats.reviewCount
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Error fetching courses" });
  }
});

router.post("/courses", async (req, res) => {
  try {
    const { title, subtitle, description, level, category, duration, lessons, thumbnail, trailerUrl, price, materials, instructor, resources, notes, relatedCourses } = req.body;
    
    const courseData = {
      title,
      subtitle,
      description,
      level,
      category,
      duration,
      lessons: lessons ? parseInt(lessons) : 0,
      thumbnail,
      trailerUrl,
      price: price ? parseFloat(price) : 0,
      createdBy: req.user._id,
      instructor: typeof instructor === "string" ? JSON.parse(instructor) : instructor,
      resources: resources 
        ? (typeof resources === "string" ? JSON.parse(resources) : resources) 
        : [],
      notes: notes
        ? (typeof notes === "string" ? JSON.parse(notes) : notes)
        : [],
      materials: materials 
        ? (typeof materials === "string" ? JSON.parse(materials) : materials) 
        : [],
      relatedCourses: relatedCourses
        ? (typeof relatedCourses === "string" ? JSON.parse(relatedCourses) : relatedCourses)
        : []
    };

    const course = await Course.create(courseData);
    res.status(201).json(course);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Error creating course", error: error.message });
  }
});

router.put("/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const { title, subtitle, description, level, category, duration, lessons, thumbnail, trailerUrl, price, materials, instructor, resources, notes, relatedCourses } = req.body;

    course.title = title || course.title;
    course.subtitle = subtitle || course.subtitle;
    course.description = description || course.description;
    course.level = level || course.level;
    course.category = category || course.category;
    course.duration = duration || course.duration;
    course.lessons = lessons ? parseInt(lessons) : course.lessons;
    course.thumbnail = thumbnail || course.thumbnail;
    course.trailerUrl = trailerUrl !== undefined ? trailerUrl : course.trailerUrl;
    course.price = price ? parseFloat(price) : course.price;
    
    if (instructor) {
      course.instructor = typeof instructor === "string" ? JSON.parse(instructor) : instructor;
    }

    if (resources) {
      course.resources = typeof resources === "string" ? JSON.parse(resources) : resources;
    }

    if (notes) {
      course.notes = typeof notes === "string" ? JSON.parse(notes) : notes;
    }
    
    if (materials) {
      course.materials = typeof materials === "string" ? JSON.parse(materials) : materials;
    }

    if (relatedCourses) {
      course.relatedCourses = typeof relatedCourses === "string" ? JSON.parse(relatedCourses) : relatedCourses;
    }

    await course.save();
    res.json(course);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Error updating course", error: error.message });
  }
});

router.delete("/courses/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await Course.findByIdAndDelete(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Clean up associated enrollments and payments
    await Enrollment.deleteMany({ course: courseId });
    await Payment.deleteMany({ course: courseId });

    res.json({ message: "Course and associated data deleted" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Error deleting course" });
  }
});

router.get("/payments", async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("student", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments" });
  }
});

// Admin stats for dashboard
router.get("/stats", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "student" });
    const totalCourses = await Course.countDocuments();
    
    // Count unique paid student-course enrollments
    const enrollmentsAgg = await Enrollment.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: { student: "$student", course: "$course" } } },
      { $count: "total" }
    ]);
    const totalEnrollments = enrollmentsAgg[0]?.total || 0;
    
    const payments = await Payment.find({ paymentStatus: "paid" });
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Monthly revenue data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyStats = await Payment.aggregate([
      {
        $match: {
          paymentStatus: "paid",
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Popular courses - count unique paid students per course
    const popularCourses = await Enrollment.aggregate([
      { $match: { paymentStatus: "paid" } },
      {
        $group: {
          _id: { course: "$course", student: "$student" }
        }
      },
      {
        $group: {
          _id: "$_id.course",
          students: { $sum: 1 }
        }
      },
      { $sort: { students: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo"
        }
      },
      { $unwind: "$courseInfo" },
      {
        $project: {
          title: "$courseInfo.title",
          students: 1
        }
      }
    ]);

    res.json({
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalRevenue,
      monthlyStats,
      popularCourses
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Error fetching admin stats" });
  }
});

// Advanced user management: Get student details with enrollment history
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const enrollments = await Enrollment.find({ student: user._id })
      .populate("course", "title thumbnail price")
      .sort({ createdAt: -1 });

    res.json({ user, enrollments });
  } catch (error) {
    res.status(500).json({ message: "Error fetching student details" });
  }
});

// Advanced user management: Update student profile
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, role, isBlocked } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    user.isBlocked = isBlocked !== undefined ? isBlocked : user.isBlocked;

    await user.save();
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user" });
  }
});

// Toggle block status
router.patch("/users/:id/block", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ message: "Error toggling block status" });
  }
});

export default router;
