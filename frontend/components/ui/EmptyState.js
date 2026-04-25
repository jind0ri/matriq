"use client";

export default function EmptyState({
  title = "No records found",
  description = "There is nothing to display yet.",
  action = null,
  className = "",
}) {
  return (
    <>
      <section className={["emptyState", className].join(" ")}>
        <div className="mark" aria-hidden="true" />

        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        {action && <div className="action">{action}</div>}
      </section>

      <style jsx>{`
        .emptyState {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-sm);
          padding: 28px;
          display: grid;
          justify-items: center;
          gap: 14px;
          text-align: center;
        }

        .mark {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-full);
          background:
            linear-gradient(
              135deg,
              var(--color-brand-light) 0%,
              var(--color-surface) 100%
            );
          border: 1px solid var(--color-border);
          position: relative;
        }

        .mark::before,
        .mark::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          height: 2px;
          border-radius: var(--radius-full);
          background: var(--color-brand);
        }

        .mark::before {
          top: 15px;
        }

        .mark::after {
          top: 23px;
          opacity: 0.55;
        }

        h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-lg);
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        p {
          margin: 6px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.55;
          max-width: 520px;
        }

        .action {
          margin-top: 4px;
        }
      `}</style>
    </>
  );
}