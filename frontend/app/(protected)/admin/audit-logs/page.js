"use client";

import { useMemo, useState } from "react";
import Dropdown from "@/components/ui/Dropdown";

const AUDIT_LOGS = [
  {
    timestamp: "2026-02-16 10:14 AM",
    user: "Admin User",
    role: "Administrator",
    action: "Created employee account",
    module: "User Management",
    ip: "192.168.1.10",
    status: "Success",
  },
  {
    timestamp: "2026-02-16 11:02 AM",
    user: "QA Engineer",
    role: "QA Engineer",
    action: "Authorized sample release",
    module: "Workflow Tracking",
    ip: "192.168.1.21",
    status: "Success",
  },
  {
    timestamp: "2026-02-16 11:44 AM",
    user: "Unknown Session",
    role: "N/A",
    action: "Attempted unauthorized access",
    module: "Admin Console",
    ip: "192.168.1.55",
    status: "Warning",
  },
  {
    timestamp: "2026-02-16 1:21 PM",
    user: "Accounting User",
    role: "Accounting",
    action: "Viewed billing report",
    module: "Reports",
    ip: "192.168.1.18",
    status: "Success",
  },
  {
    timestamp: "2026-02-16 2:03 PM",
    user: "System",
    role: "Service",
    action: "Sync retry failed",
    module: "Branch Sync",
    ip: "192.168.1.2",
    status: "Failed",
  },
];

export default function AdminAuditLogsPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    return AUDIT_LOGS.filter((log) => {
      if (statusFilter === "all") return true;
      return log.status.toLowerCase() === statusFilter;
    });
  }, [statusFilter]);

  return (
    <>
      <div className="page">
        <div className="header">
          <div>
            <h1>System Audit Logs</h1>
            <p>Review immutable activity logs across authentication, workflow, and administration.</p>
          </div>

          <div className="actions">
            <Dropdown
              options={[
                { label: "All Statuses", value: "all" },
                { label: "Success", value: "success" },
                { label: "Warning", value: "warning" },
                { label: "Failed", value: "failed" },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />

            <button type="button" className="secondaryButton">
              Export Logs
            </button>
          </div>
        </div>

        <div className="statsRow">
          <div className="statCard">
            <span>Total Events</span>
            <strong>{filteredLogs.length}</strong>
          </div>
          <div className="statCard">
            <span>Success</span>
            <strong>{filteredLogs.filter((l) => l.status === "Success").length}</strong>
          </div>
          <div className="statCard">
            <span>Warnings</span>
            <strong>{filteredLogs.filter((l) => l.status === "Warning").length}</strong>
          </div>
          <div className="statCard">
            <span>Failed</span>
            <strong>{filteredLogs.filter((l) => l.status === "Failed").length}</strong>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>Event Timeline</h3>
          </div>

          <div className="logList">
            {filteredLogs.map((log, index) => (
              <div key={index} className="logCard">
                <div className="logTop">
                  <strong>{log.action}</strong>
                  <span
                    className={
                      log.status === "Success"
                        ? "status success"
                        : log.status === "Warning"
                        ? "status warning"
                        : "status failed"
                    }
                  >
                    {log.status}
                  </span>
                </div>

                <p>
                  {log.user} • {log.role} • {log.module}
                </p>

                <div className="meta">
                  <span>{log.timestamp}</span>
                  <span>{log.ip}</span>
                </div>
              </div>
            ))}
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
          align-items: center;
        }
        .secondaryButton {
          height: 44px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
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
          margin-bottom: 16px;
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
          padding: 16px;
        }
        .logTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
        }
        .logTop strong {
          font-size: 13px;
          color: #1f2937;
        }
        .status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 76px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .status.success {
          background: #ecfdf5;
          color: #047857;
        }
        .status.warning {
          background: #fff7ed;
          color: #c2410c;
        }
        .status.failed {
          background: #fef2f2;
          color: #b91c1c;
        }
        .meta {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-top: 10px;
        }
        .meta span {
          font-size: 11px;
          color: #6b7280;
        }
        @media (max-width: 1100px) {
          .header {
            flex-direction: column;
          }
          .statsRow {
            grid-template-columns: 1fr 1fr;
          }
          .meta {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}