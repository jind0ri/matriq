"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";

const REPORT_TYPES = [
  "Incident",
  "Feedback",
  "Feature Request",
  "Workflow Issue",
  "Bug Report",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const MODULES = [
  "Sample Intake",
  "Workflow",
  "Registry",
  "Billing",
  "Invoices",
  "Reports",
  "Admin",
  "Login",
  "Notifications",
  "Other",
];

const COLUMNS = [
  { key: "title", label: "Report", width: "300px" },
  { key: "type", label: "Type", width: "140px" },
  { key: "module", label: "Module", width: "140px" },
  { key: "priority", label: "Priority", width: "120px" },
  { key: "status", label: "Status", width: "130px" },
  { key: "created", label: "Created", width: "170px" },
];

export default function FeedbackPage() {
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    report_type: "Feedback",
    priority: "Medium",
    module: "Sample Intake",
    related_sample_id: "",
    title: "",
    description: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.getMyFeedbackReports();
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

  const stats = useMemo(() => {
    return {
      total: reports.length,
      open: reports.filter((item) => item.status === "Open").length,
      review: reports.filter((item) => item.status === "In Review").length,
      resolved: reports.filter((item) => item.status === "Resolved").length,
    };
  }, [reports]);

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setNotice("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (form.title.trim().length < 5) {
      setError("Title must be at least 5 characters.");
      return;
    }

    if (form.description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.createFeedbackReport({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        related_sample_id: form.related_sample_id.trim() || null,
      });

      setForm({
        report_type: "Feedback",
        priority: "Medium",
        module: "Sample Intake",
        related_sample_id: "",
        title: "",
        description: "",
      });

      setNotice("Feedback report submitted successfully.");
      await loadReports();
    } catch (err) {
      setError(err.message || "Failed to submit feedback report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Feedback & Incident Report</h1>
          <p>
            Report interface issues, workflow concerns, bugs, or feature
            requests for system refinement.
          </p>
        </div>

        <div className="headerActions">
          <Button variant="secondary" size="sm" onClick={loadReports}>
            Refresh
          </Button>
        </div>
      </header>

      <section className="notice">
        <strong>Continuous improvement channel</strong>
        <span>
          Use this form to document interface inefficiencies, confusing
          workflows, defects, or feature requests. Submitted reports are routed
          to the administrator for review and status tracking.
        </span>
      </section>

      <section className="statsRow">
        <StatCard
          label="Total Reports"
          value={stats.total}
          note="Reports you submitted"
          variant="brand"
        />

        <StatCard
          label="Open"
          value={stats.open}
          note="Awaiting admin review"
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

      {error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {notice && (
        <section className="successNotice">
          <strong>Report submitted</strong>
          <span>{notice}</span>
        </section>
      )}

      <Card
        title="Submit Report"
        subtitle="Document issues, suggestions, or workflow improvements."
      >
        <form className="form" onSubmit={handleSubmit}>
          <Select
            label="Report Type"
            value={form.report_type}
            required
            onChange={(event) => updateForm("report_type", event.target.value)}
          >
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>

          <Select
            label="Priority"
            value={form.priority}
            required
            onChange={(event) => updateForm("priority", event.target.value)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>

          <Select
            label="Module"
            value={form.module}
            required
            onChange={(event) => updateForm("module", event.target.value)}
          >
            {MODULES.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </Select>

          <Input
            label="Related Sample ID"
            value={form.related_sample_id}
            onChange={(event) =>
              updateForm("related_sample_id", event.target.value)
            }
            placeholder="Optional, e.g. MAR-2026-014"
          />

          <Input
            label="Title"
            value={form.title}
            required
            onChange={(event) => updateForm("title", event.target.value)}
            placeholder="Brief summary of the issue or suggestion"
          />

          <label className="textareaField">
            <span>
              Description <em>Required</em>
            </span>

            <textarea
              value={form.description}
              required
              rows={5}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
              placeholder="Describe what happened, what was confusing, or what improvement is being requested."
            />
          </label>

          <div className="formActions">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        title="My Reports"
        subtitle="Track feedback and incident reports you submitted."
      >
        {loading ? (
          <Loader label="Loading feedback reports..." />
        ) : reports.length === 0 ? (
          <EmptyState
            title="No reports submitted"
            description="Submitted feedback and incident reports will appear here."
          />
        ) : (
          <Table
            columns={COLUMNS}
            data={reports}
            emptyText="No reports submitted."
            density="comfortable"
            variant="minimal"
            className="feedbackTable"
            renderRow={(item) => (
              <tr key={item.feedback_id}>
                <td>
                  <div className="reportCell">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>

                    {item.admin_notes && (
                      <p className="adminNote">
                        <b>Admin note:</b> {item.admin_notes}
                      </p>
                    )}

                    {item.related_sample_id && (
                      <em>Sample: {item.related_sample_id}</em>
                    )}
                  </div>
                </td>

                <td>{item.report_type}</td>

                <td>{item.module}</td>

                <td>
                  <PriorityBadge priority={item.priority} />
                </td>

                <td>
                  <StatusBadge status={item.status} />
                </td>

                <td>{formatDate(item.created_at)}</td>
              </tr>
            )}
          />
        )}
      </Card>

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

        .headerActions {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .headerActions > :global(button),
        .headerActions > :global(a) {
          width: auto;
          min-width: 0;
          min-height: 34px;
          border-radius: var(--radius-md) !important;
        }

        .notice,
        .successNotice {
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

        .successNotice {
          background: var(--color-success-bg);
          color: var(--color-success);
          border: 1px solid var(--color-success-border);
        }

        .notice strong,
        .successNotice strong {
          color: inherit;
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .textareaField {
          grid-column: 1 / -1;
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

        .textareaField em {
          color: var(--color-text-muted);
          font-style: normal;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
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

        .formActions {
          grid-column: 1 / -1;
          display: flex;
          justify-content: flex-end;
        }

        .reportCell {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .reportCell strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reportCell span {
          color: var(--color-text-secondary);
          font-size: 10px;
          line-height: 1.4;
          max-width: 520px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reportCell em {
          color: var(--color-text-muted);
          font-size: 10px;
          font-style: normal;
          line-height: 1.35;
        }

        .adminNote {
          margin: 2px 0 0;
          max-width: 520px;
          color: var(--color-info);
          background: var(--color-info-bg);
          border: 1px solid var(--color-info-border);
          border-radius: var(--radius-md);
          padding: 7px 9px;
          font-size: 10px;
          line-height: 1.45;
          white-space: normal;
        }

        .adminNote b {
          font-weight: 700;
        }

        :global(.feedbackTable table) {
          min-width: 980px;
        }

        @media (max-width: 1100px) {
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
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

          .headerActions > :global(button),
          .headerActions > :global(a) {
            width: 100%;
            min-width: 0;
            flex: 1 1 100%;
          }

          .form {
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
