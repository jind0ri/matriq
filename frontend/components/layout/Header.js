"use client";

import { useEffect, useMemo, useState } from "react";
import { CaretDown, List, SignOut } from "phosphor-react";
import { apiClient } from "@/services/apiClient";

const BRANCH_DETAILS = {
  marikina: {
    label: "Matest Marikina",
    branchName: "Marikina Main Office",
    address:
      "No. 5 Chile St., Greenheights Subd., Phase 1, Concepcion Uno, Marikina City",
    phones: ["+63 (02) 8870-1879", "8463-6836"],
    email: "matestlaboratory.chile@gmail.com",
  },
  pateros: {
    label: "Matest Pateros",
    branchName: "Pateros Branch",
    address:
      "Unit C 25 F. Angeles St., Brgy. Sto. Rosario-Kanluran, Pateros, Metro Manila",
    phones: ["+63 (02) 7949-9033", "8642-0664"],
    email: "matestlaboratory.pateros@gmail.com",
  },
};

function resolveBranchKey(branch, syncStatus) {
  const branchId = Number(syncStatus?.branch_id);

  if (branchId === 2) return "pateros";
  if (branchId === 1) return "marikina";

  const value = String(branch || "").toLowerCase();

  if (value.includes("pateros")) return "pateros";
  if (value.includes("marikina")) return "marikina";

  return "marikina";
}

function formatDateTime(value) {
  if (!value) return "Not checked yet";

  try {
    return new Date(value).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "Recently checked";
  }
}

function getSyncLabel(status) {
  if (status === "pending") return "BRANCH SYNC: PENDING";
  if (status === "warning") return "BRANCH SYNC: WARNING";
  if (status === "offline") return "BRANCH SYNC: OFFLINE";
  return "BRANCH SYNC: ACTIVE";
}

function getSyncClass(status) {
  if (status === "pending") return "syncBadge pending";
  if (status === "warning") return "syncBadge warning";
  if (status === "offline") return "syncBadge offline";
  return "syncBadge active";
}

function getSyncStatusText(status) {
  if (status === "pending") return "Pending Sync";
  if (status === "warning") return "Sync Warning";
  if (status === "offline") return "Offline";
  return "Active";
}

