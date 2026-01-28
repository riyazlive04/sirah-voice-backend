import sdk from "microsoft-cognitiveservices-speech-sdk";
import { v4 as uuid } from "uuid";

export async function synthesizeSpeech(text) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_SPEECH_KEY,
    process.env.AZURE_SPEECH_REGION
  );

  speechConfig.speechSynthesisVoiceName = "en-IN-NeerjaNeural";

  const fileName = `${uuid()}.wav`;
  const filePath = `audio/${fileName}`;

  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filePath);
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  return new Promise((resolve, reject) => {
    synthesizer.speakTextAsync(
      text,
      () => {
        synthesizer.close();
        resolve(fileName);
      },
      error => reject(error)
    );
  });
}