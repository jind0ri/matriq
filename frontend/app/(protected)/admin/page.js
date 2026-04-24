"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";

const STATUS_COLORS = {
  Registered: "#3730a3",
  "In Testing": "#854d0e",
  "For Review": "#c2410c",
  Released: "#047857",
  Archived: "#C7C7C7",
};

export default function AdminDashboard() {
  const [samples, setSamples] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    const [sampleRes, userRes, logRes] = await Promise.allSettled([
      apiClient.getSamples(),
      apiClient.getUsers?.(),
      apiClient.getAuditLogs(),
    ]);

    setSamples(sampleRes.status === "fulfilled" && Array.isArray(sampleRes.value) ? sampleRes.value : []);
    setUsers(userRes.status === "fulfilled" && Array.isArray(userRes.value) ? userRes.value : []);
    setLogs(logRes.status === "fulfilled" && Array.isArray(logRes.value) ? logRes.value : []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const countByState = (state) =>
      samples.filter((s) => s.current_state === state).length;

    return {
      users: users.length,
      branches: new Set(users.map((u) => u.branch_id).filter(Boolean)).size || 1,
      auditLogs: logs.length,
      pendingApprovals: countByState("For Review"),
      registered: countByState("Registered"),
      testing: countByState("In Testing"),
      completed:
        countByState("Released") + countByState("Archived"),
      overdue: 0,
    };
  }, [samples, users, logs]);

  const lifecycle = [
    { label: "Registered", value: stats.registered },
    { label: "In Testing", value: stats.testing },
    { label: "For Review", value: stats.pendingApprovals },
    { label: "Released", value: samples.filter((s) => s.current_state === "Released").length },
    { label: "Archived", value: samples.filter((s) => s.current_state === "Archived").length },
  ];

  const maxValue = Math.max(...lifecycle.map((x) => x.value), 1);

  const donutGradient = lifecycle
    .map((item, index) => {
      const total = lifecycle.reduce((sum, x) => sum + x.value, 0) || 1;
      const start =
        lifecycle.slice(0, index).reduce((sum, x) => sum + x.value, 0) / total * 100;
      const end = start + (item.value / total) * 100;
      return `${STATUS_COLORS[item.label]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>Sample Real-Time Monitor</h1>
            <p>Operational overview across all testing branches.</p>
          </div>

          <select>
            <option>All Branches</option>
          </select>
        </div>

        {loading ? (
          <div className="card">Loading admin dashboard...</div>
        ) : (
          <>
            <div className="statsRow">
              <div className="statItem">
                <span>Registered</span>
                <strong>{stats.registered}</strong>
              </div>
              <div className="statItem">
                <span>In Testing</span>
                <strong>{stats.testing}</strong>
              </div>
              <div className="statItem">
                <span>Completed</span>
                <strong>{stats.completed}</strong>
              </div>
              <div className="statItem">
                <span>Overdue</span>
                <strong>{stats.overdue}</strong>
              </div>
            </div>

            <div className="chartsGrid">
              <section className="chartPanel">
                <h2>Sample Lifecycle Progression</h2>

                <div className="barChart">
                  {lifecycle.map((item) => (
                    <div className="barGroup" key={item.label}>
                      <div className="barTrack">
                        <div
                          className="barFill"
                          style={{
                            height: `${Math.max((item.value / maxValue) * 100, item.value ? 10 : 0)}%`,
                            background: STATUS_COLORS[item.label],
                          }}
                        />
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="chartPanel">
                <h2>Distribution by Material Category</h2>

                <div className="donutWrap">
                  <div
                    className="donut"
                    style={{
                      background: `conic-gradient(${donutGradient})`,
                    }}
                  >
                    <div className="donutHole" />
                  </div>

                  <div className="legend">
                    {lifecycle.map((item) => (
                      <div className="legendItem" key={item.label}>
                        <span
                          style={{ background: STATUS_COLORS[item.label] }}
                        />
                        {item.label}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="adminStats">
              <div className="card">
                <span>Total Users</span>
                <strong>{stats.users}</strong>
              </div>
              <div className="card">
                <span>Active Branches</span>
                <strong>{stats.branches}</strong>
              </div>
              <div className="card">
                <span>Audit Logs</span>
                <strong>{stats.auditLogs}</strong>
              </div>
              <div className="card">
                <span>Pending Approvals</span>
                <strong>{stats.pendingApprovals}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        h1 {
          margin: 0;
          font-size: 26px;
          color: #1f2937;
        }

        h2 {
          margin: 0 0 24px;
          font-size: 15px;
          color: #374151;
          font-weight: 600;
        }

        p {
          margin: 6px 0 0;
          color: #9ca3af;
          font-size: 14px;
        }

        select {
          height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 0 12px;
          background: white;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .statItem span,
        .card span {
          display: block;
          font-size: 14px;
          color: #374151;
          margin-bottom: 14px;
        }

        .statItem strong,
        .card strong {
          font-size: 28px;
          font-weight: 700;
          color: #111827;
        }

        .chartsGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 28px;
        }

        .chartPanel {
          background: transparent;
          min-height: 360px;
        }

        .barChart {
          height: 300px;
          display: flex;
          align-items: flex-end;
          gap: 30px;
          padding: 10px 20px 0;
        }

        .barGroup {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex: 1;
        }

        .barTrack {
          width: 68px;
          height: 260px;
          background: #f3f4f6;
          border-radius: 14px;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
        }

        .barFill {
          width: 100%;
          border-radius: 14px;
        }

        .barGroup span {
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
        }

        .donutWrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
        }

        .donut {
          width: 280px;
          height: 280px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
        }

        .donutHole {
          width: 145px;
          height: 145px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: inset 0 0 0 1px #e5e7eb;
        }

        .legend {
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 13px;
          color: #9ca3af;
        }

        .legendItem {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legendItem span {
          width: 14px;
          height: 14px;
          border-radius: 4px;
        }

        .adminStats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
        }

        @media (max-width: 980px) {
          .statsRow,
          .chartsGrid,
          .adminStats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}