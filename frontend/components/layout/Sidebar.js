"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  PlusCircle,
  Package,
  Cube,
  Users,
  FileText,
  Receipt,
  ClipboardText,
  SignOut,
  UserCircle,
  Moon,
  Sun,
  GearSix,
} from "phosphor-react";

const NAV_CONFIG = {
  "Lab Technician": [
    { label: "Dashboard", href: "/technical", icon: SquaresFour },
    { label: "Sample Intake", href: "/technical/intake", icon: PlusCircle },
    { label: "Workflow", href: "/technical/workflow", icon: Package },
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
    { label: "Admin Dashboard", href: "/admin", icon: SquaresFour },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardText },
    { label: "Settings", href: "/admin/settings", icon: GearSix },
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

function getInitialTheme() {
  if (typeof window === "undefined") return "light";

  const savedTheme = localStorage.getItem("matriq-theme");

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;

  return prefersDark ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function clearAuthSession() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
}

export default function Sidebar({ user, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const [hovered, setHovered] = useState(null);
  const [theme, setTheme] = useState("light");

  const role = user?.role || "Lab Technician";
  const navItems = NAV_CONFIG[role] || NAV_CONFIG["Lab Technician"];
  const isDark = theme === "dark";

  useEffect(() => {
    const initialTheme = getInitialTheme();

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function closeSidebar() {
    if (typeof onClose === "function") onClose();
  }

  function handleThemeToggle() {
    const nextTheme = isDark ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("matriq-theme", nextTheme);
    applyTheme(nextTheme);
  }

  function handleLogout() {
    clearAuthSession();
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
          <button
            type="button"
            className="themeToggle"
            onClick={handleThemeToggle}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="themeIcon">
              {isDark ? (
                <Moon size={18} weight="fill" />
              ) : (
                <Sun size={18} weight="fill" />
              )}
            </span>

            <span className="themeText">
              <strong>Appearance</strong>
              <small>{isDark ? "Dark Mode" : "Light Mode"}</small>
            </span>

            <span className={isDark ? "switch active" : "switch"}>
              <i />
            </span>
          </button>

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
          background: var(--color-sidebar);
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
          overflow-y: auto;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 28px;
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
          gap: 10px;
          padding: 8px 12px 24px;
        }

        .navItem {
          display: flex;
          align-items: center;
          gap: 16px;
          min-height: 44px;
          color: #ebebeb;
          text-decoration: none;
          border-radius: 14px;
          padding: 0 12px;
          transition:
            opacity 0.2s ease,
            transform 0.2s ease,
            background 0.2s ease;
        }

        .navItem:hover {
          background: rgba(255, 255, 255, 0.12);
          opacity: 0.9;
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
          background: var(--color-sidebar-muted);
        }

        .themeToggle {
          width: 100%;
          min-height: 52px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          color: #ebebeb;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 42px;
          gap: 10px;
          align-items: center;
          padding: 8px 10px;
          text-align: left;
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            border-color 0.2s ease;
        }

        .themeToggle:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .themeIcon {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          background: rgba(255, 187, 0, 0.14);
          color: #ffbb00;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .themeText {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .themeText strong {
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
        }

        .themeText small {
          color: rgba(235, 235, 235, 0.72);
          font-size: 11px;
          font-weight: 500;
          line-height: 1.2;
        }

        .switch {
          width: 38px;
          height: 22px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.14);
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: flex-start;
        }

        .switch i {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.92);
          transition: transform 0.2s ease;
        }

        .switch.active {
          background: rgba(255, 187, 0, 0.25);
          border-color: rgba(255, 187, 0, 0.34);
        }

        .switch.active i {
          transform: translateX(16px);
          background: #ffbb00;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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