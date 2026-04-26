"use client";

export default function MetricStrip({
  items = [],
  align = "center",
  className = "",
}) {
  return (
    <>
      <section className={["metricStrip", align, className].join(" ")}>
        {items.map((item) => (
          <div className="metricItem" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value ?? "-"}</strong>
            {item.helper && <small>{item.helper}</small>}
          </div>
        ))}
      </section>

      <style jsx>{`
        .metricStrip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid var(--color-border-soft);
          border-bottom: 1px solid var(--color-border-soft);
        }

        .metricItem {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        .metricStrip.center .metricItem {
          justify-items: center;
          text-align: center;
        }

        .metricStrip.left .metricItem {
          justify-items: start;
          text-align: left;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          line-height: 1.35;
        }

        strong {
          color: var(--color-text-primary);
          font-size: 13px;
          font-weight: 500;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.25;
        }

        small {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 400;
          line-height: 1.35;
        }

        @media (max-width: 640px) {
          .metricStrip {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}