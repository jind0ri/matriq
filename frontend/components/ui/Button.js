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
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
          line-height: 1;
          transition:
            color var(--transition-base),
            background-color var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            opacity var(--transition-base);
        }

        .btn:hover:not(:disabled) {
          box-shadow: var(--shadow-xs);
        }

        .btn:active:not(:disabled) {
          box-shadow: none;
        }

        .btn:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--color-brand) 22%, transparent);
          outline-offset: 3px;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          box-shadow: none;
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
          background: var(--color-overlay);
          border-color: var(--color-border-strong);
        }

        .outline {
          background: transparent;
          color: var(--color-text-primary);
          border-color: var(--color-border);
        }

        .outline:hover:not(:disabled) {
          background: var(--color-overlay);
          border-color: var(--color-border-strong);
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
          background: var(--color-success-bg);
          color: var(--color-success);
          border-color: var(--color-success-border);
        }

        .success:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-success-bg) 88%, var(--color-success));
          border-color: var(--color-success);
        }

        .danger {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-color: var(--color-danger-border);
        }

        .danger:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-danger-bg) 88%, var(--color-danger));
          border-color: var(--color-danger);
        }

        .warning {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border-color: var(--color-warning-border);
        }

        .warning:hover:not(:disabled) {
          background: color-mix(in srgb, var(--color-warning-bg) 88%, var(--color-warning));
          border-color: var(--color-warning);
        }

        .fullWidth {
          width: 100%;
        }
      `}</style>
    </>
  );
}