"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, X, Check, ArrowsClockwise } from "phosphor-react";

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState("environment");

  const startCamera = useCallback(async (facing = facingMode) => {
    setError("");
    setCapturedImage(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setIsStreaming(true);
        };
      }
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera permissions.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not access camera. Please try again.");
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const previewUrl = canvas.toDataURL("image/jpeg", 0.9);
          setCapturedImage({ blob, previewUrl });
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage && onCapture) {
      const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
      const file = new File([capturedImage.blob], `camera-${timestamp}.jpg`, {
        type: "image/jpeg",
      });
      onCapture(file);
    }
  }, [capturedImage, onCapture]);

  const handleClose = useCallback(() => {
    stopCamera();
    if (onClose) onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <>
      <div className="overlay" onClick={handleClose} onKeyDown={(e) => e.key === "Escape" && handleClose()} role="dialog" aria-modal="true" aria-label="Camera capture dialog">
        <div className="modal" onClick={(e) => e.stopPropagation()} role="document">
          <div className="header">
            <h3>Capture Sample Image</h3>
            <button className="closeBtn" onClick={handleClose}>
              <X size={24} />
            </button>
          </div>

          <div className="content">
            {error ? (
              <div className="errorBox">
                <p>{error}</p>
                <button className="retryBtn" onClick={() => startCamera()}>
                  Try Again
                </button>
              </div>
            ) : capturedImage ? (
              <div className="previewContainer">
                <img
                  src={capturedImage.previewUrl}
                  alt="Captured"
                  className="previewImage"
                />
                <div className="captureActions">
                  <button className="actionBtn secondary" onClick={retake}>
                    <ArrowsClockwise size={20} />
                    Retake
                  </button>
                  <button className="actionBtn primary" onClick={confirmCapture}>
                    <Check size={20} />
                    Use Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="cameraContainer">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="videoPreview"
                />
                {!isStreaming && (
                  <div className="loadingOverlay">
                    <Camera size={48} />
                    <p>Starting camera...</p>
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {isStreaming && (
                  <div className="cameraControls">
                    <button className="switchBtn" onClick={switchCamera} title="Switch Camera">
                      <ArrowsClockwise size={24} />
                    </button>
                    <button className="captureBtn" onClick={capturePhoto}>
                      <Camera size={32} />
                    </button>
                    <div style={{ width: 48 }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .closeBtn {
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .closeBtn:hover {
          background: #f3f4f6;
        }

        .content {
          padding: 20px;
          flex: 1;
          overflow: auto;
        }

        .cameraContainer {
          position: relative;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          aspect-ratio: 4/3;
        }

        .videoPreview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .loadingOverlay {
          position: absolute;
          inset: 0;
          background: #1f2937;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          gap: 12px;
        }

        .cameraControls {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }

        .captureBtn {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          border: 4px solid #fff;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.2s;
        }

        .captureBtn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.05);
        }

        .captureBtn:active {
          transform: scale(0.95);
        }

        .switchBtn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all 0.2s;
        }

        .switchBtn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .previewContainer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .previewImage {
          width: 100%;
          border-radius: 16px;
          aspect-ratio: 4/3;
          object-fit: cover;
        }

        .captureActions {
          display: flex;
          gap: 12px;
        }

        .actionBtn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .actionBtn.primary {
          background: #2563eb;
          color: #fff;
        }

        .actionBtn.primary:hover {
          background: #1d4ed8;
        }

        .actionBtn.secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .actionBtn.secondary:hover {
          background: #e5e7eb;
        }

        .errorBox {
          text-align: center;
          padding: 40px 20px;
          color: #dc2626;
        }

        .errorBox p {
          margin-bottom: 16px;
        }

        .retryBtn {
          background: #2563eb;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .retryBtn:hover {
          background: #1d4ed8;
        }
      `}</style>
    </>
  );
}
