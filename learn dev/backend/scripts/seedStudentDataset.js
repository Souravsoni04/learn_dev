import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";
import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import SupportTicket from "../models/SupportTicket.js";

dotenv.config();

const studentEmail = "student@test.com";
const studentPassword = "password123";

const courses = [
  {
    title: "Student Test React Foundations",
    subtitle: "Build reusable UI with React",
    description: "A focused test course for checking catalog, enrollment, progress, payment, and review flows.",
    category: "Frontend",
    level: "Beginner",
    duration: "6h",
    lessons: 12,
    price: 499,
    instructorName: "Priya Sharma",
    seed: "student-react"
  },
  {
    title: "Student Test Node API",
    subtitle: "Create Express APIs with MongoDB",
    description: "Backend course data for validating paid course access and admin course reporting.",
    category: "Backend",
    level: "Intermediate",
    duration: "8h",
    lessons: 16,
    price: 699,
    instructorName: "Rohan Verma",
    seed: "student-node"
  },
  {
    title: "Student Test MongoDB Essentials",
    subtitle: "Model and query application data",
    description: "Database course data for checking course detail pages, resources, and progress tracking.",
    category: "Data Science",
    level: "Beginner",
    duration: "5h",
    lessons: 10,
    price: 399,
    instructorName: "Neha Iyer",
    seed: "student-mongodb"
  },
  {
    title: "Student Test Cloud Deployment",
    subtitle: "Deploy full-stack projects",
    description: "Cloud course data for checking paid enrollment, support, and dashboard totals.",
    category: "Cloud",
    level: "Advanced",
    duration: "7h",
    lessons: 14,
    price: 899,
    instructorName: "Kabir Khan",
    seed: "student-cloud"
  },
  {
    title: "Student Test UI Design Systems",
    subtitle: "Design consistent product interfaces",
    description: "Design course data for checking reviews, related courses, and student dashboard cards.",
    category: "Frontend",
    level: "Intermediate",
    duration: "4h",
    lessons: 9,
    price: 299,
    instructorName: "Ananya Rao",
    seed: "student-ui"
  }
];

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
  }

  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
};

const materialsFor = (course, index) => [
  {
    type: "video",
    title: `${course.title} - Introduction`,
    description: "Welcome and course setup.",
    duration: "08:00",
    url: "https://ik.imagekit.io/demo/sample-video.mp4",
    fileId: `${course.seed}-intro`
  },
  {
    type: "video",
    title: `${course.title} - Project Lesson`,
    description: "Hands-on project lesson.",
    duration: "18:00",
    url: "https://ik.imagekit.io/demo/sample-video.mp4",
    fileId: `${course.seed}-project`
  },
  {
    type: "pdf",
    title: `${course.title} - Reference PDF`,
    description: "Downloadable reference document.",
    duration: "05:00",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  },
  {
    type: "note",
    title: `${course.title} - Practice Notes`,
    description: "Short practice checklist.",
    duration: "04:00",
    url: ""
  }
];

const upsertStudent = async () => {
  let student = await User.findOne({ email: studentEmail });

  if (student) {
    student.name = "student";
    student.password = studentPassword;
    student.role = "student";
    student.isBlocked = false;
    student.notificationSettings = {
      emailAlerts: true,
      courseUpdates: true,
      newFeatures: true
    };
    await student.save();
  } else {
    student = await User.create({
      name: "student",
      email: studentEmail,
      password: studentPassword,
      role: "student",
      notificationSettings: {
        emailAlerts: true,
        courseUpdates: true,
        newFeatures: true
      }
    });
  }

  return student;
};

