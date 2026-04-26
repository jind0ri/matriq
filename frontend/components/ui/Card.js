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
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: none;
          min-width: 0;
        }

        .card.compact {
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .card.plain {
          box-shadow: none;
          border-color: transparent;
          background: transparent;
          padding: 0;
        }

        .card.interactive {
          transition:
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            background-color var(--transition-base);
        }

        .card.interactive:hover {
          border-color: var(--color-border);
          box-shadow: var(--shadow-xs);
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
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.015em;
        }

        p {
          margin: 6px 0 0;
          color: var(--color-text-secondary);
          font-size: 12px;
          font-weight: 400;
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