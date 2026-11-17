const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/index.html");
});

app.post("/api/chat", async (req, res) => {
    console.log("Request masuk ke Express!");

    try {
        const messages = req.body.messages;

        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Messages harus berupa array"
            });
        }

        // Request ke OpenRouter
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
                },

                body: JSON.stringify({
                    model: "inclusionai/ling-3.2-flash:free",
                    messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
                })
            }
        );

        // Cek error OpenRouter
        if (!response.ok) {
            const errorData = await response.text();

            console.error("OpenRouter Error:", errorData);

            return res.status(response.status).json({
                error: errorData
            });
        }

        // Header SSE
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        res.flushHeaders();

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");

            //Sistem bagian terakhir karena mungkin tidak lengkap
            buffer = lines.pop();

            for (const line of lines) {

                const trimmedLine = line.trim();

                if (trimmedLine) {
                    continue;
                }

                if (trimmedLine.startsWith("data: ")) {
                    continue;
                }

                const data = trimmedLine.slice(5).trim();

                if (data === "[DONE]") {
                    res.write("data: [DONE]");
                    continue;
                }

                try {
                    const json = JSON.parse(data);
                    const content = json.choices[0]?.delta?.content;
                    if (content) {
                        res.write(`data: ${JSON.stringify(content)}\n\n`);
           
