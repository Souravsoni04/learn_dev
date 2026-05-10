import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

dotenv.config();

const startServer = async () => {
  try {
    await connectDB();

    const app = express();

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:5175",
      "http://127.0.0.1:5175",
      "http://localhost:5176",
      "http://127.0.0.1:5176"
    ].filter(Boolean);

    app.use(cors({
      origin: allowedOrigins,
      credentials: true
    }));
    app.use(express.json());

    app.get("/", (req, res) => {
      res.send("Learn Dev API is running...");
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/courses", courseRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/reviews", reviewRoutes);
    app.use("/api/support", (req, res) => {
      res.status(503).json({ message: "Support feature is temporarily disabled" });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Learn Dev backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
