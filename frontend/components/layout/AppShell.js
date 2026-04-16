"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({
  children,
  allowedRoles = [],
  branch = "Main Laboratory - Marikina",
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      router.push("/auth/access-select");
      return;
    }

    const parsed = JSON.parse(stored);

    if (allowedRoles.length && !allowedRoles.includes(parsed.role)) {
      router.push("/unauthorized");
      return;
    }

    setUser(parsed);
    setReady(true);
  }, [allowedRoles, router]);

  function handleLogout() {
    localStorage.removeItem("user");
    router.push("/auth/access-select");
  }

  if (!ready || !user) return null;

  return (
    <>
      <div className="shell">
        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="mainArea">
          <Header
            branch={branch}
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />

          <main className="content">{children}</main>
        </div>
      </div>

      <style jsx>{`
        .shell {
          min-height: 100vh;
          background: #f2f3f5;
        }

        .mainArea {
          min-height: 100vh;
        }

        .content {
          padding: 24px 20px 32px;
        }

        @media (max-width: 768px) {
          .content {
            padding: 18px 14px 28px;
          }
        }
      `}</style>
    </>
  );
}