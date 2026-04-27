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

const COLUMNS = [
  { key: "report", label: "Report", width: "320px" },
  { key: "submitted", label: "Submitted By", width: "180px" },
  { key: "branch", label: "Branch", width: "120px" },
  { key: "module", label: "Module", width: "140px" },
  { key: "priority", label: "Priority", width: "120px" },
  { key: "status", label: "Status", width: "130px" },
  { key: "created", label: "Created", width: "170px" },
  { key: "action", label: "Action", align: "right", width: "110px" },
];

const STATUS_OPTIONS = ["Open", "In Review", "Resolved", "Archived"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

export default function AdminFeedbackPage() {
  const user = getStoredUser();
  const userBranchId = Number(user?.branch_id);

  const [reports, setReports] = useState([]);
  const [branchFilter, setBranchFilter] = useState(userBranchId ? "My" : "All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: "Open",
    admin_notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getAdminFeedbackReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load feedback reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (!userBranchId && branchFilter === "My") {
      setBranchFilter("All");
    }
  }, [branchFilter, userBranchId]);

  const visibleReports = useMemo(() => {
    return filterItemsByBranchView(reports, branchFilter, userBranchId);
  }, [reports, branchFilter, userBranchId]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();

    return visibleReports.filter((item) => {
      const submittedBy = getSubmittedBy(item);
      const branch = formatBranch(item.branch_id);

      const matchesSearch =
        !q ||
        String(item.title || "")
          .toLowerCase()
          .includes(q) ||
        String(item.description || "")
          .toLowerCase()
          .includes(q) ||
        String(item.module || "")
          .toLowerCase()
          .includes(q) ||
        String(item.report_type || "")
          .toLowerCase()
          .includes(q) ||
        String(item.related_sample_id || "")
          .toLowerCase()
          .includes(q) ||
        String(item.status || "")
          .toLowerCase()
          .includes(q) ||
        String(item.priority || "")
          .toLowerCase()
          .includes(q) ||
        submittedBy.toLowerCase().includes(q) ||
        branch.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [visibleReports, search, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    return {
      total: visibleReports.length,
      open: visibleReports.filter((item) => item.status === "Open").length,
      review: visibleReports.filter((item) => item.status === "In Review")
        .length,
      resolved: visibleReports.filter((item) => item.status === "Resolved")
        .length,
    };
  }, [visibleReports]);

  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);

  function openDetails(item) {
    setSelectedReport(item);
    setStatusForm({
      status: item.status || "Open",
      admin_notes: item.admin_notes || "",
    });
    setDetailsOpen(true);
  }

  function closeDetails() {
    if (saving) return;

    setSelectedReport(null);
    setDetailsOpen(false);
  }

  function updateStatusForm(field, value) {
    setStatusForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveStatusUpdate() {
    if (!selectedReport) return;

    setSaving(true);
    setError("");

    try {
      await apiClient.updateFeedbackReport(
        selectedReport.feedback_id,
        statusForm,
      );

      await loadReports();
      closeDetails();
    } catch (err) {
      setError(err.message || "Failed to update feedback report.");
    } finally {
      setSaving(false);
    }
  }

  function canEditReport(report) {
    if (!report) return false;

    if (!userBranchId) return true;

    return Number(report.branch_id) === Number(userBranchId);
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Feedback & Incident Logs</h1>
          <p>
            Review submitted feedback, incident reports, workflow issues, and
            feature requests for <strong>{branchLabel}</strong>.
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

          <Button variant="secondary" size="sm" onClick={loadReports}>
            Refresh
          </Button>
        </div>
      </header>

      {!userBranchId && (
        <section className="warningNotice">
          <strong>No branch assigned</strong>
          <span>
            This administrator account does not have a branch assigned, so the
            feedback logs default to all branches.
          </span>
        </section>
      )}

      <section className="notice">
        <strong>Continuous refinement records</strong>
        <span>
          These reports document interface concerns, confusing workflows, bugs,
          and feature requests submitted by users. Admin review closes the
          feedback loop and supports system refinement.
        </span>
      </section>

      {loading && <Loader label="Loading feedback reports..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Total Reports"
              value={stats.total}
              note="Reports in selected scope"
              variant="brand"
            />

            <StatCard
              label="Open"
              value={stats.open}
              note="Needs initial review"
              variant="warning"
            />

            <StatCard
              label="In Review"
              value={stats.review}
              note="Being evaluated"
              variant="info"
            />

            <StatCard
              label="Resolved"
              value={stats.resolved}
              note="Closed feedback loop"
              variant="success"
            />
          </section>

          <section className="toolbar">
            <Input
              name="feedbackSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, description, submitter, module, sample ID, branch..."
            />

            <Select
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>

            <Select
              name="priorityFilter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="All">All Priorities</option>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </section>

          <Card
            title="Feedback Records"
            subtitle="User-submitted issues and suggestions for continuous system improvement."
          >
            {filteredReports.length === 0 ? (
              <EmptyState
                title="No feedback reports found"
                description="Adjust your branch, status, priority, or search filters."
              />
            ) : (
              <Table
                columns={COLUMNS}
                data={filteredReports}
                emptyText="No feedback reports found."
                density="comfortable"
                variant="minimal"
                className="feedbackTable"
                renderRow={(item) => (
                  <tr key={item.feedback_id}>
                    <td>
                      <div className="reportCell">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>

                        {item.related_sample_id && (
                          <em>Sample: {item.related_sample_id}</em>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="submittedCell">
                        <strong>{getSubmittedBy(item)}</strong>
                        <span>{item.role || "-"}</span>
                      </div>
                    </td>

                    <td>{formatBranch(item.branch_id)}</td>

                    <td>{item.module}</td>

                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>

                    <td>
                      <StatusBadge status={item.status} />
                    </td>

                    <td>{formatDate(item.created_at)}</td>

                    <td className="right">
                      <button
                        type="button"
                        className="rowAction"
                        onClick={() => openDetails(item)}
                      >
                        {canEditReport(item) ? "Review" : "View"}
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
        title="Feedback Report Details"
        description="Review submitted feedback and update its resolution status."
        onClose={closeDetails}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeDetails}
              disabled={saving}
            >
              Cancel
            </Button>

            {selectedReport && canEditReport(selectedReport) && (
              <Button onClick={saveStatusUpdate} disabled={saving}>
                {saving ? "Saving..." : "Save Update"}
              </Button>
            )}
          </>
        }
      >
        {selectedReport && (
          <div className="details">
            <section className="detailGrid">
              <Detail label="Title" value={selectedReport.title} />
              <Detail label="Type" value={selectedReport.report_type} />
              <Detail label="Priority" value={selectedReport.priority} />
              <Detail label="Status" value={selectedReport.status} />
              <Detail label="Module" value={selectedReport.module} />
              <Detail
                label="Submitted By"
                value={getSubmittedBy(selectedReport)}
              />
              <Detail label="Role" value={selectedReport.role} />
              <Detail
                label="Branch"
                value={formatBranch(selectedReport.branch_id)}
              />
              <Detail
                label="Related Sample"
                value={selectedReport.related_sample_id || "-"}
              />
              <Detail
                label="Created"
                value={formatDate(selectedReport.created_at)}
              />
              <Detail
                label="Updated"
                value={formatDate(selectedReport.updated_at)}
              />
              <Detail
                label="Resolved"
                value={formatDate(selectedReport.resolved_at)}
              />
            </section>

            <section className="sectionBox">
              <div className="sectionTitle">
                <h3>Description</h3>
                <span>User-submitted report</span>
              </div>

              <p>{selectedReport.description || "-"}</p>
            </section>

            {!canEditReport(selectedReport) && (
              <section className="readonlyNotice">
                <strong>Read-only branch record</strong>
                <span>
                  This feedback report belongs to another branch. You can view
                  it for oversight, but only the assigned branch admin can
                  update its status.
                </span>
              </section>
            )}

            <section className="sectionBox">
              <div className="sectionTitle">
                <h3>Admin Review</h3>
                <span>Status and notes</span>
              </div>

              <div className="reviewGrid">
                <Select
                  label="Status"
                  value={statusForm.status}
                  disabled={!canEditReport(selectedReport)}
                  onChange={(event) =>
                    updateStatusForm("status", event.target.value)
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>

                <label className="textareaField">
                  <span>Admin Notes</span>
                  <textarea
                    rows={4}
                    value={statusForm.admin_notes}
                    disabled={!canEditReport(selectedReport)}
                    onChange={(event) =>
                      updateStatusForm("admin_notes", event.target.value)
                    }
                    placeholder={
                      canEditReport(selectedReport)
                        ? "Add action taken, decision, or follow-up notes."
                        : "Read-only: this feedback belongs to another branch."
                    }
                  />
                </label>
              </div>
            </section>
          </div>
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
          grid-template-columns: minmax(0, 1fr) 170px 170px;
          gap: 12px;
          align-items: end;
        }

        .reportCell,
        .submittedCell {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .reportCell strong,
        .submittedCell strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reportCell span,
        .submittedCell span {
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 430px;
        }

        .reportCell em {
          color: var(--color-text-muted);
          font-size: 10px;
          font-style: normal;
          line-height: 1.35;
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

        .sectionBox p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .reviewGrid {
          display: grid;
          gap: 14px;
        }

        .textareaField {
          display: grid;
          gap: 7px;
        }

        .textareaField span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        textarea {
          width: 100%;
          resize: vertical;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          padding: 12px;
          font: inherit;
          font-size: var(--text-sm);
          outline: none;
          transition:
            border-color var(--transition-base),
            box-shadow var(--transition-base);
        }

        textarea:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--color-brand) 14%, transparent);
        }

        :global(.right) {
          text-align: right;
        }

        :global(.feedbackTable table) {
          min-width: 1290px;
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

          .detailGrid {
            grid-template-columns: 1fr;
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

function Detail({ label, value }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <strong>{value || "-"}</strong>

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

        .readonlyNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border: 1px solid var(--color-warning-border);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .readonlyNotice strong {
          color: inherit;
          font-size: var(--text-xs);
          font-weight: 600;
        }

        textarea:disabled {
          opacity: 0.72;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const value = String(priority || "").toLowerCase();

  const variant =
    value === "critical" || value === "high"
      ? "danger"
      : value === "medium"
        ? "warning"
        : "info";

  return (
    <Badge variant={variant} size="sm">
      {priority || "-"}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "").toLowerCase();

  const variant =
    value === "resolved"
      ? "success"
      : value === "archived"
        ? "neutral"
        : value === "in review"
          ? "info"
          : "warning";

  return (
    <Badge variant={variant} size="sm">
      {status || "-"}
    </Badge>
  );
}

function getSubmittedBy(item) {
  return (
    item.submitted_by_name ||
    item.full_name ||
    item.submitted_by_username ||
    item.username ||
    `User ${item.submitted_by || ""}`.trim()
  );
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
    return Number(item.branch_id) === Number(resolvedBranch);
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

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return value;
  }
}
