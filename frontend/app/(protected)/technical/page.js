"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, getStoredUser } from "@/services/apiClient";

const LIFECYCLE_STATES = [
  "Registered",
  "Ready for Testing",
  "In Testing",
  "For Review",
  "Released",
  "Archived",
];

export default function TechnicalDashboardPage() {
  const user = getStoredUser();

  const [dashboard, setDashboard] = useState({
    registered: 0,
    manual_review: 0,
    mandatory_override: 0,
    completed_reviews: 0,
    recent_samples: [],
  });

  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [dashboardData, sampleData] = await Promise.all([
        apiClient.getDashboard(),
        apiClient.getSamples(),
      ]);

      setDashboard(
        dashboardData || {
          registered: 0,
          manual_review: 0,
          mandatory_override: 0,
          completed_reviews: 0,
          recent_samples: [],
        },
      );

      setSamples(Array.isArray(sampleData) ? sampleData : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const role = user?.role || "Technical User";
  const isLabTech = role === "Lab Technician";
  const isSeniorTech = role === "Senior Technician";
  const isQa = role === "QA Engineer";
  const isAdmin = role === "Administrator";

  const lifecycleCounts = useMemo(() => {
    const counts = {};

    LIFECYCLE_STATES.forEach((state) => {
      counts[state] = 0;
    });

    samples.forEach((sample) => {
      const state = sample.current_state || sample.status || "Registered";
      counts[state] = (counts[state] || 0) + 1;
    });

    return counts;
  }, [samples]);

  const materialCounts = useMemo(() => {
    const counts = {};

    samples.forEach((sample) => {
      const material = sample.material_type || "Unspecified";
      counts[material] = (counts[material] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [samples]);

  const testResultCounts = useMemo(() => {
    return samples.reduce(
      (acc, sample) => {
        const testData = sample.device_metadata?.test_data || {};
        const finalResult = getFinalResult(testData);

        if (finalResult === "PASS") acc.pass += 1;
        else if (finalResult === "FAIL") acc.fail += 1;
        else if (finalResult === "RECORDED") acc.recorded += 1;
        else acc.noResult += 1;

        return acc;
      },
      {
        pass: 0,
        fail: 0,
        recorded: 0,
        noResult: 0,
      },
    );
  }, [samples]);

  const paymentCounts = useMemo(() => {
    return samples.reduce(
      (acc, sample) => {
        const status =
          sample.device_metadata?.payment?.payment_status || "Unpaid";

        if (status === "Fully Paid") acc.fullyPaid += 1;
        else if (status === "Downpayment Paid") acc.downpayment += 1;
        else if (status === "PO Submitted") acc.po += 1;
        else acc.unpaid += 1;

        return acc;
      },
      {
        unpaid: 0,
        downpayment: 0,
        po: 0,
        fullyPaid: 0,
      },
    );
  }, [samples]);

  const recentSamples = useMemo(() => {
    const source =
      Array.isArray(dashboard.recent_samples) &&
      dashboard.recent_samples.length > 0
        ? dashboard.recent_samples
        : samples;

    return [...source].slice(0, 8);
  }, [dashboard.recent_samples, samples]);

  const roleCards = getRoleCards({
    role,
    lifecycleCounts,
    dashboard,
    testResultCounts,
    paymentCounts,
  });

  const maxLifecycleValue = Math.max(
    1,
    ...Object.values(lifecycleCounts).map((value) => Number(value) || 0),
  );

  const maxMaterialValue = Math.max(
    1,
    ...materialCounts.map((item) => Number(item.value) || 0),
  );

  return (
    <div className="page">
      <div className="header">
        <div>
          <p className="eyebrow">Technical Module</p>
          <h1>{getDashboardTitle(role)}</h1>
          <p>
            {isAdmin
              ? "Administrator oversight for sample lifecycle, testing activity, QA review, and released reports."
              : "Operational overview for sample testing, QA review, and laboratory workflow monitoring."}
          </p>
        </div>

        <button className="refreshButton" onClick={loadDashboard}>
          Refresh
        </button>
      </div>

      {isAdmin && (
        <div className="notice adminNotice">
          <strong>Administrator Oversight Mode</strong>
          <span>
            This dashboard is for monitoring technical operations. Routine
            testing, classification review, and QA release actions remain
            assigned to their respective operational roles.
          </span>
        </div>
      )}

      {loading && <div className="card">Loading technical dashboard...</div>}
      {!loading && error && <div className="card error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="statsRow">
            {roleCards.map((item) => (
              <StatCard
                key={item.label}
                label={item.label}
                value={item.value}
                note={item.note}
              />
            ))}
          </div>

          <div className="dashboardGrid">
            <section className="panel largePanel">
              <div className="panelHeader">
                <div>
                  <h2>Sample Lifecycle Distribution</h2>
                  <p>Current movement of samples through the laboratory workflow.</p>
                </div>

                <Link href="/technical/registry">View Registry</Link>
              </div>

              <div className="barList">
                {LIFECYCLE_STATES.map((state) => {
                  const value = lifecycleCounts[state] || 0;
                  const width = Math.max(5, (value / maxLifecycleValue) * 100);

                  return (
                    <div className="barRow" key={state}>
                      <div className="barMeta">
                        <span>{state}</span>
                        <strong>{value}</strong>
                      </div>

                      <div className="barTrack">
                        <div
                          className={`barFill ${getLifecycleClass(state)}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2>System Result Summary</h2>
                  <p>QA final result is counted when available.</p>
                </div>
              </div>

              <div className="resultGrid">
                <ResultTile label="PASS" value={testResultCounts.pass} tone="pass" />
                <ResultTile label="FAIL" value={testResultCounts.fail} tone="fail" />
                <ResultTile
                  label="RECORDED"
                  value={testResultCounts.recorded}
                  tone="recorded"
                />
                <ResultTile
                  label="NO RESULT"
                  value={testResultCounts.noResult}
                  tone="empty"
                />
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Material Distribution</h2>
                  <p>Most common registered sample materials.</p>
                </div>
              </div>

              <div className="miniBarList">
                {materialCounts.length === 0 && (
                  <div className="emptyText">No material data yet.</div>
                )}

                {materialCounts.map((item) => {
                  const width = Math.max(6, (item.value / maxMaterialValue) * 100);

                  return (
                    <div className="miniBarRow" key={item.label}>
                      <div className="miniBarText">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>

                      <div className="miniTrack">
                        <div
                          className="miniFill"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div>
                  <h2>Payment Readiness</h2>
                  <p>Financial status affecting testing and report release.</p>
                </div>
              </div>

              <div className="paymentGrid">
                <PaymentTile label="Unpaid" value={paymentCounts.unpaid} />
                <PaymentTile
                  label="Downpayment"
                  value={paymentCounts.downpayment}
                />
                <PaymentTile label="PO Submitted" value={paymentCounts.po} />
                <PaymentTile label="Fully Paid" value={paymentCounts.fullyPaid} />
              </div>
            </section>

            <section className="panel actionsPanel">
              <div className="panelHeader">
                <div>
                  <h2>{getActionTitle(role)}</h2>
                  <p>{getActionSubtitle(role)}</p>
                </div>
              </div>

              <div className="actionLinks">
                {isLabTech && (
                  <>
                    <Link href="/technical/intake">Register Sample</Link>
                    <Link href="/technical/workflow">Start Testing Queue</Link>
                    <Link href="/technical/registry">Open Registry</Link>
                  </>
                )}

                {isSeniorTech && (
                  <>
                    <Link href="/technical/workflow">
                      Review AI Classifications
                    </Link>
                    <Link href="/technical/registry">Open Registry</Link>
                  </>
                )}

                {isQa && (
                  <>
                    <Link href="/technical/workflow">QA Review Queue</Link>
                    <Link href="/technical/reports">Released Reports</Link>
                    <Link href="/technical/registry">Open Registry</Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <Link href="/technical/workflow">Workflow Oversight</Link>
                    <Link href="/technical/reports">Technical Reports</Link>
                    <Link href="/admin/audit-logs">Audit Logs</Link>
                  </>
                )}
              </div>
            </section>
          </div>

          <section className="tableSection">
            <div className="tableHeader">
              <div>
                <h2>Recent Samples</h2>
                <p>Latest sample records visible to the technical module.</p>
              </div>

              <Link href="/technical/registry">View All</Link>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Material</th>
                    <th>Client</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Result</th>
                  </tr>
                </thead>

                <tbody>
                  {recentSamples.map((sample) => {
                    const testData = sample.device_metadata?.test_data || {};
                    const finalResult = getFinalResult(testData);

                    return (
                      <tr key={sample.sample_id}>
                        <td>
                          <Link
                            href={`/technical/tracking/${sample.sample_id}`}
                            className="sampleLink"
                          >
                            {sample.sample_id}
                          </Link>
                        </td>
                        <td>{sample.material_type || "-"}</td>
                        <td>{sample.client_name || "-"}</td>
                        <td>{formatBranch(sample.branch_id)}</td>
                        <td>
                          <LifecycleBadge status={sample.current_state} />
                        </td>
                        <td>
                          <ResultBadge result={finalResult} />
                        </td>
                      </tr>
                    );
                  })}

                  {recentSamples.length === 0 && (
                    <tr>
                      <td colSpan="6" className="emptyCell">
                        No samples registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
          color: #111827;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
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
          color: #111827;
          font-size: 28px;
          letter-spacing: -0.02em;
        }

        .header p {
          margin: 6px 0 0;
          color: #4b5563;
          font-size: 14px;
          line-height: 1.5;
        }

        .refreshButton {
          border: none;
          border-radius: 12px;
          padding: 11px 15px;
          font-weight: 900;
          cursor: pointer;
          background: #111827;
          color: #ffffff;
        }

        .notice {
          display: grid;
          gap: 4px;
          border-radius: 16px;
          padding: 14px 16px;
          font-size: 13px;
          line-height: 1.5;
        }

        .adminNotice {
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }

        .notice strong {
          color: #1d4ed8;
        }

        .card,
        .panel,
        .tableSection,
        .statCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
        }

        .card {
          padding: 20px;
        }

        .error {
          color: #b91c1c;
          border-color: #fecaca;
          background: #fff7f7;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .dashboardGrid {
          display: grid;
          grid-template-columns: 1.35fr 1fr;
          gap: 18px;
          align-items: stretch;
        }

        .panel {
          padding: 20px;
        }

        .largePanel {
          grid-row: span 2;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .panelHeader h2,
        .tableHeader h2 {
          margin: 0;
          color: #111827;
          font-size: 17px;
        }

        .panelHeader p,
        .tableHeader p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }

        .panelHeader :global(a),
        .tableHeader :global(a) {
          color: #4f46e5;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .barList {
          display: grid;
          gap: 15px;
        }

        .barRow {
          display: grid;
          gap: 7px;
        }

        .barMeta,
        .miniBarText {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
        }

        .barMeta span,
        .miniBarText span {
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .barMeta strong,
        .miniBarText strong {
          color: #111827;
          font-size: 13px;
          font-weight: 900;
        }

        .barTrack,
        .miniTrack {
          width: 100%;
          height: 12px;
          border-radius: 999px;
          background: #f1f5f9;
          overflow: hidden;
        }

        .barFill,
        .miniFill {
          height: 100%;
          border-radius: 999px;
        }

        .lifeRegistered {
          background: #6366f1;
        }

        .lifeReady {
          background: #2563eb;
        }

        .lifeTesting {
          background: #ca8a04;
        }

        .lifeReview {
          background: #f97316;
        }

        .lifeReleased {
          background: #16a34a;
        }

        .lifeArchived {
          background: #64748b;
        }

        .lifeDefault,
        .miniFill {
          background: #4f46e5;
        }

        .resultGrid,
        .paymentGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .resultTile,
        .paymentTile {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 8px;
          background: #f8fafc;
        }

        .resultTile span,
        .paymentTile span {
          font-size: 11px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .resultTile strong,
        .paymentTile strong {
          font-size: 24px;
          color: #111827;
        }

        .tonePass {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .toneFail {
          background: #fff7f7;
          border-color: #fecaca;
        }

        .toneRecorded {
          background: #eef2ff;
          border-color: #c7d2fe;
        }

        .toneEmpty {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .miniBarList {
          display: grid;
          gap: 13px;
        }

        .miniBarRow {
          display: grid;
          gap: 7px;
        }

        .emptyText {
          color: #64748b;
          font-size: 13px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 14px;
        }

        .actionsPanel {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        }

        .actionLinks {
          display: grid;
          gap: 10px;
        }

        .actionLinks :global(a) {
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-decoration: none;
          color: #111827;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 900;
        }

        .actionLinks :global(a)::after {
          content: "→";
          color: #4f46e5;
        }

        .tableSection {
          padding: 20px;
        }

        .tableHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .tableWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          text-align: left;
          padding: 12px 10px;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
          white-space: nowrap;
        }

        td {
          padding: 14px 10px;
          border-bottom: 1px solid #eef2f7;
          color: #111827;
          font-size: 13px;
          font-weight: 700;
          vertical-align: middle;
        }

        .sampleLink {
          color: #4f46e5;
          font-weight: 900;
          text-decoration: none;
        }

        .emptyCell {
          text-align: center;
          color: #64748b;
          padding: 24px;
        }

        .badge {
          display: inline-flex;
          width: fit-content;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .statusRegistered {
          background: #eef2ff;
          color: #3730a3;
        }

        .statusReady {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .statusTesting {
          background: #fef9c3;
          color: #854d0e;
        }

        .statusReview {
          background: #fff7ed;
          color: #c2410c;
        }

        .statusReleased {
          background: #dcfce7;
          color: #166534;
        }

        .statusArchived,
        .statusDefault {
          background: #f1f5f9;
          color: #475569;
        }

        .resultPass {
          background: #dcfce7;
          color: #166534;
        }

        .resultFail {
          background: #fee2e2;
          color: #991b1b;
        }

        .resultRecorded {
          background: #e0e7ff;
          color: #3730a3;
        }

        .resultEmpty {
          background: #f1f5f9;
          color: #475569;
        }

        @media (max-width: 1100px) {
          .statsRow,
          .dashboardGrid {
            grid-template-columns: 1fr 1fr;
          }

          .largePanel {
            grid-row: auto;
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 720px) {
          .header,
          .panelHeader,
          .tableHeader {
            flex-direction: column;
          }

          .statsRow,
          .dashboardGrid,
          .resultGrid,
          .paymentGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, note }) {
  return (
    <div className="statCard">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
      {note && <small>{note}</small>}

      <style jsx>{`
        .statCard {
          padding: 18px;
          display: grid;
          gap: 6px;
        }

        .statCard span {
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .statCard strong {
          color: #111827;
          font-size: 30px;
          line-height: 1;
        }

        .statCard small {
          color: #64748b;
          font-size: 12px;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

function ResultTile({ label, value, tone }) {
  return (
    <div className={`resultTile tone${capitalize(tone)}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PaymentTile({ label, value }) {
  return (
    <div className="paymentTile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LifecycleBadge({ status }) {
  const cls =
    status === "Registered"
      ? "statusRegistered"
      : status === "Ready for Testing"
        ? "statusReady"
        : status === "In Testing"
          ? "statusTesting"
          : status === "For Review"
            ? "statusReview"
            : status === "Released"
              ? "statusReleased"
              : status === "Archived"
                ? "statusArchived"
                : "statusDefault";

  return <span className={`badge ${cls}`}>{status || "-"}</span>;
}

function ResultBadge({ result }) {
  const cls =
    result === "PASS"
      ? "resultPass"
      : result === "FAIL"
        ? "resultFail"
        : result === "RECORDED"
          ? "resultRecorded"
          : "resultEmpty";

  return <span className={`badge ${cls}`}>{result || "No Result"}</span>;
}

function getDashboardTitle(role) {
  if (role === "Lab Technician") return "Lab Technician Dashboard";
  if (role === "Senior Technician") return "Senior Technician Dashboard";
  if (role === "QA Engineer") return "QA Engineer Dashboard";
  if (role === "Administrator") return "Technical Oversight Dashboard";
  return "Sample Real-Time Monitor";
}

function getRoleCards({
  role,
  lifecycleCounts,
  dashboard,
  testResultCounts,
  paymentCounts,
}) {
  if (role === "Lab Technician") {
    return [
      {
        label: "Ready for Testing",
        value: lifecycleCounts["Ready for Testing"] || 0,
        note: "Samples cleared for lab work",
      },
      {
        label: "In Testing",
        value: lifecycleCounts["In Testing"] || 0,
        note: "Active testing workload",
      },
      {
        label: "Registered",
        value: dashboard.registered ?? lifecycleCounts.Registered ?? 0,
        note: "Samples awaiting routing",
      },
      {
        label: "No Result Yet",
        value: testResultCounts.noResult,
        note: "Samples without entered results",
      },
    ];
  }

  if (role === "Senior Technician") {
    return [
      {
        label: "Manual Review",
        value: dashboard.manual_review ?? 0,
        note: "AI classifications needing review",
      },
      {
        label: "Mandatory Override",
        value: dashboard.mandatory_override ?? 0,
        note: "Low-confidence classifications",
      },
      {
        label: "Completed Reviews",
        value: dashboard.completed_reviews ?? 0,
        note: "Reviewed classification cases",
      },
      {
        label: "Registered",
        value: dashboard.registered ?? 0,
        note: "Current registered samples",
      },
    ];
  }

  if (role === "QA Engineer") {
    return [
      {
        label: "For Review",
        value: lifecycleCounts["For Review"] || 0,
        note: "Reports requiring QA review",
      },
      {
        label: "Released",
        value: lifecycleCounts.Released || 0,
        note: "Finalized official reports",
      },
      {
        label: "Failed Results",
        value: testResultCounts.fail,
        note: "Requires careful QA review",
      },
      {
        label: "Fully Paid",
        value: paymentCounts.fullyPaid,
        note: "Financially cleared samples",
      },
    ];
  }

  return [
    {
      label: "Total Samples",
      value: Object.values(lifecycleCounts).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      ),
      note: "All visible technical records",
    },
    {
      label: "For Review",
      value: lifecycleCounts["For Review"] || 0,
      note: "Awaiting QA authorization",
    },
    {
      label: "Released",
      value: lifecycleCounts.Released || 0,
      note: "Finalized official reports",
    },
    {
      label: "Manual Review",
      value: dashboard.manual_review ?? 0,
      note: "AI classification review cases",
    },
  ];
}

function getActionTitle(role) {
  if (role === "Lab Technician") return "Lab Technician Actions";
  if (role === "Senior Technician") return "Senior Technician Actions";
  if (role === "QA Engineer") return "QA Engineer Actions";
  if (role === "Administrator") return "Oversight Links";
  return "Workflow Actions";
}

function getActionSubtitle(role) {
  if (role === "Lab Technician") {
    return "Register and process samples assigned for laboratory testing.";
  }

  if (role === "Senior Technician") {
    return "Review low-confidence AI classifications and manual override cases.";
  }

  if (role === "QA Engineer") {
    return "Review testing results, override when justified, and release reports.";
  }

  if (role === "Administrator") {
    return "Monitor technical operations and inspect audit activity.";
  }

  return "Open available workflow modules.";
}

function getLifecycleClass(state) {
  if (state === "Registered") return "lifeRegistered";
  if (state === "Ready for Testing") return "lifeReady";
  if (state === "In Testing") return "lifeTesting";
  if (state === "For Review") return "lifeReview";
  if (state === "Released") return "lifeReleased";
  if (state === "Archived") return "lifeArchived";
  return "lifeDefault";
}

function getFinalResult(testData) {
  if (!testData) return null;
  return testData.qa_final_result || testData.result || null;
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId || "-";
}

function capitalize(value) {
  if (!value) return "";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}