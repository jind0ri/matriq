"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function RegistryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSamples() {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient.getSamples();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load registry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSamples();
  }, []);

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Sample Registry</h1>
            <p className="description">
              All classified and registered samples.
            </p>
          </div>
          <button className="refresh-btn" onClick={loadSamples}>
            Refresh
          </button>
        </div>

        {loading && <div className="card">Loading samples...</div>}
        {!loading && error && <div className="card error">{error}</div>}

        {!loading && !error && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Client</th>
                  <th>Project</th>
                  <th>Material</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Decision</th>
                  <th>Model</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.sample_id}>
                    <td>{item.sample_id}</td>
                    <td>{item.client_name || "-"}</td>
                    <td>{item.project_reference || "-"}</td>
                    <td>
                      {item.material_type || item.ai_predicted_label || "-"}
                    </td>
                    <td>
                      <span
                        className={`status ${
                          item.current_state === "Registered"
                            ? "registered"
                            : item.current_state === "For Review"
                              ? "review"
                              : item.current_state === "In Testing"
                                ? "testing"
                                : item.current_state === "Released"
                                  ? "released"
                                  : item.current_state === "Archived"
                                    ? "archived"
                                    : "unknown"
                        }`}
                      >
                        {item.current_state || "Unknown"}
                      </span>
                    </td>
                    <td>
                      {typeof item.ai_confidence_score === "number"
                        ? `${Math.round(item.ai_confidence_score * 100)}%`
                        : "-"}
                    </td>
                    <td>{item.decision || "-"}</td>
                    <td>{item.model_version || "-"}</td>
                    <td>
                      <Link
                        href={`/technical/tracking/${item.sample_id}`}
                        className="view-link"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty">
                      No samples found.
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
          color: #000000;
          font-weight: 800;
        }
        .description {
          margin: 0;
          color: #000000;
        }
        .refresh-btn {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
          cursor: pointer;
          background: #14003a;
          color: #ffffff;
        }
        .card,
        .tableWrap {
          background: #ffffff;
          border: 1px solid #e7e7ef;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
          color: #000000;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          color: #000000;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 800;
          padding: 14px 10px;
          border-bottom: 2px solid #ececf4;
          text-align: left;
        }
        td {
          text-align: left;
          padding: 14px 10px;
          border-bottom: 1px solid #ececf4;
          font-size: 14px;
          color: #000000;
        }
        .view-link {
          color: #14003a;
          font-weight: 700;
          text-decoration: underline;
        }
        .empty {
          text-align: center;
          color: #000000;
          padding: 24px;
        }
        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .status {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          display: inline-block;
          white-space: nowrap;
        }

        .registered {
          background: #eef2ff;
          color: #3730a3;
        }

        .review {
          background: #fff7ed;
          color: #c2410c;
        }

        .testing {
          background: #fef9c3;
          color: #854d0e;
        }

        .released {
          background: #ecfdf5;
          color: #047857;
        }

        .archived {
          background: #f1f5f9;
          color: #334155;
        }

        .unknown {
          background: #f3f4f6;
          color: #374151;
        }
      `}</style>
    </>
  );
}
