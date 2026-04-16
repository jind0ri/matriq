"use client";

export default function AccountingDashboard() {
  const stats = [
    { label: "Pending Invoices", value: 6 },
    { label: "Paid Today", value: 3 },
    { label: "Released Samples", value: 5 },
    { label: "Outstanding Balance", value: "₱48,200" },
  ];

  const invoices = [
    {
      id: "INV-2026-001",
      client: "Build-Build-Build Corp",
      amount: "₱12,500",
      status: "Pending",
    },
    {
      id: "INV-2026-002",
      client: "Metro Manila Concrete Solutions",
      amount: "₱8,900",
      status: "Paid",
    },
    {
      id: "INV-2026-003",
      client: "Luzon Dev Corp",
      amount: "₱14,300",
      status: "Pending",
    },
  ];

  const releasedSamples = [
    {
      sampleId: "BRS-2026-001",
      material: "Concrete (Beam)",
      branch: "Pateros",
      billingStatus: "Ready",
    },
    {
      sampleId: "BRS-2026-005",
      material: "Reinforcing Steel Bars",
      branch: "Marikina",
      billingStatus: "Billed",
    },
  ];

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Accounting Dashboard</h1>
            <p>Track billing, released samples, and invoice activity.</p>
          </div>

          <div className="actions">
            <button type="button" className="primaryButton">
              Create Invoice
            </button>

            <button type="button" className="secondaryButton">
              View Billing Reports
            </button>
          </div>
        </div>

        <div className="statsRow">
          {stats.map((stat) => (
            <div key={stat.label} className="statCard">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="contentGrid">
          <div className="panel">
            <div className="panelHeader">
              <h3>Recent Invoices</h3>
              <button type="button">View All</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.client}</td>
                    <td>{item.amount}</td>
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
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h3>Released Samples for Billing</h3>
              <button type="button">View All</button>
            </div>

            <div className="sampleList">
              {releasedSamples.map((item) => (
                <div key={item.sampleId} className="sampleCard">
                  <strong>{item.sampleId}</strong>
                  <p>{item.material}</p>
                  <span>{item.branch}</span>

                  <div className="statusRow">
                    <span
                      className={
                        item.billingStatus === "Billed"
                          ? "status paid"
                          : "status ready"
                      }
                    >
                      {item.billingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
        }

        .primaryButton,
        .secondaryButton {
          height: 44px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .primaryButton {
          border: none;
          background: #080026;
          color: #ffffff;
        }

        .primaryButton:hover {
          background: #14004a;
        }

        .secondaryButton {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #1f2937;
        }

        .secondaryButton:hover {
          border-color: #9ca3af;
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

        .contentGrid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 20px;
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

        .status.ready {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .sampleList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sampleCard {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px;
        }

        .sampleCard strong {
          display: block;
          font-size: 13px;
          color: #111827;
        }

        .sampleCard p {
          margin: 6px 0 4px;
          font-size: 12px;
          color: #374151;
        }

        .sampleCard span {
          font-size: 11px;
          color: #6b7280;
        }

        .statusRow {
          margin-top: 10px;
        }

        @media (max-width: 980px) {
          .header {
            flex-direction: column;
          }

          .statsRow {
            grid-template-columns: 1fr 1fr;
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}