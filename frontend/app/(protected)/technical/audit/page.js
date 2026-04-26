"use client";

import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import Select from "@/components/ui/Select";
import { apiClient, getStoredUser } from "@/services/apiClient";

const IMPORTANT_ACTIONS = [
  "ALL",
  "UPDATE_TEST_DATA",
  "QA_RESULT_OVERRIDE",
  "QA_RELEASE_REVIEW",
  "UPDATE_SAMPLE_STATUS",
  "CREATE_SAMPLE",
  "VIEW_SAMPLE",
  "QA_PRE_TESTING_REVIEW",
];

export default function AuditPage() {
  const user = getStoredUser();

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getAuditLogs();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return logs.filter((log) => {
      const action = log.action || "";
      const endpoint = log.endpoint_accessed || "";
      const sampleId = log.sample_id || "";
      const userId = getUserDisplay(log);
      const details = JSON.stringify(log.new_value || log.old_value || {});

      const matchesAction = actionFilter === "ALL" || action === actionFilter;

      const matchesSearch =
        !q ||
        action.toLowerCase().includes(q) ||
        endpoint.toLowerCase().includes(q) ||
        String(sampleId).toLowerCase().includes(q) ||
        String(userId).toLowerCase().includes(q) ||
        details.toLowerCase().includes(q);

      return matchesAction && matchesSearch;
    });
  }, [logs, search, actionFilter]);

  const stats = useMemo(() => {
    return logs.reduce(
      (acc, log) => {
        acc.total += 1;

        if (log.action === "UPDATE_TEST_DATA") acc.testData += 1;
        if (log.action === "QA_RESULT_OVERRIDE") acc.overrides += 1;
        if (log.action === "QA_RELEASE_REVIEW") acc.releases += 1;
        if (log.action === "UPDATE_SAMPLE_STATUS") acc.statusUpdates += 1;

        return acc;
      },
      {
        total: 0,
        testData: 0,
        overrides: 0,
        releases: 0,
        statusUpdates: 0,
      },
    );
  }, [logs]);

  if (user?.role !== "Administrator") {
    return (
      <div className="page">
        <Card>
          <div className="errorText">
            Only Administrators can access audit logs.
          </div>
        </Card>

        <style jsx>{`
          .page {
            display: flex;
            flex-direction: column;
            gap: 22px;
            color: var(--color-text-primary);
          }

          .errorText {
            color: var(--color-danger);
            font-size: var(--text-sm);
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Audit Logs</h1>
          <p>
            Trace system events, testing updates, QA reviews, report release,
            and lifecycle changes.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadLogs}>
          Refresh
        </Button>
      </header>

      <section className="notice">
        <strong>Traceability record</strong>
        <span>
          Audit logs are read-only records used for accountability. Workflow
          actions, QA overrides, and report releases should remain traceable by
          user, sample, timestamp, and recorded details.
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
          <section className="stats">
            <StatCard label="Total Events" value={stats.total} />
            <StatCard label="Test Data Entries" value={stats.testData} />
            <StatCard label="QA Overrides" value={stats.overrides} />
            <StatCard label="Report Releases" value={stats.releases} />
          </section>

          <section className="toolbar">
            <Input
              name="auditSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, user, sample, endpoint, or details..."
            />

            <Select
              name="actionFilter"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
            >
              {IMPORTANT_ACTIONS.map((action) => (
                <option key={action} value={action}>
                  {action === "ALL" ? "All Actions" : formatAction(action)}
                </option>
              ))}
            </Select>
          </section>

          {filteredLogs.length === 0 ? (
            <Card>
              <EmptyState
                title="No audit logs found"
                description="No audit records match the current filters."
              />
            </Card>
          ) : (
            <section className="logsList">
              {filteredLogs.map((log, index) => (
                <AuditCard key={log.audit_id || index} log={log} />
              ))}
            </section>
          )}
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
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        h1 {
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

        .notice {
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border: 1px solid var(--color-info-border);
          border-radius: var(--radius-md);
          background: var(--color-info-bg);
          color: var(--color-info);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .notice strong {
          color: var(--color-info);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          padding: 4px 0 2px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 12px;
          align-items: end;
        }

        .logsList {
          display: grid;
          gap: 14px;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .header {
            flex-direction: column;
          }

          .stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function AuditCard({ log }) {
  const details = log.new_value || log.old_value || {};
  const action = log.action || "-";
  const isOverride = action === "QA_RESULT_OVERRIDE";
  const isRelease = action === "QA_RELEASE_REVIEW";
  const isTestData = action === "UPDATE_TEST_DATA";
  const isStatusUpdate = action === "UPDATE_SAMPLE_STATUS";

  return (
    <Card>
      <article className="auditCard">
        <div className="topRow">
          <div className="titleBlock">
            <ActionBadge action={action} />
            <h2>{formatAction(action)}</h2>
            <p>{formatDate(log.timestamp)}</p>
          </div>

          <div className="metaRight">
            <MetaPill label="User" value={getUserDisplay(log)} />
            <MetaPill
              label="Sample"
              value={log.sample_id || extractSampleId(details)}
            />
          </div>
        </div>

        <div className="infoGrid">
          <Info label="Endpoint" value={log.endpoint_accessed} />
          <Info label="Action" value={formatAction(action)} />
          <Info label="User" value={getUserDisplay(log)} />
          <Info
            label="Sample ID"
            value={log.sample_id || extractSampleId(details)}
          />
        </div>

        {isOverride && (
          <HighlightBox type="override" title="QA Result Override">
            <Info label="System Result" value={details.system_result} />
            <Info label="Previous Result" value={details.previous_result} />
            <Info
              label="QA Final Result"
              value={details.qa_final_result}
              emphasis
            />
            <Info label="Override Reason" value={details.override_reason} />
          </HighlightBox>
        )}

        {isRelease && (
          <HighlightBox type="release" title="Official Report Released">
            <Info label="Status" value={details.status} />
            <Info label="Test Result" value={details.test_result} />
            <Info label="Release Note" value={details.release_note} />
          </HighlightBox>
        )}

        {isTestData && (
          <HighlightBox type="testing" title="Test Data Recorded">
            <Info
              label="Test Result"
              value={details.test_data?.result}
              emphasis
            />
            <Info
              label="Test Type"
              value={formatLabel(details.test_data?.test_type)}
            />
            <Info
              label="Auto Transition"
              value={
                details.auto_transition
                  ? `${details.auto_transition.from || "-"} → ${
                      details.auto_transition.to || "-"
                    }`
                  : "-"
              }
            />
          </HighlightBox>
        )}

        {isStatusUpdate && (
          <HighlightBox type="status" title="Lifecycle Status Updated">
            <Info label="From" value={details.from || details.previous_state} />
            <Info label="To" value={details.to || details.new_state} emphasis />
            <Info label="Reason" value={details.reason || details.note} />
          </HighlightBox>
        )}

        <details className="details">
          <summary>View raw audit details</summary>
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </details>
      </article>

      <style jsx>{`
        .auditCard {
          display: grid;
          gap: 16px;
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .titleBlock {
          display: grid;
          gap: 6px;
          min-width: 0;
        }

        h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .metaRight {
          display: flex;
          justify-content: flex-end;
          align-items: flex-start;
          gap: 8px;
          flex-wrap: wrap;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--color-border-soft);
        }

        .details {
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          overflow: hidden;
        }

        .details summary {
          cursor: pointer;
          padding: 12px 13px;
          color: var(--color-brand);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1.4;
        }

        pre {
          width: calc(100% - 26px);
          max-width: 100%;
          max-height: 300px;
          overflow: auto;
          margin: 0 13px 13px;
          padding: 12px;
          border-radius: var(--radius-md);
          background: #0f172a;
          color: #e2e8f0;
          font-size: 11px;
          line-height: 1.55;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          word-break: break-word;
          box-sizing: border-box;
        }

        @media (max-width: 900px) {
          .topRow {
            flex-direction: column;
          }

          .metaRight {
            justify-content: flex-start;
          }

          .infoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .infoGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </Card>
  );
}

function HighlightBox({ title, type = "default", children }) {
  return (
    <section className={`highlightBox ${type}`}>
      <h3>{title}</h3>
      <div className="highlightGrid">{children}</div>

      <style jsx>{`
        .highlightBox {
          display: grid;
          gap: 12px;
          padding: 13px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-soft);
          background: var(--color-overlay);
        }

        .highlightBox.override {
          background: var(--color-warning-bg);
          border-color: var(--color-warning-border);
        }

        .highlightBox.release {
          background: var(--color-success-bg);
          border-color: var(--color-success-border);
        }

        .highlightBox.testing {
          background: var(--color-info-bg);
          border-color: var(--color-info-border);
        }

        .highlightBox.status {
          background: var(--color-brand-light);
          border-color: color-mix(in srgb, var(--color-brand) 24%, white);
        }

        h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
          line-height: 1.4;
        }

        .highlightGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 13px;
        }

        @media (max-width: 900px) {
          .highlightGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .highlightGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .statCard {
          display: grid;
          gap: 8px;
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
          font-size: 18px;
          font-weight: 600;
          line-height: 1;
        }
      `}</style>
    </div>
  );
}

function Info({ label, value, emphasis = false }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong className={emphasis ? "emphasis" : ""}>
        {formatValue(value)}
      </strong>

      <style jsx>{`
        .info {
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

        strong.emphasis {
          color: var(--color-brand);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function MetaPill({ label, value }) {
  return (
    <span className="metaPill">
      <small>{label}</small>
      {formatValue(value)}

      <style jsx>{`
        .metaPill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid var(--color-border-soft);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
        }

        small {
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}</style>
    </span>
  );
}

function ActionBadge({ action }) {
  const variant =
    action === "QA_RESULT_OVERRIDE"
      ? "warning"
      : action === "QA_RELEASE_REVIEW"
        ? "success"
        : action === "UPDATE_TEST_DATA"
          ? "info"
          : action === "UPDATE_SAMPLE_STATUS"
            ? "brand"
            : "neutral";

  return (
    <Badge variant={variant} size="sm">
      {formatAction(action)}
    </Badge>
  );
}

function extractSampleId(details) {
  if (!details || typeof details !== "object") return null;
  return details.sample_id || details?.test_data?.sample_id || null;
}

function getUserDisplay(log) {
  return (
    log.user_name ||
    log.user_display ||
    log.user_full_name ||
    log.actor_name ||
    log.actor_display ||
    formatUser(log.user_id)
  );
}

function formatAction(action) {
  if (!action) return "-";

  return String(action)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLabel(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatUser(userId) {
  if (!userId) return "-";

  const value = String(userId);

  if (Number.isNaN(Number(value))) {
    return value;
  }

  return `User ${value}`;
}