"use client";

import { useState } from "react";

export default function Dropdown({ options = [], value, onChange }) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <div className="dropdown">
        {/* Trigger */}
        <button
          type="button"
          className="trigger"
          onClick={() => setOpen(!open)}
        >
          {selected?.label || "Select"}
          <span className="chevron">▾</span>
        </button>

        {/* Menu */}
        {open && (
          <div className="menu">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`item ${
                  value === opt.value ? "active" : ""
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .dropdown {
          position: relative;
          width: 190px;
        }

        .trigger {
          width: 100%;
          height: 42px;
          border-radius: 14px;
          border: 1px solid #d8d8d8;
          background: #ffffff;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .trigger:hover {
          border-color: #a0a0a0;
        }

        .chevron {
          font-size: 12px;
          color: #6b7280;
        }

        .menu {
          position: absolute;
          top: 50px;
          right: 0;
          width: 190px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          padding: 8px;
          z-index: 50;
        }

        .item {
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          cursor: pointer;
        }

        .item:hover {
          background: #f3f4f6;
        }

        .item.active {
          background: #e5e7eb;
        }

        @media (max-width: 768px) {
          .dropdown {
            width: 100%;
          }

          .menu {
            width: 100%;
            right: 0;
          }
        }
      `}</style>
    </>
  );
}