"use client";

import { useState } from "react";
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
  "Lab Technician": [
    { label: "Dashboard", href: "/technical", icon: SquaresFour },
    { label: "Sample Intake", href: "/technical/intake", icon: PlusCircle },
    { label: "Registry", href: "/technical/registry", icon: Cube },
  ],
  "Senior Technician": [
    { label: "Dashboard", href: "/technical", icon: SquaresFour },
    { label: "Workflow", href: "/technical/workflow", icon: Package },
    { label: "Registry", href: "/technical/registry", icon: Cube },
  ],
  "QA Engineer": [
    { label: "Dashboard", href: "/technical", icon: SquaresFour },
    { label: "Workflow", href: "/technical/workflow", icon: Package },
    { label: "Registry", href: "/technical/registry", icon: Cube },
    { label: "Reports", href: "/technical/reports", icon: FileText },
  ],
  Administrator: [
    { label: "Dashboard", href: "/admin", icon: SquaresFour },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Branches", href: "/admin/branches", icon: Buildings },
    { label: "Audit Logs", href: "/technical/audit", icon: ClipboardText },
    { label: "Reports", href: "/admin/reports", icon: FileText },
  ],
  "Accounting Staff": [
    { label: "Dashboard", href: "/accounting", icon: SquaresFour },
    { label: "Billing", href: "/accounting/billing", icon: Receipt },
    { label: "Invoices", href: "/accounting/invoices", icon: FileText },
    { label: "Reports", href: "/accounting/reports", icon: ClipboardText },
  ],
};

function formatRole(role) {
  return (role || "User").toUpperCase();
}

export default function Sidebar({ user, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const [hovered, setHovered] = useState(null);

  const role = user?.role || "Lab Technician";
  const navItems = NAV_CONFIG[role] || NAV_CONFIG["Lab Technician"];

  function closeSidebar() {
    if (typeof onClose === "function") onClose();
  }

  function handleLogout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    router.push("/auth/access-select");
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebarOverlay"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      <aside className={isOpen ? "sidebar open" : "sidebar"}>
        <div className="top">
          <div className="brand">
            <div className="logoBox">M</div>
            <div>
              <div className="brandText">Matriq</div>
              <div className="brandSub">Laboratory Terminal</div>
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
                  onClick={closeSidebar}
                  onMouseEnter={() => setHovered(item.href)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="iconWrap">
                    <Icon
                      size={20}
                      weight={
                        isActive || hovered === item.href ? "fill" : "regular"
                      }
                    />
                  </span>
                  <span className="label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

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
        .sidebarOverlay {
          position: fixed;
          inset: 0;
          z-index: 9998;
          border: none;
          padding: 0;
          background: rgba(51, 51, 51, 0.55);
          backdrop-filter: blur(2px);
          cursor: default;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 292px;
          height: 100vh;
          background: #080026;
          color: #ebebeb;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          z-index: 9999;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 24px 0 60px rgba(0, 0, 0, 0.35);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .top {
          padding: 24px 18px 0;
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
          font-weight: 800;
          flex-shrink: 0;
        }

        .brandText {
          color: #ffbb00;
          font-size: 28px;
          font-weight: 800;
          line-height: 1;
        }

        .brandSub {
          margin-top: 4px;
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 26px;
          padding: 12px 28px 0;
        }

        .navItem:hover .navIcon {
          font-weight: 700;
        }

        .navItem {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 0;
          min-height: auto;
          color: #ebebeb;
          text-decoration: none;
          border-radius: 0;
          transition:
            opacity 0.85s ease,
            transform 0.2s ease;
        }

        .navItem:hover {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          opacity: 0.85;
        }

        .navItem.active {
          background: rgba(255, 255, 255, 0.18);
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
          font-size: 15px;
          font-weight: 600;
          line-height: 20px;
          display: flex;
          align-items: center;
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
          min-width: 0;
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
          margin-top: 6px;
          width: 100%;
          height: 42px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          color: #ebebeb;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .logoutBtn:hover {
          background: rgba(110, 17, 0, 0.55);
        }
      `}</style>
    </>
  );
}
