"use client";

const BRANCHES = [
  {
    name: "Main Laboratory - Marikina",
    location: "Marikina City",
    staffCount: 12,
    throughput: 48,
    status: "Active",
  },
  {
    name: "Pateros Satellite Laboratory",
    location: "Pateros",
    staffCount: 9,
    throughput: 31,
    status: "Active",
  },
  {
    name: "Cavite Extension Node",
    location: "Cavite",
    staffCount: 5,
    throughput: 12,
    status: "Maintenance",
  },
];

export default function AdminBranchesPage() {
  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Branch Registry</h1>
            <p>Monitor branch activity, staffing, throughput, and operational status.</p>
          </div>

          <div className="actions">
            <button type="button" className="primaryButton">
              Register Branch
            </button>
            <button type="button" className="secondaryButton">
              Sync Overview
            </button>
          </div>
        </div>

        <div className="statsRow">
          <div className="statCard">
            <span>Active Nodes</span>
            <strong>2</strong>
          </div>
          <div className="statCard">
            <span>Total Staff</span>
            <strong>26</strong>
          </div>
          <div className="statCard">
            <span>24h Throughput</span>
            <strong>91</strong>
          </div>
          <div className="statCard">
            <span>Maintenance Count</span>
            <strong>1</strong>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>Branch Directory</h3>
          </div>

          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Location</th>
                <th>Staff Count</th>
                <th>Throughput</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {BRANCHES.map((branch) => (
                <tr key={branch.name}>
                  <td>{branch.name}</td>
                  <td>{branch.location}</td>
                  <td>{branch.staffCount}</td>
                  <td>{branch.throughput}</td>
                  <td>
                    <span
                      className={
                        branch.status === "Active"
                          ? "status active"
                          : "status maintenance"
                      }
                    >
                      {branch.status}
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
          min-width: 92px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .status.active {
          background: #ecfdf5;
          color: #047857;
        }
        .status.maintenance {
          background: #fff7ed;
          color: #c2410c;
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
          .statsRow {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </>
  );
}