"use client";

import { useEffect, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function AuditPage() {
  const user = getStoredUser();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  if (user?.role !== "Administrator") {
    return (
      <div className="page">
        <div className="card error">
          Only Administrators can access audit logs.
        </div>
        <style jsx>{`
          .page {
            padding: 24px;
            background: #f7f7fb;
            min-height: 100vh;
          }
          .card {
            background: #fff;
            border: 1px solid #e7e7ef;
            border-radius: 18px;
            padding: 18px;
          }
          .error {
            color: #b91c1c;
            border-color: #fecaca;
            background: #fff7f7;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Audit Log Viewer</h1>
            <p>Trace system events, AI actions, validation, release, and archive activity.</p>
          </div>
          <button onClick={loadLogs}>Refresh</button>
        </div>

        {loading && <div className="card">Loading audit logs...</div>}
        {!loading && error && <div className="card error">{error}</div>}

        {!loading && !error && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User ID</th>
                  <th>Action</th>
                  <th>Endpoint</th>
                  <th>Sample</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.audit_id || index}>
                    <td>{log.timestamp || "-"}</td>
                    <td>{log.user_id || "-"}</td>
                    <td>
                      <span className="badge">{log.action || "-"}</span>
                    </td>
                    <td>{log.endpoint_accessed || "-"}</td>
                    <td>{log.sample_id || "-"}</td>
                    <td>
                      <pre>{JSON.stringify(log.new_value || log.old_value || {}, null, 2)}</pre>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          padding: 24px;
          background: #f7f7fb;
          min-height: 100vh;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: 28px;
          color: #000;
        }

        p {
          margin: 0;
          color: #000;
        }

        button {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
          background: #14003a;
          color: #fff;
        }

        .card,
        .tableWrap {
          background: #fff;
          border: 1px solid #e7e7ef;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 14px 10px;
          border-bottom: 2px solid #ececf4;
        }

        td {
          padding: 14px 10px;
          border-bottom: 1px solid #ececf4;
          font-size: 14px;
          vertical-align: top;
        }

        .badge {
          display: inline-block;
          border-radius: 999px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 800;
          background: #eef2ff;
          color: #3730a3;
          white-space: nowrap;
        }

        pre {
          margin: 0;
          max-width: 420px;
          max-height: 140px;
          overflow: auto;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 12px;
          padding: 10px;
          font-size: 11px;
        }

        .empty {
          text-align: center;
          padding: 24px;
        }
      `}</style>
    </>
  );
}