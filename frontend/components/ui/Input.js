"use client";

export default function Input({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
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
        />

        {error && <span className="errorText">{error}</span>}
      </div>

      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        label {
          font-size: 14px;
          font-weight: 600;
          color: #334155;
        }

        input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: 0.2s ease;
          background: #fff;
        }

        input:focus {
          border-color: #1f6feb;
          box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.15);
        }

        .error {
          border-color: #dc2626;
        }

        .errorText {
          color: #dc2626;
          font-size: 12px;
        }
      `}</style>
    </>
  );
}