"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, Check } from "phosphor-react";

export default function TestCodeSelect({
  label,
  value,
  onChange,
  options = [],
  loading = false,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;

    const term = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.code?.toLowerCase().includes(term) ||
        opt.name?.toLowerCase().includes(term) ||
        opt.standard?.toLowerCase().includes(term)
    );
  }, [searchTerm, options]);

  const selectedOption = options.find((opt) => opt.code === value);

  const handleSelect = (testCode) => {
    onChange(testCode);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="testCodeSelectWrapper">
      <label className="selectLabel">
        {label}
        {required && <em>Required</em>}
      </label>

      <div className="selectContainer">
        <button
          type="button"
          className="selectTrigger"
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
        >
          <div className="triggerContent">
            {loading ? (
              <span className="loadingText">Loading tests...</span>
            ) : selectedOption ? (
              <>
                <span className="triggerCode">{selectedOption.code}</span>
                <span className="triggerName">{selectedOption.name}</span>
              </>
            ) : (
              <span className="triggerPlaceholder">Select a test code...</span>
            )}
          </div>

          <MagnifyingGlass size={16} className="triggerIcon" />
        </button>

        {isOpen && !loading && (
          <>
            <div className="dropdownOverlay" onClick={() => setIsOpen(false)} />

            <div className="dropdownMenu">
              <div className="searchBox">
                <MagnifyingGlass size={16} />
                <input
                  type="text"
                  placeholder="Search by code, name, or standard..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="searchInput"
                />
              </div>

              <div className="optionsList">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      className={`option ${
                        value === option.code ? "selected" : ""
                      }`}
                      onClick={() => handleSelect(option.code)}
                    >
                      <div className="optionContent">
                        <div className="optionHeader">
                          <span className="optionCode">{option.code}</span>
                          {value === option.code && (
                            <Check size={18} weight="bold" />
                          )}
                        </div>
                        <div className="optionMeta">
                          <span className="optionName">{option.name}</span>
                          <span className="optionStandard">
                            {option.standard}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="noResults">
                    <p>No tests found matching "{searchTerm}"</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .testCodeSelectWrapper {
          display: grid;
          gap: 6px;
        }

        .selectLabel {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .selectLabel em {
          margin-left: 6px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-style: normal;
          font-weight: 400;
        }

        .selectContainer {
          position: relative;
        }

        .selectTrigger {
          width: 100%;
          min-height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: 12px;
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .selectTrigger:hover:not(:disabled) {
          border-color: var(--color-border);
          background: var(--color-overlay);
        }

        .selectTrigger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .triggerContent {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }

        .triggerCode {
          font-weight: 700;
          color: var(--color-brand);
          min-width: fit-content;
        }

        .triggerName {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .triggerPlaceholder {
          color: var(--color-text-muted);
        }

        .loadingText {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
        }

        .triggerIcon {
          color: var(--color-text-muted);
          flex-shrink: 0;
        }

        .dropdownOverlay {
          position: fixed;
          inset: 0;
          z-index: 99;
        }

        .dropdownMenu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          border: 1px solid var(--color-border);
          border-radius: 14px;
          background: var(--color-surface);
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
          z-index: 100;
          display: grid;
          max-height: 320px;
          overflow: hidden;
        }

        .searchBox {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--color-border-soft);
          background: var(--color-overlay);
          color: var(--color-text-muted);
          flex-shrink: 0;
        }

        .searchInput {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          outline: none;
          padding: 0;
        }

        .searchInput::placeholder {
          color: var(--color-text-muted);
        }

        .optionsList {
          overflow-y: auto;
          display: grid;
          max-height: 260px;
        }

        .option {
          padding: 10px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
          display: grid;
          grid-template-columns: 1fr;
          border-bottom: 1px solid var(--color-border-soft);
        }

        .option:last-child {
          border-bottom: none;
        }

        .option:hover {
          background: var(--color-overlay);
        }

        .option.selected {
          background: color-mix(
            in srgb,
            var(--color-brand) 8%,
            var(--color-surface)
          );
        }

        .optionContent {
          display: grid;
          gap: 6px;
        }

        .optionHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .optionCode {
          font-weight: 700;
          color: var(--color-brand);
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .optionMeta {
          display: grid;
          gap: 3px;
        }

        .optionName {
          font-weight: 600;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          line-height: 1.3;
        }

        .optionStandard {
          color: var(--color-text-muted);
          font-size: 10px;
          font-style: italic;
        }

        .noResults {
          padding: 20px 12px;
          text-align: center;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
        }
      `}</style>
    </div>
  );
}