"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getAccountingInvoices();
      setInvoices(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load invoices.");
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
          <h1>Invoices</h1>
          <p>Review generated invoices and billing status.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="card">Loading invoices...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Sample ID</th>
                <th>Client</th>
                <th>Material</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {invoices.map((item) => (
                <tr key={item.invoice_id}>
                  <td>{item.invoice_id}</td>
                  <td>{item.sample_id}</td>
                  <td>{item.client_name || "-"}</td>
                  <td>{item.material_type || "-"}</td>
                  <td>₱{Number(item.amount || 0).toLocaleString()}</td>
                  <td>
                    <span
                      className={
                        item.status === "Paid"
                          ? "status paid"
                          : "status pending"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}

              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No invoices found.
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
          padding: 14px 0;
          border-top: 1px solid #eee;
          font-size: 14px;
        }

        .status {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .paid {
          background: #ecfdf5;
          color: #047857;
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