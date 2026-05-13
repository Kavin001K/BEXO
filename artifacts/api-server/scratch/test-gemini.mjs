import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GOOGLE_API_KEY;
if (!key) { process.exit(1); }

const genAI = new GoogleGenerativeAI(key);

async function test() {
  const models = ["gemini-2.5-flash-lite", "gemini-3-flash-preview"];
  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const result = await model.generateContent("Hi");
      const response = await result.response;
      console.log(`Success with ${m}:`, response.text());
      return;
    } catch (err) {
      console.error(`Failed with ${m}:`, err.message);
    }
  }
}

test();
