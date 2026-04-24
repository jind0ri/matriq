"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function AdminReportsPage() {
  const [samples, setSamples] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [sampleData, userData, auditData] = await Promise.all([
        apiClient.getSamples(),
        apiClient.getUsers(),
        apiClient.getAuditLogs(),
      ]);

      setSamples(Array.isArray(sampleData) ? sampleData : []);
      setUsers(Array.isArray(userData) ? userData : []);
      setLogs(Array.isArray(auditData) ? auditData : []);
    } catch (err) {
      setError(err.message || "Failed to load admin reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const report = useMemo(() => {
    const countState = (state) =>
      samples.filter((item) => item.current_state === state).length;

    const roleCounts = users.reduce((acc, user) => {
      const role = user.role || "Unknown";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    const actionCounts = logs.reduce((acc, log) => {
      const action = log.action || "UNKNOWN";
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {});

    return {
      totalSamples: samples.length,
      registered: countState("Registered"),
      inTesting: countState("In Testing"),
      forReview: countState("For Review"),
      released: countState("Released"),
      archived: countState("Archived"),
      totalUsers: users.length,
      auditEvents: logs.length,
      roleCounts,
      actionCounts,
    };
  }, [samples, users, logs]);

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>Admin Reports</h1>
          <p>System-wide reports for samples, users, workflow, and audit activity.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="card">Loading reports...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="stats">
            <div className="statCard">
              <span>Total Samples</span>
              <strong>{report.totalSamples}</strong>
            </div>

            <div className="statCard">
              <span>Pending Review</span>
              <strong>{report.forReview}</strong>
            </div>

            <div className="statCard">
              <span>Total Users</span>
              <strong>{report.totalUsers}</strong>
            </div>

            <div className="statCard">
              <span>Audit Events</span>
              <strong>{report.auditEvents}</strong>
            </div>
          </div>

          <div className="grid">
            <div className="card">
              <h2>Workflow Status Summary</h2>

              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Count</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td><span className="badge registered">Registered</span></td>
                    <td>{report.registered}</td>
                  </tr>
                  <tr>
                    <td><span className="badge testing">In Testing</span></td>
                    <td>{report.inTesting}</td>
                  </tr>
                  <tr>
                    <td><span className="badge review">For Review</span></td>
                    <td>{report.forReview}</td>
                  </tr>
                  <tr>
                    <td><span className="badge released">Released</span></td>
                    <td>{report.released}</td>
                  </tr>
                  <tr>
                    <td><span className="badge archived">Archived</span></td>
                    <td>{report.archived}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Users by Role</h2>

              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Count</th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(report.roleCounts).map(([role, count]) => (
                    <tr key={role}>
                      <td>{role}</td>
                      <td>{count}</td>
                    </tr>
                  ))}

                  {Object.keys(report.roleCounts).length === 0 && (
                    <tr>
                      <td colSpan={2} className="empty">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Audit Activity Summary</h2>

            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Events</th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(report.actionCounts).map(([action, count]) => (
                  <tr key={action}>
                    <td>
                      <span className="actionBadge">{action}</span>
                    </td>
                    <td>{count}</td>
                  </tr>
                ))}

                {Object.keys(report.actionCounts).length === 0 && (
                  <tr>
                    <td colSpan={2} className="empty">No audit events found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style jsx>{`
        .page {
          padding: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
        }

        h2 {
          margin: 0 0 16px;
          font-size: 18px;
        }

        p {
          margin: 4px 0 0;
          color: #555;
        }

        button {
          background: #080026;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          cursor: pointer;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }

        .statCard,
        .card {
          background: white;
          border: 1px solid #eee;
          border-radius: 14px;
          padding: 16px;
        }

        .statCard span {
          font-size: 12px;
          color: #555;
        }

        .statCard strong {
          display: block;
          margin-top: 8px;
          font-size: 24px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          font-size: 12px;
          color: #555;
          padding-bottom: 10px;
        }

        td {
          padding: 12px 0;
          border-top: 1px solid #eee;
          font-size: 14px;
        }

        .badge,
        .actionBadge {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .registered {
          background: #eef2ff;
          color: #3730a3;
        }

        .testing {
          background: #fef9c3;
          color: #854d0e;
        }

        .review {
          background: #fff7ed;
          color: #c2410c;
        }

        .released {
          background: #ecfdf5;
          color: #047857;
        }

        .archived {
          background: #f1f5f9;
          color: #334155;
        }

        .actionBadge {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .empty {
          text-align: center;
          color: #666;
        }

        .error {
          color: red;
        }

        @media (max-width: 980px) {
          .stats,
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}