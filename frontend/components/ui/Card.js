"use client";

export default function Card({
  title,
  subtitle,
  children,
  className = "",
  interactive = false,
  compact = false,
  plain = false,
  actions = null,
}) {
  return (
    <>
      <section
        className={[
          "card",
          interactive ? "interactive" : "",
          compact ? "compact" : "",
          plain ? "plain" : "",
          className,
        ].join(" ")}
      >
        {(title || subtitle || actions) && (
          <div className="header">
            <div className="titleBlock">
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
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-xs);
          min-width: 0;
        }

        .card.compact {
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .card.plain {
          box-shadow: none;
        }

        .card.interactive {
          transition:
            transform var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            background-color var(--transition-base);
        }

        .card.interactive:hover {
          transform: translateY(-1px);
          border-color: var(--color-border-strong);
          box-shadow: var(--shadow-sm);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .titleBlock {
          min-width: 0;
        }

        h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-md);
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
          flex-shrink: 0;
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