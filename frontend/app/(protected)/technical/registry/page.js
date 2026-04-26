"use client";

import Link from "next/link";
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
import Table from "@/components/ui/Table";

const TABLE_COLUMNS = [
  { key: "sample", label: "Sample", width: "160px" },
  { key: "status", label: "Lifecycle Status", width: "145px" },
  { key: "result", label: "Test Result", width: "125px" },
  { key: "queue", label: "Queue", width: "145px" },
  { key: "client", label: "Client / Project", width: "220px" },
  { key: "material", label: "Material", width: "180px" },
];

export default function RegistryPage() {
  const user = getStoredUser();
  const role = user?.role || "Lab Technician";
  const isAdmin = role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetailsSample, setSelectedDetailsSample] = useState(null);

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

  const branchViewLabel = getBranchViewLabel(branchFilter, userBranchId);
  const isCloudMonitoring = !isAdmin && branchFilter === "All";
  const isOtherBranchView =
    !isAdmin &&
    branchFilter !== "All" &&
    branchFilter !== "My" &&
    Number(resolveBranchFilter(branchFilter, userBranchId)) !==
      Number(userBranchId);

  function getMetadata(item) {
    return item?.device_metadata || {};
  }

  function getTestData(item) {
    return getMetadata(item)?.test_data || {};
  }

  function getTestResult(item) {
    const testData = getTestData(item);

    return (
      testData.qa_final_result ||
      testData.final_result ||
      testData.result ||
      testData.status ||
      null
    );
  }

  function getQueueLabel(item) {
    const metadata = getMetadata(item);
    const payment = metadata.payment || {};
    const qa = metadata.qa || {};

    if (
      item.current_state === "Registered" &&
      ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
        payment.payment_status,
      ) &&
      qa.pre_testing_reviewed
    ) {
      return { label: "Ready for Testing", type: "ready" };
    }

    if (
      item.current_state === "Registered" &&
      ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
        payment.payment_status,
      ) &&
      !qa.pre_testing_reviewed
    ) {
      return { label: "QA Pre-Testing", type: "qa" };
    }

    if (item.decision === "Manual-Review") {
      return { label: "AI Review", type: "review" };
    }

    if (
      item.current_state === "For Review" &&
      payment.payment_status === "Fully Paid"
    ) {
      return { label: "QA Release", type: "release" };
    }

    if (item.current_state === "For Review") {
      return { label: "For Review", type: "review" };
    }

    if (item.current_state === "Released") {
      return { label: "Archive", type: "archive" };
    }

    if (item.current_state === "In Testing") {
      return { label: "Testing", type: "testing" };
    }

    return { label: "General", type: "default" };
  }

  function filterByRole(data) {
    if (role === "Lab Technician") {
      return data.filter((item) => {
        const metadata = getMetadata(item);
        const payment = metadata.payment || {};
        const qa = metadata.qa || {};

        return (
          (item.current_state === "Registered" &&
            ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
              payment.payment_status,
            ) &&
            qa.pre_testing_reviewed) ||
          item.current_state === "In Testing"
        );
      });
    }

    if (role === "Senior Technician") {
      return data.filter(
        (item) =>
          item.decision === "Manual-Review" &&
          item.current_state !== "Released" &&
          item.current_state !== "Archived",
      );
    }

    if (role === "QA Engineer") {
      return data.filter((item) => {
        const metadata = getMetadata(item);
        const payment = metadata.payment || {};
        const qa = metadata.qa || {};

        const pre =
          item.current_state === "Registered" &&
          ["Downpayment Paid", "PO Submitted", "Fully Paid"].includes(
            payment.payment_status,
          ) &&
          !qa.pre_testing_reviewed;

        const release =
          item.current_state === "For Review" &&
          payment.payment_status === "Fully Paid";

        const archive = item.current_state === "Released";

        return pre || release || archive;
      });
    }

    return data;
  }

  async function loadSamples() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getSamples();
      setItems(filterByRole(Array.isArray(data) ? data : []));
    } catch (err) {
      setError(err.message || "Failed to load registry.");
    } finally {
      setLoading(false);
    }
  }

  function openDetailsModal(item) {
    setSelectedDetailsSample(item);
    setDetailsModalOpen(true);
  }

  function closeDetailsModal() {
    setDetailsModalOpen(false);
    setSelectedDetailsSample(null);
  }

  useEffect(() => {
    loadSamples();
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

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

    return items.filter((item) => {
      const material = normalizeMaterialName(
        item.material_type || item.ai_predicted_label,
      );

      const matchesBranch =
        resolvedBranch === "All" ||
        Number(item.branch_id) === Number(resolvedBranch);

      const matchesSearch =
        !q ||
        item.sample_id?.toLowerCase().includes(q) ||
        item.client_name?.toLowerCase().includes(q) ||
        item.project_reference?.toLowerCase().includes(q) ||
        item.project_id?.toLowerCase().includes(q) ||
        material.toLowerCase().includes(q) ||
        item.material_type?.toLowerCase().includes(q) ||
        item.ai_predicted_label?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || item.current_state === statusFilter;

      return matchesBranch && matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter, branchFilter, userBranchId]);

  const summary = useMemo(() => {
    return visibleItems.reduce(
      (acc, item) => {
        const queue = getQueueLabel(item);

        acc.total += 1;

        if (queue.type === "ready") acc.ready += 1;
        if (item.current_state === "In Testing") acc.testing += 1;
        if (item.current_state === "For Review") acc.review += 1;
        if (item.current_state === "Released") acc.released += 1;

        return acc;
      },
      {
        total: 0,
        ready: 0,
        testing: 0,
        review: 0,
        released: 0,
      },
    );
  }, [visibleItems]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Sample Registry</h1>
          <p className="subtitle">
            Search, filter, and review sample records across the testing
            lifecycle for <strong>{branchViewLabel}</strong>.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadSamples}>
          Refresh
        </Button>
      </header>

      {(isAdmin || isCloudMonitoring || isOtherBranchView) && (
        <section className="notice">
          <strong>
            {isAdmin ? "Administrator Registry View" : "Cloud-Synced Monitoring"}
          </strong>
          <span>
            {isAdmin
              ? "You can view all branch registry records from the centralized system."
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

      {loading && <Loader label="Loading registry..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="summary">
            <div>
              <span>Total</span>
              <strong>{summary.total}</strong>
            </div>

            <div>
              <span>Ready</span>
              <strong>{summary.ready}</strong>
            </div>

            <div>
              <span>Testing</span>
              <strong>{summary.testing}</strong>
            </div>

            <div>
              <span>For Review</span>
              <strong>{summary.review}</strong>
            </div>

            <div>
              <span>Released</span>
              <strong>{summary.released}</strong>
            </div>
          </section>

          <section className="toolbar">
            <Input
              name="registrySearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sample ID, client, project, or material..."
            />

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

            <Select
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Queues</option>

              {role === "Lab Technician" && (
                <>
                  <option value="Registered">Ready for Testing</option>
                  <option value="In Testing">In Testing</option>
                </>
              )}

              {role === "Senior Technician" && (
                <option value="For Review">Manual Review</option>
              )}

              {role === "QA Engineer" && (
                <>
                  <option value="Registered">QA Pre-Test</option>
                  <option value="For Review">QA Release</option>
                  <option value="Released">Archive</option>
                </>
              )}

              {role === "Administrator" && (
                <>
                  <option value="Registered">Registered</option>
                  <option value="In Testing">In Testing</option>
                  <option value="For Review">For Review</option>
                  <option value="Released">Released</option>
                  <option value="Archived">Archived</option>
                </>
              )}
            </Select>

            <div className="viewToggle">
              <button
                className={
                  viewMode === "list" ? "iconToggle active" : "iconToggle"
                }
                onClick={() => setViewMode("list")}
                type="button"
                title="List view"
              >
                ☷
              </button>

              <button
                className={
                  viewMode === "grid" ? "iconToggle active" : "iconToggle"
                }
                onClick={() => setViewMode("grid")}
                type="button"
                title="Grid view"
              >
                ▦
              </button>
            </div>
          </section>

          {viewMode === "list" && (
            <Card
              title="Registry Records"
              subtitle="Click a row to view sample details. Workflow actions are handled in the Workflow page."
            >
              {visibleItems.length === 0 ? (
                <EmptyState
                  title="No samples found"
                  description="Try changing the filter or search term."
                />
              ) : (
                <Table
                  columns={TABLE_COLUMNS}
                  data={visibleItems}
                  emptyText="No samples found."
                  density="comfortable"
                  variant="minimal"
                  className="registryTable"
                  renderRow={(item) => {
                    const queue = getQueueLabel(item);
                    const testResult = getTestResult(item);
                    const material = normalizeMaterialName(
                      item.material_type || item.ai_predicted_label,
                    );

                    return (
                      <tr
                        key={item.sample_id}
                        className="clickableRow"
                        onClick={() => openDetailsModal(item)}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetailsModal(item);
                          }
                        }}
                      >
                        <td>
                          <div className="sampleCell">
                            <strong>{item.sample_id}</strong>
                            <small>{formatBranch(item.branch_id)}</small>
                          </div>
                        </td>

                        <td>
                          <StatusBadge status={item.current_state} />
                        </td>

                        <td>
                          <ResultBadge result={testResult} />
                        </td>

                        <td>
                          <QueueBadge queue={queue} />
                        </td>

                        <td>
                          <div className="stack">
                            <strong>{item.client_name || "-"}</strong>
                            <small>
                              {item.project_reference || item.project_id || "-"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <strong className="materialName">{material}</strong>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </Card>
          )}

          {viewMode === "grid" && (
            <section className="grid">
              {visibleItems.length === 0 ? (
                <EmptyState
                  title="No samples found"
                  description="Try changing the filter or search term."
                />
              ) : (
                visibleItems.map((item) => {
                  const queue = getQueueLabel(item);
                  const testResult = getTestResult(item);
                  const material = normalizeMaterialName(
                    item.material_type || item.ai_predicted_label,
                  );

                  return (
                    <article
                      key={item.sample_id}
                      className="sampleCard"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetailsModal(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetailsModal(item);
                        }
                      }}
                    >
                      <div className="sampleCardTop">
                        <div>
                          <span>Sample ID</span>
                          <strong>{item.sample_id}</strong>
                        </div>

                        <StatusBadge status={item.current_state} />
                      </div>

                      <div className="sampleMaterial">{material}</div>

                      <div className="sampleMetaGrid">
                        <div>
                          <span>Branch</span>
                          <strong>{formatBranch(item.branch_id)}</strong>
                        </div>

                        <div>
                          <span>Queue</span>
                          <QueueBadge queue={queue} />
                        </div>

                        <div>
                          <span>Result</span>
                          <ResultBadge result={testResult} />
                        </div>
                      </div>

                      <div className="sampleDivider" />

                      <div className="sampleMetaGrid bottom">
                        <div>
                          <span>Client</span>
                          <strong>{item.client_name || "-"}</strong>
                        </div>

                        <div>
                          <span>Project</span>
                          <strong>
                            {item.project_reference || item.project_id || "-"}
                          </strong>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}
        </>
      )}

      <Modal
        open={detailsModalOpen}
        title="Sample Details"
        description="Quick registry context for this sample."
        onClose={closeDetailsModal}
        size="lg"
        footer={
          selectedDetailsSample?.sample_id ? (
            <Link
              href={`/technical/tracking/${selectedDetailsSample.sample_id}`}
              className="footerButton"
            >
              Open Tracking
            </Link>
          ) : null
        }
      >
        {selectedDetailsSample && (
          <SampleDetails
            sample={selectedDetailsSample}
            queue={getQueueLabel(selectedDetailsSample)}
          />
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

        .subtitle {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.45;
        }

        .subtitle strong {
          color: var(--color-text-primary);
          font-weight: 500;
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

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid var(--color-border-soft);
          border-bottom: 1px solid var(--color-border-soft);
        }

        .summary div {
          display: grid;
          gap: 6px;
          min-width: 0;
          text-align: center;
        }

        .summary span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .summary strong {
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 600;
        }

        .toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px 220px auto;
          gap: 12px;
          align-items: end;
        }

        .viewToggle {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }

        .iconToggle {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-soft);
          background: var(--color-surface);
          color: var(--color-text-muted);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            color var(--transition-base),
            border-color var(--transition-base);
        }

        .iconToggle:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-text-primary);
        }

        .iconToggle.active {
          background: var(--color-brand-light);
          border-color: color-mix(in srgb, var(--color-brand) 28%, transparent);
          color: var(--color-brand-dark);
        }

        .sampleCell,
        .stack {
          display: grid;
          gap: 4px;
        }

        .sampleCell strong,
        .stack strong,
        .materialName {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .sampleCell small,
        .stack small {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 400;
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

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .sampleCard {
          display: grid;
          gap: 13px;
          padding: 17px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          cursor: pointer;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            transform var(--transition-base);
        }

        .sampleCard:hover {
          background: color-mix(
            in srgb,
            var(--color-overlay) 36%,
            var(--color-surface)
          );
          border-color: var(--color-border);
          transform: translateY(-1px);
        }

        .sampleCard:focus-visible {
          outline: 2px solid var(--color-brand);
          outline-offset: 2px;
        }

        .sampleCardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .sampleCardTop div {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .sampleCardTop span,
        .sampleMetaGrid span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sampleCardTop strong {
          color: var(--color-text-primary);
          font-size: 15px;
          font-weight: 600;
          line-height: 1.25;
        }

        .sampleMaterial {
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.4;
        }

        .sampleMetaGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-items: start;
        }

        .sampleMetaGrid.bottom {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .sampleMetaGrid div {
          display: grid;
          gap: 5px;
          min-width: 0;
        }

        .sampleMetaGrid strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .sampleDivider {
          height: 1px;
          background: var(--color-border-soft);
        }

        .sampleCard h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 16px;
          font-weight: 600;
        }

        .sampleCard p {
          margin: -7px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          font-weight: 400;
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .meta {
          display: grid;
          gap: 4px;
        }

        .meta span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.45;
        }

        :global(.registryTable table) {
          min-width: 960px;
        }

        :global(.registryTable .clickableRow) {
          cursor: pointer;
          transition: background-color var(--transition-base);
        }

        :global(.registryTable .clickableRow:hover) {
          background: var(--color-overlay);
        }

        :global(.registryTable .clickableRow:focus-visible) {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          background: var(--color-overlay);
        }

        @media (max-width: 1180px) {
          .toolbar {
            grid-template-columns: minmax(0, 1fr) 180px 220px;
          }

          .viewToggle {
            justify-content: flex-start;
          }
        }

        @media (max-width: 1080px) {
          .summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .viewToggle {
            justify-content: flex-start;
          }
        }

        @media (max-width: 720px) {
          .header {
            flex-direction: column;
          }

          .summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .sampleMetaGrid,
          .sampleMetaGrid.bottom {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function SampleDetails({ sample, queue }) {
  const metadata = sample.device_metadata || {};
  const testData = metadata.test_data || {};
  const payment = metadata.payment || {};
  const qa = metadata.qa || {};

  return (
    <div className="details">
      <section className="detailGrid">
        <Detail label="Sample ID" value={sample.sample_id} />
        <Detail label="Client" value={sample.client_name} />
        <Detail
          label="Project Reference"
          value={sample.project_reference || sample.project_id}
        />
        <Detail
          label="Material"
          value={normalizeMaterialName(
            sample.material_type || sample.ai_predicted_label,
          )}
        />
        <Detail label="Branch" value={formatBranch(sample.branch_id)} />
        <Detail label="Lifecycle Status" value={sample.current_state} />
        <Detail label="Queue" value={queue?.label} />
        <Detail label="Decision" value={sample.decision} />
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Testing</h3>
          <ResultBadge result={getFinalResult(testData)} />
        </div>

        <div className="detailGrid">
          <Detail label="Test Type" value={formatLabel(testData.test_type)} />
          <Detail label="Result" value={getFinalResult(testData)} />
          <Detail label="Specification" value={getSpecification(testData)} />
          <Detail
            label="Reviewed By"
            value={
              testData.reviewed_by_name ||
              testData.reviewed_by_display ||
              testData.reviewed_by_full_name ||
              formatUser(testData.reviewed_by)
            }
          />
          <Detail label="Remarks" value={testData.remarks} wide />
          <Detail label="Review Notes" value={testData.review_notes} wide />
        </div>
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>QA / Payment</h3>
          <QueueBadge queue={queue} />
        </div>

        <div className="detailGrid">
          <Detail
            label="Pre-testing Reviewed"
            value={qa.pre_testing_reviewed ? "Yes" : "No"}
          />
          <Detail
            label="Payment Status"
            value={payment.payment_status || "Unpaid"}
          />
          <Detail
            label="Testing Cleared"
            value={payment.financially_cleared_for_testing ? "Yes" : "No"}
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
          font-weight: 400;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }) {
  const variant =
    status === "Released"
      ? "success"
      : status === "In Testing"
        ? "warning"
        : status === "For Review"
          ? "info"
          : status === "Archived"
            ? "neutral"
            : "brand";

  return (
    <Badge variant={variant} size="sm">
      {status || "-"}
    </Badge>
  );
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

  return (
    <Badge variant={variant} size="sm">
      {result || "No Result"}
    </Badge>
  );
}

function QueueBadge({ queue }) {
  const variant =
    queue?.type === "ready"
      ? "info"
      : queue?.type === "qa"
        ? "warning"
        : queue?.type === "release"
          ? "success"
          : queue?.type === "review"
            ? "warning"
            : queue?.type === "testing"
              ? "brand"
              : "neutral";

  return (
    <Badge variant={variant} size="sm">
      {queue?.label || "General"}
    </Badge>
  );
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

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
}

function normalizeMaterialName(value) {
  if (!value) return "-";

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

  return formatLabel(value);
}

function formatLabel(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function formatEmpty(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}