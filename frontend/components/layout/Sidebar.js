"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  PlusCircle,
  Package,
  Cube,
  Users,
  Buildings,
  FileText,
  Receipt,
  ClipboardText,
  SignOut,
  UserCircle,
} from "phosphor-react";

const NAV_CONFIG = {
  technical: [
    { label: "Dashboard", href: "/technical", icon: SquaresFour },
    { label: "Sample Intake", href: "/technical/intake", icon: PlusCircle },
    { label: "Registry", href: "/technical/registry", icon: Cube },
    { label: "Workflow", href: "/technical/workflow", icon: Package },
  ],
  admin: [
    { label: "Dashboard", href: "/admin", icon: SquaresFour },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Branches", href: "/admin/branches", icon: Buildings },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardText },
    { label: "Reports", href: "/admin/reports", icon: FileText },
  ],
  accounting: [
    { label: "Dashboard", href: "/accounting", icon: SquaresFour },
    { label: "Billing", href: "/accounting/billing", icon: Receipt },
    { label: "Invoices", href: "/accounting/invoices", icon: FileText },
    { label: "Reports", href: "/accounting/reports", icon: ClipboardText },
  ],
};

function getSectionByRole(role) {
  if (role === "admin") return "admin";
  if (role === "accounting") return "accounting";
  return "technical";
}

function formatRole(role) {
  switch (role) {
    case "admin":
      return "ADMIN";
    case "qa_engineer":
      return "QA ENGINEER";
    case "technician":
      return "TECHNICIAN";
    case "senior_technician":
      return "SENIOR TECHNICIAN";
    case "accounting":
      return "ACCOUNTING";
    default:
      return "USER";
  }
}

export default function Sidebar({ user, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const role = user?.role || "technician";
  const section = getSectionByRole(role);
  const navItems = NAV_CONFIG[section] || NAV_CONFIG.technical;

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/auth/access-select");
  }

  return (
    <>
      {isOpen && <div className="overlay" onClick={onClose} />}

      <aside className={isOpen ? "sidebar open" : "sidebar"}>
        <div className="top">
          <div className="brand">
            <div className="logoBox">M</div>
            <div className="brandText">Matriq</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "navItem active" : "navItem"}
                onClick={onClose}
              >
                <span className="iconWrap">
                  <Icon size={22} weight="regular" />
                </span>
                <span className="label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="bottom">
          <div className="userCard">
            <div className="avatarWrap">
              <UserCircle size={26} weight="regular" />
            </div>

            <div className="userMeta">
              <strong>{user?.name || "User"}</strong>
              <span>{formatRole(role)}</span>
            </div>
          </div>

          <button type="button" className="logoutBtn" onClick={handleLogout}>
            <SignOut size={18} weight="regular" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.22);
          z-index: 39;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 282px;
          height: 100vh;
          background: #080026;
          color: #ebebeb;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          z-index: 40;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .top {
          padding: 24px 20px 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 34px;
        }

        .logoBox {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          background: rgba(15, 0, 67, 0.7);
          color: #ffbb00;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .brandText {
          color: #ffbb00;
          font-size: 28px;
          font-weight: 700;
          line-height: 1;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0 20px;
          flex: 1;
        }

        .navItem {
          display: flex;
          align-items: center;
          gap: 18px;
          min-height: 50px;
          padding: 0 4px;
          color: #ebebeb;
          text-decoration: none;
          border-radius: 12px;
          transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        }

        .navItem:hover {
          background: rgba(255, 255, 255, 0.05);
          transform: translateX(2px);
        }

        .navItem.active {
          background: rgba(255, 255, 255, 0.06);
        }

        .iconWrap {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffbb00;
          flex-shrink: 0;
        }

        .label {
          font-size: 15px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          color: #ebebeb;
        }

        .bottom {
          padding: 18px 20px 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #0a002f;
        }

        .userCard {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatarWrap {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.24);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ebebeb;
          flex-shrink: 0;
        }

        .userMeta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .userMeta strong {
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
        }

        .userMeta span {
          color: #0072f5;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }

        .logoutBtn {
          border: none;
          background: transparent;
          color: #ebebeb;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 0 0;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .logoutBtn:hover {
          opacity: 0.85;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 272px;
          }
        }
      `}</style>
    </>
  );
}