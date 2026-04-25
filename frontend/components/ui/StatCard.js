"use client";

export default function StatCard({
  label,
  value,
  note,
  trend,
  variant = "neutral",
  className = "",
}) {
  return (
    <>
      <article className={["statCard", variant, className].join(" ")}>
        <div className="topLine">
          <span>{label}</span>
          {trend && <small>{trend}</small>}
        </div>

        <strong>{value ?? 0}</strong>

        {note && <p>{note}</p>}
      </article>

      <style jsx>{`
        .statCard {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 18px;
          box-shadow: var(--shadow-sm);
          display: grid;
          gap: 8px;
          min-width: 0;
          transition:
            transform var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base);
        }

        .statCard:hover {
          transform: translateY(-2px);
          border-color: var(--color-border-strong);
          box-shadow: var(--shadow-md);
        }

        .topLine {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        span {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        small {
          border-radius: var(--radius-full);
          padding: 4px 7px;
          background: var(--color-overlay);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 900;
          white-space: nowrap;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-2xl);
          font-weight: 900;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.45;
        }

        .brand {
          border-color: color-mix(in srgb, var(--color-brand) 35%, white);
          background: linear-gradient(
            135deg,
            var(--color-surface) 0%,
            var(--color-brand-light) 100%
          );
        }

        .success {
          border-color: var(--color-success-border);
        }

        .success small {
          background: var(--color-success-bg);
          border-color: var(--color-success-border);
          color: var(--color-success);
        }

        .danger {
          border-color: var(--color-danger-border);
        }

        .danger small {
          background: var(--color-danger-bg);
          border-color: var(--color-danger-border);
          color: var(--color-danger);
        }

        .warning {
          border-color: var(--color-warning-border);
        }

        .warning small {
          background: var(--color-warning-bg);
          border-color: var(--color-warning-border);
          color: var(--color-warning);
        }

        .info {
          border-color: var(--color-info-border);
        }

        .info small {
          background: var(--color-info-bg);
          border-color: var(--color-info-border);
          color: var(--color-info);
        }
      `}</style>
    </>
  );
}