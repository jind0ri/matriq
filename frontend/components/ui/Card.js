"use client";

export default function Card({
  title,
  subtitle,
  children,
  className = "",
  interactive = false,
  compact = false,
  actions = null,
}) {
  return (
    <>
      <section
        className={[
          "card",
          interactive ? "interactive" : "",
          compact ? "compact" : "",
          className,
        ].join(" ")}
      >
        {(title || subtitle || actions) && (
          <div className="header">
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>

            {actions && <div className="actions">{actions}</div>}
          </div>
        )}

        <div className="body">{children}</div>
      </section>

      <style jsx>{`
        .card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 20px;
          box-shadow: var(--shadow-sm);
        }

        .card.compact {
          padding: 16px;
          border-radius: var(--radius-lg);
        }

        .card.interactive {
          transition:
            transform var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base);
        }

        .card.interactive:hover {
          transform: translateY(-2px);
          border-color: var(--color-border-strong);
          box-shadow: var(--shadow-md);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
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

        .actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .body {
          min-width: 0;
        }

        @media (max-width: 700px) {
          .header {
            flex-direction: column;
          }

          .actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </>
  );
}