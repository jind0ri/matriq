"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
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
  { key: "sample_id", label: "Sample ID", width: "135px" },
  { key: "material_type", label: "Material", width: "170px" },
  { key: "branch_id", label: "Branch", width: "120px" },
  { key: "current_state", label: "Status", width: "135px" },
  { key: "action", label: "Action", align: "right", width: "100px" },
];

const MATERIAL_COLORS = ["#4f6f8f", "#5b5f97", "#8a6f5a"];

const MATERIAL_ORDER = ["Reinforcing Steel Bar", "Soil Aggregates", "Concrete"];

export default function TechnicalDashboardPage() {
  const user = getStoredUser();
  const role = user?.role || "Technical User";
  const isAdmin = role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [dashboard, setDashboard] = useState({
    registered: 0,
    manual_review: 0,
    mandatory_override: 0,
    completed_reviews: 0,
    recent_samples: [],
  });

  const [samples, setSamples] = useState([]);
  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");
  const [selectedSample, setSelectedSample] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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

  useEffect(() => {
    if (!isAdmin && branchFilter !== "All" && branchFilter !== "My") {
      const resolved = resolveBranchFilter(branchFilter, userBranchId);
      const isOwnBranch = Number(resolved) === Number(userBranchId);

      if (isOwnBranch) {
        setBranchFilter("My");
      }
    }
  }, [branchFilter, isAdmin, userBranchId]);

  const branchOptions = useMemo(() => {
    if (isAdmin) {
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
  }, [isAdmin, userBranchId]);

  const visibleSamples = useMemo(() => {
    const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

    if (resolvedBranch === "All") return samples;

    return samples.filter(
      (sample) => Number(sample.branch_id) === Number(resolvedBranch),
    );
  }, [samples, branchFilter, userBranchId]);

  const sampleById = useMemo(() => {
    const map = new Map();

    samples.forEach((sample) => {
      map.set(sample.sample_id, sample);
    });

    return map;
  }, [samples]);

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
    const counts = {
      "Reinforcing Steel Bar": 0,
      "Soil Aggregates": 0,
      Concrete: 0,
    };

    visibleSamples.forEach((sample) => {
      const material = normalizeMaterialName(
        sample.material_type || sample.ai_predicted_label || "Concrete",
      );

      counts[material] = (counts[material] || 0) + 1;
    });

    return MATERIAL_ORDER.map((label) => ({
      label,
      value: counts[label] || 0,
    })).filter((item) => item.value > 0);
  }, [visibleSamples]);

  const recentSamples = useMemo(() => {
    const dashboardSamples =
      Array.isArray(dashboard.recent_samples) &&
        dashboard.recent_samples.length > 0
        ? dashboard.recent_samples
          .map((sample) => sampleById.get(sample.sample_id) || sample)
          .filter((sample) => isSampleInBranchView(sample, branchFilter, userBranchId))
        : [];

    const source = dashboardSamples.length > 0 ? dashboardSamples : visibleSamples;

    return [...source].slice(0, 5);
  }, [dashboard.recent_samples, visibleSamples, sampleById, branchFilter, userBranchId]);

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

  const branchViewLabel = getBranchViewLabel(branchFilter, userBranchId);
  const isCloudMonitoring = !isAdmin && branchFilter === "All";
  const isOtherBranchView =
    !isAdmin &&
    branchFilter !== "All" &&
    branchFilter !== "My" &&
    Number(resolveBranchFilter(branchFilter, userBranchId)) !== Number(userBranchId);

  function openDetails(sample) {
    setSelectedSample(sample);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedSample(null);
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{getDashboardTitle(role)}</h1>
          <p>
            Operational overview for <strong>{branchViewLabel}</strong>.
          </p>
        </div>

        <div className="headerControls">
          <Select
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

          <Button onClick={loadDashboard} variant="secondary" size="sm">
            Refresh
          </Button>
        </div>
      </header>

      {(isAdmin || isCloudMonitoring || isOtherBranchView) && (
        <section className="notice">
          <strong>
            {isAdmin ? "Administrator Oversight Mode" : "Cloud-Synced Monitoring"}
          </strong>
          <span>
            {isAdmin
              ? "You can view all branch records from the centralized system. This dashboard remains monitoring-only."
              : isCloudMonitoring
                ? `You are viewing all cloud-synced branch records. Operational actions remain locked to your assigned branch: ${formatBranch(
                  userBranchId,
                )}.`
                : `You are viewing ${branchViewLabel} records for monitoring. Operational actions remain locked to your assigned branch: ${formatBranch(
                  userBranchId,
                )}.`}
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
                <p>Click a row to view details, or open the tracking record.</p>
              </div>

              <Link href="/technical/registry" className="viewAllButton">
                View All
              </Link>
            </div>

            <Table
              columns={RECENT_SAMPLE_COLUMNS}
              data={recentSamples}
              emptyText="No samples registered yet."
              density="comfortable"
              variant="minimal"
              className="recentSamplesTable"
              renderRow={(sample) => (
                <tr
                  key={sample.sample_id}
                  className="clickableRow"
                  onClick={() => openDetails(sample)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetails(sample);
                    }
                  }}
                >
                  <td>
                    <span className="sampleId">{sample.sample_id}</span>
                  </td>
                  <td>
                    {normalizeMaterialName(
                      sample.material_type || sample.ai_predicted_label,
                    )}
                  </td>
                  <td>{formatBranch(sample.branch_id)}</td>
                  <td>
                    <LifecycleBadge status={sample.current_state} />
                  </td>
                  <td
                    className="right"
                    onClick={(event) => event.stopPropagation()}
                  >
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

      <Modal
        open={detailsOpen}
        title="Sample Details"
        description="Quick context for this sample. Open tracking for full test workflow."
        onClose={closeDetails}
        size="lg"
        footer={
          selectedSample?.sample_id ? (
            <Link
              href={`/technical/tracking/${selectedSample.sample_id}`}
              className="footerButton"
            >
              Open Tracking
            </Link>
          ) : null
        }
      >
        {selectedSample && <SampleDetails sample={selectedSample} />}
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
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
        }

        .header p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.4;
        }

        .header p strong {
          color: var(--color-text-primary);
          font-weight: 600;
        }

        .headerControls {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          min-width: 260px;
        }

        .notice {
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border-radius: var(--radius-md);
          background: var(--color-info-bg);
          border: 1px solid var(--color-info-border);
          color: var(--color-info);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .notice strong {
          color: var(--color-info);
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .errorBox {
          padding: 14px;
          border-radius: var(--radius-md);
          background: var(--color-danger-bg);
          border: 1px solid var(--color-danger-border);
          color: var(--color-danger);
          font-size: 12px;
          font-weight: 500;
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
          font-weight: 500;
        }

        .metric strong {
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 1;
        }

        .charts {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
          gap: 44px;
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
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .barChart {
          height: 235px;
          display: flex;
          align-items: end;
          justify-content: center;
          gap: 42px;
          padding: 0 12px;
          overflow-x: auto;
          overflow-y: hidden;
        }

        .barChart::-webkit-scrollbar {
          height: 0;
        }

        .barColumn {
          width: 66px;
          min-width: 66px;
          display: grid;
          justify-items: center;
          gap: 7px;
        }

        .barValue {
          height: 12px;
          color: var(--color-text-secondary);
          font-size: 9px;
          font-weight: 400;
          line-height: 1;
        }

        .barTrack {
          height: 178px;
          width: 100%;
          max-width: 42px;
          display: flex;
          align-items: end;
          justify-content: center;
          border-radius: var(--radius-md);
          background: transparent;
          border: none;
          overflow: visible;
        }

        .bar {
          width: 42px;
          min-height: 10px;
          border-radius: var(--radius-md);
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
          font-weight: 400;
          text-align: center;
          line-height: 1.25;
          min-height: 22px;
        }

        .donutSection {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 26px;
          align-items: center;
        }

        .donutChart {
          width: 260px;
          height: 260px;
          max-width: 100%;
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
          font-weight: 400;
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
          font-weight: 600;
        }

        .tableSection {
          margin-top: 4px;
        }

        .tableHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 14px;
          margin-bottom: 12px;
        }

        .tableHeader p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.4;
        }

        :global(.viewAllButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 13px;
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

        :global(.viewAllButton:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
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
  text-decoration: none;
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
  text-decoration: none;
  transform: none;
}

        .sampleId {
          color: var(--color-brand);
          font-size: var(--text-xs);
          font-weight: 500;
        }

:global(.footerButton) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
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

:global(.footerButton:hover) {
  background: var(--color-overlay);
  border-color: var(--color-border);
  color: var(--color-brand);
  text-decoration: none;
}

        :global(.right) {
          text-align: right;
        }

        :global(.recentSamplesTable .clickableRow) {
          cursor: pointer;
          transition: background-color var(--transition-base);
        }

        :global(.recentSamplesTable .clickableRow:hover) {
          background: var(--color-overlay);
        }

        :global(.recentSamplesTable .clickableRow:focus-visible) {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          background: var(--color-overlay);
        }

        @media (max-width: 1080px) {
          .charts {
            grid-template-columns: 1fr;
          }

          .donutSection {
            grid-template-columns: 260px minmax(0, 1fr);
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

          .barChart {
            gap: 28px;
            padding-left: 0;
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
            gap: 20px;
          }

          .barColumn {
            width: 62px;
            min-width: 62px;
          }

          .bar {
            width: 40px;
          }
        }
      `}</style>
    </div>
  );
}

function SampleDetails({ sample }) {
  const metadata = sample.device_metadata || {};
  const testData = metadata.test_data || {};
  const payment = metadata.payment || {};

  return (
    <div className="details">
      <SampleImagePreview sampleId={sample.sample_id} />
      <section className="detailGrid">
        <Detail label="Sample ID" value={sample.sample_id} />
        <Detail label="Client" value={sample.client_name} />
        <Detail label="Project Reference" value={sample.project_reference} />
        <Detail
          label="Material"
          value={normalizeMaterialName(
            sample.material_type || sample.ai_predicted_label,
          )}
        />
        <Detail label="Branch" value={formatBranch(sample.branch_id)} />
        <Detail
          label="Lifecycle Status"
          value={normalizeLifecycleState(sample.current_state || sample.status)}
        />
        <Detail label="Decision" value={sample.decision} />
        <Detail label="Registered At" value={formatDate(sample.created_at)} />
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Testing Summary</h3>
          <LifecycleBadge status={sample.current_state} />
        </div>

        <div className="detailGrid">
          <Detail label="Final Result" value={getFinalResult(testData)} />
          <Detail label="Specification" value={getSpecification(testData)} />
          <Detail
            label="Technician"
            value={
              testData.entered_by_name ||
              testData.entered_by_display ||
              testData.entered_by_full_name ||
              formatUser(testData.entered_by || testData.technician_id)
            }
          />
          <Detail
            label="Reviewed By"
            value={
              testData.reviewed_by_name ||
              testData.reviewed_by_display ||
              testData.reviewed_by_full_name ||
              formatUser(testData.reviewed_by)
            }
          />
          <Detail label="Review Notes" value={testData.review_notes} wide />
        </div>
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Billing Readiness</h3>
          <PaymentBadge status={payment.payment_status} />
        </div>

        <div className="detailGrid">
          <Detail
            label="Payment Status"
            value={payment.payment_status || "Unpaid"}
          />
          <Detail
            label="Release Cleared"
            value={payment.financially_cleared_for_release ? "Yes" : "No"}
          />
          <Detail label="Billing Notes" value={payment.billing_notes} wide />
        </div>
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
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .sectionTitle h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .detailGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function SampleImagePreview({ sampleId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!sampleId) return;

    let objectUrl = "";

    async function loadImage() {
      setFailed(false);
      setImageUrl("");

      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        setFailed(true);
        return;
      }

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

        const response = await fetch(
          `${baseUrl}/api/samples/${sampleId}/image`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Image not available");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch {
        setFailed(true);
      }
    }

    loadImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sampleId]);

  if (!sampleId || failed) {
    return (
      <section className="imageBox">
        <div className="imageEmpty">No sample image available.</div>

        <style jsx>{`
          .imageBox {
            display: grid;
            gap: 10px;
            padding: 14px;
            border: 1px solid var(--color-border-soft);
            border-radius: var(--radius-md);
            background: var(--color-surface);
          }

          .imageEmpty {
            display: grid;
            place-items: center;
            min-height: 170px;
            border: 1px dashed var(--color-border-soft);
            border-radius: var(--radius-md);
            background: var(--color-overlay);
            color: var(--color-text-secondary);
            font-size: var(--text-xs);
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="imageBox">
      <div className="imageHeader">
        <div>
          <h3>Sample Image</h3>
          <p>Uploaded image used for AI material identification.</p>
        </div>
      </div>

      <div className="imageFrame">
        {imageUrl ? (
          <img src={imageUrl} alt={`Uploaded sample image for ${sampleId}`} />
        ) : (
          <div className="imageEmpty">Loading sample image...</div>
        )}
      </div>

      <style jsx>{`
        .imageBox {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .imageHeader h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .imageHeader p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .imageFrame {
          overflow: hidden;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
        }

        .imageFrame img {
          display: block;
          width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        .imageEmpty {
          display: grid;
          place-items: center;
          min-height: 170px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
        }
      `}</style>
    </section>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div className={wide ? "detail wide" : "detail"}>
      <span>{label}</span>
      <strong>{formatEmpty(value)}</strong>

      <style jsx>{`
        .detail {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .detail.wide {
          grid-column: 1 / -1;
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
          font-weight: 500;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 78;
  const strokeWidth = 36;
  const size = 260;
  const center = size / 2;
  const innerCircleRadius = radius - strokeWidth / 2 + 4;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="donutChart"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--color-overlay)"
        strokeWidth={strokeWidth}
      />

      {data.map((item, index) => {
        const segment = total === 0 ? 0 : (item.value / total) * circumference;
        const dashArray = `${segment} ${circumference - segment}`;
        const dashOffset = -offset;

        offset += segment;

        return (
          <circle
            key={item.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={MATERIAL_COLORS[index % MATERIAL_COLORS.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
      })}

      <circle
        cx={center}
        cy={center}
        r={innerCircleRadius}
        fill="var(--color-surface)"
      />
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

function PaymentBadge({ status }) {
  const variant =
    status === "Fully Paid"
      ? "success"
      : status === "PO Submitted"
        ? "info"
        : status === "Downpayment Paid"
          ? "warning"
          : "danger";

  return (
    <Badge variant={variant} size="sm">
      {status || "Unpaid"}
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

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function isSampleInBranchView(sample, branchFilter, userBranchId) {
  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return true;

  return Number(sample?.branch_id) === Number(resolvedBranch);
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
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

function normalizeMaterialName(value) {
  if (!value) return "Concrete";

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "rsb" ||
    normalized === "rebar" ||
    normalized === "reinforcing steel" ||
    normalized === "reinforcing steel bar" ||
    normalized === "steel bar" ||
    normalized === "metal" ||
    normalized.includes("rsb") ||
    normalized.includes("rebar") ||
    normalized.includes("reinforcing") ||
    normalized.includes("steel") ||
    normalized.includes("metal")
  ) {
    return "Reinforcing Steel Bar";
  }

  if (
    normalized === "soil aggregates" ||
    normalized === "soil aggregate" ||
    normalized === "soil_aggregates" ||
    normalized === "soil-aggregates" ||
    normalized === "aggregate" ||
    normalized === "aggregates" ||
    normalized.includes("soil") ||
    normalized.includes("aggregate")
  ) {
    return "Soil Aggregates";
  }

  if (
    normalized === "concrete" ||
    normalized === "cement concrete" ||
    normalized.includes("concrete") ||
    normalized.includes("cement")
  ) {
    return "Concrete";
  }

  return "Concrete";
}

function getFinalResult(testData) {
  if (!testData) return null;

  return (
    testData.qa_final_result ||
    testData.final_result ||
    testData.result ||
    testData.status ||
    null
  );
}

function getSpecification(testData) {
  if (!testData) return null;

  return (
    testData.specification_status ||
    testData.specification_result ||
    testData.standard_compliance ||
    testData.compliance_status ||
    null
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

function formatEmpty(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}