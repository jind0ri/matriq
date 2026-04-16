"use client";

import { List, SignOut } from "phosphor-react";

export default function Header({
  branch = "Main Laboratory - Marikina",
  onMenuClick,
  onLogout,
}) {
  return (
    <>
      <header className="header">
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
          background: #f7f7f4;
          border-bottom: 1px solid #e8e8e8;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 20px;
        }

        .left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .menuButton {
          border: none;
          background: transparent;
          color: #3f3f3f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
        }

        .menuButton:hover {
          opacity: 0.75;
        }

        .locationBlock {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .locationBlock span {
          font-size: 11px;
          color: #8f8f8f;
          margin-bottom: 2px;
        }

        .locationBlock strong {
          font-size: 14px;
          color: #333333;
          font-weight: 700;
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
          border-radius: 999px;
          border: 1px solid #8ac08d;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #138c2d;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
        }

        .dot {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: #0d9b27;
          display: inline-block;
        }

        .logoutIcon {
          border: none;
          background: transparent;
          color: #8a8a8a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
        }

        .logoutIcon:hover {
          opacity: 0.75;
        }

        @media (max-width: 768px) {
          .header {
            padding: 0 14px;
          }

          .syncBadge {
            padding: 0 10px;
            font-size: 11px;
          }

          .locationBlock strong {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}