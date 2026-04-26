"use client";

export default function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  helperText,
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

        {error ? (
          <small className="errorText">{error}</small>
        ) : helperText ? (
          <small className="helperText">{helperText}</small>
        ) : null}
      </div>

      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 10px;
          font-weight: 500;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }

        label span {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
        }

        input {
          width: 100%;
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          font-family: inherit;
          font-size: var(--text-sm);
          font-weight: 400;
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
          font-weight: 400;
        }

        input:hover:not(:disabled):not(:read-only) {
          border-color: var(--color-border);
        }

        input:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-brand) 11%, transparent);
        }

        input:read-only {
          background: color-mix(
            in srgb,
            var(--color-overlay) 72%,
            var(--color-surface)
          );
          color: var(--color-text-secondary);
          border-color: var(--color-border-soft);
        }

        input:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          background: var(--color-overlay);
        }

        input.error {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        input.error:focus {
          border-color: var(--color-danger);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-danger) 10%, transparent);
        }

        .errorText,
        .helperText {
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.4;
        }

        .errorText {
          color: var(--color-danger);
        }

        .helperText {
          color: var(--color-text-muted);
        }
      `}</style>
    </>
  );
}