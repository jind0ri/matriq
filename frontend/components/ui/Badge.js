"use client";

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}) {
  return (
    <>
      <span className={["badge", variant, size, className].join(" ")}>
        {children}
      </span>

      <style jsx>{`
        .badge {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          border: 1px solid transparent;
          font-weight: 850;
          line-height: 1;
          white-space: nowrap;
        }

        .sm {
          padding: 5px 8px;
          font-size: 10px;
        }

        .md {
          padding: 7px 11px;
          font-size: var(--text-xs);
        }

        .lg {
          padding: 8px 12px;
          font-size: var(--text-sm);
        }

        .neutral {
          background: hsl(220, 14%, 94%);
          color: hsl(220, 12%, 35%);
          border-color: hsl(220, 12%, 74%);
        }

        .brand {
          background: var(--color-brand-light);
          color: var(--color-brand-dark);
          border-color: color-mix(in srgb, var(--color-brand) 28%, white);
        }

        .success {
          background: var(--color-success-bg);
          color: var(--color-success);
          border-color: var(--color-success-border);
        }

        .danger {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-color: var(--color-danger-border);
        }

        .warning {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border-color: var(--color-warning-border);
        }

        .info {
          background: var(--color-info-bg);
          color: var(--color-info);
          border-color: var(--color-info-border);
        }

        .outline {
          background: var(--color-surface);
          color: var(--color-text-secondary);
          border-color: var(--color-border);
        }

        .subtle {
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          border-color: var(--color-border-soft);
        }
      `}</style>
    </>
  );
}