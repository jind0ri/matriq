"use client";

export default function Button({
  children,
  type = "button",
  onClick,
  variant = "primary",
  fullWidth = false,
  disabled = false,
}) {
  return (
    <>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`btn ${variant} ${fullWidth ? "fullWidth" : ""}`}
      >
        {children}
      </button>

      <style jsx>{`
        .btn {
          border: none;
          border-radius: 18px;
          min-height: 56px;
          padding: 0 18px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .primary {
          background: #ffffff;
          border: 1px solid #d8d8d8;
          color: #2d2d2d;
        }

        .primary:hover:not(:disabled) {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
        }

        .secondary {
          background: #e2e8f0;
          color: #0f172a;
        }

        .secondary:hover:not(:disabled) {
          background: #cbd5e1;
        }

        .danger {
          background: #dc2626;
          color: #ffffff;
        }

        .danger:hover:not(:disabled) {
          background: #b91c1c;
        }

        .fullWidth {
          width: 100%;
        }
      `}</style>
    </>
  );
}