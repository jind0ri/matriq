"use client";

export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <>
      <section className={`card ${className}`}>
        {(title || subtitle) && (
          <div className="header">
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}

        <div>{children}</div>
      </section>

      <style jsx>{`
        .card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .header {
          margin-bottom: 16px;
        }

        h2 {
          margin: 0 0 6px;
          font-size: 20px;
          color: #0f172a;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #64748b;
        }
      `}</style>
    </>
  );
}