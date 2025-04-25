/**
 * Input validation middleware
 */

/**
 * Validates the prompt input for AI generation
 */
export const validatePrompt = (req, res, next) => {
  const { prompt } = req.body;

  // Check if prompt exists and is a string
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      error: "Bad Request",
      message: "Prompt is required and must be a string",
    });
  }

  // Trim whitespace
  req.body.prompt = prompt.trim();

  // Check if prompt is empty after trimming
  if (req.body.prompt.length === 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Prompt cannot be empty",
    });
  }

  // Check prompt length (adjust max length as needed)
  const MAX_PROMPT_LENGTH = 4000; // Gemini has token limits
  if (req.body.prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      error: "Bad Request",
      message: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
    });
  }

  // Check for potentially harmful content (basic example)
  const harmfulPatterns = [
    /<script>/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
  ];

  for (const pattern of harmfulPatterns) {
    if (pattern.test(req.body.prompt)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Prompt contains potentially harmful content",
      });
    }
  }

  next();
};
