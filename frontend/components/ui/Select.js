"use client";

export default function Select({
  label,
  name,
  value,
  onChange,
  children,
  error,
  helperText,
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

        <div className="selectWrap">
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={error ? "error" : ""}
          >
            {children}
          </select>
        </div>

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

        .selectWrap {
          position: relative;
        }

        .selectWrap::after {
          content: "";
          position: absolute;
          right: 13px;
          top: 50%;
          width: 7px;
          height: 7px;
          border-right: 2px solid var(--color-text-secondary);
          border-bottom: 2px solid var(--color-text-secondary);
          transform: translateY(-65%) rotate(45deg);
          pointer-events: none;
        }

        select {
          width: 100%;
          min-height: 40px;
          padding: 0 34px 0 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: var(--text-sm);
          font-weight: 650;
          color: var(--color-text-primary);
          background: var(--color-surface);
          outline: none;
          appearance: none;
          cursor: pointer;
          transition:
            color var(--transition-base),
            background-color var(--transition-base),
            border-color var(--transition-base),
            box-shadow var(--transition-base),
            opacity var(--transition-base);
        }

        select:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-brand) 14%, transparent);
        }

        select:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          background: var(--color-overlay);
        }

        select.error {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        select.error:focus {
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