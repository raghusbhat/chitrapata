import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { validatePrompt } from "../middleware/validation.js";
import { sanitizePrompt } from "../middleware/sanitization.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

// Load environment variables directly in this file to ensure they're available
dotenv.config();

const router = express.Router();

// Get API key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY is not set in environment variables");
} else {
  console.log(
    `Using Gemini API key starting with: ${apiKey.substring(0, 5)}...`
  );
}

// POST /api/ai/generate
router.post(
  "/generate",
  aiRateLimiter,
  sanitizePrompt,
  validatePrompt,
  async (req, res) => {
    try {
      const { prompt } = req.body;

      console.log("📤 User prompt:", prompt);

      // Check if API key is available
      if (!apiKey) {
        return res.status(500).json({
          error: "Configuration Error",
          message: "API key is not configured",
        });
      }

      // Add strict instructions for JSON output: no markdown, color matching, default stroke
      const systemInstructions =
        "You are a UI component generator. Respond ONLY with a plain JSON array of components (no markdown/code fences). " +
        "Each component must include: type, x, y, width, height, fill, stroke, strokeWidth, rotation, zIndex, isVisible. " +
        "The fill property must match the color specified in the user's request (CSS color names or hex codes). " +
        "The stroke property should default to 'black'.";
      const fullPrompt = `${systemInstructions}\nUser request: ${prompt}`;

      // Call Gemini API using the latest model: gemini-2.0-flash
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: fullPrompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API request failed: ${JSON.stringify(errorData, null, 2)}`
        );
      }

      const data = await response.json();

      // Extract response text
      const aiResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response generated";
      console.log("📥 Gemini API response:", aiResponse);

      // Strip markdown fences if present and parse JSON
      let jsonText = aiResponse.trim();
      const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) jsonText = fenceMatch[1];
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          return res.json({ response: parsed });
        }
      } catch {
        // Not valid JSON, fall back to raw text
      }
      return res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error generating AI response:", error);

      // Provide more detailed error information in development
      if (process.env.NODE_ENV === "development") {
        console.error("Detailed error:", error.message);
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
