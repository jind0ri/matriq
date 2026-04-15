"use client";

import { useEffect, useState } from "react";
import { hasPermission } from "@/features/auth/auth.utils";

export default function TechnicalPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) return null;

  return (
    <>
      <div className="page">
        <h1>Technical Dashboard</h1>
        <p>
          Shared dashboard for QA Engineer, Technician, and Senior Technician.
        </p>

        <div className="actions">
          {hasPermission(user.role, "create_sample") && (
            <button>Register Sample</button>
          )}

          {hasPermission(user.role, "view_registry") && (
            <button>Open Registry</button>
          )}

          {hasPermission(user.role, "update_sample_status") && (
            <button>Update Sample Status</button>
          )}

          {hasPermission(user.role, "manual_validate_ai_result") && (
            <button>Manual Validation Queue</button>
          )}

          {hasPermission(user.role, "review_results") && (
            <button>Review Results</button>
          )}

          {hasPermission(user.role, "approve_reports") && (
            <button>Approve Reports</button>
          )}

          {hasPermission(user.role, "view_validation_queue") && (
            <button>View Validation Queue</button>
          )}
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          color: #0f172a;
        }

        p {
          margin: 0;
          color: #64748b;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
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