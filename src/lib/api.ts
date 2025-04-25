/**
 * API utility functions for making requests to the backend
 */

// Base URL for API requests
const API_BASE_URL = "http://localhost:3001/api";

/**
 * Call the AI generation endpoint
 * @param prompt The user's prompt
 * @returns The AI response
 */
export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
      credentials: "include", // Include cookies if needed for authentication
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error calling AI API:", error);
    throw error; // Re-throw to let the component handle the error
  }
}
