"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { apiClient } from "@/services/apiClient";
import { BellRinging } from "phosphor-react";

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

  const [toastNotification, setToastNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const shownNotificationIds = useRef(new Set());

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

  useEffect(() => {
    if (!ready || !user) return;

    let cancelled = false;

    async function loadUnreadNotifications() {
      try {
        const notifications = await apiClient.getUnreadNotifications();
        const list = Array.isArray(notifications) ? notifications : [];

        if (cancelled) return;

        setUnreadCount(list.length);

        const newestUnshown = list.find(
          (item) => !shownNotificationIds.current.has(item.notification_id),
        );

        if (newestUnshown) {
          shownNotificationIds.current.add(newestUnshown.notification_id);
          setToastNotification(newestUnshown);
        }
      } catch (err) {
        // Avoid interrupting page usage if polling fails.
      }
    }

    loadUnreadNotifications();

    const interval = setInterval(() => {
      if (!document.hidden) {
        loadUnreadNotifications();
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ready, user]);

  function handleLogout() {
    clearStoredSession();
    router.push("/auth/access-select");
  }

  async function dismissToast() {
    const current = toastNotification;
    setToastNotification(null);

    if (!current?.notification_id) return;

    try {
      await apiClient.markNotificationRead(current.notification_id);
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      // Keep UI quiet if read update fails.
    }
  }

  async function openToastAction() {
    const current = toastNotification;

    if (!current) return;

    await dismissToast();

    if (current.action_path) {
      router.push(current.action_path);
    }
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

          <NotificationToast
            notification={toastNotification}
            unreadCount={unreadCount}
            onClose={dismissToast}
            onOpen={openToastAction}
          />
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

function NotificationToast({ notification, unreadCount, onClose, onOpen }) {
  if (!notification) return null;

  return (
    <div className="toastWrap">
      <button
        type="button"
        className="toastCard"
        onClick={onOpen}
        aria-label="Open notification"
      >
        <div className="toastIcon">
          <BellRinging size={18} weight="fill" />
        </div>

        <div className="toastBody">
          <div className="toastTop">
            <strong>{notification.title || "Notification"}</strong>

            {unreadCount > 1 && <small>{unreadCount} unread</small>}
          </div>

          <p>{notification.message || "You have a new system notification."}</p>

          {notification.sample_id && <em>Sample {notification.sample_id}</em>}
        </div>

        <span
          role="button"
          tabIndex={0}
          className="toastClose"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
          aria-label="Dismiss notification"
        >
          ×
        </span>
      </button>

      <style jsx>{`
        .toastWrap {
          position: fixed;
          top: 18px;
          right: 18px;
          z-index: 10050;
          width: min(372px, calc(100vw - 32px));
          pointer-events: none;
        }

        .toastCard {
          width: 100%;
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) 24px;
          gap: 12px;
          align-items: flex-start;
          border: 1px solid color-mix(in srgb, var(--color-brand) 24%, var(--color-border));
          border-radius: 18px;
          background: color-mix(in srgb, var(--color-surface) 98%, white);
          color: var(--color-text-primary);
          box-shadow:
            0 18px 50px rgba(15, 23, 42, 0.18),
            0 2px 8px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(18px);
          padding: 13px;
          text-align: left;
          cursor: pointer;
          pointer-events: auto;
          animation: toastIn 0.22s ease-out;
          position: relative;
          overflow: hidden;
        }

        .toastCard::before {
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: var(--color-brand);
          opacity: 0.95;
        }

        .toastCard:hover {
          border-color: color-mix(in srgb, var(--color-brand) 42%, var(--color-border));
          transform: translateY(-1px);
        }

        .toastIcon {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: color-mix(in srgb, var(--color-brand) 12%, var(--color-surface));
          border: 1px solid color-mix(in srgb, var(--color-brand) 22%, transparent);
          color: var(--color-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1px;
        }

        .toastBody {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .toastTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .toastTop strong {
          min-width: 0;
          color: var(--color-text-primary);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .toastTop small {
          flex-shrink: 0;
          color: var(--color-brand);
          font-size: 10px;
          font-weight: 700;
        }

        .toastBody p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 400;
          line-height: 1.42;
        }

        .toastBody em {
          color: var(--color-text-muted);
          font-size: 10px;
          font-style: normal;
          font-weight: 600;
          line-height: 1.3;
        }

        .toastClose {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            color var(--transition-base);
        }

        .toastClose:hover {
          background: var(--color-overlay);
          color: var(--color-text-primary);
        }

        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 640px) {
          .toastWrap {
            top: 12px;
            right: 12px;
            width: calc(100vw - 24px);
          }
        }
      `}</style>
    </div>
  );
}