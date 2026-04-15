"use client";

export default function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  fullWidth = false,
}) {
  return (
    <>
      <button
        type={type}
        onClick={onClick}
        className={`btn ${variant} ${fullWidth ? "fullWidth" : ""}`}
      >
        {children}
      </button>

      <style jsx>{`
        .btn {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .primary {
          background: #1f6feb;
          color: #ffffff;
        }

        .primary:hover {
          background: #1557b0;
        }

        .secondary {
          background: #e2e8f0;
          color: #0f172a;
        }

        .secondary:hover {
          background: #cbd5e1;
        }

        .danger {
          background: #dc2626;
          color: #ffffff;
        }

        .danger:hover {
          background: #b91c1c;
        }

        .fullWidth {
          width: 100%;
        }
      `}</style>
    </>
  );
}