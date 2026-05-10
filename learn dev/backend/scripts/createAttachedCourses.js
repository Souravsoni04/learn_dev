import mongoose from "mongoose";
import dotenv from "dotenv";
import Course from "../models/Course.js";

dotenv.config();

const asset = (name) => `/course-assets/${name}`;

const courses = [
  {
    title: "India Pakistan Conflict: Top News Briefing",
    subtitle: "A current affairs course built from the uploaded news video and notes.",
    description:
      "Understand the key updates around the India Pakistan conflict, Pak High Commission coverage, and CCS meeting through a focused video lesson with instructor notes.",
    level: "Beginner",
    category: "Current Affairs",
    duration: "Self paced",
    lessons: 2,
    thumbnail: "https://picsum.photos/seed/india-pakistan-news-course/1200/675",
    price: 0,
    createdBy: "Attached File Import",
    instructor: {
      name: "Sourav AJ",
      bio: "Current affairs and news analysis instructor.",
      avatar: "https://ui-avatars.com/api/?name=Sourav+AJ&background=eef7f4&color=16806f",
      socials: {}
    },
    materials: [
      {
        type: "video",
        title: "Morning Top 10 News Briefing",
        description:
          "Watch the uploaded briefing covering India Pakistan conflict updates, Pak High Commission news, and the CCS meet.",
        duration: "",
        url: asset("india-pakistan-conflict-top-news.mp4"),
        fileId: "local-india-pakistan-conflict-top-news"
      },
      {
        type: "note",
        title: "Sourav AJ Course Notes",
        description: "Open the uploaded DOCX notes for supporting class material.",
        url: asset("sourav-aj-course-notes.docx"),
        fileId: "local-sourav-aj-course-notes"
      }
    ],
    notes: [
      {
        title: "Class Notes",
        content: "Attached DOCX notes provided by the instructor for this news-analysis course.",
        fileUrl: asset("sourav-aj-course-notes.docx")
      }
    ],
    resources: []
  },
  {
    title: "IPL 2025 New Schedule Update",
    subtitle: "A sports news course built from the uploaded IPL schedule video.",
    description:
      "Review the IPL 2025 new schedule announcement, rule updates, dates, venues, and team coverage for RCB, MI, and CSK.",
    level: "Beginner",
    category: "Sports News",
    duration: "Self paced",
    lessons: 2,
    thumbnail: "https://picsum.photos/seed/ipl-2025-schedule-course/1200/675",
    price: 0,
    createdBy: "Attached File Import",
    instructor: {
      name: "Sourav AJ",
      bio: "Sports news and schedule analysis instructor.",
      avatar: "https://ui-avatars.com/api/?name=Sourav+AJ&background=eef7f4&color=16806f",
      socials: {}
    },
    materials: [
      {
        type: "video",
        title: "IPL 2025 Schedule Announcement",
        description:
          "Watch the uploaded IPL update covering the new schedule, rules, date, venue, RCB, MI, and CSK.",
        duration: "",
        url: asset("ipl-2025-new-schedule.mp4"),
        fileId: "local-ipl-2025-new-schedule"
      },
      {
        type: "note",
        title: "Sourav AJ Course Notes",
        description: "Open the uploaded DOCX notes for supporting class material.",
        url: asset("sourav-aj-course-notes.docx"),
        fileId: "local-sourav-aj-course-notes"
      }
    ],
    notes: [
      {
        title: "Class Notes",
        content: "Attached DOCX notes provided by the instructor for this sports-news course.",
        fileUrl: asset("sourav-aj-course-notes.docx")
      }
    ],
    resources: []
  }
];

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from .env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const saved = [];
  for (const course of courses) {
    const result = await Course.findOneAndUpdate(
      { title: course.title },
      { $set: course },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    saved.push(result);
  }

  if (saved.length === 2) {
    await Course.updateOne({ _id: saved[0]._id }, { $set: { relatedCourses: [saved[1]._id] } });
    await Course.updateOne({ _id: saved[1]._id }, { $set: { relatedCourses: [saved[0]._id] } });
  }

  console.log("Attached file courses created:");
  for (const course of saved) {
    console.log(`- ${course.title}: ${course._id}`);
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Failed to create attached file courses:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