export default function Header({
  branch = "Main Laboratory - Marikina",
  onMenuClick,
  onLogout,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncError, setSyncError] = useState("");

  const branchKey = useMemo(
    () => resolveBranchKey(branch, syncStatus),
    [branch, syncStatus],
  );

  const branchDetails = BRANCH_DETAILS[branchKey];

  async function loadSyncStatus() {
    try {
      const data = await apiClient.getSyncStatus();
      setSyncStatus(data);
      setSyncError("");
    } catch (error) {
      setSyncStatus((current) => ({
        ...(current || {}),
        status: "offline",
        database_reachable: false,
        last_sync_at: new Date().toISOString(),
        message: "Unable to reach backend synchronization monitor.",
      }));
      setSyncError(error.message || "Unable to reach synchronization monitor.");
    }
  }

  useEffect(() => {
    loadSyncStatus();

    const interval = window.setInterval(() => {
      if (!document.hidden) {
        loadSyncStatus();
      }
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const syncState = syncStatus?.status || "offline";
  const syncLabel = getSyncLabel(syncState);
  const syncClass = getSyncClass(syncState);

  return (
    <>
      <header className="header no-print">
        <div className="left">
          <button
            type="button"
            className="menuButton"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <List size={28} weight="regular" />
          </button>

          <div className="branchWrap">
            <button
              type="button"
              className="locationBlock"
              onClick={() => {
                setDetailsOpen((current) => !current);
                setSyncOpen(false);
              }}
              aria-label="View branch details"
            >
              <span>Location</span>

              <strong>
                {branchDetails.label}
                <CaretDown
                  size={13}
                  weight="bold"
                  className={detailsOpen ? "chevron open" : "chevron"}
                />
              </strong>
            </button>

            {detailsOpen && (
              <section className="branchPopover">
                <div className="branchPopoverHeader">
                  <strong>{branchDetails.branchName}</strong>
                  <span>{branchDetails.label}</span>
                </div>

                <div className="branchInfo">
                  <div>
                    <span>Address</span>
                    <p>{branchDetails.address}</p>
                  </div>

                  <div>
                    <span>Phone</span>
                    <p>{branchDetails.phones.join(" / ")}</p>
                  </div>

                  <div>
                    <span>Email</span>
                    <p>{branchDetails.email}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="right">
          <div className="syncWrap">
            <button
              type="button"
              className={syncClass}
              onClick={() => {
                setSyncOpen((current) => !current);
                setDetailsOpen(false);
                loadSyncStatus();
              }}
              title={`Last checked: ${formatDateTime(syncStatus?.last_sync_at)}`}
              aria-label="View branch synchronization status"
            >
              <span className="dot" />
              <span>{syncLabel}</span>
            </button>

            {syncOpen && (
              <section className="syncPopover">
                <div className="syncPopoverHeader">
                  <strong>Branch Sync Monitor</strong>
                  <span>{getSyncStatusText(syncState)}</span>
                </div>

                <div className="syncInfo">
                  <SyncRow
                    label="Branch"
                    value={syncStatus?.branch_name || branchDetails.branchName}
                  />

                  <SyncRow
                    label="Last Checked"
                    value={formatDateTime(syncStatus?.last_sync_at)}
                  />

                  <SyncRow
                    label="Database"
                    value={
                      syncStatus?.database_reachable
                        ? "Reachable"
                        : "Not reachable"
                    }
                  />

                  <SyncRow
                    label="Pending Queue"
                    value={syncStatus?.pending_queue ?? 0}
                  />

                  <SyncRow
                    label="Failed Queue"
                    value={syncStatus?.failed_queue ?? 0}
                  />

                  <SyncRow
                    label="Conflicts"
                    value={syncStatus?.conflicts ?? 0}
                  />
                </div>

                <p className={syncError ? "syncMessage error" : "syncMessage"}>
                  {syncError ||
                    syncStatus?.message ||
                    "Cloud database synchronization status checked."}
                </p>
              </section>
            )}
          </div>

          <button
            type="button"
            className="logoutIcon"
            aria-label="Logout"
            onClick={onLogout}
          >
            <SignOut size={20} weight="regular" />
          </button>
        </div>
      </header>

      <style jsx>{`
        .header {
          height: 76px;
          background: var(--color-surface);
          border-bottom: 1px solid var(--color-border-soft);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 20px;
          color: var(--color-text-primary);
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        .left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .menuButton {
          width: 36px;
          height: 36px;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            opacity var(--transition-base);
        }

        .menuButton:hover {
          background: var(--color-overlay);
          border-color: var(--color-border-soft);
          opacity: 1;
        }

        .branchWrap,
        .syncWrap {
          position: relative;
          min-width: 0;
        }

        .locationBlock {
          border: none;
          background: transparent;
          padding: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
          cursor: pointer;
          text-align: left;
        }

        .locationBlock span {
          margin-bottom: 2px;
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 400;
          line-height: 1.25;
        }

        .locationBlock strong {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.3;
          white-space: nowrap;
        }

        .chevron {
          color: var(--color-text-muted);
          transition: transform var(--transition-base);
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .branchPopover,
        .syncPopover {
          position: absolute;
          top: calc(100% + 14px);
          z-index: 10020;
          width: min(390px, calc(100vw - 28px));
          border: 1px solid var(--color-border-soft);
          border-radius: 18px;
          background: var(--color-surface);
          box-shadow: 0 18px 50px rgba(15, 23, 42, 0.16);
          padding: 14px;
        }

        .branchPopover {
          left: 0;
        }

        .syncPopover {
          right: 0;
        }

        .branchPopoverHeader,
        .syncPopoverHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 11px;
          border-bottom: 1px solid var(--color-border-soft);
        }

        .branchPopoverHeader {
          display: grid;
          gap: 3px;
        }

        .branchPopoverHeader strong,
        .syncPopoverHeader strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 700;
        }

        .branchPopoverHeader span,
        .syncPopoverHeader span {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          white-space: nowrap;
        }

        .branchInfo,
        .syncInfo {
          display: grid;
          gap: 11px;
          padding-top: 12px;
        }

        .branchInfo div {
          display: grid;
          gap: 3px;
        }

        .branchInfo span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .branchInfo p {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .right {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-shrink: 0;
        }

        .syncBadge {
          height: 38px;
          border-radius: var(--radius-full);
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            opacity var(--transition-base);
        }

        .syncBadge:hover {
          opacity: 0.88;
        }

        .syncBadge.active {
          border: 1px solid var(--color-success-border);
          color: var(--color-success);
          background: var(--color-success-bg);
        }

        .syncBadge.pending {
          border: 1px solid var(--color-warning-border);
          color: var(--color-warning);
          background: var(--color-warning-bg);
        }

        .syncBadge.warning,
        .syncBadge.offline {
          border: 1px solid var(--color-danger-border);
          color: var(--color-danger);
          background: var(--color-danger-bg);
        }

        .dot {
          width: 14px;
          height: 14px;
          border-radius: var(--radius-full);
          display: inline-block;
          flex-shrink: 0;
        }

        .syncBadge.active .dot {
          background: var(--color-success);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-success) 14%, transparent);
        }

        .syncBadge.pending .dot {
          background: var(--color-warning);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-warning) 14%, transparent);
        }

        .syncBadge.warning .dot,
        .syncBadge.offline .dot {
          background: var(--color-danger);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-danger) 14%, transparent);
        }

        .syncMessage {
          margin: 12px 0 0;
          padding: 10px 11px;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .syncMessage.error {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border: 1px solid var(--color-danger-border);
        }

        .logoutIcon {
          width: 34px;
          height: 34px;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            opacity var(--transition-base);
        }

        .logoutIcon:hover {
          background: var(--color-overlay);
          border-color: var(--color-border-soft);
          color: var(--color-danger);
          opacity: 1;
        }

        @media (max-width: 768px) {
          .header {
            padding: 0 14px;
          }

          .syncBadge {
            height: 34px;
            padding: 0 10px;
            font-size: 11px;
          }

          .dot {
            width: 11px;
            height: 11px;
          }

          .locationBlock strong {
            font-size: 13px;
          }
        }

        @media (max-width: 520px) {
          .syncBadge span:last-child {
            display: none;
          }

          .syncBadge {
            width: 34px;
            justify-content: center;
            padding: 0;
          }
        }

        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

function SyncRow({ label, value }) {
  return (
    <div className="syncRow">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .syncRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
          text-align: right;
        }
      `}</style>
    </div>
  );
}