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

  const startCamera = useCallback(
    async (facing = facingMode) => {
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
    },
    [facingMode],
  );

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
      0.9,
    );
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmCapture = useCallback(() => {
    if (capturedImage && onCapture) {
      const timestamp = new Date()
        .toISOString()
        .replaceAll(":", "-")
        .replaceAll(".", "-");
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
      <div
        className="overlay"
        onClick={handleClose}
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
        role="dialog"
        aria-modal="true"
        aria-label="Camera capture dialog"
      >
        <div
          className="modal"
          onClick={(e) => e.stopPropagation()}
          role="document"
        >
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
                  <button
                    className="actionBtn primary"
                    onClick={confirmCapture}
                  >
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
                    <button
                      className="switchBtn"
                      onClick={switchCamera}
                      title="Switch Camera"
                    >
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
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .modal {
          background: var(--color-surface);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-soft);
          border-radius: 20px;
          width: min(960px, 100%);
          max-height: 94vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border-soft);
          background: var(--color-surface);
        }

        .header h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 700;
        }

        .closeBtn {
          border: 1px solid var(--color-border-soft);
          background: var(--color-surface);
          color: var(--color-text-primary);
          cursor: pointer;
          padding: 6px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .closeBtn:hover {
          background: var(--color-overlay);
        }

        .content {
          padding: 16px;
          flex: 1;
          overflow: auto;
          background: var(--color-surface);
        }

        .cameraContainer {
          position: relative;
          background: #000;
          border-radius: 16px;
          overflow: hidden;
          min-height: 520px;
        }

        .videoPreview {
          width: 100%;
          height: 100%;
          min-height: 520px;
          object-fit: cover;
          display: block;
        }

        .loadingOverlay {
          position: absolute;
          inset: 0;
          background: #111827;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #d1d5db;
          gap: 12px;
        }

        .cameraControls {
          position: absolute;
          bottom: 24px;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 0 20px;
        }

        .captureBtn {
          width: 82px;
          height: 82px;
          border-radius: 50%;
          border: 5px solid #fff;
          background: rgba(255, 255, 255, 0.18);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .switchBtn {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }

        .previewContainer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .previewImage {
          width: 100%;
          max-height: 70vh;
          border-radius: 16px;
          object-fit: contain;
          background: #000;
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
          font-weight: 700;
          cursor: pointer;
          border: none;
        }

        .actionBtn.primary {
          background: var(--color-brand);
          color: var(--color-text-inverse);
        }

        .actionBtn.secondary {
          background: var(--color-overlay);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-soft);
        }

        .errorBox {
          text-align: center;
          padding: 40px 20px;
          color: var(--color-danger);
        }

        .retryBtn {
          background: var(--color-brand);
          color: var(--color-text-inverse);
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .overlay {
            padding: 0;
            align-items: stretch;
          }

          .modal {
            width: 100vw;
            height: 100dvh;
            max-height: none;
            border-radius: 0;
            border: none;
          }

          .header {
            min-height: 62px;
            padding: 14px 16px;
          }

          .header h3 {
            font-size: 17px;
            color: var(--color-text-primary);
          }

          .content {
            padding: 0;
            display: flex;
            flex-direction: column;
          }

          .cameraContainer {
            flex: 1;
            min-height: calc(100dvh - 62px);
            border-radius: 0;
          }

          .videoPreview {
            min-height: calc(100dvh - 62px);
          }

          .cameraControls {
            bottom: calc(env(safe-area-inset-bottom) + 30px);
          }

          .captureBtn {
            width: 88px;
            height: 88px;
          }

          .switchBtn {
            width: 58px;
            height: 58px;
          }

          .previewContainer {
            min-height: calc(100dvh - 62px);
            padding: 12px;
            background: var(--color-surface);
          }

          .previewImage {
            flex: 1;
            max-height: none;
            min-height: 0;
          }

          .captureActions {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </>
  );
}
