"use client";

import { useEffect, useMemo, useState } from "react";
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
      const userId = log.user_id || "";
      const details = JSON.stringify(log.new_value || log.old_value || {});

      const matchesAction =
        actionFilter === "ALL" || action === actionFilter;

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
        <div className="card error">
          Only Administrators can access audit logs.
        </div>

        <style jsx>{`
          .page {
            padding: 24px;
            background: #f7f7fb;
            min-height: 100vh;
          }

          .card {
            background: #fff;
            border: 1px solid #e7e7ef;
            border-radius: 18px;
            padding: 18px;
          }

          .error {
            color: #b91c1c;
            border-color: #fecaca;
            background: #fff7f7;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Administrator Module</p>
          <h1>Audit Log Viewer</h1>
          <p>
            Trace system events, AI actions, testing updates, QA overrides,
            report release, and lifecycle changes.
          </p>
        </div>

        <button onClick={loadLogs}>Refresh</button>
      </div>

      <div className="notice">
        Audit logs support traceability and accountability. QA overrides should
        always show the original system result, QA final result, reviewer, time,
        and justification.
      </div>

      <div className="stats">
        <StatCard label="Total Events" value={stats.total} />
        <StatCard label="Test Data Entries" value={stats.testData} />
        <StatCard label="QA Overrides" value={stats.overrides} />
        <StatCard label="Report Releases" value={stats.releases} />
      </div>

      <div className="toolbar">
        <div className="searchBox">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, sample, endpoint, or details..."
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          {IMPORTANT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {action === "ALL" ? "All Actions" : formatAction(action)}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="card">Loading audit logs...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="logsList">
          {filteredLogs.length === 0 && (
            <div className="card empty">
              No audit logs match the current filters.
            </div>
          )}

          {filteredLogs.map((log, index) => (
            <AuditCard key={log.audit_id || index} log={log} />
          ))}
        </div>
      )}

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 28px;
          background: #f6f7fb;
          color: #111827;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 18px;
        }

        .eyebrow {
          margin: 0 0 6px;
          font-size: 12px;
          font-weight: 900;
          color: #4f46e5;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        h1 {
          margin: 0;
          font-size: 28px;
          color: #111827;
          letter-spacing: -0.02em;
        }

        p {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
        }

        button {
          border: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 800;
          cursor: pointer;
          background: #111827;
          color: #fff;
        }

        .notice {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
          padding: 14px 16px;
          border-radius: 16px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 16px;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 240px;
          gap: 12px;
          margin-bottom: 16px;
        }

        .searchBox {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 0 14px;
        }

        .searchBox span {
          color: #6b7280;
          font-weight: 900;
        }

        .searchBox input {
          width: 100%;
          border: none;
          outline: none;
          padding: 13px 0;
          background: transparent;
          color: #111827;
          font-size: 14px;
        }

        select {
          border: 1px solid #d1d5db;
          border-radius: 16px;
          padding: 0 12px;
          background: white;
          color: #111827;
          font-weight: 800;
        }

        .card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .logsList {
          display: grid;
          gap: 12px;
        }

        .empty {
          color: #475569;
        }

        @media (max-width: 820px) {
          .header {
            flex-direction: column;
          }

          .toolbar {
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

  return (
    <article className="auditCard">
      <div className="topRow">
        <div>
          <ActionBadge action={action} />
          <h2>{formatAction(action)}</h2>
          <p>{formatDate(log.timestamp)}</p>
        </div>

        <div className="metaRight">
          <span>User: {log.user_id || "-"}</span>
          <span>Sample: {log.sample_id || extractSampleId(details) || "-"}</span>
        </div>
      </div>

      <div className="infoGrid">
        <Info label="Endpoint" value={log.endpoint_accessed} />
        <Info label="Action" value={action} />
        <Info label="User ID" value={log.user_id} />
        <Info label="Sample ID" value={log.sample_id || extractSampleId(details)} />
      </div>

      {isOverride && (
        <div className="highlightBox override">
          <strong>QA Result Override</strong>
          <div className="highlightGrid">
            <Info label="System Result" value={details.system_result} />
            <Info label="Previous Result" value={details.previous_result} />
            <Info label="QA Final Result" value={details.qa_final_result} emphasis />
            <Info label="Override Reason" value={details.override_reason} />
          </div>
        </div>
      )}

      {isRelease && (
        <div className="highlightBox release">
          <strong>Official Report Released</strong>
          <div className="highlightGrid">
            <Info label="Status" value={details.status} />
            <Info label="Test Result" value={details.test_result} />
            <Info label="Release Note" value={details.release_note} />
          </div>
        </div>
      )}

      {isTestData && (
        <div className="highlightBox testing">
          <strong>Test Data Recorded</strong>
          <div className="highlightGrid">
            <Info
              label="Test Result"
              value={details.test_data?.result}
              emphasis
            />
            <Info
              label="Test Type"
              value={formatText(details.test_data?.test_type)}
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
          </div>
        </div>
      )}

      <details className="details">
        <summary>View raw audit details</summary>
        <pre>{JSON.stringify(details, null, 2)}</pre>
      </details>

      <style jsx>{`
        .auditCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
          overflow: hidden;
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 18px;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-bottom: 1px solid #e5e7eb;
        }

        h2 {
          margin: 8px 0 0;
          font-size: 18px;
          color: #111827;
        }

        p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .metaRight {
          display: grid;
          gap: 6px;
          justify-items: end;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
        }

        .infoGrid,
        .highlightGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          padding: 18px;
        }

        .highlightBox {
          margin: 0 18px 16px;
          border-radius: 16px;
          padding: 14px;
          border: 1px solid #e5e7eb;
        }

        .highlightBox strong {
          display: block;
          margin-bottom: 10px;
          font-size: 13px;
          color: #111827;
        }

        .highlightBox .highlightGrid {
          padding: 0;
        }

        .override {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .release {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .testing {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .details {
          border-top: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .details summary {
          cursor: pointer;
          padding: 14px 18px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        pre {
          margin: 0 18px 18px;
          max-height: 260px;
          overflow: auto;
          background: #0f172a;
          color: #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .topRow {
            flex-direction: column;
          }

          .metaRight {
            justify-items: start;
          }

          .infoGrid,
          .highlightGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </article>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .statCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }

        .statCard span {
          display: block;
          margin-bottom: 8px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .statCard strong {
          color: #111827;
          font-size: 30px;
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
        }

        .info span {
          color: #64748b;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info strong {
          color: #111827;
          font-size: 13px;
          line-height: 1.45;
          word-break: break-word;
        }

        .info strong.emphasis {
          color: #2563eb;
          font-weight: 900;
        }
      `}</style>
    </div>
  );
}

function ActionBadge({ action }) {
  const cls =
    action === "QA_RESULT_OVERRIDE"
      ? "override"
      : action === "QA_RELEASE_REVIEW"
        ? "release"
        : action === "UPDATE_TEST_DATA"
          ? "testing"
          : action === "UPDATE_SAMPLE_STATUS"
            ? "status"
            : "default";

  return (
    <span className={`badge ${cls}`}>
      {action || "-"}

      <style jsx>{`
        .badge {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 7px 11px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .override {
          background: #ffedd5;
          color: #9a3412;
          border: 1px solid #fed7aa;
        }

        .release {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .testing {
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .status {
          background: #e0e7ff;
          color: #3730a3;
          border: 1px solid #c7d2fe;
        }

        .default {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
        }
      `}</style>
    </span>
  );
}

function extractSampleId(details) {
  if (!details || typeof details !== "object") return null;
  return details.sample_id || details?.test_data?.sample_id || null;
}

function formatAction(action) {
  if (!action) return "-";

  return String(action)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatText(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
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