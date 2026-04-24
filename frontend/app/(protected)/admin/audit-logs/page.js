"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getAuditLogs();
      setLogs(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>Audit Logs</h1>
          <p>Review system activity, classification, validation, and release events.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
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
                    <span className="actionBadge">{log.action || "-"}</span>
                  </td>
                  <td>{log.endpoint_accessed || "-"}</td>
                  <td>{log.sample_id || "-"}</td>
                  <td>
                    <pre>
                      {JSON.stringify(log.new_value || log.old_value || {}, null, 2)}
                    </pre>
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

        .card,
        .tableWrap {
          background: white;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #eee;
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
          padding: 14px 8px;
          border-top: 1px solid #eee;
          font-size: 13px;
          vertical-align: top;
        }

        .actionBadge {
          display: inline-block;
          background: #eef2ff;
          color: #3730a3;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        pre {
          margin: 0;
          max-width: 360px;
          max-height: 120px;
          overflow: auto;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          font-size: 11px;
        }

        .empty {
          text-align: center;
          color: #666;
        }

        .error {
          color: red;
        }
      `}</style>
    </div>
  );
}