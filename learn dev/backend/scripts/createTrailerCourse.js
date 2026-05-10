import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";

dotenv.config();

const asset = (name) => `/course-assets/${name}`;

const trailerCourse = {
  title: "JavaScript Project Bootcamp: Build Real Apps",
  subtitle: "Preview the course first, then unlock the full project lessons after enrollment.",
  description:
    "A paid demo course that shows how trailers work before purchase while keeping the real lesson videos, PDFs, notes, and resources inside the enrolled classroom.",
  level: "Beginner",
  category: "Web Development",
  duration: "18m",
  lessons: 4,
  thumbnail: "https://picsum.photos/seed/javascript-project-bootcamp/1200/675",
  trailerUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  price: 499,
  createdBy: "Trailer Demo Import",
  instructor: {
    name: "Learn Dev Team",
    bio: "Project-first instructors focused on practical web development.",
    avatar: "https://ui-avatars.com/api/?name=Learn+Dev&background=eef7f4&color=16806f",
    socials: {
      github: "https://github.com",
      youtube: "https://youtube.com"
    }
  },
  materials: [
    {
      type: "video",
      title: "Course Welcome and Setup",
      description: "Set up the project workspace and understand the learning path.",
      duration: "4:00",
      url: asset("ipl-2025-new-schedule.mp4"),
      fileId: "local-demo-setup",
      resources: [
        {
          title: "Starter checklist",
          url: "https://developer.mozilla.org/en-US/docs/Learn"
        }
      ]
    },
    {
      type: "video",
      title: "Build the First UI Screen",
      description: "Create the first working screen and connect it to course requirements.",
      duration: "6:30",
      url: asset("india-pakistan-conflict-top-news.mp4"),
      fileId: "local-demo-ui-screen",
      resources: [
        {
          title: "React documentation",
          url: "https://react.dev/learn"
        }
      ]
    },
    {
      type: "pdf",
      title: "Project Notes PDF",
      description: "Downloadable notes for revision and implementation steps.",
      duration: "",
      url: asset("sourav-aj-course-notes.docx"),
      fileId: "local-demo-notes"
    },
    {
      type: "note",
      title: "Submission Checklist",
      description: "Final steps students should complete before marking the project done.",
      duration: "",
      url: ""
    }
  ],
  notes: [
    {
      title: "Before You Start",
      content: "Watch the free trailer on the course page. Full lesson files are unlocked only after enrollment.",
      fileUrl: asset("sourav-aj-course-notes.docx")
    }
  ],
  resources: [
    {
      title: "MDN JavaScript Guide",
      url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
    }
  ],
  relatedCourses: []
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const course = await Course.findOneAndUpdate(
    { title: trailerCourse.title },
    { $set: trailerCourse },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  console.log("Trailer demo course ready:");
  console.log(`- ${course.title}: ${course._id}`);
  console.log(`- Course page: /courses/${course._id}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to create trailer demo course:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
