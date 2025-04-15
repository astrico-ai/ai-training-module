import { useState } from "react";
// import { useVoiceBot, VoiceBotStatus } from "../../context/VoiceBotContextProvider";

export const VoiceSelector = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  // const { status } = useVoiceBot();

  const handleBackgroundClick = () => {
    setIsExpanded(false);
  };

  const containerClassName = `
    relative
    flex
    items-center
    justify-center
    ${isExpanded ? "z-50" : ""}
  `;

  return (
    <div className={containerClassName}>
      {isExpanded && (
        <div className="fixed inset-0" onClick={handleBackgroundClick} />
      )}
    </div>
  );
};
