"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/services/apiClient";

export default function Page() {
  const [d, setD] = useState({
    registered: 0,
    manual_review: 0,
    mandatory_override: 0,
    completed_reviews: 0,
    recent_samples: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .getDashboard()
      .then(setD)
      .catch((e) => setError(e.message || "Failed to load dashboard."));
  }, []);

  const stats = [
    ["Registered", d.registered],
    ["Manual Review", d.manual_review],
    ["Mandatory Override", d.mandatory_override],
    ["Completed Reviews", d.completed_reviews],
  ];

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Sample Real-Time Monitor</h1>
            <p>Operational overview across all testing branches.</p>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="statsRow">
          {stats.map(([l, v]) => (
            <div key={l} className="statCard">
              <span>{l}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>

        <div className="chartsRow">
          <div className="chartBox">
            <h3>Routing Overview</h3>
            <div className="chartPlaceholder">
              ≥85 Auto Accept · 70–84 Manual Review · &lt;70 Override
            </div>
          </div>
          <div className="chartBox">
            <h3>AI Workflow Actions</h3>
            <div className="chartPlaceholder actions">
              <Link href="/technical/intake">Sample Intake</Link>
              <Link href="/technical/workflow">Workflow</Link>
              <Link href="/technical/validation">Validation</Link>
            </div>
          </div>
        </div>

        <div className="tableSection">
          <div className="tableHeader">
            <h3>Recent Registered Samples</h3>
            <Link href="/technical/registry">View All</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Material</th>
                <th>Branch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {d.recent_samples.map((s) => (
                <tr key={s.sample_id}>
                  <td>{s.sample_id}</td>
                  <td>{s.material_type}</td>
                  <td>{s.branch_id}</td>
                  <td>{s.current_state}</td>
                </tr>
              ))}
              {!d.recent_samples.length && (
                <tr>
                  <td colSpan="4">No AI-registered samples yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header h1 {
          color: #333;
          font-size: 24px;
        }

        .header p {
          color: #333;
          margin: 6px 0 0;
          font-size: 14px;
        }

        .error {
          color: #dc2626;
          font-size: 13px;
        }
        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }
        .statCard,
        .chartBox,
        .tableSection {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
        }
        .statCard span {
          font-size: 12px;
          color: #374151;
        }
        .statCard strong {
          display: block;
          font-size: 30px;
          margin-top: 10px;
          color: #111827;
        }
        .chartsRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .chartPlaceholder {
          min-height: 180px;
          background: #eef0f3;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          padding: 20px;
          text-align: center;
        }
        .actions {
          flex-direction: column;
          gap: 10px;
        }
        .actions :global(a) {
          text-decoration: none;
          color: #111827;
          font-weight: 600;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          text-align: left;
          padding: 12px 0;
          border-top: 1px solid #f1f5f9;
        }

        /* "Recent Registered Samples" */
        .tableHeader h3 {
          color: #111827;
        }

        /* "View All" Link */
        .tableHeader :global(a) {
          color: #4f46e5; /* A nice indigo blue */
        }

        .tableHeader :global(a:hover) {
          color: #3730a3; /* Darkens on hover */
        }
      `}</style>
    </>
  );
}
