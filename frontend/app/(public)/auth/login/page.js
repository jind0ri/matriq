"use client";

import { useRouter } from "next/navigation";
import { ROLE_TO_DASHBOARD } from "@/features/auth/role-map";

export default function LoginPage() {
  const router = useRouter();

  function handleLogin(role) {
    const mockUser = { role };

    localStorage.setItem("user", JSON.stringify(mockUser));
    router.push(ROLE_TO_DASHBOARD[role]);
  }

  return (
    <>
      <main className="page">
        <div className="card">
          <h1>Login Page</h1>
          <p>Select a role to simulate login.</p>

          <div className="buttons">
            <button onClick={() => handleLogin("admin")}>Login as Admin</button>
            <button onClick={() => handleLogin("qa_engineer")}>Login as QA Engineer</button>
            <button onClick={() => handleLogin("technician")}>Login as Technician</button>
            <button onClick={() => handleLogin("senior_technician")}>
              Login as Senior Technician
            </button>
            <button onClick={() => handleLogin("accounting")}>Login as Accounting</button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f8fafc;
          padding: 24px;
        }

        .card {
          width: 100%;
          max-width: 480px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        h1 {
          margin-bottom: 8px;
          font-size: 28px;
          color: #0f172a;
        }

        p {
          margin-bottom: 20px;
          color: #64748b;
        }

        .buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        button {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          background: #1f6feb;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        button:hover {
          background: #1557b0;
        }
      `}</style>
    </>
  );
}