import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { aiRouter } from "./routes/ai.js";

// Load environment variables
const result = dotenv.config();
if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log("Environment variables loaded successfully");
  // Check if critical environment variables are set
  const requiredVars = ["PORT", "NODE_ENV", "GEMINI_API_KEY", "CORS_ORIGIN"];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error(
      "Missing required environment variables:",
      missingVars.join(", ")
    );
  } else {
    console.log("All required environment variables are set");
    // Print first 5 chars of API key to verify it's loaded correctly
    if (process.env.GEMINI_API_KEY) {
      console.log(
        `API Key found: ${process.env.GEMINI_API_KEY.substring(0, 5)}...`
      );
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Security middleware
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    methods: ["POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

// Routes
app.use("/api/ai", aiRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
