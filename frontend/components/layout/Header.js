"use client";

import { List, SignOut } from "phosphor-react";

export default function Header({ user, onMenuClick }) {
  function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "/auth/login";
  }

  return (
    <>
      <header className="header">
        <button
          className="menuButton"
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
        >
          <List size={28} weight="bold" color="#2d2d2d" />
        </button>

        <div className="location">
          <span>Location</span>
          <strong>Main Laboratory - Marikina</strong>
        </div>

        <div className="right">
          <div className="status">
            <span className="dot" />
            BRANCH SYNC: ACTIVE
          </div>

          <button
            className="logoutIcon"
            type="button"
            aria-label="Logout"
            onClick={handleLogout}
          >
            <SignOut size={24} weight="regular" />
          </button>
        </div>
      </header>

      <style jsx>{`
        .header {
          height: 84px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0 28px;
          border-bottom: 1px solid #ececec;
          background: #f5f5f3;
        }

        .menuButton {
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          flex-shrink: 0;
        }

        .location {
          flex: 1;
          min-width: 0;
        }

        .location span {
          display: block;
          font-size: 12px;
          color: #9a9a9a;
          margin-bottom: 2px;
        }

        .location strong {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #2d2d2d;
        }

        .right {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-shrink: 0;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          border: 1px solid #8bc18e;
          border-radius: 999px;
          color: #0f8a28;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.4px;
          white-space: nowrap;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #0f9d2b;
          display: inline-block;
        }

        .logoutIcon {
          border: none;
          background: transparent;
          color: #8b8b8b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .logoutIcon:hover {
          color: #4b4b4b;
        }

        @media (max-width: 700px) {
          .header {
            padding: 0 16px;
            gap: 12px;
          }

          .status {
            padding: 6px 12px;
            font-size: 11px;
          }

          .location strong {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}