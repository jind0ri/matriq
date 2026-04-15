"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({
  user,
  children,
  showSidebar = true,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function openSidebar() {
    setIsSidebarOpen(true);
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <>
      <div className="shell">
        {showSidebar && <Sidebar role={user?.role} />}

        <main className="main">
          <Header
            user={user}
            onMenuClick={openSidebar}
          />
          <div className="content">{children}</div>
        </main>
      </div>

      {!showSidebar && isSidebarOpen && (
        <>
          <div className="overlay" onClick={closeSidebar} />

          <div className="drawer">
            <Sidebar role={user?.role} />
          </div>
        </>
      )}

      <style jsx>{`
        .shell {
          min-height: 100vh;
          display: flex;
          background: #f8fafc;
        }

        .main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .content {
          padding: 24px;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.28);
          z-index: 40;
        }

        .drawer {
          position: fixed;
          top: 0;
          left: 0;
          width: 320px;
          max-width: 86vw;
          height: 100vh;
          z-index: 50;
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.25);
        }

        @media (max-width: 900px) {
          .shell {
            flex-direction: column;
          }

          .content {
            padding: 20px;
          }
        }
      `}</style>
    </>
  );
}