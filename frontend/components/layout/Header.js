"use client";

import { List, SignOut } from "phosphor-react";

export default function Header({
  branch = "Main Laboratory - Marikina",
  onMenuClick,
  onLogout,
}) {
  return (
    <>
      <header className="header no-print">
        <div className="left">
          <button
            type="button"
            className="menuButton"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <List size={28} weight="regular" />
          </button>

          <div className="locationBlock">
            <span>Location</span>
            <strong>{branch}</strong>
          </div>
        </div>

        <div className="right">
          <div className="syncBadge">
            <span className="dot" />
            <span>BRANCH SYNC: ACTIVE</span>
          </div>

          <button
            type="button"
            className="logoutIcon"
            aria-label="Logout"
            onClick={onLogout}
          >
            <SignOut size={20} weight="regular" />
          </button>
        </div>
      </header>

      <style jsx>{`
        .header {
          height: 76px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-soft);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 20px;
          color: var(--color-text-primary);
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        .left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .menuButton {
          width: 36px;
          height: 36px;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            opacity var(--transition-base);
        }

        .menuButton:hover {
          background: var(--color-overlay);
          border-color: var(--color-border-soft);
          opacity: 1;
        }

        .locationBlock {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .locationBlock span {
          margin-bottom: 2px;
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 400;
          line-height: 1.25;
        }

        .locationBlock strong {
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
          white-space: nowrap;
        }

        .right {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }

        .syncBadge {
          height: 38px;
          border-radius: var(--radius-full);
          border: 1px solid var(--color-success-border);
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--color-success);
          font-size: 12px;
          font-weight: 500;
          background: var(--color-success-bg);
          white-space: nowrap;
        }

        .dot {
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          background: var(--color-success);
          display: inline-block;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 14%, transparent);
        }

        .logoutIcon {
          width: 34px;
          height: 34px;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            opacity var(--transition-base);
        }

        .logoutIcon:hover {
          background: var(--color-overlay);
          border-color: var(--color-border-soft);
          color: var(--color-danger);
          opacity: 1;
        }

        @media (max-width: 768px) {
          .header {
            padding: 0 14px;
          }

          .syncBadge {
            height: 34px;
            padding: 0 10px;
            font-size: 11px;
          }

          .dot {
            width: 11px;
            height: 11px;
          }

          .locationBlock strong {
            font-size: 13px;
          }
        }

        @media (max-width: 520px) {
          .syncBadge span:last-child {
            display: none;
          }

          .syncBadge {
            width: 34px;
            justify-content: center;
            padding: 0;
          }
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}