"use client";

import { useRouter } from "next/navigation";
import { getStoredUser } from "@/services/apiClient";

function getHomeRoute(role) {
  if (role === "Administrator") return "/admin";
  if (role === "Accounting Staff") return "/accounting";

  if (
    role === "Lab Technician" ||
    role === "Senior Technician" ||
    role === "QA Engineer"
  ) {
    return "/technical";
  }

  return "/auth/access-select";
}

export default function UnauthorizedPage() {
  const router = useRouter();

  function goToDashboard() {
    const user = getStoredUser();
    router.replace(getHomeRoute(user?.role));
  }

  return (
    <>
      <div className="page">
        <section className="card">
          <div className="code">403</div>

          <h1>Unauthorized Access</h1>

          <p>
            Your account does not have permission to access this page. Please
            return to your assigned dashboard or contact the administrator if you
            believe this is a mistake.
          </p>

          <div className="actions">
            <button
              type="button"
              className="primaryButton"
              onClick={goToDashboard}
            >
              Go to My Dashboard
            </button>

            <button
              type="button"
              className="secondaryButton"
              onClick={() => router.replace("/auth/access-select")}
            >
              Access Selection
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: var(--color-background, #0f1220);
          color: var(--color-text-primary, #ffffff);
        }

        .card {
          width: 100%;
          max-width: 460px;
          display: grid;
          gap: 14px;
          text-align: center;
          padding: 30px;
          border-radius: 22px;
          background: var(--color-surface, #171b2a);
          border: 1px solid var(--color-border-soft, rgba(255, 255, 255, 0.12));
          box-shadow: var(--shadow-sm, 0 18px 45px rgba(0, 0, 0, 0.18));
        }

        .code {
          width: 68px;
          height: 68px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          justify-self: center;
          border-radius: 20px;
          background: var(--color-danger-bg, rgba(239, 68, 68, 0.12));
          color: var(--color-danger, #ef4444);
          border: 1px solid var(--color-danger-border, rgba(239, 68, 68, 0.35));
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        h1 {
          margin: 4px 0 0;
          color: var(--color-text-primary, #ffffff);
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.03em;
        }

        p {
          margin: 0;
          color: var(--color-text-secondary, #a8b0c3);
          font-size: 13px;
          line-height: 1.6;
        }

        .actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .primaryButton,
        .secondaryButton {
          min-height: 40px;
          border-radius: 12px;
          padding: 0 15px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease;
        }

        .primaryButton {
          border: 1px solid var(--color-brand-border, rgba(139, 92, 246, 0.45));
          background: var(--color-brand, #9b87f5);
          color: #ffffff;
        }

        .secondaryButton {
          border: 1px solid var(--color-border-soft, rgba(255, 255, 255, 0.16));
          background: transparent;
          color: var(--color-text-primary, #ffffff);
        }

        .primaryButton:hover,
        .secondaryButton:hover {
          transform: translateY(-1px);
        }

        .secondaryButton:hover {
          background: var(--color-overlay, rgba(255, 255, 255, 0.08));
        }

        @media (max-width: 520px) {
          .card {
            padding: 24px;
          }

          .actions {
            flex-direction: column;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}