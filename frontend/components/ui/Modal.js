"use client";

import { useEffect } from "react";

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

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="overlay"
        onMouseDown={() => {
          if (typeof onClose === "function") onClose();
        }}
      >
        <section
          className={["modal", size].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-label={!title ? "Dialog" : undefined}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="header">
            <div className="titleBlock">
              {title && <h2 id="modal-title">{title}</h2>}
              {description && <p>{description}</p>}
            </div>

            {onClose && (
              <button
                className="closeButton"
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </header>

          <div className="body">{children}</div>

          {footer && <footer className="footer">{footer}</footer>}
        </section>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.34);
          backdrop-filter: blur(3px);
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
          padding: 18px 20px;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
        }

        .titleBlock {
          min-width: 0;
        }

        h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-lg);
          font-weight: 850;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }

        p {
          margin: 5px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .closeButton {
          width: 32px;
          height: 32px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 20px;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            transform var(--transition-base),
            box-shadow var(--transition-base);
        }

        .closeButton:hover {
          background: var(--color-overlay);
          border-color: var(--color-border-strong);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-xs);
          transform: translateY(-1px);
        }

        .closeButton:focus-visible {
          outline: 2px solid var(--color-brand);
          outline-offset: 2px;
        }

        .body {
          padding: 20px;
          overflow: auto;
        }

        .footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid var(--color-border);
          background: var(--color-overlay);
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

          .header {
            padding: 16px;
          }

          .body {
            padding: 16px;
          }

          .footer {
            padding: 14px 16px;
            flex-direction: column-reverse;
            align-items: stretch;
          }
        }
      `}</style>
    </>
  );
}