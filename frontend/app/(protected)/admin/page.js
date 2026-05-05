"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import MetricStrip from "@/components/ui/MetricStrip";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";
import { apiClient, getStoredUser } from "@/services/apiClient";

const STATUS_COLORS = {
  Registered: "var(--color-brand)",
  "In Testing": "var(--color-warning)",
  "For Review": "var(--color-info)",
  Released: "var(--color-success)",
  Archived: "var(--color-text-muted)",
};

const USER_COLUMNS = [
  { key: "user", label: "User", width: "220px" },
  { key: "role", label: "Role", width: "180px" },
  { key: "branch", label: "Branch", width: "130px" },
  { key: "status", label: "Status", width: "120px" },
];

const AUDIT_COLUMNS = [
  { key: "event", label: "Event", width: "240px" },
  { key: "user", label: "User", width: "160px" },
  { key: "time", label: "Time", width: "170px" },
];

export default function AdminDashboard() {
  const user = getStoredUser();
  const userBranchId = Number(user?.branch_id);

  const [samples, setSamples] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [branchFilter, setBranchFilter] = useState(userBranchId ? "My" : "All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const branchOptions = useMemo(() => {
    if (!userBranchId) {
      return [
        { label: "All Branches", value: "All" },
        { label: "Marikina", value: "1" },
        { label: "Pateros", value: "2" },
      ];
    }

    const otherBranch =
      Number(userBranchId) === 1
        ? { label: "Pateros", value: "2" }
        : { label: "Marikina", value: "1" };

    return [
      { label: "All Branches", value: "All" },
      { label: "My Branch", value: "My" },
      otherBranch,
    ];
  }, [userBranchId]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [sampleRes, userRes, logRes] = await Promise.allSettled([
        apiClient.getSamples(),
        apiClient.getUsers?.(),
        apiClient.getAuditLogs(),
      ]);

      setSamples(
        sampleRes.status === "fulfilled" && Array.isArray(sampleRes.value)
          ? sampleRes.value
          : [],
      );

      setUsers(
        userRes.status === "fulfilled" && Array.isArray(userRes.value)
          ? userRes.value
          : [],
      );

      setLogs(
        logRes.status === "fulfilled" && Array.isArray(logRes.value)
          ? logRes.value
          : [],
      );

      if (sampleRes.status === "rejected") {
        setError(sampleRes.reason?.message || "Failed to load samples.");
      }
    } catch (err) {
      setError(err.message || "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!userBranchId && branchFilter === "My") {
      setBranchFilter("All");
    }
  }, [branchFilter, userBranchId]);

  const visibleSamples = useMemo(() => {
    return filterItemsByBranchView(samples, branchFilter, userBranchId);
  }, [samples, branchFilter, userBranchId]);

  const visibleUsers = useMemo(() => {
    return filterItemsByBranchView(users, branchFilter, userBranchId);
  }, [users, branchFilter, userBranchId]);

  const visibleLogs = useMemo(() => {
    const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

    if (resolvedBranch === "All") return logs;

    return logs.filter((log) => {
      const branchId =
        log.branch_id ||
        log.metadata?.branch_id ||
        log.details?.branch_id ||
        log.sample_branch_id;

      return Number(branchId) === Number(resolvedBranch);
    });
  }, [logs, branchFilter, userBranchId]);

  const stats = useMemo(() => {
    const countByState = (state) =>
      visibleSamples.filter((sample) => sample.current_state === state).length;

    const activeUsers = visibleUsers.filter((item) => isUserActive(item));
    const inactiveUsers = visibleUsers.filter((item) => !isUserActive(item));

    return {
      users: visibleUsers.length,
      activeUsers: activeUsers.length,
      inactiveUsers: inactiveUsers.length,
      branches:
        new Set(
          users
            .map((item) => item.branch_id)
            .filter((branchId) => branchId !== null && branchId !== undefined),
        ).size || 2,
      auditLogs: visibleLogs.length,
      pendingApprovals: countByState("For Review"),
      registered: countByState("Registered"),
      testing: countByState("In Testing"),
      released: countByState("Released"),
      archived: countByState("Archived"),
      completed: countByState("Released") + countByState("Archived"),
      overdue: 0,
    };
  }, [visibleSamples, visibleUsers, visibleLogs, users]);

  const lifecycle = useMemo(() => {
    return [
      { label: "Registered", shortLabel: "Registered", value: stats.registered },
      { label: "In Testing", shortLabel: "In-Test", value: stats.testing },
      {
        label: "For Review",
        shortLabel: "For Review",
        value: stats.pendingApprovals,
      },
      { label: "Released", shortLabel: "Released", value: stats.released },
      { label: "Archived", shortLabel: "Archived", value: stats.archived },
    ];
  }, [stats]);

  const maxValue = Math.max(...lifecycle.map((item) => item.value), 1);

  const donutGradient = useMemo(() => {
    const total = lifecycle.reduce((sum, item) => sum + item.value, 0) || 1;

    return lifecycle
      .map((item, index) => {
        const start =
          (lifecycle
            .slice(0, index)
            .reduce((sum, current) => sum + current.value, 0) /
            total) *
          100;

        const end = start + (item.value / total) * 100;

        return `${STATUS_COLORS[item.label]} ${start}% ${end}%`;
      })
      .join(", ");
  }, [lifecycle]);

  const roleRows = useMemo(() => {
    const roleMap = new Map();

    visibleUsers.forEach((item) => {
      const role = item.role || item.role_name || "Unassigned";
      roleMap.set(role, (roleMap.get(role) || 0) + 1);
    });

    return Array.from(roleMap.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }, [visibleUsers]);

  const branchRows = useMemo(() => {
    const branchMap = new Map();

    visibleUsers.forEach((item) => {
      const branch = formatBranch(item.branch_id);
      branchMap.set(branch, (branchMap.get(branch) || 0) + 1);
    });

    return Array.from(branchMap.entries()).map(([branch, count]) => ({
      branch,
      count,
    }));
  }, [visibleUsers]);

  const recentUsers = visibleUsers.slice(0, 6);
  const recentLogs = visibleLogs.slice(0, 6);
  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            System oversight, user status monitoring, and audit visibility for{" "}
            <strong>{branchLabel}</strong>.
          </p>
        </div>

        <div className="headerActions">
          <Select
            className="branchSelect"
            name="branchFilter"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>
      </header>

      {!userBranchId && (
        <section className="warningNotice">
          <strong>No branch assigned</strong>
          <span>
            This administrator account does not have a branch assigned, so the
            dashboard defaults to all branches.
          </span>
        </section>
      )}

      <section className="notice">
        <strong>Administrator scope</strong>
        <span>
          Admin can manage users, roles, branches, system settings, and audit
          records across all branch views. Inactive accounts should be
          deactivated instead of deleted so previous sample updates, validation
          actions, payment actions, and audit records remain attributable.
        </span>
      </section>

      {loading && <Loader label="Loading admin dashboard..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Total Users"
              value={stats.users}
              note="Accounts in selected scope"
              variant="brand"
            />

            <StatCard
              label="Active Users"
              value={stats.activeUsers}
              note="Allowed to access the system"
              variant="success"
            />

            <StatCard
              label="Inactive Users"
              value={stats.inactiveUsers}
              note="Access disabled, history preserved"
              variant="danger"
            />

            <StatCard
              label="Audit Logs"
              value={stats.auditLogs}
              note="Recorded system actions"
              variant="info"
            />
          </section>

          <MetricStrip
            items={[
              {
                label: "Active Branches",
                value: stats.branches,
              },
              {
                label: "Pending QA Review",
                value: stats.pendingApprovals,
              },
              {
                label: "Completed Samples",
                value: stats.completed,
              },
              {
                label: "Branch Scope",
                value: branchLabel,
              },
            ]}
          />

          <section className="chartsGrid">
            <section className="chartPanel">
              <div>
                <h2>Sample Lifecycle Progression</h2>
                <p>Operational sample count by lifecycle state.</p>
              </div>

              <div className="chartBody">
                <div className="barChart">
                  {lifecycle.map((item) => (
                    <div className="barGroup" key={item.label}>
                      <strong>{item.value}</strong>

                      <div className="barTrack">
                        <div
                          className="barFill"
                          style={{
                            height: `${Math.max(
                              (item.value / maxValue) * 100,
                              item.value ? 10 : 0,
                            )}%`,
                            background: STATUS_COLORS[item.label],
                          }}
                        />
                      </div>

                      <span>{item.shortLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="chartPanel">
              <div>
                <h2>Distribution by Lifecycle Status</h2>
                <p>Current status composition across selected branch scope.</p>
              </div>

              <div className="chartBody">
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

                        <p>{item.label}</p>

                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </section>

          <section className="contentGrid">
            <Card
              title="Recent Users"
              subtitle="User account status should be managed through activation and deactivation, not deletion."
              actions={
                <Link href="/admin/users" className="textAction">
                  Manage
                </Link>
              }
            >
              {recentUsers.length === 0 ? (
                <EmptyState
                  title="No users found"
                  description="User accounts will appear here once available."
                />
              ) : (
                <Table
                  columns={USER_COLUMNS}
                  data={recentUsers}
                  emptyText="No users found."
                  density="comfortable"
                  variant="minimal"
                  className="adminTable"
                  renderRow={(item) => (
                    <tr key={item.id || item.user_id || item.email}>
                      <td>
                        <div className="stack">
                          <strong>{getUserDisplayName(item)}</strong>
                          <small>{item.email || item.username || "-"}</small>
                        </div>
                      </td>

                      <td>{item.role || item.role_name || "-"}</td>

                      <td>{formatBranch(item.branch_id)}</td>

                      <td>
                        <UserStatusBadge user={item} />
                      </td>
                    </tr>
                  )}
                />
              )}
            </Card>

            <Card
              title="Recent Audit Activity"
              subtitle="Attributable records connect actions to the account that performed them."
              actions={
                <Link href="/admin/audit-logs" className="textAction">
                  View All
                </Link>
              }
            >
              {recentLogs.length === 0 ? (
                <EmptyState
                  title="No audit activity found"
                  description="Audit events will appear here after system actions are recorded."
                />
              ) : (
                <Table
                  columns={AUDIT_COLUMNS}
                  data={recentLogs}
                  emptyText="No audit activity found."
                  density="comfortable"
                  variant="minimal"
                  className="adminTable"
                  renderRow={(item, index) => (
                    <tr key={item.id || item.audit_id || index}>
                      <td>
                        <div className="stack">
                          <strong>{getAuditAction(item)}</strong>
                          <small>{getAuditTarget(item)}</small>
                        </div>
                      </td>

                      <td>{getAuditUser(item)}</td>

                      <td>{formatDate(item.created_at || item.timestamp)}</td>
                    </tr>
                  )}
                />
              )}
            </Card>
          </section>

          <section className="summaryGrid">
            <Card title="Users by Role" subtitle="Role distribution overview.">
              {roleRows.length === 0 ? (
                <EmptyState
                  title="No role data"
                  description="Role counts will appear once users are loaded."
                />
              ) : (
                <div className="summaryList">
                  {roleRows.map((item) => (
                    <SummaryRow
                      key={item.role}
                      label={item.role}
                      value={item.count}
                    />
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Users by Branch"
              subtitle="Branch assignment overview for account management."
            >
              {branchRows.length === 0 ? (
                <EmptyState
                  title="No branch data"
                  description="Branch counts will appear once users are loaded."
                />
              ) : (
                <div className="summaryList">
                  {branchRows.map((item) => (
                    <SummaryRow
                      key={item.branch}
                      label={item.branch}
                      value={item.count}
                    />
                  ))}
                </div>
              )}
            </Card>
          </section>
        </>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          color: var(--color-text-primary);
        }

        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .header h1 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .header p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.45;
        }

        .header p strong {
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .headerActions {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .headerActions :global(.branchSelect) {
          width: 150px;
          min-width: 150px;
          flex: 0 0 150px;
        }

        .headerActions > :global(button),
        .headerActions > :global(a) {
          width: auto;
          min-width: 0;
          min-height: 34px;
          border-radius: var(--radius-md) !important;
        }

        .notice,
        .warningNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .notice {
          background: var(--color-info-bg);
          color: var(--color-info);
          border: 1px solid var(--color-info-border);
        }

        .warningNotice {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border: 1px solid var(--color-warning-border);
        }

        .notice strong,
        .warningNotice strong {
          color: inherit;
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .chartsGrid,
        .contentGrid,
        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .chartPanel {
          display: grid;
          gap: 18px;
          min-height: 360px;
          align-content: start;
        }

        .chartPanel h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .chartPanel p {
          margin: 6px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .chartBody {
          min-height: 286px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .barChart {
          width: 100%;
          height: 270px;
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          gap: 16px;
          padding: 8px 10px 0;
        }

        .barGroup {
          height: 100%;
          display: flex;
          flex: 1;
          min-width: 0;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }

        .barGroup strong {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
        }

        .barTrack {
          width: 42px;
          height: 205px;
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          border-radius: 14px;
          background: transparent;
          border: none;
        }

        .barFill {
          width: 100%;
          border-radius: 14px;
          transition: height var(--transition-base);
        }

        .barGroup span {
          min-height: 28px;
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.25;
          text-align: center;
        }

        .donutWrap {
          width: 100%;
          min-height: 270px;
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 24px;
          align-items: center;
          justify-content: center;
        }

        .donut {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: none;
        }

        .donutHole {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          background: var(--color-background);
          box-shadow: none;
        }

        .legend {
          display: grid;
          gap: 10px;
          align-content: center;
        }

        .legendItem {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }

        .legendItem span {
          width: 10px;
          height: 10px;
          border-radius: var(--radius-full);
        }

        .legendItem p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.35;
        }

        .legendItem strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        :global(.textAction) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.textAction:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        :global(.adminTable table) {
          min-width: 620px;
        }

        .stack {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .stack strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stack small {
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.35;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .summaryList {
          display: grid;
          gap: 10px;
        }

        @media (max-width: 1100px) {
          .statsRow,
          .chartsGrid,
          .contentGrid,
          .summaryGrid {
            grid-template-columns: 1fr;
          }

          .chartPanel {
            min-height: auto;
          }

          .donutWrap {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .legend {
            width: 100%;
          }
        }

        @media (max-width: 820px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            width: 100%;
            justify-content: flex-start;
          }

          .headerActions :global(.branchSelect),
          .headerActions > :global(button),
          .headerActions > :global(a) {
            width: 100%;
            min-width: 0;
            flex: 1 1 100%;
          }
        }
      `}</style>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="summaryRow">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .summaryRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
        }

        span {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.35;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

function UserStatusBadge({ user }) {
  const active = isUserActive(user);

  return (
    <Badge variant={active ? "success" : "danger"} size="sm">
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

function isUserActive(user) {
  if (!user) return false;

  if (typeof user.is_active === "boolean") return user.is_active;
  if (typeof user.active === "boolean") return user.active;

  const status = String(user.status || user.account_status || "")
    .trim()
    .toLowerCase();

  if (!status) return true;

  return !["inactive", "disabled", "deactivated", "suspended"].includes(status);
}

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function filterItemsByBranchView(items, branchFilter, userBranchId) {
  if (!Array.isArray(items)) return [];

  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return items;

  return items.filter((item) => {
    const branchId =
      item.branch_id ||
      item.metadata?.branch_id ||
      item.details?.branch_id ||
      item.sample_branch_id;

    return Number(branchId) === Number(resolvedBranch);
  });
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
}

function getUserDisplayName(user) {
  return (
    user.full_name ||
    user.name ||
    user.display_name ||
    user.username ||
    user.email ||
    `User ${user.id || user.user_id || ""}`.trim()
  );
}

function getAuditAction(log) {
  return (
    log.action ||
    log.event ||
    log.activity ||
    log.operation ||
    log.description ||
    "System activity"
  );
}

function getAuditTarget(log) {
  return (
    log.target ||
    log.entity ||
    log.sample_id ||
    log.invoice_id ||
    log.record_id ||
    "-"
  );
}

function getAuditUser(log) {
  return (
    log.user_name ||
    log.user_display ||
    log.user_email ||
    log.created_by_name ||
    log.actor_name ||
    formatUser(log.user_id || log.created_by || log.actor_id)
  );
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}

function formatUser(userId) {
  if (!userId) return "-";

  const value = String(userId);

  if (Number.isNaN(Number(value))) {
    return value;
  }

  return `User ${value}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}