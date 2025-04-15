"use client";

import { useState } from "react";
import { App } from "./components/App";
import { DeepgramContextProvider } from "./context/DeepgramContextProvider";
import { MicrophoneContextProvider } from "./context/MicrophoneContextProvider";
import { VoiceBotProvider } from "./context/VoiceBotContextProvider";
import { stsConfig } from "./lib/constants";

export default function Home() {
  return (
    <DeepgramContextProvider>
      <MicrophoneContextProvider>
        <VoiceBotProvider>
          <App
            defaultStsConfig={stsConfig}
            requiresUserActionToInitialize={true}
          />
        </VoiceBotProvider>
      </MicrophoneContextProvider>
    </DeepgramContextProvider>
  );
}
