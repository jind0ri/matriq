"use client";

export default function SummaryTile({
  label,
  value,
  variant = "neutral",
  helper,
  className = "",
}) {
  return (
    <>
      <div className={["summaryTile", variant, className].join(" ")}>
        <div>
          <span>{label}</span>
          {helper && <small>{helper}</small>}
        </div>

        <strong>{value ?? 0}</strong>
      </div>

      <style jsx>{`
        .summaryTile {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          min-width: 0;
          padding: 14px 16px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        span {
          display: block;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.35;
        }

        small {
          display: block;
          margin-top: 4px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xl);
          line-height: 1;
          font-weight: 900;
          text-align: right;
          min-width: 34px;
        }

        .success {
          border-color: var(--color-success-border);
          background: var(--color-success-bg);
        }

        .danger {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        .warning {
          border-color: var(--color-warning-border);
          background: var(--color-warning-bg);
        }

        .info {
          border-color: var(--color-info-border);
          background: var(--color-info-bg);
        }

        .brand {
          border-color: color-mix(in srgb, var(--color-brand) 28%, white);
          background: var(--color-brand-light);
        }

        .neutral {
          background: var(--color-overlay);
        }

        @media (max-width: 520px) {
          .summaryTile {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          strong {
            text-align: left;
          }
        }
      `}</style>
    </>
  );
}