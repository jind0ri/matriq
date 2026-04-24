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
      const res = await apiClient.getSamples(); // 🔥 CHANGE: use all samples
      setItems(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePayment(sampleId, status) {
    try {
      await apiClient.updateSamplePayment(sampleId, {
        payment_status: status,
      });

      await loadData();
    } catch (err) {
      alert(err.message || "Payment update failed");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>Payment Management</h1>
          <p>Manage payment status before testing and release.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="card">Loading...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="list">
          {items.length === 0 && (
            <div className="card">No samples found.</div>
          )}

          {items.map((item) => {
            const payment =
              item.device_metadata?.payment || {};

            return (
              <div key={item.sample_id} className="card">
                <div className="row">
                  <strong>{item.sample_id}</strong>

                  <span className="pill">
                    {payment.payment_status || "Unpaid"}
                  </span>
                </div>

                <div className="grid">
                  <div>
                    <span>Client</span>
                    <p>{item.client_name || "-"}</p>
                  </div>

                  <div>
                    <span>Status</span>
                    <p>{item.current_state}</p>
                  </div>

                  <div>
                    <span>Payment Method</span>
                    <p>{payment.payment_requirement || "-"}</p>
                  </div>
                </div>

                <div className="actions">
                  <button
                    onClick={() =>
                      updatePayment(item.sample_id, "Downpayment Paid")
                    }
                  >
                    50% Downpayment
                  </button>

                  <button
                    onClick={() =>
                      updatePayment(item.sample_id, "PO Submitted")
                    }
                  >
                    PO Submitted
                  </button>

                  <button
                    className="full"
                    onClick={() =>
                      updatePayment(item.sample_id, "Fully Paid")
                    }
                  >
                    Fully Paid
                  </button>
                </div>
              </div>
            );
          })}
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
        }

        .pill {
          background: #eef2ff;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }

        button {
          background: #080026;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 8px 12px;
          cursor: pointer;
        }

        .full {
          background: #16a34a;
        }

        .error {
          color: red;
        }
      `}</style>
    </div>
  );
}