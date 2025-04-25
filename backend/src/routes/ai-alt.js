import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { validatePrompt } from "../middleware/validation.js";
import { sanitizePrompt } from "../middleware/sanitization.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /api/ai/generate
router.post(
  "/generate",
  aiRateLimiter,
  sanitizePrompt,
  validatePrompt,
  async (req, res) => {
    try {
      const { prompt } = req.body;

      // Get API key directly from environment
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Configuration Error",
          message: "API key is not configured",
        });
      }

      // Initialize Gemini AI with the API key
      const genAI = new GoogleGenerativeAI(apiKey);

      // Initialize the model
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Generate content
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      res.json({ response: text });
    } catch (error) {
      console.error("Error generating AI response:", error);

      // Provide more detailed error information in development
      if (process.env.NODE_ENV === "development") {
        console.error("Detailed error:", JSON.stringify(error, null, 2));
      }

      // Check for specific error types
      if (error.message && error.message.includes("API key not valid")) {
        return res.status(500).json({
          error: "API Key Error",
          message: "The API key is not valid. Please check your configuration.",
        });
      }

      res.status(500).json({
        error: "AI Generation Error",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Failed to generate AI response",
      });
    }
  }
);

export const aiRouter = router;
