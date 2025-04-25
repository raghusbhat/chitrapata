/**
 * Test script to verify the Gemini API key works correctly
 * Run with: node test-api-key.js
 */

import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
const result = dotenv.config();
if (result.error) {
  console.error("Error loading .env file:", result.error);
  process.exit(1);
}

// Get API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY is not set in environment variables");
  process.exit(1);
}

console.log(`Using Gemini API key starting with: ${apiKey.substring(0, 5)}...`);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(apiKey);

// Test the API key with a simple prompt
async function testApiKey() {
  try {
    console.log("Testing API key with a simple prompt...");

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Generate content
    const result = await model.generateContent("Hello, this is a test.");
    const response = await result.response;
    const text = response.text();

    console.log("API key is valid!");
    console.log("Response:", text);
  } catch (error) {
    console.error("Error testing API key:", error);
    console.error("Detailed error:", JSON.stringify(error, null, 2));
  }
}

// Run the test
testApiKey();
