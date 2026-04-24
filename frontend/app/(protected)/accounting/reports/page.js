"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function AccountingReportsPage() {
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [dashboardData, invoiceData] = await Promise.all([
        apiClient.getAccountingDashboard(),
        apiClient.getAccountingInvoices(),
      ]);

      setData(dashboardData);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (err) {
      setError(err.message || "Failed to load accounting reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const paidInvoices = invoices.filter((item) => item.status === "Paid");
  const pendingInvoices = invoices.filter((item) => item.status === "Pending");

  const totalRevenue = paidInvoices.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const outstanding = pendingInvoices.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>Accounting Reports</h1>
          <p>Summarized billing activity, revenue, and outstanding balances.</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="card">Loading reports...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="stats">
            <div className="statCard">
              <span>Total Revenue</span>
              <strong>₱{totalRevenue.toLocaleString()}</strong>
            </div>

            <div className="statCard">
              <span>Outstanding</span>
              <strong>₱{outstanding.toLocaleString()}</strong>
            </div>

            <div className="statCard">
              <span>Pending Invoices</span>
              <strong>{data?.pending_invoices ?? pendingInvoices.length}</strong>
            </div>

            <div className="statCard">
              <span>Paid Samples</span>
              <strong>{data?.paid_samples ?? paidInvoices.length}</strong>
            </div>
          </div>

          <div className="card">
            <h2>Invoice Summary</h2>

            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Total Amount</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    <span className="status paid">Paid</span>
                  </td>
                  <td>{paidInvoices.length}</td>
                  <td>₱{totalRevenue.toLocaleString()}</td>
                </tr>

                <tr>
                  <td>
                    <span className="status pending">Pending</span>
                  </td>
                  <td>{pendingInvoices.length}</td>
                  <td>₱{outstanding.toLocaleString()}</td>
                </tr>
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
          padding: 16px;
          border-radius: 14px;
          border: 1px solid #eee;
        }

        .statCard span {
          font-size: 12px;
          color: #555;
        }

        .statCard strong {
          display: block;
          margin-top: 8px;
          font-size: 22px;
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

        .error {
          color: red;
        }

        @media (max-width: 980px) {
          .stats {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}