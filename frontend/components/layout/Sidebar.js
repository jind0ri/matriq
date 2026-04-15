"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_CONFIG } from "@/features/auth/nav-config";

export default function Sidebar({ role }) {
  const pathname = usePathname();
  const menuItems = NAV_CONFIG[role] || [];

  return (
    <>
      <aside className="sidebar">
        <div className="brand">
          <h2>Matriq</h2>
          <p>{role ? role.replaceAll("_", " ") : "No role"}</p>
        </div>

        <nav className="nav">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "navItem active" : "navItem"}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <style jsx>{`
        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: #0f172a;
          color: #ffffff;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .brand h2 {
          margin: 0 0 6px;
          font-size: 24px;
        }

        .brand p {
          margin: 0;
          font-size: 14px;
          color: #94a3b8;
          text-transform: capitalize;
        }

        .nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .navItem {
          display: block;
          padding: 12px 14px;
          border-radius: 12px;
          color: #cbd5e1;
          text-decoration: none;
          transition: 0.2s ease;
        }

        .navItem:hover {
          background: #1e293b;
          color: #ffffff;
        }

        .active {
          background: #1f6feb;
          color: #ffffff;
        }

        @media (max-width: 900px) {
          .sidebar {
            width: 100%;
            min-height: auto;
          }
        }
      `}</style>
    </>
  );
}