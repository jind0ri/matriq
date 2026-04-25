"use client";

export default function Loader({
  label = "Loading...",
  variant = "block",
  className = "",
}) {
  return (
    <>
      <div
        className={["loader", variant, className].join(" ")}
        role="status"
        aria-live="polite"
      >
        <span className="spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>

      <style jsx>{`
        .loader {
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          font-weight: 750;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .block {
          width: 100%;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          padding: 18px;
        }

        .inline {
          padding: 0;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border-radius: var(--radius-full);
          border: 2px solid var(--color-border);
          border-top-color: var(--color-brand);
          animation: spin 800ms linear infinite;
          flex: 0 0 auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spinner {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}