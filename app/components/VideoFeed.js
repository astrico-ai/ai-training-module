import { useEffect, useRef, useState } from 'react';

export default function VideoFeed() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
  const [isStreamActive, setIsStreamActive] = useState(false);

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
      }
    } catch (err) {
      setError("Camera access denied or not available");
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreamActive(false);
    }
  };

  const toggleCamera = () => {
    if (isStreamActive) {
      stopCamera();
    } else {
      setupCamera();
    }
  };

  useEffect(() => {
    setupCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[600px]">
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-600 text-center px-4">
            <p>{error}</p>
            <button
              onClick={setupCamera}
              className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isStreamActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Practice Info */}
            {/* <div className="absolute bottom-4 left-4 text-sm text-gray-600">
              Practice negotiating interest rates with a customer who's comparing rates with competitors
            </div> */}
          </div>
          
          {/* Camera Controls */}
          <div className="absolute top-4 right-4">
            <button
              onClick={toggleCamera}
              className={`
                p-2 rounded-lg transition-all duration-300
                ${isStreamActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gray-900 hover:bg-gray-800 text-white'}
              `}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-5 h-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {isStreamActive ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
                  />
                )}
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
} 