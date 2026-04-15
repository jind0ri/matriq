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
}) {
  return (
    <>
      <div className="field">
        {label && <label htmlFor={name}>{label}</label>}

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={error ? "error" : ""}
          readOnly={readOnly}
        />

        {error && <span className="errorText">{error}</span>}
      </div>

      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #5b5b5b;
          letter-spacing: 0.2px;
        }

        input {
          width: 100%;
          height: 56px;
          padding: 0 18px;
          border: 1px solid #d8d8d8;
          border-radius: 18px;
          font-size: 14px;
          color: #2d2d2d;
          background: #ffffff;
          outline: none;
          transition: all 0.2s ease;
        }

        input::placeholder {
          color: #b0b0b0;
        }

        input:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
        }

        input:read-only {
          background: #fafafa;
          color: #5b5b5b;
        }

        .error {
          border-color: #dc2626;
        }

        .errorText {
          color: #dc2626;
          font-size: 12px;
          margin-top: -2px;
        }
      `}</style>
    </>
  );
}