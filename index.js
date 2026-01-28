import express from "express";
import dotenv from "dotenv";
import { v4 as uuid } from "uuid";
import multer from "multer";
import fs from "fs";

import { generateReply } from "./ai/llm.js";
import { synthesizeSpeech } from "./ai/tts.js";
import { speechToText } from "./ai/stt.js";
import { calls } from "./memory/calls.js";

dotenv.config();

const app = express();

/* =====================================================
   HARD CORS FIX (WORKS WITH LOVABLE + NGROK + MIC)
===================================================== */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =====================================================
   Middleware
===================================================== */
app.use(express.json());
app.use("/audio", express.static("audio"));

/* =====================================================
   Temp audio storage for STT
===================================================== */
const upload = multer({ dest: "temp_audio/" });

if (!fs.existsSync("temp_audio")) {
  fs.mkdirSync("temp_audio");
}

/* =====================================================
   Health Check
===================================================== */
app.get("/", (req, res) => {
  res.send("Sirah Voice backend is running");
});

/* =====================================================
   START CALL
===================================================== */
app.post("/start-call", async (req, res) => {
  try {
    const callId = uuid();

    const agentText =
      "Hello, this is Sirah Voice assistant. May I know your name please?";

    const audioFile = await synthesizeSpeech(agentText);

    calls[callId] = {
      created_at: new Date().toISOString(),
      messages: [
        {
          role: "agent",
          text: agentText
        }
      ]
    };

    res.json({
      call_id: callId,
      status: "agent_speaking",
      agent_text: agentText,
      audio_url: `/audio/${audioFile}`
    });
  } catch (error) {
    console.error("START CALL ERROR:", error);
    res.status(500).json({
      error: "Failed to start call"
    });
  }
});

/* =====================================================
   SEND MESSAGE (TEXT INPUT)
===================================================== */
app.post("/send-message", async (req, res) => {
  const { call_id, user_text } = req.body;

  if (!call_id || !user_text) {
    return res.status(400).json({
      error: "call_id and user_text are required"
    });
  }

  if (!calls[call_id]) {
    return res.status(404).json({
      error: "Invalid call_id"
    });
  }

  calls[call_id].messages.push({
    role: "user",
    text: user_text
  });

  let agentReply;

  try {
    agentReply = await generateReply(calls[call_id].messages);
  } catch (error) {
    console.error("LLM ERROR:", error.message);
    agentReply =
      "Thank you. Our team will follow up with you shortly. Have a great day.";
  }

  try {
    const audioFile = await synthesizeSpeech(agentReply);

    calls[call_id].messages.push({
      role: "agent",
      text: agentReply
    });

    res.json({
      status: "agent_speaking",
      agent_text: agentReply,
      audio_url: `/audio/${audioFile}`
    });
  } catch (error) {
    console.error("TTS ERROR:", error);
    res.status(500).json({
      error: "Voice generation failed"
    });
  }
});

/* =====================================================
   SPEECH TO TEXT (MIC INPUT)
===================================================== */
app.post(
  "/speech-to-text",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No audio file received"
        });
      }

      const transcript = await speechToText(req.file.path);

      // Clean up temp audio file
      fs.unlinkSync(req.file.path);

      res.json({
        user_text: transcript
      });
    } catch (error) {
      console.error("STT ERROR:", error);
      res.status(500).json({
        error: "Speech recognition failed"
      });
    }
  }
);

/* =====================================================
   END CALL (OPTIONAL)
===================================================== */
app.post("/end-call", (req, res) => {
  const { call_id } = req.body;

  if (call_id && calls[call_id]) {
    delete calls[call_id];
  }

  res.json({
    status: "call_ended"
  });
});

/* =====================================================
   START SERVER
===================================================== */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sirah Voice backend running on port ${PORT}`);
});
