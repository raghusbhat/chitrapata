import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// Check if API key is set
if (
  !process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY === "your_new_api_key_here"
) {
  console.error(
    "Error: GEMINI_API_KEY is not set or still has the placeholder value."
  );
  console.error(
    "Please update your .env file with a valid API key from Google AI Studio."
  );
  process.exit(1);
}

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGeminiAPI() {
  try {
    console.log("Testing API with a simple request...");
    // Get the generative model - using the latest model name
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Generate content
    const result = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: "Hello, Gemini! Can you confirm that my API key is working?",
            },
          ],
        },
      ],
    });
    const response = await result.response;

    console.log("API Key is working correctly!");
    console.log("Response from Gemini:");
    console.log(response.text());
  } catch (error) {
    console.error("Error testing Gemini API:");
    console.error(error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
  }
}

// Run the test
testGeminiAPI();
