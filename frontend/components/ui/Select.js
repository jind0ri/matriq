"use client";

import { Children, cloneElement, isValidElement, useEffect, useMemo, useRef, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const options = useMemo(() => {
    return Children.toArray(children)
      .filter((child) => isValidElement(child) && child.type === "option")
      .map((child) => ({
        value: child.props.value ?? child.props.children,
        label: child.props.children,
        disabled: child.props.disabled || false,
      }));
  }, [children]);

  const selectedOption =
    options.find((option) => String(option.value) === String(value)) ||
    options[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (!rootRef.current) return;

      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSelect(option) {
    if (option.disabled) return;

    if (typeof onChange === "function") {
      onChange({
        target: {
          name,
          value: option.value,
        },
      });
    }

    setOpen(false);
  }

  return (
    <>
      <div className={["field", className].join(" ")} ref={rootRef}>
        {label && (
          <label htmlFor={name}>
            {label}
            {required && <span>Required</span>}
          </label>
        )}

        <div className="selectBox">
          <button
            id={name}
            type="button"
            className={[
              "selectTrigger",
              error ? "error" : "",
              open ? "open" : "",
            ].join(" ")}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <span>{selectedOption?.label || "Select option"}</span>
            <i aria-hidden="true" />
          </button>

          {open && !disabled && (
            <div className="menu" role="listbox">
              {options.map((option) => {
                const isSelected = String(option.value) === String(value);

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={[
                      "option",
                      isSelected ? "selected" : "",
                    ].join(" ")}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
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
          position: relative;
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

        .selectBox {
          position: relative;
          min-width: 150px;
        }

        .selectTrigger {
          width: 100%;
          min-height: 36px;
          padding: 0 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-family: inherit;
          font-size: var(--text-xs);
          font-weight: 850;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          cursor: pointer;
          box-shadow: none;
          outline: none;
          transition:
            border-color var(--transition-base),
            background-color var(--transition-base),
            box-shadow var(--transition-base),
            transform var(--transition-fast),
            opacity var(--transition-base);
        }

        .selectTrigger:hover:not(:disabled) {
          background: var(--color-overlay);
          border-color: var(--color-border-strong);
          transform: none;
          box-shadow: var(--shadow-xs);
        }

        .selectTrigger.open {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-brand) 13%, transparent);
        }

        .selectTrigger.error {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        .selectTrigger:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          background: var(--color-overlay);
          transform: none;
          box-shadow: none;
        }

        .selectTrigger span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .selectTrigger i {
          width: 7px;
          height: 7px;
          border-right: 2px solid var(--color-text-secondary);
          border-bottom: 2px solid var(--color-text-secondary);
          transform: translateY(-2px) rotate(45deg);
          flex: 0 0 auto;
        }

        .selectTrigger.open i {
          transform: translateY(2px) rotate(225deg);
        }

        .menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          z-index: 50;
          width: 100%;
          min-width: 170px;
          max-height: 240px;
          overflow: auto;
          padding: 6px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-md);
        }

        .menu::-webkit-scrollbar {
          width: 8px;
        }

        .menu::-webkit-scrollbar-track {
          background: var(--color-overlay);
          border-radius: var(--radius-full);
        }

        .menu::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: var(--radius-full);
          border: 2px solid var(--color-overlay);
        }

        .option {
          width: 100%;
          min-height: 34px;
          padding: 0 10px;
          border: none;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--color-text-primary);
          font-family: inherit;
          font-size: var(--text-xs);
          font-weight: 750;
          text-align: left;
          display: flex;
          align-items: center;
          cursor: pointer;
          box-shadow: none;
        }

        .option:hover:not(:disabled) {
          background: var(--color-overlay);
          transform: none;
          box-shadow: none;
        }

        .option.selected {
          background: var(--color-brand-light);
          color: var(--color-brand-dark);
          font-weight: 900;
        }

        .option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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