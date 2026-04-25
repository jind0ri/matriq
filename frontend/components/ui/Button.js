"use client";

export default function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  className = "",
  title,
}) {
  return (
    <>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={[
          "btn",
          variant,
          size,
          fullWidth ? "fullWidth" : "",
          className,
        ].join(" ")}
      >
        {children}
      </button>

      <style jsx>{`
        .btn {
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-weight: 850;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
          transition:
            color var(--transition-base),
            background-color var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            transform var(--transition-fast),
            opacity var(--transition-base);
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-xs);
        }

        .btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .sm {
          min-height: 34px;
          padding: 0 12px;
          font-size: var(--text-xs);
        }

        .md {
          min-height: 40px;
          padding: 0 15px;
          font-size: var(--text-sm);
        }

        .lg {
          min-height: 46px;
          padding: 0 18px;
          font-size: var(--text-base);
        }

        .primary {
          background: var(--color-brand);
          color: var(--color-text-inverse);
          border-color: var(--color-brand);
        }

        .primary:hover:not(:disabled) {
          background: var(--color-brand-dark);
          border-color: var(--color-brand-dark);
        }

        .secondary {
          background: var(--color-surface);
          color: var(--color-text-primary);
          border-color: var(--color-border);
        }

        .secondary:hover:not(:disabled) {
          border-color: var(--color-border-strong);
          background: var(--color-overlay);
        }

        .ghost {
          background: transparent;
          color: var(--color-text-secondary);
          border-color: transparent;
        }

        .ghost:hover:not(:disabled) {
          background: var(--color-overlay);
          color: var(--color-text-primary);
        }

        .success {
          background: var(--color-success);
          color: var(--color-text-inverse);
          border-color: var(--color-success);
        }

        .success:hover:not(:disabled) {
          filter: brightness(0.92);
        }

        .danger {
          background: var(--color-danger);
          color: var(--color-text-inverse);
          border-color: var(--color-danger);
        }

        .danger:hover:not(:disabled) {
          filter: brightness(0.92);
        }

        .warning {
          background: var(--color-warning);
          color: var(--color-text-inverse);
          border-color: var(--color-warning);
        }

        .warning:hover:not(:disabled) {
          filter: brightness(0.92);
        }

        .fullWidth {
          width: 100%;
        }
      `}</style>
    </>
  );
}