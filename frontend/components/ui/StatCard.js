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
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          padding: 17px;
          box-shadow: none;
          display: grid;
          gap: 9px;
          min-width: 0;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base);
        }

        .statCard:hover {
          background: color-mix(
            in srgb,
            var(--color-overlay) 30%,
            var(--color-surface)
          );
          border-color: var(--color-border);
          transform: none;
          box-shadow: none;
        }

        .topLine {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.35;
        }

        small {
          border-radius: var(--radius-full);
          padding: 4px 7px;
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 400;
          white-space: nowrap;
        }

        strong {
          color: var(--color-text-primary);
          font-size: 22px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.45;
        }

        .brand {
          border-color: color-mix(in srgb, var(--color-brand) 24%, white);
        }

        .brand small {
          background: var(--color-brand-light);
          border-color: color-mix(in srgb, var(--color-brand) 24%, white);
          color: var(--color-brand-dark);
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

        .neutral {
          border-color: var(--color-border-soft);
        }
      `}</style>
    </>
  );
}