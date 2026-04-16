"use client";

export default function AdminDashboard() {
  const stats = [
    { label: "Total Users", value: 18 },
    { label: "Active Branches", value: 4 },
    { label: "Audit Logs Today", value: 27 },
    { label: "Pending Approvals", value: 3 },
  ];

  const recentUsers = [
    {
      name: "Tech. Jon",
      role: "Technician",
      branch: "Marikina",
      status: "Active",
    },
    {
      name: "QA Engineer",
      role: "QA Engineer",
      branch: "Pateros",
      status: "Active",
    },
    {
      name: "Senior Tech",
      role: "Senior Technician",
      branch: "Marikina",
      status: "Pending",
    },
  ];

  const recentLogs = [
    {
      action: "Created employee account",
      actor: "Admin User",
      target: "Tech. Jon",
      time: "10:14 AM",
    },
    {
      action: "Updated branch assignment",
      actor: "Admin User",
      target: "QA Engineer",
      time: "11:02 AM",
    },
    {
      action: "Reviewed audit event",
      actor: "Admin User",
      target: "Sample BRS-2026-002",
      time: "1:45 PM",
    },
  ];

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Admin Control Center</h1>
            <p>Manage users, branches, permissions, and audit visibility.</p>
          </div>

          <div className="actions">
            <button type="button" className="primaryButton">
              Manage Users
            </button>

            <button type="button" className="secondaryButton">
              View Audit Logs
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
              <h3>Recent User Activity</h3>
              <button type="button">View All</button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentUsers.map((item) => (
                  <tr key={`${item.name}-${item.role}`}>
                    <td>{item.name}</td>
                    <td>{item.role}</td>
                    <td>{item.branch}</td>
                    <td>
                      <span
                        className={
                          item.status === "Active"
                            ? "status active"
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
              <h3>Recent Audit Events</h3>
              <button type="button">View All</button>
            </div>

            <div className="logList">
              {recentLogs.map((log, index) => (
                <div key={index} className="logCard">
                  <strong>{log.action}</strong>
                  <p>
                    {log.actor} • {log.target}
                  </p>
                  <span>{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="quickActions">
          <h3>Quick Admin Actions</h3>

          <div className="actionGrid">
            <button type="button" className="quickActionCard">
              <strong>Create / Manage Users</strong>
              <span>Add employees, assign roles, update access.</span>
            </button>

            <button type="button" className="quickActionCard">
              <strong>Manage Branches</strong>
              <span>Configure branch-level visibility and assignments.</span>
            </button>

            <button type="button" className="quickActionCard">
              <strong>System Reports</strong>
              <span>Review system usage, logs, and branch performance.</span>
            </button>
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
          grid-template-columns: 1.15fr 0.85fr;
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

        .panelHeader button:hover {
          color: #111827;
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

        .status.active {
          background: #ecfdf5;
          color: #047857;
        }

        .status.pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .logList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .logCard {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px;
        }

        .logCard strong {
          display: block;
          font-size: 13px;
          color: #1f2937;
        }

        .logCard p {
          margin: 6px 0 4px;
          font-size: 12px;
          color: #4b5563;
        }

        .logCard span {
          font-size: 11px;
          color: #6b7280;
        }

        .quickActions {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .actionGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .quickActionCard {
          border: 1px solid #e5e7eb;
          background: #ffffff;
          border-radius: 16px;
          padding: 18px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quickActionCard:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
        }

        .quickActionCard strong {
          display: block;
          font-size: 14px;
          color: #111827;
          margin-bottom: 6px;
        }

        .quickActionCard span {
          font-size: 12px;
          color: #4b5563;
          line-height: 1.5;
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

          .actionGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}