/**
 * Direct test script for Gemini API
 * Replace YOUR_API_KEY with your actual API key
 */

import fetch from "node-fetch";

// Replace this with your actual API key
const API_KEY = "YOUR_API_KEY";

console.log(
  "Testing with API key starting with:",
  API_KEY.substring(0, 5) + "..."
);

// Test the API key with a simple prompt
async function testApiKey() {
  try {
    console.log("Testing API key with a simple prompt...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
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
                  text: "Hello, this is a test.",
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
    console.log("API key is valid!");
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error testing API key:", error);
  }
}

// Run the test
testApiKey();