const upsertCourses = async () => {
  const docs = [];

  for (const [index, course] of courses.entries()) {
    const payload = {
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      level: course.level,
      category: course.category,
      duration: course.duration,
      lessons: course.lessons,
      thumbnail: `https://picsum.photos/seed/${course.seed}/800/450`,
      trailerUrl: "https://ik.imagekit.io/demo/sample-video.mp4",
      price: course.price,
      createdBy: "Student Dataset Seed",
      instructor: {
        name: course.instructorName,
        bio: `${course.instructorName} teaches practical ${course.category.toLowerCase()} skills.`,
        avatar: `https://i.pravatar.cc/160?img=${index + 20}`,
        socials: {
          github: "https://github.com/example",
          linkedin: "https://linkedin.com/in/example",
          youtube: "https://youtube.com/@example"
        }
      },
      materials: materialsFor(course, index),
      resources: [
        { title: "Starter files", url: "https://github.com/example/starter" },
        { title: "Documentation", url: "https://developer.mozilla.org/" }
      ],
      notes: [
        {
          title: "Seed note",
          content: "Created by scripts/seedStudentDataset.js for module testing.",
          fileUrl: ""
        }
      ]
    };

    const doc = await Course.findOneAndUpdate(
      { title: course.title },
      { $set: payload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    docs.push(doc);
  }

  for (let index = 0; index < docs.length; index += 1) {
    await Course.updateOne(
      { _id: docs[index]._id },
      {
        $set: {
          relatedCourses: [
            docs[(index + 1) % docs.length]._id,
            docs[(index + 2) % docs.length]._id
          ]
        }
      }
    );
  }

  return docs;
};

const upsertStudentActivity = async (student, courseDocs) => {
  const progressValues = [100, 75, 50, 30, 10];
  let paymentCount = 0;
  let reviewCount = 0;

  for (const [index, course] of courseDocs.entries()) {
    const completedCount = Math.max(1, Math.ceil((course.materials.length * progressValues[index]) / 100));
    const orderId = `student_dataset_order_${index + 1}`;
    const paymentId = `student_dataset_payment_${index + 1}`;

    const enrollment = await Enrollment.findOneAndUpdate(
      { student: student._id, course: course._id },
      {
        $set: {
          paymentStatus: "paid",
          paymentId,
          orderId,
          amount: course.price,
          currency: "INR",
          completedMaterials: course.materials.slice(0, completedCount).map((material) => material.title),
          videoProgress: course.materials
            .filter((material) => material.type === "video")
            .map((material, materialIndex) => ({
              materialId: material.title,
              watchedSeconds: Math.min(900, 180 + index * 120 + materialIndex * 90),
              durationSeconds: 1200,
              updatedAt: new Date()
            })),
          progress: progressValues[index],
          notes: [
            {
              materialId: course.materials[0]?.title || course.title,
              content: `Student note for ${course.title}.`,
              updatedAt: new Date()
            }
          ]
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await Payment.findOneAndUpdate(
      { student: student._id, course: course._id, orderId },
      {
        $set: {
          enrollment: enrollment._id,
          paymentStatus: "paid",
          amount: course.price,
          currency: "INR",
          paymentId,
          gateway: "demo"
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    paymentCount += 1;

    if (index < 4) {
      await Review.findOneAndUpdate(
        { student: student._id, course: course._id },
        {
          $set: {
            rating: index % 2 === 0 ? 5 : 4,
            comment: `Useful course for testing module ${index + 1}.`
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      reviewCount += 1;
    }
  }

  return { enrollmentCount: courseDocs.length, paymentCount, reviewCount };
};

const upsertSupportTickets = async (student) => {
  const tickets = [
    {
      subject: "Video playback test ticket",
      message: "The student account can use this ticket to test technical support workflow.",
      category: "Technical",
      priority: "High",
      status: "Open"
    },
    {
      subject: "Payment invoice test ticket",
      message: "The student account can use this ticket to test billing support workflow.",
      category: "Billing",
      priority: "Medium",
      status: "In Progress"
    },
    {
      subject: "Course content test ticket",
      message: "The student account can use this ticket to test course content support workflow.",
      category: "Course Content",
      priority: "Low",
      status: "Resolved"
    },
    {
      subject: "General dashboard test ticket",
      message: "The student account can use this ticket to test general support workflow.",
      category: "General",
      priority: "Medium",
      status: "Closed"
    }
  ];

  for (const ticket of tickets) {
    await SupportTicket.findOneAndUpdate(
      { user: student._id, subject: ticket.subject },
      {
        $set: {
          ...ticket,
          userHasSeen: false,
          replies: [
            {
              user: student._id,
              message: "Seeded reply for support module testing.",
              createdAt: new Date()
            }
          ]
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  return tickets.length;
};

const refreshCourseStats = async (courseDocs) => {
  for (const course of courseDocs) {
    const paidEnrollments = await Enrollment.countDocuments({
      course: course._id,
      paymentStatus: "paid"
    });
    const reviews = await Review.find({ course: course._id }).select("rating");
    const averageRating = reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

    await Course.updateOne(
      { _id: course._id },
      {
        $set: {
          enrolledCount: paidEnrollments,
          reviewCount: reviews.length,
          averageRating
        }
      }
    );
  }
};

const run = async () => {
  try {
    await connectDB();

    const student = await upsertStudent();
    const courseDocs = await upsertCourses();
    const activity = await upsertStudentActivity(student, courseDocs);
    const supportCount = await upsertSupportTickets(student);
    await refreshCourseStats(courseDocs);

    console.log("Student dataset seed complete");
    console.log(`Login: ${studentEmail} / ${studentPassword}`);
    console.log(`Courses upserted: ${courseDocs.length}`);
    console.log(`Paid enrollments upserted: ${activity.enrollmentCount}`);
    console.log(`Payments upserted: ${activity.paymentCount}`);
    console.log(`Reviews upserted: ${activity.reviewCount}`);
    console.log(`Support tickets upserted: ${supportCount}`);
  } catch (error) {
    console.error("Student dataset seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
