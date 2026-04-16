"use client";

export default function TechnicalDashboard() {
  const role = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("user") || "{}")?.role
    : null;

  const dashboardConfig = {
    technician: {
      title: "Sample Real-Time Monitor",
      stats: [
        { label: "Registered", value: 1 },
        { label: "In Testing", value: 2 },
        { label: "Completed", value: 2 },
        { label: "Overdue", value: 0 },
      ],
    },
    senior_technician: {
      title: "Validation Overview",
      stats: [
        { label: "For Review", value: 3 },
        { label: "In Testing", value: 2 },
        { label: "Release Ready", value: 1 },
        { label: "Overdue", value: 0 },
      ],
    },
    qa_engineer: {
      title: "Quality Assurance Monitor",
      stats: [
        { label: "Compliance Passed", value: 4 },
        { label: "For Review", value: 2 },
        { label: "Flagged", value: 1 },
        { label: "Completed", value: 3 },
      ],
    },
  };

  const config = dashboardConfig[role] || dashboardConfig.technician;

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>{config.title}</h1>
            <p>Operational overview across all testing branches.</p>
          </div>

          <select className="branchSelect">
            <option>All Branches</option>
            <option>Marikina</option>
            <option>Pateros</option>
          </select>
        </div>

        <div className="statsRow">
          {config.stats.map((stat) => (
            <div key={stat.label} className="statCard">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="chartsRow">
          <div className="chartBox">
            <h3>Sample Lifecycle Progression</h3>
            <div className="chartPlaceholder">Bar Chart</div>
          </div>

          <div className="chartBox">
            <h3>Distribution by Material Category</h3>
            <div className="chartPlaceholder">Pie Chart</div>
          </div>
        </div>

        <div className="tableSection">
          <div className="tableHeader">
            <h3>Recent Registered Samples</h3>
            <button type="button">View All</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Material</th>
                <th>Branch</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>BRS-2026-001</td>
                <td>Concrete (Beam)</td>
                <td>Pateros</td>
                <td className="released">Released</td>
                <td>→</td>
              </tr>

              <tr>
                <td>BRS-2026-002</td>
                <td>Cement (Ready-mix)</td>
                <td>Marikina</td>
                <td className="review">For Review</td>
                <td>→</td>
              </tr>
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
          align-items: center;
          gap: 20px;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          color: #1f2937;
        }

        p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #4b5563;
        }

        h3 {
          color: #1f2937;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 12px;
        }

        .branchSelect {
          height: 36px;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          padding: 0 10px;
          color: #374151;
          background: #ffffff;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 16px;
          border-radius: 12px;
        }

        .statCard span {
          font-size: 12px;
          color: #374151;
        }

        .statCard strong {
          display: block;
          font-size: 30px;
          margin-top: 10px;
          color: #111827;
          line-height: 1;
        }

        .chartsRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .chartBox {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          padding: 20px;
          border-radius: 16px;
        }

        .chartBox h3 {
          color: #374151;
        }

        .chartPlaceholder {
          height: 220px;
          background: #eef0f3;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 14px;
        }

        .tableSection {
          margin-top: 4px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px 18px 8px;
        }

        .tableHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .tableHeader button {
          border: none;
          background: transparent;
          color: #4b5563;
          cursor: pointer;
          font-size: 13px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          font-size: 11px;
          color: #4b5563;
          font-weight: 600;
          padding-bottom: 10px;
        }

        td {
          padding: 14px 0;
          font-size: 13px;
          color: #1f2937;
          border-top: 1px solid #f1f5f9;
        }

        tr:hover {
          background: #f8fafc;
        }

        .released {
          color: #0f8a28;
          font-weight: 600;
        }

        .review {
          color: #0072f5;
          font-weight: 600;
        }

        @media (max-width: 980px) {
          .header {
            flex-direction: column;
            align-items: flex-start;
          }

          .statsRow {
            grid-template-columns: 1fr 1fr;
          }

          .chartsRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}