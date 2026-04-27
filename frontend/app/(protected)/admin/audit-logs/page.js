"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const AUDIT_COLUMNS = [
  { key: "timestamp", label: "Timestamp", width: "170px" },
  { key: "user", label: "User", width: "180px" },
  { key: "action", label: "Action", width: "170px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "target", label: "Target", width: "180px" },
  { key: "endpoint", label: "Page / Module", width: "190px" },
  { key: "details", label: "Details", align: "right", width: "120px" },
];

export default function AdminAuditLogsPage() {
  const user = getStoredUser();
  const userBranchId = Number(user?.branch_id);

  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [branchFilter, setBranchFilter] = useState(userBranchId ? "My" : "All");
  const [actionFilter, setActionFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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

  const userLookup = useMemo(() => {
    const map = new Map();

    users.forEach((item) => {
      const ids = [
        item.user_id,
        item.id,
        item.account_id,
        item.username,
        item.email,
      ].filter(Boolean);

      ids.forEach((id) => {
        map.set(String(id), item);
      });
    });

    return map;
  }, [users]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [logRes, userRes] = await Promise.allSettled([
        apiClient.getAuditLogs(),
        typeof apiClient.getUsers === "function"
          ? apiClient.getUsers()
          : Promise.resolve([]),
      ]);

      if (logRes.status === "fulfilled") {
        setLogs(Array.isArray(logRes.value) ? logRes.value : []);
      } else {
        throw logRes.reason;
      }

      setUsers(
        userRes.status === "fulfilled" && Array.isArray(userRes.value)
          ? userRes.value
          : [],
      );
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
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

  const visibleLogs = useMemo(() => {
    return filterItemsByBranchView(logs, branchFilter, userBranchId, userLookup);
  }, [logs, branchFilter, userBranchId, userLookup]);

  const actionOptions = useMemo(() => {
    const actions = new Set();

    visibleLogs.forEach((log) => {
      const action = getAuditAction(log);
      if (action && action !== "-") actions.add(action);
    });

    return ["All", ...Array.from(actions).sort((a, b) => a.localeCompare(b))];
  }, [visibleLogs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visibleLogs.filter((log) => {
      const action = getAuditAction(log);
      const target = getAuditTarget(log);
      const actor = getAuditUser(log, userLookup);
      const page = getPageLabel(log);
      const branch = formatBranch(getLogBranchId(log, userLookup));
      const details = stringifyDetails(log, userLookup);

      const matchesSearch =
        !q ||
        action.toLowerCase().includes(q) ||
        target.toLowerCase().includes(q) ||
        actor.toLowerCase().includes(q) ||
        page.toLowerCase().includes(q) ||
        branch.toLowerCase().includes(q) ||
        details.toLowerCase().includes(q);

      const matchesAction = actionFilter === "All" || action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [visibleLogs, search, actionFilter, userLookup]);

  const stats = useMemo(() => {
    const userIds = new Set(
      visibleLogs
        .map((log) => log.user_id || log.created_by || log.actor_id)
        .filter(Boolean),
    );

    const sampleEvents = visibleLogs.filter((log) =>
      getAuditTarget(log).toLowerCase().includes("sample"),
    );

    const paymentEvents = visibleLogs.filter((log) =>
      getAuditAction(log).toLowerCase().includes("payment"),
    );

    return {
      total: visibleLogs.length,
      users: userIds.size,
      sampleEvents: sampleEvents.length,
      paymentEvents: paymentEvents.length,
    };
  }, [visibleLogs]);

  function openDetails(log) {
    setSelectedLog(log);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedLog(null);
  }

  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Audit Logs</h1>
          <p>
            Review attributable system activity for{" "}
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
            audit trail defaults to all branches.
          </span>
        </section>
      )}

      <section className="notice">
        <strong>Read-only audit trail</strong>
        <span>
          Audit records preserve who performed each action, what record or module
          was affected, and when it happened. The table shows user-facing pages
          and modules, while the raw API route remains available in the details
          modal for technical traceability.
        </span>
      </section>

      {loading && <Loader label="Loading audit logs..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Audit Events"
              value={stats.total}
              note="Records in selected scope"
              variant="brand"
            />

            <StatCard
              label="Users Involved"
              value={stats.users}
              note="Accounts linked to actions"
              variant="info"
            />

            <StatCard
              label="Sample Events"
              value={stats.sampleEvents}
              note="Sample or module references"
              variant="success"
            />

            <StatCard
              label="Payment Events"
              value={stats.paymentEvents}
              note="Payment-related records"
              variant="warning"
            />
          </section>

          <section className="toolbar">
            <Input
              name="auditSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user, action, page, module, sample, invoice, branch, or details..."
            />

            <Select
              name="actionFilter"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action === "All" ? "All Actions" : action}
                </option>
              ))}
            </Select>
          </section>

          <Card
            title="Audit Records"
            subtitle="Read-only chronological activity records for traceability and accountability."
          >
            {filteredLogs.length === 0 ? (
              <EmptyState
                title="No audit logs found"
                description="Adjust the branch, action, or search filters."
              />
            ) : (
              <Table
                columns={AUDIT_COLUMNS}
                data={filteredLogs}
                emptyText="No audit logs found."
                density="comfortable"
                variant="minimal"
                className="auditTable"
                renderRow={(log, index) => (
                  <tr
                    key={log.audit_id || log.id || index}
                    className="clickableRow"
                    onClick={() => openDetails(log)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetails(log);
                      }
                    }}
                  >
                    <td>{formatDate(log.timestamp || log.created_at)}</td>

                    <td>{getAuditUser(log, userLookup)}</td>

                    <td>
                      <ActionBadge action={getAuditAction(log)} />
                    </td>

                    <td>{formatBranch(getLogBranchId(log, userLookup))}</td>

                    <td>{getAuditTarget(log)}</td>

                    <td>
                      <span className="endpointText">{getPageLabel(log)}</span>
                    </td>

                    <td
                      className="right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="rowAction"
                        onClick={() => openDetails(log)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={detailsOpen}
        title="Audit Log Details"
        description="Full audit context for the selected recorded action."
        onClose={closeDetails}
        size="lg"
      >
        {selectedLog && (
          <AuditDetails log={selectedLog} userLookup={userLookup} />
        )}
      </Modal>

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

        .toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 12px;
          align-items: end;
        }

        .endpointText {
          display: inline-block;
          max-width: 210px;
          color: var(--color-text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          vertical-align: middle;
        }

        .rowAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        .rowAction:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
        }

        :global(.right) {
          text-align: right;
        }

        :global(.auditTable table) {
          min-width: 1110px;
        }

        :global(.auditTable .clickableRow) {
          cursor: pointer;
          transition: background-color var(--transition-base);
        }

        :global(.auditTable .clickableRow:hover) {
          background: var(--color-overlay);
        }

        :global(.auditTable .clickableRow:focus-visible) {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          background: var(--color-overlay);
        }

        @media (max-width: 1100px) {
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
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

        @media (max-width: 520px) {
          .statsRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function AuditDetails({ log, userLookup }) {
  const oldValue = log.old_value || log.before || null;
  const newValue = log.new_value || log.after || null;

  return (
    <div className="details">
      <section className="detailGrid">
        <Detail
          label="Timestamp"
          value={formatDate(log.timestamp || log.created_at)}
        />
        <Detail label="User" value={getAuditUser(log, userLookup)} />
        <Detail label="Action" value={getAuditAction(log)} />
        <Detail
          label="Branch"
          value={formatBranch(getLogBranchId(log, userLookup))}
        />
        <Detail label="Target" value={getAuditTarget(log)} />
        <Detail label="Page / Module" value={getPageLabel(log)} />
        <Detail label="API Route" value={getEndpoint(log)} />
        <Detail label="Audit ID" value={log.audit_id || log.id} />
        <Detail
          label="User ID"
          value={log.user_id || log.created_by || log.actor_id}
        />
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Recorded Values</h3>
          <span>Read-only</span>
        </div>

        <div className="valueGrid">
          <ValueBlock label="Old Value" value={oldValue} />
          <ValueBlock label="New Value" value={newValue} />
        </div>
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Raw Audit Record</h3>
          <span>System stored metadata</span>
        </div>

        <pre>{safeJson(log)}</pre>
      </section>

      <style jsx>{`
        .details {
          display: grid;
          gap: 16px;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .sectionBox {
          display: grid;
          gap: 13px;
          padding: 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sectionTitle h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .sectionTitle span {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 400;
        }

        .valueGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        pre {
          max-height: 280px;
          overflow: auto;
          margin: 0;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          color: var(--color-text-primary);
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        @media (max-width: 720px) {
          .detailGrid,
          .valueGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{formatEmpty(value)}</strong>

      <style jsx>{`
        .detail {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function ValueBlock({ label, value }) {
  return (
    <div className="valueBlock">
      <span>{label}</span>
      <pre>{safeJson(value || {})}</pre>

      <style jsx>{`
        .valueBlock {
          display: grid;
          gap: 8px;
          min-width: 0;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        pre {
          max-height: 220px;
          overflow: auto;
          margin: 0;
          padding: 12px;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          color: var(--color-text-primary);
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function ActionBadge({ action }) {
  return (
    <Badge variant={getActionVariant(action)} size="sm">
      {action || "-"}
    </Badge>
  );
}

function getActionVariant(action) {
  const value = String(action || "").toLowerCase();

  if (value.includes("delete") || value.includes("cancel")) return "danger";
  if (value.includes("payment") || value.includes("invoice")) return "warning";
  if (value.includes("release") || value.includes("approve")) return "success";

  if (
    value.includes("login") ||
    value.includes("access") ||
    value.includes("auth") ||
    value.includes("password")
  ) {
    return "info";
  }

  return "brand";
}

function getUserFromLog(log, userLookup) {
  const possibleIds = [
    log.user_id,
    log.created_by,
    log.actor_id,
    log.user,
    log.created_by_id,
    log.actor,
  ].filter(Boolean);

  for (const id of possibleIds) {
    const matchedUser = userLookup.get(String(id));
    if (matchedUser) return matchedUser;
  }

  return null;
}

function getLogBranchId(log, userLookup) {
  const matchedUser = getUserFromLog(log, userLookup);

  return (
    log.branch_id ||
    log.metadata?.branch_id ||
    log.details?.branch_id ||
    log.sample_branch_id ||
    log.new_value?.branch_id ||
    log.old_value?.branch_id ||
    matchedUser?.branch_id ||
    null
  );
}

function getAuditAction(log) {
  return (
    log.action ||
    log.event ||
    log.activity ||
    log.operation ||
    log.description ||
    "-"
  );
}

function getAuditTarget(log) {
  const directTarget =
    log.sample_id ||
    log.invoice_id ||
    log.target ||
    log.entity ||
    log.record_id ||
    log.new_value?.sample_id ||
    log.old_value?.sample_id ||
    log.new_value?.invoice_id ||
    log.old_value?.invoice_id ||
    log.new_value?.record_id ||
    log.old_value?.record_id;

  if (directTarget) return directTarget;

  return getPageLabel(log);
}

function getEndpoint(log) {
  return log.endpoint_accessed || log.endpoint || log.route || log.path || "-";
}

function getPageLabel(log) {
  const action = String(getAuditAction(log)).toLowerCase();
  const endpoint = String(getEndpoint(log)).toLowerCase();

  if (
    action.includes("forgot_password") ||
    action.includes("password_reset_email") ||
    endpoint.includes("/forgot-password")
  ) {
    return "Forgot Password";
  }

  if (
    action.includes("password_reset_completed") ||
    endpoint.includes("/reset-password")
  ) {
    return "Password Reset";
  }

  if (
    action.includes("auth") ||
    action.includes("login") ||
    endpoint.includes("/api/auth") ||
    endpoint.includes("/login")
  ) {
    return "Authentication";
  }

  if (action.includes("sample") || endpoint.includes("/samples")) {
    return "Samples Page";
  }

  if (action.includes("dashboard") || endpoint.includes("/dashboard")) {
    return "Dashboard";
  }

  if (action.includes("invoice") || endpoint.includes("/invoices")) {
    return "Invoices Page";
  }

  if (action.includes("billing") || endpoint.includes("/billing")) {
    return "Billing Page";
  }

  if (action.includes("payment") || endpoint.includes("/payment")) {
    return "Payments";
  }

  if (action.includes("user") || endpoint.includes("/users")) {
    return "User Management";
  }

  if (action.includes("audit") || endpoint.includes("/audit")) {
    return "Audit Logs";
  }

  if (action.includes("report") || endpoint.includes("/reports")) {
    return "Reports Page";
  }

  if (action.includes("setting") || endpoint.includes("/settings")) {
    return "System Settings";
  }

  if (endpoint && endpoint !== "-") {
    return endpoint.replace("/api/", "").replaceAll("/", " / ");
  }

  return "-";
}

function getAuditUser(log, userLookup) {
  const matchedUser = getUserFromLog(log, userLookup);

  return (
    log.user_name ||
    log.user_display ||
    log.user_email ||
    log.created_by_name ||
    log.actor_name ||
    matchedUser?.full_name ||
    matchedUser?.name ||
    matchedUser?.display_name ||
    matchedUser?.username ||
    matchedUser?.email ||
    formatUser(log.user_id || log.created_by || log.actor_id)
  );
}

function stringifyDetails(log, userLookup) {
  return [
    getAuditAction(log),
    getAuditTarget(log),
    getPageLabel(log),
    getEndpoint(log),
    getAuditUser(log, userLookup),
    formatBranch(getLogBranchId(log, userLookup)),
    safeJson(log.old_value || {}),
    safeJson(log.new_value || {}),
    safeJson(log.metadata || {}),
    safeJson(log.details || {}),
  ].join(" ");
}

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function filterItemsByBranchView(items, branchFilter, userBranchId, userLookup) {
  if (!Array.isArray(items)) return [];

  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return items;

  return items.filter((item) => {
    const branchId = getLogBranchId(item, userLookup);
    return Number(branchId) === Number(resolvedBranch);
  });
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
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

function formatEmpty(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function safeJson(value) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return String(value || "-");
  }
}