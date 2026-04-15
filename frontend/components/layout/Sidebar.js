"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SquaresFour, PlusCircle, Cube, UserCircle } from "phosphor-react";
import { NAV_CONFIG } from "@/features/auth/nav-config";

const ICON_MAP = {
  Dashboard: SquaresFour,
  "Sample Intake": PlusCircle,
  "Sample Tracking": Cube,
  Registry: Cube,
  Workflow: Cube,
  Validation: Cube,
  Reports: Cube,
  Users: Cube,
  Branches: Cube,
  "Audit Logs": Cube,
  Billing: Cube,
  Invoices: Cube,
};

export default function Sidebar({ role }) {
  const pathname = usePathname();
  const menuItems = NAV_CONFIG[role] || [];

  return (
    <>
      <aside className="sidebar">
        <div className="top">
          <div className="brand">
            <div className="logoBox">M</div>
            <h1>Matriq</h1>
          </div>

          <nav className="nav">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = ICON_MAP[item.label] || Cube;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? "navItem active" : "navItem"}
                >
                  <span className="iconWrap">
                    <Icon size={22} weight={isActive ? "fill" : "regular"} />
                  </span>

                  <span className="label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="bottom">
          <div className="userCard">
            <div className="avatar">
              <UserCircle size={28} weight="regular" />
            </div>

            <div className="userInfo">
              <strong>Jon Santos</strong>
              <span>{role ? role.replaceAll("_", " ") : "User"}</span>
            </div>
          </div>
        </div>
      </aside>

      <style jsx>{`
        .sidebar {
          width: 100%;
          height: 100%;
          background: #080026;
          color: #ebebeb;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding-top: 26px;
        }

        .top {
          padding: 0 28px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 68px;
        }

        .logoBox {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: rgba(15, 0, 67, 0.7);
          color: #ffbb00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 700;
          flex-shrink: 0;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1;
          color: #ffbb00;
          font-weight: 700;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .navItem {
          display: flex;
          align-items: center;
          gap: 22px; /* more breathing room like mockup */
          height: 48px;
          padding: 0;
        }

        .navItem:hover {
          opacity: 0.85;
          transform: translateX(2px);
        }

        .iconWrap {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffbb00;
          flex-shrink: 0;
        }

        .label {
          font-size: 16px;
          font-weight: 500;
          color: #ebebeb;
          line-height: 1;
          display: flex;
          align-items: center;
          white-space: nowrap; /* 🔥 THIS FIXES IT */
        }

        .active .label {
          font-weight: 600;
        }

        .bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.18);
          background: #0a002f;
          padding: 18px 28px 20px;
        }

        .userCard {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.28);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          flex-shrink: 0;
        }

        .userInfo strong {
          display: block;
          font-size: 15px;
          font-weight: 700;
          color: #ebebeb;
          margin-bottom: 5px;
          line-height: 1.1;
        }

        .userInfo span {
          display: block;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #0072f5;
          letter-spacing: 0.4px;
          line-height: 1;
        }
      `}</style>
    </>
  );
}
