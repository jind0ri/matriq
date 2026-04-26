"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

const BRANCH_NAMES = {
  1: "Matest Marikina",
  2: "Matest Pateros",
};

function getBranchName(branchId) {
  const normalizedBranchId = Number(branchId);
  return BRANCH_NAMES[normalizedBranchId] || "Unknown Branch";
}

function clearStoredSession() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
}

function isInactiveUser(user) {
  if (!user) return true;

  if (typeof user.is_active === "boolean") {
    return user.is_active === false;
  }

  if (typeof user.active === "boolean") {
    return user.active === false;
  }

  const status = String(user.status || user.account_status || "")
    .trim()
    .toLowerCase();

  if (!status) return false;

  return ["inactive", "disabled", "deactivated", "suspended"].includes(status);
}

export default function AppShell({ children, allowedRoles = [], branch }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) {
      clearStoredSession();
      router.push("/auth/access-select");
      return;
    }

    let parsed;

    try {
      parsed = JSON.parse(stored);
    } catch {
      clearStoredSession();
      router.push("/auth/access-select");
      return;
    }

    if (isInactiveUser(parsed)) {
      clearStoredSession();
      router.push("/auth/access-select?reason=deactivated");
      return;
    }

    if (allowedRoles.length && !allowedRoles.includes(parsed.role)) {
      router.push("/unauthorized");
      return;
    }

    setUser(parsed);
    setReady(true);
  }, [allowedRoles, router]);

  function handleLogout() {
    clearStoredSession();
    router.push("/auth/access-select");
  }

  if (!ready || !user) return null;

  const branchName = branch || getBranchName(user?.branch_id);

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
            branch={branchName}
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />

          <main className="content">{children}</main>
        </div>
      </div>

      <style jsx>{`
        .shell {
          min-height: 100vh;
          background: var(--color-background);
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