"use client";

import { useEffect } from "react";
import Button from "./Button";

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer = null,
  size = "md",
  closeLabel = "Close",
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="overlay" onMouseDown={onClose}>
        <section
          className={["modal", size].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label={title || "Dialog"}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="header">
            <div>
              {title && <h2>{title}</h2>}
              {description && <p>{description}</p>}
            </div>

            {onClose && (
              <button className="closeButton" type="button" onClick={onClose}>
                <span aria-hidden="true">×</span>
                <span className="srOnly">{closeLabel}</span>
              </button>
            )}
          </header>

          <div className="body">{children}</div>

          <footer className="footer">
            {footer || (
              <Button variant="secondary" onClick={onClose}>
                {closeLabel}
              </Button>
            )}
          </footer>
        </section>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(15, 23, 42, 0.36);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal {
          width: min(100%, 560px);
          max-height: min(760px, 90vh);
          overflow: hidden;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          animation: modalIn var(--transition-slow);
        }

        .sm {
          width: min(100%, 420px);
        }

        .md {
          width: min(100%, 560px);
        }

        .lg {
          width: min(100%, 760px);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
        }

        h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-lg);
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        p {
          margin: 5px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .closeButton {
          width: 34px;
          height: 34px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 20px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .closeButton:hover {
          background: var(--color-overlay);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-xs);
          transform: translateY(-1px);
        }

        .body {
          padding: 20px;
          overflow: auto;
        }

        .footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 16px 20px;
          border-top: 1px solid var(--color-border);
          background: var(--color-overlay);
        }

        .srOnly {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modal {
            animation: none;
          }
        }

        @media (max-width: 640px) {
          .overlay {
            align-items: flex-end;
            padding: 12px;
          }

          .modal,
          .sm,
          .md,
          .lg {
            width: 100%;
            max-height: 92vh;
          }

          .footer {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </>
  );
}