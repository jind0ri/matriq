"use client";

export default function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  readOnly = false,
  disabled = false,
  required = false,
  rows = 4,
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

        <textarea
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={error ? "error" : ""}
          readOnly={readOnly}
          disabled={disabled}
          required={required}
          rows={rows}
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
          font-size: var(--text-xs);
          font-weight: 850;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        label span {
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 750;
          text-transform: none;
          letter-spacing: 0;
        }

        textarea {
          width: 100%;
          min-height: 96px;
          padding: 11px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          background: var(--color-surface);
          outline: none;
          resize: vertical;
          line-height: 1.5;
          transition:
            color var(--transition-base),
            background-color var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            opacity var(--transition-base);
        }

        textarea::placeholder {
          color: var(--color-text-muted);
          font-weight: 500;
        }

        textarea:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-brand) 14%, transparent);
        }

        textarea:read-only {
          background: var(--color-overlay);
          color: var(--color-text-secondary);
        }

        textarea:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          background: var(--color-overlay);
        }

        textarea.error {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        textarea.error:focus {
          border-color: var(--color-danger);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-danger) 12%, transparent);
        }

        .errorText,
        .helperText {
          font-size: var(--text-xs);
          font-weight: 700;
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