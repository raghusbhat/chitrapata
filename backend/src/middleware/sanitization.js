/**
 * Input sanitization middleware
 */

/**
 * Sanitizes the prompt input for AI generation
 */
export const sanitizePrompt = (req, res, next) => {
  if (req.body.prompt) {
    // Remove any HTML tags
    req.body.prompt = req.body.prompt.replace(/<[^>]*>/g, "");

    // Remove any control characters
    req.body.prompt = req.body.prompt.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // Normalize whitespace (replace multiple spaces with a single space)
    req.body.prompt = req.body.prompt.replace(/\s+/g, " ");

    // Trim leading and trailing whitespace
    req.body.prompt = req.body.prompt.trim();
  }

  next();
};
