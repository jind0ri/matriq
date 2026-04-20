"use client";

import { useMemo, useState } from "react";
import Dropdown from "@/components/ui/Dropdown";

const BILLING_ITEMS = [
  {
    sampleId: "BRS-2026-001",
    client: "Build-Build-Build Corp",
    material: "Concrete (Beam)",
    branch: "Pateros",
    amount: 12500,
    status: "Ready",
    releasedDate: "02/16/2026",
  },
  {
    sampleId: "BRS-2026-005",
    client: "Metro Manila Concrete Solutions",
    material: "Reinforcing Steel Bars",
    branch: "Marikina",
    amount: 8900,
    status: "Billed",
    releasedDate: "02/15/2026",
  },
  {
    sampleId: "BRS-2026-006",
    client: "Luzon Dev Corp",
    material: "Soil Aggregate (Subbase)",
    branch: "Pateros",
    amount: 14300,
    status: "Ready",
    releasedDate: "02/14/2026",
  },
];

function formatCurrency(value) {
  return `₱${value.toLocaleString()}`;
}

export default function AccountingBillingPage() {
  const [branch, setBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    return BILLING_ITEMS.filter((item) => {
      const matchesBranch = branch === "all" || item.branch.toLowerCase() === branch;
      const matchesStatus =
        statusFilter === "all" || item.status.toLowerCase() === statusFilter;

      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.sampleId.toLowerCase().includes(q) ||
        item.client.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q);

      return matchesBranch && matchesStatus && matchesQuery;
    });
  }, [branch, statusFilter, query]);

  const totalReady = filteredItems
    .filter((item) => item.status === "Ready")
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Billing Queue</h1>
            <p>Track released samples that are ready for billing and invoice preparation.</p>
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
                { label: "All Statuses", value: "all" },
                { label: "Ready", value: "ready" },
                { label: "Billed", value: "billed" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <button type="button" className="primaryButton">
              Generate Billing Summary
            </button>
          </div>
        </div>

        <div className="statsRow">
          <div className="statCard">
            <span>Items in Queue</span>
            <strong>{filteredItems.length}</strong>
          </div>

          <div className="statCard">
            <span>Ready for Billing</span>
            <strong>{filteredItems.filter((item) => item.status === "Ready").length}</strong>
          </div>

          <div className="statCard">
            <span>Already Billed</span>
            <strong>{filteredItems.filter((item) => item.status === "Billed").length}</strong>
          </div>

          <div className="statCard">
            <span>Ready Value</span>
            <strong>{formatCurrency(totalReady)}</strong>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>Billing Records</h3>

            <input
              className="searchInput"
              type="text"
              placeholder="Search by sample ID, client, or material"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <table>
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Client</th>
                <th>Material</th>
                <th>Branch</th>
                <th>Released Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.sampleId}>
                  <td>{item.sampleId}</td>
                  <td>{item.client}</td>
                  <td>{item.material}</td>
                  <td>{item.branch}</td>
                  <td>{item.releasedDate}</td>
                  <td>{formatCurrency(item.amount)}</td>
                  <td>
                    <span
                      className={
                        item.status === "Billed" ? "status billed" : "status ready"
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="tableAction">
                      {item.status === "Ready" ? "Prepare Invoice" : "View"}
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
          gap: 16px;
          margin-bottom: 16px;
        }

        .searchInput {
          width: 320px;
          height: 42px;
          border: 1px solid #d8d8d8;
          border-radius: 14px;
          padding: 0 14px;
          font-size: 13px;
          color: #1f2937;
          background: #ffffff;
          outline: none;
        }

        .searchInput::placeholder {
          color: #9ca3af;
        }

        .searchInput:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
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
          vertical-align: middle;
        }

        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 78px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }

        .status.ready {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .status.billed {
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

          .panelHeader {
            flex-direction: column;
            align-items: stretch;
          }

          .searchInput {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}