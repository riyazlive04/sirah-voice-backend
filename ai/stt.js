import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function speechToText(audioFilePath) {
  const response = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioFilePath),
    model: "gpt-4o-transcribe"
  });

  return response.text;
}