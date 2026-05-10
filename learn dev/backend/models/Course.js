import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["video", "pdf", "note"], required: true },
    title: { type: String, required: true },
    description: { type: String },
    duration: { type: String },
    url: { type: String },
    videoId: { type: mongoose.Schema.Types.ObjectId }, // GridFS file ID for videos stored in DB
    fileId: { type: String }, // ImageKit file ID
    resources: [{
      title: String,
      url: String
    }]
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subtitle: String,
    description: String,
    level: { type: String, default: "Beginner" },
    thumbnail: String,
    trailerUrl: String,
    category: String,
    duration: String,
    lessons: { type: Number, default: 0 },
    createdBy: { type: String, default: "Admin" },
    instructor: {
      name: { type: String, default: "Expert Instructor" },
      bio: { type: String },
      avatar: { type: String },
      socials: {
        github: String,
        linkedin: String,
        youtube: String
      }
    },
    price: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    materials: [materialSchema],
    resources: [{
      title: String,
      url: String
    }],
    relatedCourses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course"
    }],
    notes: [{
      title: String,
      content: String,
      fileUrl: String
    }]
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
