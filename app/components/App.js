"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import { useDeepgram } from "../context/DeepgramContextProvider";
import { useMicrophone } from "../context/MicrophoneContextProvider";
import { EventType, useVoiceBot, VoiceBotStatus } from "../context/VoiceBotContextProvider";
import { createAudioBuffer, playAudioBuffer } from "../utils/audioUtils";
import { sendSocketMessage, sendMicToSocket } from "app/utils/deepgramUtils";
import { isMobile } from "react-device-detect";
import { usePrevious } from "@uidotdev/usehooks";
import { useStsQueryParams } from "app/hooks/UseStsQueryParams";
import RateLimited from "./RateLimited";
import VideoFeed from "./VideoFeed";

const AnimationManager = dynamic(() => import("./AnimationManager"), {
  ssr: false,
});

export const App = ({
  defaultStsConfig,
  onMessageEvent = () => {},
  requiresUserActionToInitialize = false,
  className = "",
}) => {
  const {
    status,
    messages,
    addVoicebotMessage,
    addBehindTheScenesEvent,
    isWaitingForUserVoiceAfterSleep,
    toggleSleep,
    startListening,
    startSpeaking,
  } = useVoiceBot();
  const {
    setupMicrophone,
    microphone,
    microphoneState,
    processor,
    microphoneAudioContext,
    startMicrophone,
  } = useMicrophone();
  const { socket, connectToDeepgram, socketState, rateLimited } = useDeepgram();
  const { voice, instructions, applyParamsToConfig } = useStsQueryParams();
  const audioContext = useRef(null);
  const agentVoiceAnalyser = useRef(null);
  const userVoiceAnalyser = useRef(null);
  const startTimeRef = useRef(-1);
  const [data, setData] = useState();
  const [isInitialized, setIsInitialized] = useState(requiresUserActionToInitialize ? false : null);
  const previousVoice = usePrevious(voice);
  const previousInstructions = usePrevious(instructions);
  const scheduledAudioSources = useRef([]);
  const pathname = usePathname();
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  // AUDIO MANAGEMENT
  /**
   * Initialize the audio context for managing and playing audio. (just for TTS playback; user audio input logic found in Microphone Context Provider)
   */
  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: 24000,
      });
      agentVoiceAnalyser.current = audioContext.current.createAnalyser();
      agentVoiceAnalyser.current.fftSize = 2048;
      agentVoiceAnalyser.current.smoothingTimeConstant = 0.96;
    }
  }, []);

  /**
   * Callback to handle audio data processing and playback.
   * Converts raw audio into an AudioBuffer and plays the processed audio through the web audio context
   */
  const bufferAudio = useCallback((data) => {
    const audioBuffer = createAudioBuffer(audioContext.current, data);
    if (!audioBuffer) return;
    scheduledAudioSources.current.push(
      playAudioBuffer(audioContext.current, audioBuffer, startTimeRef, agentVoiceAnalyser.current),
    );
  }, []);

  const clearAudioBuffer = () => {
    scheduledAudioSources.current.forEach((source) => source.stop());
    scheduledAudioSources.current = [];
  };

  // MICROPHONE AND SOCKET MANAGEMENT
  /**
   * Open the microphone at the very start when there isn't one.
   * Logic for microphone found in Microphone Context Provider
   */
  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let wakeLock;
    const requestWakeLock = async () => {
      try {
        // Wake lock will only be successfully granted if this useEffect is triggered as a result of a user action (a click or tap)
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (isInitialized) {
      requestWakeLock();
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [isInitialized]);

  /**
   * Open Deepgram once the microphone opens.
   * Runs whenever the `microphone` changes state, but exits if no microphone state.
   * `microphone` is only set once it is ready to open and record audio.
   */
  useEffect(() => {
    if (microphoneState === 1 && socket && defaultStsConfig) {
      /**
       * When the connection to Deepgram opens, the following will happen;
       *  1. Send the API configuration first.
       *  3. Start the microphone immediately.
       *  4. Update the app state to the INITIAL listening state.
       */

      const onOpen = () => {
        const combinedStsConfig = applyParamsToConfig(defaultStsConfig);

        sendSocketMessage(socket, combinedStsConfig);
        startMicrophone();
        startListening(true);
        if (pathname === "/") {
          // This is the "base" demo at /agent
          toggleSleep();
        }
      };

      socket.addEventListener("open", onOpen);

      /**
       * Cleanup function runs before component unmounts. Use this
       * to deregister/remove event listeners.
       */
      return () => {
        socket.removeEventListener("open", onOpen);
        microphone.ondataavailable = null;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphone, socket, microphoneState, defaultStsConfig, pathname]);

  /**
   * Performs checks to ensure that the system is ready to proceed with setting up the data transmission
   * Attaches an event listener to the microphone which sends audio data through the WebSocket as it becomes available
   */
  useEffect(() => {
    if (!microphone) return;
    if (!socket) return;
    if (microphoneState !== 2) return;
    if (socketState !== 1) return;
    processor.onaudioprocess = sendMicToSocket(socket);
  }, [microphone, socket, microphoneState, socketState, processor]);

  useEffect(() => {
    if (!processor || socket?.readyState !== 1) return;
    if (status === VoiceBotStatus.SLEEPING) {
      processor.onaudioprocess = null;
    } else {
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket]);

  /**
   * Create AnalyserNode for user microphone audio context.
   * Exposes audio time / frequency data which is used in the
   * AnimationManager to scale the animations in response to user/agent voice
   */
  useEffect(() => {
    if (microphoneAudioContext) {
      userVoiceAnalyser.current = microphoneAudioContext.createAnalyser();
      userVoiceAnalyser.current.fftSize = 2048;
      userVoiceAnalyser.current.smoothingTimeConstant = 0.96;
      microphone.connect(userVoiceAnalyser.current);
    }
  }, [microphoneAudioContext, microphone]);

  /**
   * Handles incoming WebSocket messages. Differentiates between ArrayBuffer data and other data types (basically just string type).
   * */
  const onMessage = useCallback(
    async (event) => {
      if (event.data instanceof ArrayBuffer) {
        if (status !== VoiceBotStatus.SLEEPING && !isWaitingForUserVoiceAfterSleep.current) {
          bufferAudio(event.data); // Process the ArrayBuffer data to play the audio
        }
      } else {
        console.log(event?.data);
        // Handle other types of messages such as strings
        setData(event.data);
        onMessageEvent(event.data);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bufferAudio, status],
  );

  /**
   * Opens Deepgram when the microphone opens.
   * Runs whenever `microphone` changes state, but exits if no microphone state.
   */
  useEffect(() => {
    if (
      microphoneState === 1 &&
      socketState === -1 &&
      (!requiresUserActionToInitialize || (requiresUserActionToInitialize && isInitialized))
    ) {
      connectToDeepgram();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    microphone,
    socket,
    microphoneState,
    socketState,
    isInitialized,
    requiresUserActionToInitialize,
  ]);

  /**
   * Sets up a WebSocket message event listener to handle incoming messages through the 'onMessage' callback.
   */
  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  useEffect(() => {
    if (previousVoice && previousVoice !== voice && socket && socketState === 1) {
      sendSocketMessage(socket, {
        type: "UpdateSpeak",
        model: voice,
      });
    }
  }, [voice, socket, socketState, previousVoice]);

  useEffect(() => {
    if (previousInstructions !== instructions && socket && socketState === 1) {
      sendSocketMessage(socket, {
        type: "UpdateInstructions",
        instructions: `${defaultStsConfig.agent.think.instructions}\n${instructions}`,
      });
    }
  }, [defaultStsConfig, previousInstructions, instructions, socket, socketState]);

  /**
   * Manage responses to incoming data from WebSocket.
   * This useEffect primarily handles string-based data that is expected to represent JSON-encoded messages determining actions based on the nature of the message
   * */
  useEffect(() => {
    /**
     * When the API returns a message event, several possible things can occur.
     *
     * 1. If it's a user message, check if it's a wake word or a stop word and add it to the queue.
     * 2. If it's an agent message, add it to the queue.
     * 3. If the message type is `AgentAudioDone` switch the app state to `START_LISTENING`
     */

    if (typeof data === "string") {
      const userRole = (data) => {
        const userTranscript = data.content;

        /**
         * When the user says something, add it to the conversation queue.
         */
        if (status !== VoiceBotStatus.SLEEPING) {
          addVoicebotMessage({ user: userTranscript });
        }
      };

      /**
       * When the assistant/agent says something, add it to the conversation queue.
       */
      const assistantRole = (data) => {
        if (status !== VoiceBotStatus.SLEEPING && !isWaitingForUserVoiceAfterSleep.current) {
          startSpeaking();
          const assistantTranscript = data.content;
          addVoicebotMessage({ assistant: assistantTranscript });
        }
      };

      try {
        const parsedData = JSON.parse(data);

        /**
         * Nothing was parsed so return an error.
         */
        if (!parsedData) {
          throw new Error("No data returned in JSON.");
        }

        maybeRecordBehindTheScenesEvent(parsedData);

        /**
         * If it's a user message.
         */
        if (parsedData.role === "user") {
          startListening();
          userRole(parsedData);
        }

        /**
         * If it's an agent message.
         */
        if (parsedData.role === "assistant") {
          if (status !== VoiceBotStatus.SLEEPING) {
            startSpeaking();
          }
          assistantRole(parsedData);
        }

        /**
         * The agent has finished speaking so we reset the sleep timer.
         */
        if (parsedData.type === EventType.AGENT_AUDIO_DONE) {
          // Note: It's not quite correct that the agent goes to the listening state upon receiving
          // `AgentAudioDone`. When that message is sent, it just means that all of the agent's
          // audio has arrived at the client, but the client will still be in the process of playing
          // it, which means the agent is still speaking. In practice, with the way the server
          // currently sends audio, this means Talon will deem the agent speech finished right when
          // the agent begins speaking the final sentence of its reply.
          startListening();
        }
        if (parsedData.type === EventType.USER_STARTED_SPEAKING) {
          isWaitingForUserVoiceAfterSleep.current = false;
          startListening();
          clearAudioBuffer();
        }
        if (parsedData.type === EventType.AGENT_STARTED_SPEAKING) {
          const { tts_latency, ttt_latency, total_latency } = parsedData;
          if (!tts_latency || !ttt_latency) return;
          const latencyMessage = { tts_latency, ttt_latency, total_latency };
          addVoicebotMessage(latencyMessage);
        }
      } catch (error) {
        console.error(data, error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, socket]);

  const handleVoiceBotAction = () => {
    if (requiresUserActionToInitialize && !isInitialized) {
      setIsInitialized(true);
    }

    if (status !== VoiceBotStatus.NONE) {
      toggleSleep();
    }
  };

  const maybeRecordBehindTheScenesEvent = (serverMsg) => {
    switch (serverMsg.type) {
      case EventType.SETTINGS_APPLIED:
        addBehindTheScenesEvent({
          type: EventType.SETTINGS_APPLIED,
        });
        break;
      case EventType.USER_STARTED_SPEAKING:
        if (status === VoiceBotStatus.SPEAKING) {
          addBehindTheScenesEvent({
            type: "Interruption",
          });
        }
        addBehindTheScenesEvent({
          type: EventType.USER_STARTED_SPEAKING,
        });
        break;
      case EventType.AGENT_STARTED_SPEAKING:
        addBehindTheScenesEvent({
          type: EventType.AGENT_STARTED_SPEAKING,
        });
        break;
      case EventType.CONVERSATION_TEXT: {
        const role = serverMsg.role;
        const content = serverMsg.content;
        addBehindTheScenesEvent({
          type: EventType.CONVERSATION_TEXT,
          role: role,
          content: content,
        });
        break;
      }
      case EventType.END_OF_THOUGHT:
        addBehindTheScenesEvent({
          type: EventType.END_OF_THOUGHT,
        });
        break;
    }
  };

  // Add timer management functions
  const startTimer = useCallback(() => {
    if (!timerRef.current) {
      const startTime = Date.now() - elapsedTime * 1000; // Account for existing elapsed time
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
  }, [elapsedTime]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start/stop timer based on conversation status
  useEffect(() => {
    if (status === VoiceBotStatus.SLEEPING) {
      stopTimer();
    } else if (status === VoiceBotStatus.LISTENING || status === VoiceBotStatus.SPEAKING) {
      startTimer();
    }
    
    return () => stopTimer();
  }, [status, startTimer, stopTimer]);

  // Format time function
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (rateLimited) {
    return <RateLimited />;
  }

  // MAIN UI
  return (
    <div className={`${className} min-h-screen bg-black/90 w-full`}>
      {/* Header */}
      <div className="px-6 pb-0 pt-4">
        
        <h1 className="text-xl font-semibold text-white mt-2">Strategic Sales Negotiation Drill</h1>
        <p className="text-white/60 mt-1">Practice your customer handling skills</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - AI Customer */}
        <div className="bg-[#1e2642] rounded-2xl overflow-hidden max-h-full">
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6c5dd3] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xl text-white font-medium">AI Procurement Manager</p>
              <p className="text-white/60 text-sm">Navigate a high-stakes B2B negotiation with a cost-conscious Procurement Head</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <AnimationManager
              agentVoiceAnalyser={agentVoiceAnalyser.current}
              userVoiceAnalyser={userVoiceAnalyser.current}
              onOrbClick={handleVoiceBotAction}
            />
          </div>

          {/* Minimized Transcript Button */}
          <div className="px-4 pb-4">
            <button
              onClick={() => setIsTranscriptOpen(true)}
              className="w-full bg-[#151b30] hover:bg-[#1a2039] transition-colors rounded-xl p-4 flex items-center justify-between text-white/80"
            >
              <div className="flex items-center gap-2">
                {/* <svg className="w-5 h-5 text-white/60" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0h8v12H6V4z" clipRule="evenodd" />
                </svg> */}
                <span className="font-medium">View conversation transcript</span>
              </div>
              {/* <div className="text-sm text-white/60">{messages.length} messages</div> */}
            </button>
          </div>

          {/* Transcript Modal */}
          {isTranscriptOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#1e2642] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-white font-medium">Conversation transcript</h3>
                  <button 
                    onClick={() => setIsTranscriptOpen(false)}
                    className="text-white/60 hover:text-white/80 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-3">
                    {messages.map((message, index) => {
                      if (message.assistant) {
                        return (
                          <div key={index} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#6c5dd3] flex-shrink-0 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                              </svg>
                            </div>
                            <div className="bg-[#151b30] rounded-lg px-3 py-2 text-white/80 text-sm flex-1">
                              {message.assistant}
                            </div>
                          </div>
                        );
                      }
                      if (message.user) {
                        return (
                          <div key={index} className="flex items-start gap-2 justify-end">
                            <div className="bg-[#6c5dd3] rounded-lg px-3 py-2 text-white text-sm flex-1 max-w-[80%]">
                              {message.user}
                            </div>
                            <div className="w-6 h-6 rounded-full bg-[#2a3349] flex-shrink-0 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!microphone ? (
            <div className="text-base text-white/80 text-center w-full mt-6 mb-8">Loading microphone...</div>
          ) : (
            <Fragment>
              {/* {socketState === -1 && requiresUserActionToInitialize && (
                <div className="text-center mb-8">
                  <button 
                    onClick={handleVoiceBotAction}
                    className="inline-flex items-center px-6 py-3 rounded-lg bg-[#6c5dd3] hover:bg-[#5c4ec3] text-white transition-colors"
                  >
                    Start Training
                  </button>
                </div>
              )} */}
              {socketState === 0 && (
                <div className="text-base text-white/80 text-center w-full mt-6 mb-8">
                  Loading Astrico...
                </div>
              )}
              {socketState > 0 && status === VoiceBotStatus.SLEEPING && (
                <div className="text-center mb-8">
                  <div className="text-white/60 text-sm">
                    I&apos;ve stopped listening. {isMobile ? "Tap" : "Click"} the orb to resume.
                  </div>
                </div>
              )}
            </Fragment>
          )}
        </div>

        {/* Right Column - Video Feed */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <VideoFeed />
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-6 py-4 bg-[#1a1f2d] border-t border-white/10">
        <div className="flex items-center justify-between w-full">
          <div className="text-white/80 font-mono">{formatTime(elapsedTime)}</div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-white/60 text-sm">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
