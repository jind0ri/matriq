"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";

const LIFECYCLE_STATES = [
  "Registered",
  "In Testing",
  "For Review",
  "Released",
  "Archived",
];

const RECENT_SAMPLE_COLUMNS = [
  { key: "sample_id", label: "Sample ID" },
  { key: "material_type", label: "Material" },
  { key: "branch_id", label: "Branch" },
  { key: "current_state", label: "Status" },
  { key: "action", label: "Action" },
];

const MATERIAL_COLORS = [
  "#4f6f8f",
  "#5b5f97",
  "#8a6f5a",
  "#9a7b4f",
  "#58745d",
  "#6b7280",
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
  const [branchFilter, setBranchFilter] = useState("All");
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
  const isAdmin = role === "Administrator";

  const visibleSamples = useMemo(() => {
    if (branchFilter === "All") return samples;

    return samples.filter((sample) => {
      if (branchFilter === "Marikina") return Number(sample.branch_id) === 1;
      if (branchFilter === "Pateros") return Number(sample.branch_id) === 2;
      return true;
    });
  }, [samples, branchFilter]);

  const lifecycleCounts = useMemo(() => {
    const counts = {};

    LIFECYCLE_STATES.forEach((state) => {
      counts[state] = 0;
    });

    visibleSamples.forEach((sample) => {
      const state = normalizeLifecycleState(
        sample.current_state || sample.status || "Registered",
      );

      counts[state] = (counts[state] || 0) + 1;
    });

    return counts;
  }, [visibleSamples]);

  const materialCounts = useMemo(() => {
    const counts = {};

    visibleSamples.forEach((sample) => {
      const material = sample.material_type || "Unspecified";
      counts[material] = (counts[material] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [visibleSamples]);

  const recentSamples = useMemo(() => {
    const source =
      Array.isArray(dashboard.recent_samples) &&
      dashboard.recent_samples.length > 0
        ? dashboard.recent_samples
        : visibleSamples;

    return [...source].slice(0, 5);
  }, [dashboard.recent_samples, visibleSamples]);

  const topMetrics = getTopMetrics({
    role,
    lifecycleCounts,
    dashboard,
    totalSamples: visibleSamples.length,
  });

  const maxLifecycleValue = Math.max(
    1,
    ...LIFECYCLE_STATES.map((state) => Number(lifecycleCounts[state]) || 0),
  );

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{getDashboardTitle(role)}</h1>
          <p>Operational overview across all testing branches.</p>
        </div>

        <div className="headerControls">
          <Select
            name="branchFilter"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            <option value="All">All Branches</option>
            <option value="Marikina">Marikina</option>
            <option value="Pateros">Pateros</option>
          </Select>

          <Button onClick={loadDashboard} variant="secondary" size="sm">
            Refresh
          </Button>
        </div>
      </header>

      {isAdmin && (
        <section className="notice">
          <strong>Administrator Oversight Mode</strong>
          <span>
            Actions remain assigned to operational roles. This page is for
            monitoring only.
          </span>
        </section>
      )}

      {loading && <Loader label="Loading technical dashboard..." />}

      {!loading && error && <div className="errorBox">{error}</div>}

      {!loading && !error && (
        <>
          <section className="metrics">
            {topMetrics.map((metric) => (
              <div className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </section>

          <section className="charts">
            <div className="chartBlock">
              <div className="sectionHeader">
                <h2>Sample Lifecycle Progression</h2>
              </div>

              <div className="barChart">
                {LIFECYCLE_STATES.map((state) => {
                  const value = lifecycleCounts[state] || 0;
                  const height = Math.max(
                    10,
                    (value / maxLifecycleValue) * 170,
                  );

                  return (
                    <div className="barColumn" key={state}>
                      <div className="barValue">{value}</div>
                      <div className="barTrack">
                        <div
                          className={`bar ${getLifecycleClass(state)}`}
                          style={{ height: `${height}px` }}
                        />
                      </div>
                      <span>{shortenState(state)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chartBlock">
              <div className="sectionHeader">
                <h2>Distribution by Material Category</h2>
              </div>

              {materialCounts.length === 0 ? (
                <EmptyState
                  title="No material data yet"
                  description="Material distribution will appear after samples are registered."
                />
              ) : (
                <div className="donutSection">
                  <DonutChart data={materialCounts} />

                  <div className="legend">
                    {materialCounts.map((item, index) => (
                      <div className="legendItem" key={item.label}>
                        <i
                          style={{
                            background:
                              MATERIAL_COLORS[index % MATERIAL_COLORS.length],
                          }}
                        />
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="tableSection">
            <div className="tableHeader">
              <div>
                <h2>Recent Registered Samples</h2>
              </div>

              <Link href="/technical/registry">View All</Link>
            </div>

            <Table
              columns={RECENT_SAMPLE_COLUMNS}
              data={recentSamples}
              emptyText="No samples registered yet."
              density="comfortable"
              variant="minimal"
              renderRow={(sample) => (
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
                  <td>{formatBranch(sample.branch_id)}</td>
                  <td>
                    <LifecycleBadge status={sample.current_state} />
                  </td>
                  <td>
                    <Link
                      href={`/technical/tracking/${sample.sample_id}`}
                      className="rowAction"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              )}
            />
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
          font-size: 18px;
          font-weight: 850;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
        }

        .header p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.4;
        }

        .headerControls {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          min-width: 260px;
        }

        .notice {
          display: grid;
          gap: 3px;
          padding: 11px 13px;
          border-radius: var(--radius-md);
          background: var(--color-info-bg);
          border: 1px solid var(--color-info-border);
          color: var(--color-info);
          font-size: 12px;
          line-height: 1.45;
        }

        .notice strong {
          font-size: 12px;
        }

        .errorBox {
          padding: 14px;
          border-radius: var(--radius-md);
          background: var(--color-danger-bg);
          border: 1px solid var(--color-danger-border);
          color: var(--color-danger);
          font-size: 12px;
          font-weight: 800;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          padding: 4px 0 2px;
        }

        .metric {
          display: grid;
          gap: 8px;
        }

        .metric span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 750;
        }

        .metric strong {
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 850;
          line-height: 1;
        }

        .charts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 34px;
          align-items: start;
        }

        .chartBlock {
          min-width: 0;
        }

        .sectionHeader {
          margin-bottom: 16px;
        }

        .sectionHeader h2,
        .tableHeader h2 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }

        .barChart {
          height: 235px;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          align-items: end;
          gap: 18px;
        }

        .barColumn {
          min-width: 0;
          display: grid;
          justify-items: center;
          gap: 7px;
        }

        .barValue {
          height: 12px;
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 750;
          line-height: 1;
        }

        .barTrack {
          height: 178px;
          width: 100%;
          max-width: 46px;
          display: flex;
          align-items: end;
          justify-content: center;
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          border: 1px solid var(--color-border-soft);
          overflow: hidden;
        }

        .bar {
          width: 100%;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .lifeRegistered,
        .lifeReady,
        .lifeReview,
        .lifeDefault {
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

        .barColumn span {
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 650;
          text-align: center;
          line-height: 1.25;
          min-height: 22px;
        }

        .donutSection {
          display: grid;
          grid-template-columns: 210px minmax(0, 1fr);
          gap: 22px;
          align-items: center;
        }

        .legend {
          display: grid;
          gap: 9px;
        }

        .legendItem {
          display: grid;
          grid-template-columns: 10px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 700;
        }

        .legendItem i {
          width: 9px;
          height: 9px;
          border-radius: var(--radius-full);
        }

        .legendItem span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .legendItem strong {
          color: var(--color-text-primary);
          font-size: 10px;
          font-weight: 850;
        }

        .tableSection {
          margin-top: 4px;
        }

        .tableHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          margin-bottom: 10px;
        }

        .tableHeader a,
        .sampleLink,
        .rowAction {
          color: var(--color-brand);
          font-size: 10px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .tableHeader a:hover,
        .sampleLink:hover,
        .rowAction:hover {
          color: var(--color-brand-dark);
          text-decoration: underline;
          transform: none;
        }

        @media (max-width: 1080px) {
          .charts {
            grid-template-columns: 1fr;
          }

          .donutSection {
            grid-template-columns: 210px minmax(0, 1fr);
          }
        }

        @media (max-width: 760px) {
          .header {
            flex-direction: column;
          }

          .headerControls {
            width: 100%;
            min-width: 0;
            display: grid;
            grid-template-columns: 1fr auto;
          }

          .metrics {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }

          .donutSection {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .legend {
            width: 100%;
          }
        }

        @media (max-width: 520px) {
          .metrics {
            grid-template-columns: 1fr;
          }

          .headerControls {
            grid-template-columns: 1fr;
          }

          .barChart {
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg width="210" height="210" viewBox="0 0 210 210" aria-hidden="true">
      <circle
        cx="105"
        cy="105"
        r={radius}
        fill="none"
        stroke="var(--color-overlay)"
        strokeWidth="32"
      />

      {data.map((item, index) => {
        const segment = total === 0 ? 0 : (item.value / total) * circumference;
        const dashArray = `${segment} ${circumference - segment}`;
        const dashOffset = -offset;

        offset += segment;

        return (
          <circle
            key={item.label}
            cx="105"
            cy="105"
            r={radius}
            fill="none"
            stroke={MATERIAL_COLORS[index % MATERIAL_COLORS.length]}
            strokeWidth="32"
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 105 105)"
          />
        );
      })}

      <circle cx="105" cy="105" r="38" fill="var(--color-surface)" />
    </svg>
  );
}

function LifecycleBadge({ status }) {
  const normalized = normalizeLifecycleState(status);

  const variant =
    normalized === "Released"
      ? "success"
      : normalized === "In Testing"
        ? "warning"
        : normalized === "For Review"
          ? "info"
          : normalized === "Archived"
            ? "neutral"
            : "brand";

  return (
    <Badge variant={variant} size="sm">
      {normalized || "-"}
    </Badge>
  );
}

function getDashboardTitle(role) {
  if (role === "Lab Technician") return "Sample Real-Time Monitor";
  if (role === "Senior Technician") return "Sample Real-Time Monitor";
  if (role === "QA Engineer") return "Sample Real-Time Monitor";
  if (role === "Administrator") return "Sample Real-Time Monitor";
  return "Sample Real-Time Monitor";
}

function getTopMetrics({ role, lifecycleCounts, dashboard, totalSamples }) {
  if (role === "Senior Technician") {
    return [
      { label: "Registered", value: dashboard.registered ?? 0 },
      { label: "Manual Review", value: dashboard.manual_review ?? 0 },
      { label: "Mandatory Override", value: dashboard.mandatory_override ?? 0 },
      { label: "Completed", value: dashboard.completed_reviews ?? 0 },
    ];
  }

  if (role === "QA Engineer") {
    return [
      { label: "Registered", value: lifecycleCounts.Registered || 0 },
      { label: "For Review", value: lifecycleCounts["For Review"] || 0 },
      { label: "Released", value: lifecycleCounts.Released || 0 },
      { label: "Total", value: totalSamples },
    ];
  }

  return [
    { label: "Registered", value: lifecycleCounts.Registered || 0 },
    { label: "In Testing", value: lifecycleCounts["In Testing"] || 0 },
    { label: "Completed", value: lifecycleCounts.Released || 0 },
    { label: "Overdue", value: 0 },
  ];
}

function normalizeLifecycleState(status) {
  if (status === "Ready for Testing") return "Registered";
  if (!status) return "Registered";
  return status;
}

function shortenState(state) {
  if (state === "In Testing") return "In-Test";
  if (state === "For Review") return "For Review";
  return state;
}

function getLifecycleClass(state) {
  if (state === "Registered") return "lifeRegistered";
  if (state === "In Testing") return "lifeTesting";
  if (state === "For Review") return "lifeReview";
  if (state === "Released") return "lifeReleased";
  if (state === "Archived") return "lifeArchived";
  return "lifeDefault";
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId || "-";
}
