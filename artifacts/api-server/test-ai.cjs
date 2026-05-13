const { GoogleGenerativeAI } = require("@google/generative-ai");

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  try {
    // There is no direct listModels in the main export, usually it is part of the admin/management API
    // but we can try a few common ones
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-pro"
    ];
    for (const m of models) {
        console.log(`Testing ${m}...`);
        const model = genAI.getGenerativeModel({ model: m });
        try {
            const result = await model.generateContent("hi");
            console.log(`  ${m}: SUCCESS`);
            break;
        } catch (e) {
            console.log(`  ${m}: FAILED - ${e.message}`);
        }
    }
  } catch (err) {
    console.error("GLOBAL FAILED:", err.message);
  }
}
run();
