import dotenv from "dotenv";
dotenv.config(); // 🔑 FORCE env load here

import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is NOT loaded");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
You are a professional business receptionist.
Ask one question at a time.
Do not provide medical advice.
Keep responses under 2 short sentences.
`;

export async function generateReply(conversation) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversation.map(m => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.text
    }))
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.4
  });

  return response.choices[0].message.content;
}