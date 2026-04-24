"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function BillingPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getAccountingBilling();
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load billing queue.");
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
          <h1>Billing Queue</h1>
          <p>Released samples ready for invoice generation.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="card">Loading...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="list">
          {items.length === 0 && (
            <div className="card">No samples ready for billing.</div>
          )}

          {items.map((item) => (
            <div key={item.sample_id} className="card">
              <div className="row">
                <strong>{item.sample_id}</strong>

                <span className="pill ready">Ready</span>
              </div>

              <div className="grid">
                <div>
                  <span>Client</span>
                  <p>{item.client_name || "-"}</p>
                </div>

                <div>
                  <span>Material</span>
                  <p>{item.material_type || "-"}</p>
                </div>

                <div>
                  <span>Branch</span>
                  <p>{item.branch_id || "-"}</p>
                </div>
              </div>

              <div className="actions">
                <button className="primary">Generate Invoice</button>
              </div>
            </div>
          ))}
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

        .list {
          display: grid;
          gap: 14px;
        }

        .card {
          background: white;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #eee;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 10px;
        }

        span {
          font-size: 12px;
          color: #666;
        }

        p {
          margin: 2px 0 0;
          font-weight: 600;
        }

        .pill {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .ready {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .actions {
          margin-top: 10px;
        }

        .primary {
          background: #16a34a;
        }

        .error {
          color: red;
        }
      `}</style>
    </div>
  );
}