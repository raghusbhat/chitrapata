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

    // Trim leading and trailing whitespace
    req.body.prompt = req.body.prompt.trim();
  }

  next();
};
