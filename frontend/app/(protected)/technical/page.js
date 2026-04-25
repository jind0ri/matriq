"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const LIFECYCLE_STATES = [
  "Registered",
  "Ready for Testing",
  "In Testing",
  "For Review",
  "Released",
  "Archived",
];

const RECENT_SAMPLE_COLUMNS = [
  { key: "sample_id", label: "Sample ID" },
  { key: "material_type", label: "Material" },
  { key: "client_name", label: "Client" },
  { key: "branch_id", label: "Branch" },
  { key: "current_state", label: "Status" },
  { key: "result", label: "Result" },
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
          <p className="kicker">Technical Module</p>
          <h1 className="page-title">{getDashboardTitle(role)}</h1>
          <p className="page-subtitle">
            {isAdmin
              ? "Administrator oversight for sample lifecycle, testing activity, QA review, and released reports."
              : "Operational overview for sample testing, QA review, and laboratory workflow monitoring."}
          </p>
        </div>

        <Button onClick={loadDashboard} variant="primary">
          Refresh
        </Button>
      </div>

      {isAdmin && (
        <div className="adminNotice">
          <strong>Administrator Oversight Mode</strong>
          <span>
            This dashboard is for monitoring technical operations. Routine
            testing, classification review, and QA release actions remain
            assigned to their respective operational roles.
          </span>
        </div>
      )}

      {loading && <Loader label="Loading technical dashboard..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="statsRow">
            {roleCards.map((item) => (
              <StatCard
                key={item.label}
                label={item.label}
                value={item.value}
                note={item.note}
                variant={item.variant}
              />
            ))}
          </div>

          <div className="dashboardGrid">
            <Card
              title="Sample Lifecycle Distribution"
              subtitle="Current movement of samples through the laboratory workflow."
              className="largePanel"
              actions={
                <Link href="/technical/registry" className="panelLink">
                  View Registry
                </Link>
              }
            >
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
            </Card>

            <Card
              title="System Result Summary"
              subtitle="QA final result is counted when available."
            >
              <div className="resultGrid">
                <ResultTile
                  label="PASS"
                  value={testResultCounts.pass}
                  variant="success"
                />
                <ResultTile
                  label="FAIL"
                  value={testResultCounts.fail}
                  variant="danger"
                />
                <ResultTile
                  label="RECORDED"
                  value={testResultCounts.recorded}
                  variant="info"
                />
                <ResultTile
                  label="NO RESULT"
                  value={testResultCounts.noResult}
                  variant="neutral"
                />
              </div>
            </Card>

            <Card
              title="Material Distribution"
              subtitle="Most common registered sample materials."
            >
              <div className="miniBarList">
                {materialCounts.length === 0 && (
                  <EmptyState
                    title="No material data yet"
                    description="Material distribution will appear after samples are registered."
                  />
                )}

                {materialCounts.map((item) => {
                  const width = Math.max(
                    6,
                    (item.value / maxMaterialValue) * 100,
                  );

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
            </Card>

            <Card
              title="Payment Readiness"
              subtitle="Financial status affecting testing and report release."
            >
              <div className="paymentGrid">
                <PaymentTile label="Unpaid" value={paymentCounts.unpaid} />
                <PaymentTile
                  label="Downpayment"
                  value={paymentCounts.downpayment}
                />
                <PaymentTile label="PO Submitted" value={paymentCounts.po} />
                <PaymentTile
                  label="Fully Paid"
                  value={paymentCounts.fullyPaid}
                />
              </div>
            </Card>

            <Card
              title={getActionTitle(role)}
              subtitle={getActionSubtitle(role)}
            >
              <div className="actionLinks">
                {isLabTech && (
                  <>
                    <ActionLink href="/technical/intake">
                      Register Sample
                    </ActionLink>
                    <ActionLink href="/technical/workflow">
                      Start Testing Queue
                    </ActionLink>
                    <ActionLink href="/technical/registry">
                      Open Registry
                    </ActionLink>
                  </>
                )}

                {isSeniorTech && (
                  <>
                    <ActionLink href="/technical/workflow">
                      Review AI Classifications
                    </ActionLink>
                    <ActionLink href="/technical/registry">
                      Open Registry
                    </ActionLink>
                  </>
                )}

                {isQa && (
                  <>
                    <ActionLink href="/technical/workflow">
                      QA Review Queue
                    </ActionLink>
                    <ActionLink href="/technical/reports">
                      Released Reports
                    </ActionLink>
                    <ActionLink href="/technical/registry">
                      Open Registry
                    </ActionLink>
                  </>
                )}

                {isAdmin && (
                  <>
                    <ActionLink href="/technical/workflow">
                      Workflow Oversight
                    </ActionLink>
                    <ActionLink href="/technical/reports">
                      Technical Reports
                    </ActionLink>
                    <ActionLink href="/admin/audit-logs">
                      Audit Logs
                    </ActionLink>
                  </>
                )}
              </div>
            </Card>
          </div>

          <Card
            title="Recent Samples"
            subtitle="Latest sample records visible to the technical module."
            actions={
              <Link href="/technical/registry" className="panelLink">
                View All
              </Link>
            }
          >
            <Table
              columns={RECENT_SAMPLE_COLUMNS}
              data={recentSamples}
              emptyText="No samples registered yet."
              renderRow={(sample) => {
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
              }}
            />
          </Card>
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
          gap: 16px;
        }

        .adminNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          background: var(--color-info-bg);
          color: var(--color-info);
          border: 1px solid var(--color-info-border);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .adminNotice strong {
          color: var(--color-info);
          font-size: var(--text-sm);
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 800;
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

        :global(.largePanel) {
          grid-row: span 2;
        }

        .panelLink {
          color: var(--color-brand);
          font-size: var(--text-sm);
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .panelLink:hover {
          color: var(--color-brand-dark);
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
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          font-weight: 850;
        }

        .barMeta strong,
        .miniBarText strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 900;
        }

        .barTrack,
        .miniTrack {
          width: 100%;
          height: 12px;
          border-radius: var(--radius-full);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          overflow: hidden;
        }

        .barFill,
        .miniFill {
          height: 100%;
          border-radius: var(--radius-full);
        }

        .lifeRegistered,
        .lifeReady,
        .lifeReview,
        .lifeDefault,
        .miniFill {
          background: var(--color-brand);
        }

        .lifeTesting {
          background: var(--color-warning);
        }

        .lifeReleased {
          background: var(--color-success);
        }

        .lifeArchived {
          background: var(--color-text-muted);
        }

        .resultGrid,
        .paymentGrid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .resultTile,
        .paymentTile {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          padding: 14px;
          display: grid;
          gap: 8px;
          background: var(--color-surface);
        }

        .resultTile span,
        .paymentTile span {
          font-size: var(--text-xs);
          font-weight: 900;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .resultTile strong,
        .paymentTile strong {
          font-size: var(--text-xl);
          color: var(--color-text-primary);
          line-height: 1;
        }

        .resultTile.success {
          border-color: var(--color-success-border);
          background: var(--color-success-bg);
        }

        .resultTile.danger {
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        .resultTile.info {
          border-color: var(--color-info-border);
          background: var(--color-info-bg);
        }

        .resultTile.neutral {
          border-color: var(--color-border);
          background: var(--color-overlay);
        }

        .miniBarList {
          display: grid;
          gap: 13px;
        }

        .miniBarRow {
          display: grid;
          gap: 7px;
        }

        .actionLinks {
          display: grid;
          gap: 10px;
        }

        .actionLink {
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-decoration: none;
          color: var(--color-text-primary);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 12px 14px;
          font-size: var(--text-sm);
          font-weight: 900;
          box-shadow: none;
        }

        .actionLink:hover {
          background: var(--color-overlay);
          border-color: var(--color-border-strong);
          transform: translateY(-1px);
          box-shadow: var(--shadow-xs);
        }

        .actionLink span {
          color: var(--color-brand);
          font-size: var(--text-sm);
        }

        .sampleLink {
          color: var(--color-brand);
          font-weight: 900;
          text-decoration: none;
        }

        .sampleLink:hover {
          color: var(--color-brand-dark);
        }

        @media (max-width: 1100px) {
          .statsRow,
          .dashboardGrid {
            grid-template-columns: 1fr 1fr;
          }

          :global(.largePanel) {
            grid-row: auto;
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 720px) {
          .header {
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

function ResultTile({ label, value, variant }) {
  return (
    <div className={`resultTile ${variant}`}>
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

function ActionLink({ href, children }) {
  return (
    <Link href={href} className="actionLink">
      {children}
      <span>Open</span>
    </Link>
  );
}

function LifecycleBadge({ status }) {
  const variant =
    status === "Released"
      ? "success"
      : status === "In Testing"
        ? "warning"
        : status === "For Review" || status === "Ready for Testing"
          ? "info"
          : status === "Archived"
            ? "neutral"
            : "brand";

  return <Badge variant={variant}>{status || "-"}</Badge>;
}

function ResultBadge({ result }) {
  const variant =
    result === "PASS"
      ? "success"
      : result === "FAIL"
        ? "danger"
        : result === "RECORDED"
          ? "info"
          : "neutral";

  return <Badge variant={variant}>{result || "No Result"}</Badge>;
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
        variant: "info",
      },
      {
        label: "In Testing",
        value: lifecycleCounts["In Testing"] || 0,
        note: "Active testing workload",
        variant: "warning",
      },
      {
        label: "Registered",
        value: dashboard.registered ?? lifecycleCounts.Registered ?? 0,
        note: "Samples awaiting routing",
        variant: "brand",
      },
      {
        label: "No Result Yet",
        value: testResultCounts.noResult,
        note: "Samples without entered results",
        variant: "neutral",
      },
    ];
  }

  if (role === "Senior Technician") {
    return [
      {
        label: "Manual Review",
        value: dashboard.manual_review ?? 0,
        note: "AI classifications needing review",
        variant: "warning",
      },
      {
        label: "Mandatory Override",
        value: dashboard.mandatory_override ?? 0,
        note: "Low-confidence classifications",
        variant: "danger",
      },
      {
        label: "Completed Reviews",
        value: dashboard.completed_reviews ?? 0,
        note: "Reviewed classification cases",
        variant: "success",
      },
      {
        label: "Registered",
        value: dashboard.registered ?? 0,
        note: "Current registered samples",
        variant: "brand",
      },
    ];
  }

  if (role === "QA Engineer") {
    return [
      {
        label: "For Review",
        value: lifecycleCounts["For Review"] || 0,
        note: "Reports requiring QA review",
        variant: "info",
      },
      {
        label: "Released",
        value: lifecycleCounts.Released || 0,
        note: "Finalized official reports",
        variant: "success",
      },
      {
        label: "Failed Results",
        value: testResultCounts.fail,
        note: "Requires careful QA review",
        variant: "danger",
      },
      {
        label: "Fully Paid",
        value: paymentCounts.fullyPaid,
        note: "Financially cleared samples",
        variant: "brand",
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
      variant: "brand",
    },
    {
      label: "For Review",
      value: lifecycleCounts["For Review"] || 0,
      note: "Awaiting QA authorization",
      variant: "info",
    },
    {
      label: "Released",
      value: lifecycleCounts.Released || 0,
      note: "Finalized official reports",
      variant: "success",
    },
    {
      label: "Manual Review",
      value: dashboard.manual_review ?? 0,
      note: "AI classification review cases",
      variant: "warning",
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