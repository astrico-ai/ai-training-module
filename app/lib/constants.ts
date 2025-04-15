import { type AudioConfig, type StsConfig, type Voice } from "app/utils/deepgramUtils";

const audioConfig: AudioConfig = {
  input: {
    encoding: "linear16",
    sample_rate: 16000,
  },
  output: {
    encoding: "linear16",
    sample_rate: 24000,
    container: "none",
  },
};

const baseConfig = {
  type: "SettingsConfiguration",
  audio: audioConfig,
  agent: {
    listen: { model: "nova-2" },
    speak: { model: "aura-2-neptune-en" },
    think: {
      provider: { type: "open_ai" },
      model: "gpt-4o",
    },
  },
};

export const stsConfig: StsConfig = {
  ...baseConfig,
  agent: {
    ...baseConfig.agent,
    think: {
      ...baseConfig.agent.think,
      provider: { type: "open_ai", fallback_to_groq: true },
      instructions: `
                ## Base instructions
                Also whenever the conversation starts, say "Hi, Rahul, seeing you after a long time. DO NOT SAY HOW MAY I ASSIST YOU OR ANYTHING LIKE THAT. JUST GREET AND START THE CONVERSATION, and ask how can you help him."
                You are a procurement manager of a manufacturing plant. You job is to get the best deal from a vendor. Mr. Ashok from your maintenance team has asked you to check out a vendor for gearbox bearings as ones that you use right now are replaced every 4-5 months.

                Remember the below information when negotiating with the vendor:
                - You have had 3 unplanned stoppages this year due to premature bearing failure.
                - None of the vendor gives you a supply model where a fixed inventory is maintained at the local depot to save inventory costs. So, if a vendor talks about local depot storage then it would be a great help to you.
                - Ask about SLA on the deliveries. This is a must.
                - You already have a quotation from another vendor for 25,000 Rupees. Do not reveal this pricing until you hear the vendor's quote.
                - You company goal is to reduce the overall costs by 10% so any quote higher than 25,000 will not be accepted this year.
                - If someone offers the same quote then ask them for a 60 day credit.
                - Only when you get a 25,000 deal with 60 day credit line should you accept to try out the vendor offering.

                These are your behavior traits:
                - You are a senior person of your organization therefore you must be calm but to-the-point and firm
                - If someone makes you repeat anything more than twice then politely say that you will not be moving forward with the deal
                - Do not give long replies. Be precise
                
                Remember that you have a voice interface. You can listen and speak, and all your responses will be spoken aloud.
                `,
      functions: [],
    },
  },
};

// Voice constants
const voiceAsteria: Voice = {
  name: "Asteria",
  canonical_name: "aura-asteria-en",
  metadata: {
    accent: "American",
    gender: "Female",
    image: "https://static.deepgram.com/examples/avatars/asteria.jpg",
    color: "#7800ED",
    sample: "https://static.deepgram.com/examples/voices/asteria.wav",
  },
};

const voiceOrion: Voice = {
  name: "Orion",
  canonical_name: "aura-orion-en",
  metadata: {
    accent: "American",
    gender: "Male",
    image: "https://static.deepgram.com/examples/avatars/orion.jpg",
    color: "#83C4FB",
    sample: "https://static.deepgram.com/examples/voices/orion.mp3",
  },
};

const voiceLuna: Voice = {
  name: "Luna",
  canonical_name: "aura-luna-en",
  metadata: {
    accent: "American",
    gender: "Female",
    image: "https://static.deepgram.com/examples/avatars/luna.jpg",
    color: "#949498",
    sample: "https://static.deepgram.com/examples/voices/luna.wav",
  },
};

const voiceArcas: Voice = {
  name: "Zeus",
  canonical_name: "aura-2-neptune-en",
  metadata: {
    accent: "American",
    gender: "Male",
    image: "https://static.deepgram.com/examples/avatars/arcas.jpg",
    color: "#DD0070",
    sample: "https://static.deepgram.com/examples/voices/arcas.mp3",
  },
};

type NonEmptyArray<T> = [T, ...T[]];
export const availableVoices: NonEmptyArray<Voice> = [
  voiceAsteria,
  voiceOrion,
  voiceLuna,
  voiceArcas,
];
export const defaultVoice: Voice = voiceArcas;

export const sharedOpenGraphMetadata = {
  title: "Voice Agent | Deepgram",
  type: "website",
  url: "/",
  description: "Meet Deepgram's Voice Agent API",
};

export const latencyMeasurementQueryParam = "latency-measurement";
