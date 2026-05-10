import multer from "multer";

// Configure multer for memory storage (we'll stream directly to GridFS)
const storage = multer.memoryStorage();

// File filter to only accept video files
const fileFilter = (req, file, cb) => {
  // Accept video files
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed"), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

export default upload;

