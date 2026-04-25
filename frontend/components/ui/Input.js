"use client";

export default function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  readOnly = false,
  disabled = false,
  required = false,
  className = "",
}) {
  return (
    <>
      <div className={["field", className].join(" ")}>
        {label && (
          <label htmlFor={name}>
            {label}
            {required && <span>Required</span>}
          </label>
        )}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={error ? "error" : ""}
          readOnly={readOnly}
          disabled={disabled}
          required={required}
        />

        {error && <small className="errorText">{error}</small>}
      </div>

      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: var(--text-xs);
          font-weight: 900;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        label span {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 800;
          text-transform: none;
          letter-spacing: 0;
        }

        input {
          width: 100%;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: var(--text-sm);
          font-weight: 650;
          color: var(--color-text-primary);
          background: var(--color-surface);
          outline: none;
          transition:
            color var(--transition-base),
            background-color var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            opacity var(--transition-base);
        }

        input::placeholder {
          color: var(--color-text-muted);
          font-weight: 500;
        }

        input:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-brand) 16%, transparent);
        }

        input:read-only {
          background: var(--color-overlay);
          color: var(--color-text-secondary);
        }

        input:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        input.error {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        input.error:focus {
          border-color: var(--color-danger);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-danger) 15%, transparent);
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-xs);
          font-weight: 750;
          line-height: 1.4;
        }
      `}</style>
    </>
  );
}