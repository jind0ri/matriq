"use client";

import { useMemo, useState } from "react";
import Dropdown from "@/components/ui/Dropdown";

const INVOICES = [
  {
    id: "INV-2026-001",
    client: "Build-Build-Build Corp",
    branch: "Pateros",
    total: 12500,
    issuedDate: "02/16/2026",
    dueDate: "02/23/2026",
    status: "Pending",
  },
  {
    id: "INV-2026-002",
    client: "Metro Manila Concrete Solutions",
    branch: "Marikina",
    total: 8900,
    issuedDate: "02/15/2026",
    dueDate: "02/22/2026",
    status: "Paid",
  },
  {
    id: "INV-2026-003",
    client: "Luzon Dev Corp",
    branch: "Pateros",
    total: 14300,
    issuedDate: "02/14/2026",
    dueDate: "02/21/2026",
    status: "Pending",
  },
];

function formatCurrency(value) {
  return `₱${value.toLocaleString()}`;
}

export default function AccountingInvoicesPage() {
  const [branch, setBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInvoices = useMemo(() => {
    return INVOICES.filter((item) => {
      const matchesBranch = branch === "all" || item.branch.toLowerCase() === branch;
      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter;
      return matchesBranch && matchesStatus;
    });
  }, [branch, statusFilter]);

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Invoices</h1>
            <p>Manage issued invoices, payment status, and client billing records.</p>
          </div>

          <div className="actions">
            <Dropdown
              options={[
                { label: "All Branches", value: "all" },
                { label: "Marikina", value: "marikina" },
                { label: "Pateros", value: "pateros" },
              ]}
              value={branch}
              onChange={setBranch}
            />

            <Dropdown
              options={[
                { label: "All Invoices", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Paid", value: "paid" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <button type="button" className="primaryButton">
              New Invoice
            </button>
          </div>
        </div>

        <div className="statsRow">
          <div className="statCard">
            <span>Total Invoices</span>
            <strong>{filteredInvoices.length}</strong>
          </div>

          <div className="statCard">
            <span>Pending</span>
            <strong>{filteredInvoices.filter((item) => item.status === "Pending").length}</strong>
          </div>

          <div className="statCard">
            <span>Paid</span>
            <strong>{filteredInvoices.filter((item) => item.status === "Paid").length}</strong>
          </div>

          <div className="statCard">
            <span>Total Value</span>
            <strong>
              {formatCurrency(
                filteredInvoices.reduce((sum, item) => sum + item.total, 0)
              )}
            </strong>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>Invoice Register</h3>
            <button type="button">Export Invoice List</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Client</th>
                <th>Branch</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.client}</td>
                  <td>{item.branch}</td>
                  <td>{item.issuedDate}</td>
                  <td>{item.dueDate}</td>
                  <td>{formatCurrency(item.total)}</td>
                  <td>
                    <span
                      className={
                        item.status === "Paid" ? "status paid" : "status pending"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="tableAction">
                      View
                    </button>
                  </td>
                </tr>
              ))}
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
          align-items: flex-start;
          gap: 24px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          color: #1f2937;
        }

        p {
          margin: 6px 0 0;
          font-size: 14px;
          color: #4b5563;
        }

        h3 {
          margin: 0;
          color: #1f2937;
          font-size: 15px;
          font-weight: 700;
        }

        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .primaryButton {
          height: 44px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: #080026;
          color: #ffffff;
          transition: all 0.2s ease;
        }

        .primaryButton:hover {
          background: #14004a;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .statCard {
          background: #ffffff;
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
          margin-top: 8px;
          font-size: 24px;
          color: #111827;
        }

        .panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 20px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .panelHeader button {
          border: none;
          background: transparent;
          color: #4b5563;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: #4b5563;
          padding-bottom: 10px;
        }

        td {
          padding: 14px 0;
          font-size: 13px;
          color: #1f2937;
          border-top: 1px solid #f1f5f9;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 72px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .status.pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .status.paid {
          background: #ecfdf5;
          color: #047857;
        }

        .tableAction {
          border: none;
          background: transparent;
          color: #1f2937;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .tableAction:hover {
          color: #0072f5;
        }

        @media (max-width: 1100px) {
          .header {
            flex-direction: column;
          }

          .actions {
            width: 100%;
          }

          .statsRow {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}