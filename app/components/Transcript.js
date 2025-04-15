import React from "react";
import { useVoiceBot } from "../context/VoiceBotContextProvider";

function Transcript() {
  const { messages } = useVoiceBot();
  const lastMessage = messages[messages.length - 1];

  return (
    <div className="w-full">
      {lastMessage && (
        <div className="relative">
          <div className="text-center p-4 bg-background-dark rounded-xl border border-gray-700/20 shadow-lg backdrop-blur-sm">
            <p className="text-text-primary text-sm md:text-base leading-relaxed">
              {lastMessage.assistant}
            </p>
          </div>
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45 bg-background-dark border-b border-r border-gray-700/20" />
        </div>
      )}
    </div>
  );
}

export default Transcript;
