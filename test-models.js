import fs from "fs";

async function testModel(modelName) {
    console.log(`Testing ${modelName}`);
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // Provide a dummy key, we just want to see if it gives 401 (model exists) or 404 (model not found)
                "Authorization": "Bearer sk-or-v1-dummy",
            },
            body: JSON.stringify({
                model: modelName,
                messages: [{ role: "user", content: "hello" }]
            })
        });
        const data = await response.json();
        console.log(modelName, data);
    } catch(e) {
        console.error(modelName, e);
    }
}

async function run() {
    await testModel("google/gemini-1.5-flash");
    await testModel("google/gemini-1.5-flash:free");
    await testModel("google/gemini-2.0-flash-lite-preview-02-05:free");
    await testModel("google/gemini-2.0-pro-exp-02-05:free");
}

run();
