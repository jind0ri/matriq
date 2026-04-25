"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";

export default function ReportsPage() {
  const [samples, setSamples] = useState([]);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getSamples();
      setSamples(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const releasedReports = useMemo(() => {
    const q = search.trim().toLowerCase();

    return samples
      .filter((item) => item.current_state === "Released")
      .filter((item) => {
        const testData = item.device_metadata?.test_data || {};
        const finalResult = getFinalResult(testData);

        const matchesResult =
          resultFilter === "All" || finalResult === resultFilter;

        const matchesSearch =
          !q ||
          item.sample_id?.toLowerCase().includes(q) ||
          item.client_name?.toLowerCase().includes(q) ||
          item.project_reference?.toLowerCase().includes(q) ||
          item.material_type?.toLowerCase().includes(q) ||
          testData.test_type?.toLowerCase().includes(q);

        return matchesResult && matchesSearch;
      });
  }, [samples, search, resultFilter]);

  const stats = useMemo(() => {
    return samples.reduce(
      (acc, item) => {
        if (item.current_state !== "Released") return acc;

        acc.total += 1;

        const testData = item.device_metadata?.test_data || {};
        const finalResult = getFinalResult(testData);

        if (finalResult === "PASS") acc.pass += 1;
        else if (finalResult === "FAIL") acc.fail += 1;
        else if (finalResult === "RECORDED") acc.recorded += 1;
        else acc.noResult += 1;

        return acc;
      },
      {
        total: 0,
        pass: 0,
        fail: 0,
        recorded: 0,
        noResult: 0,
      },
    );
  }, [samples]);

  return (
    <div className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Reports Module</p>
          <h1>Official Reports</h1>
          <p className="subtitle">
            Released laboratory reports finalized through QA authorization.
          </p>
        </div>

        <button className="refreshButton" onClick={loadReports}>
          Refresh
        </button>
      </div>

      <div className="notice">
        Reports shown here are finalized sample records. A failed result may
        still appear as a released report because the report documents the
        actual laboratory outcome; it does not independently certify material
        acceptance.
      </div>

      <div className="stats">
        <StatCard label="Released Reports" value={stats.total} />
        <StatCard label="PASS" value={stats.pass} />
        <StatCard label="FAIL" value={stats.fail} />
        <StatCard label="RECORDED" value={stats.recorded} />
      </div>

      <div className="toolbar">
        <div className="searchBox">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample ID, client, project, material, or test type..."
          />
        </div>

        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
        >
          <option value="All">All Results</option>
          <option value="PASS">PASS</option>
          <option value="FAIL">FAIL</option>
          <option value="RECORDED">RECORDED</option>
        </select>
      </div>

      {loading && <div className="card">Loading released reports...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <div className="reportsList">
          {releasedReports.length === 0 && (
            <div className="card emptyState">
              <h2>No released reports found</h2>
              <p>
                Reports will appear here after QA releases an official
                laboratory report.
              </p>

              <Link href="/technical/registry" className="secondaryLink">
                Go to Registry
              </Link>
            </div>
          )}

          {releasedReports.map((item) => {
            const metadata = item.device_metadata || {};
            const testData = metadata.test_data || {};
            const testValues = testData.values || {};
            const payment = metadata.payment || {};
            const qa = metadata.qa || {};
            const systemResult = getSystemResult(testData);
            const finalResult = getFinalResult(testData);
            const qaOverride = testData.qa_override || null;

            return (
              <article className="reportCard" key={item.sample_id}>
                <div className="cardTop">
                  <div>
                    <p className="reportLabel">Official Laboratory Report</p>
                    <h2>{item.sample_id}</h2>
                    <p className="reportSubtext">
                      {item.client_name || "No client"} •{" "}
                      {item.project_reference || "No project"}
                    </p>
                  </div>

                  <div className="badgeGroup">
                    <ResultBadge result={finalResult} />
                    <span className="releasedBadge">Released</span>
                  </div>
                </div>

                <div className="summaryGrid">
                  <Info label="Client" value={item.client_name} />
                  <Info label="Project" value={item.project_reference} />
                  <Info label="Material" value={item.material_type} />
                  <Info
                    label="Test Type"
                    value={formatLabel(testData.test_type)}
                  />
                  <Info
                    label="Test Name"
                    value={testValues.test_name || formatLabel(testData.test_type)}
                  />
                  <Info
                    label="Applicable Standard"
                    value={testValues.standard}
                  />
                  <Info label="System Result" value={systemResult} />
                  <Info label="QA Final Result" value={finalResult} emphasis />
                  <Info
                    label="Payment Status"
                    value={payment.payment_status || "-"}
                  />
                  <Info
                    label="QA Released At"
                    value={formatDate(qa.release_reviewed_at)}
                  />
                </div>

                {qaOverride?.is_overridden && (
                  <div className="overrideBox">
                    <strong>QA Override Applied</strong>
                    <p>
                      Original system result was <b>{qaOverride.system_result}</b>.
                      QA finalized the report as{" "}
                      <b>{qaOverride.override_result}</b>.
                    </p>
                    <p>
                      <b>Reason:</b> {qaOverride.override_reason}
                    </p>
                  </div>
                )}

                <div className="actions">
                  <Link
                    href={`/technical/tracking/${item.sample_id}`}
                    className="primaryLink"
                  >
                    View Official Report
                  </Link>
                </div>
              </article>
            );
          })}
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

        .subtitle {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
        }

        .refreshButton {
          border: none;
          border-radius: 12px;
          padding: 11px 15px;
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
          grid-template-columns: 1fr 210px;
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

        .reportsList {
          display: grid;
          gap: 14px;
        }

        .card,
        .reportCard,
        .statCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
        }

        .card {
          padding: 22px;
        }

        .statCard {
          padding: 18px;
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

        .reportCard {
          overflow: hidden;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 22px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        }

        .reportLabel {
          margin: 0 0 6px;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .cardTop h2 {
          margin: 0;
          color: #111827;
          font-size: 22px;
        }

        .reportSubtext {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .badgeGroup {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .releasedBadge {
          display: inline-flex;
          border-radius: 999px;
          padding: 8px 12px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px 22px;
          padding: 22px;
        }

        .overrideBox {
          margin: 0 22px 18px;
          padding: 14px;
          border-radius: 16px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #9a3412;
          font-size: 13px;
          line-height: 1.5;
        }

        .overrideBox strong {
          display: block;
          margin-bottom: 4px;
          color: #7c2d12;
        }

        .overrideBox p {
          margin: 5px 0 0;
        }

        .actions {
          display: flex;
          justify-content: flex-end;
          padding: 18px 22px;
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
        }

        .primaryLink,
        .secondaryLink {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 900;
        }

        .primaryLink {
          background: #111827;
          color: white;
        }

        .secondaryLink {
          background: #f4f1ff;
          color: #14003a;
          margin-top: 12px;
        }

        .emptyState h2 {
          margin: 0 0 8px;
          color: #111827;
          font-size: 18px;
        }

        .emptyState p {
          margin: 0;
          color: #64748b;
          line-height: 1.5;
          font-size: 14px;
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        @media (max-width: 820px) {
          .header,
          .cardTop {
            flex-direction: column;
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .summaryGrid {
            grid-template-columns: 1fr;
          }

          .badgeGroup {
            justify-content: flex-start;
          }

          .actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value}</strong>
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
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info strong {
          color: #111827;
          font-size: 14px;
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

function ResultBadge({ result }) {
  const normalized = result || "RECORDED";

  const cls =
    normalized === "PASS"
      ? "pass"
      : normalized === "FAIL"
        ? "fail"
        : normalized === "RECORDED"
          ? "recorded"
          : "default";

  return (
    <span className={`resultBadge ${cls}`}>
      Result: {normalized}

      <style jsx>{`
        .resultBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .pass {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .fail {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .recorded {
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

function getSystemResult(testData) {
  return (
    testData?.system_result ||
    testData?.qa_override?.system_result ||
    testData?.result ||
    null
  );
}

function getFinalResult(testData) {
  return testData?.qa_final_result || testData?.result || null;
}

function formatLabel(value) {
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