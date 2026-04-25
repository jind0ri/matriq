"use client";

export default function Textarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
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

        textarea {
          width: 100%;
          min-height: 96px;
          padding: 11px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: var(--text-sm);
          font-weight: 650;
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
            color-mix(in srgb, var(--color-brand) 16%, transparent);
        }

        textarea:read-only {
          background: var(--color-overlay);
          color: var(--color-text-secondary);
        }

        textarea:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        textarea.error {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
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