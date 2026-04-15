"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ user, children }) {
  return (
    <>
      <div className="shell">
        <Sidebar role={user?.role} />

        <main className="main">
          <Header user={user} />
          <div className="content">{children}</div>
        </main>
      </div>

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

        @media (max-width: 900px) {
          .shell {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}