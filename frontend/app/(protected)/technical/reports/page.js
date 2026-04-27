"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import { apiClient, getStoredUser } from "@/services/apiClient";

const REPORT_COLUMNS = [
  { key: "sample", label: "Sample", width: "150px" },
  { key: "client", label: "Client / Project", width: "220px" },
  { key: "material", label: "Material", width: "170px" },
  { key: "test", label: "Test", width: "190px" },
  { key: "result", label: "Result", width: "130px" },
  { key: "released", label: "Released At", width: "155px" },
  { key: "action", label: "Report", align: "right", width: "230px" },
];

const PDF_DOWNLOAD_ROLES = new Set([
  "QA Engineer",
  "Accounting Staff",
  "Administrator",
]);

export default function ReportsPage() {
  const user = getStoredUser();
  const role = user?.role || "Lab Technician";
  const canDownloadOfficialReport = PDF_DOWNLOAD_ROLES.has(role);
  const isAdmin = role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [samples, setSamples] = useState([]);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");
  const [resultFilter, setResultFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  async function downloadSampleReport(sampleId) {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("token");

    if (!token) {
      setError("Missing login token. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/samples/${sampleId}/report/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to download PDF report.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${sampleId}-official-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download PDF report.");
    }
  }

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

  useEffect(() => {
    if (!isAdmin && branchFilter !== "All" && branchFilter !== "My") {
      const resolved = resolveBranchFilter(branchFilter, userBranchId);
      const isOwnBranch = Number(resolved) === Number(userBranchId);

      if (isOwnBranch) {
        setBranchFilter("My");
      }
    }
  }, [branchFilter, isAdmin, userBranchId]);

  const releasedReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

    return samples
      .filter((item) => item.current_state === "Released")
      .filter((item) => {
        const metadata = item.device_metadata || {};
        const testData = metadata.test_data || {};
        const finalResult = getFinalResult(testData);
        const material = normalizeMaterialName(
          item.material_type || item.ai_predicted_label,
        );

        const matchesBranch =
          resolvedBranch === "All" ||
          Number(item.branch_id) === Number(resolvedBranch);

        const matchesResult =
          resultFilter === "All" || finalResult === resultFilter;

        const matchesSearch =
          !q ||
          item.sample_id?.toLowerCase().includes(q) ||
          item.client_name?.toLowerCase().includes(q) ||
          item.project_reference?.toLowerCase().includes(q) ||
          material.toLowerCase().includes(q) ||
          testData.test_type?.toLowerCase().includes(q) ||
          testData.values?.test_name?.toLowerCase().includes(q);

        return matchesBranch && matchesResult && matchesSearch;
      });
  }, [samples, search, resultFilter, branchFilter, userBranchId]);

  const stats = useMemo(() => {
    return releasedReports.reduce(
      (acc, item) => {
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
  }, [releasedReports]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Official Reports</h1>
          <p>
            Released laboratory reports finalized through QA authorization for{" "}
            <strong>{branchViewLabel}</strong>.
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

          <Button variant="secondary" size="sm" onClick={loadReports}>
            Refresh
          </Button>
        </div>
      </header>

      <section className="notice">
        <strong>
          {isAdmin
            ? "Administrator Report Scope"
            : isCloudMonitoring || isOtherBranchView
              ? "Cloud-Synced Monitoring"
              : "Report Scope"}
        </strong>
        <span>
          {isAdmin
            ? "You can view released reports across all branches from the centralized system."
            : isCloudMonitoring
              ? `You are viewing all cloud-synced released reports. This page is read-only; operational actions remain branch-aware in Workflow.`
              : isOtherBranchView
                ? `You are viewing ${branchViewLabel} released reports for monitoring. This page is read-only.`
                : "Released reports are viewable for monitoring. Official PDF download is restricted to QA Engineers, Accounting Staff, and Administrators."}
        </span>
      </section>

      {loading && <Loader label="Loading released reports..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="stats">
            <StatCard label="Released Reports" value={stats.total} />
            <StatCard label="PASS" value={stats.pass} />
            <StatCard label="FAIL" value={stats.fail} />
            <StatCard label="RECORDED" value={stats.recorded} />
          </section>

          <section className="toolbar">
            <Input
              name="reportSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sample ID, client, project, material, or test type..."
            />

            <Select
              name="resultFilter"
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value)}
            >
              <option value="All">All Results</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="RECORDED">RECORDED</option>
            </Select>
          </section>

          <Card
            title="Released Reports"
            subtitle="Open a report to view the official report preview and print/PDF options."
          >
            {releasedReports.length === 0 ? (
              <EmptyState
                title="No released reports found"
                description="Reports will appear here after QA releases an official laboratory report."
              />
            ) : (
              <Table
                columns={REPORT_COLUMNS}
                data={releasedReports}
                emptyText="No released reports found."
                density="comfortable"
                variant="minimal"
                className="reportsTable"
                renderRow={(item) => {
                  const metadata = item.device_metadata || {};
                  const testData = metadata.test_data || {};
                  const testValues = testData.values || {};
                  const qa = metadata.qa || {};
                  const finalResult = getFinalResult(testData);
                  const material = normalizeMaterialName(
                    item.material_type || item.ai_predicted_label,
                  );

                  return (
                    <tr key={item.sample_id}>
                      <td>
                        <div className="stack">
                          <strong>{item.sample_id}</strong>
                          <small>{formatBranch(item.branch_id)}</small>
                        </div>
                      </td>

                      <td>
                        <div className="stack">
                          <strong>{item.client_name || "-"}</strong>
                          <small>{item.project_reference || "-"}</small>
                        </div>
                      </td>

                      <td>
                        <strong className="regularText">{material}</strong>
                      </td>

                      <td>
                        <div className="stack">
                          <strong>
                            {testValues.test_name ||
                              formatLabel(testData.test_type)}
                          </strong>
                          <small>{testValues.standard || "-"}</small>
                        </div>
                      </td>

                      <td>
                        <ResultBadge result={finalResult} />
                      </td>

                      <td>
                        <span className="dateText">
                          {formatDate(qa.release_reviewed_at)}
                        </span>
                      </td>

                      <td className="right">
                        <div className="reportActions">
                          {canDownloadOfficialReport && (
                            <button
                              type="button"
                              className="reportButton"
                              onClick={() =>
                                downloadSampleReport(item.sample_id)
                              }
                            >
                              Download PDF
                            </button>
                          )}

                          <Link
                            href={`/technical/tracking/${item.sample_id}`}
                            className="reportLink"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                }}
              />
            )}
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
          gap: 18px;
        }

        .headerControls {
          display: grid;
          grid-template-columns: 180px auto;
          gap: 10px;
          align-items: start;
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

        .header p strong {
          color: var(--color-text-primary);
          font-weight: 500;
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
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 12px;
          align-items: end;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .stack {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .stack strong,
        .regularText {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1.45;
        }

        .stack small,
        .dateText {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 400;
          line-height: 1.35;
        }

        :global(.right) {
          text-align: right;
        }

        .reportActions {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          min-width: 210px;
        }

        .reportButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid var(--color-brand);
          border-radius: var(--radius-md);
          background: var(--color-brand);
          color: #ffffff;
          font-size: var(--text-xs);
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            opacity var(--transition-base);
        }

        .reportButton:hover {
          opacity: 0.88;
        }

        :global(.reportLink) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.reportLink:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        :global(.reportsTable table) {
          min-width: 1220px;
        }

        @media (max-width: 900px) {
          .header {
            flex-direction: column;
          }

          .headerControls {
            width: 100%;
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .toolbar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .stats {
            grid-template-columns: 1fr;
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

function ResultBadge({ result }) {
  const normalized = result || "RECORDED";

  const variant =
    normalized === "PASS"
      ? "success"
      : normalized === "FAIL"
        ? "danger"
        : normalized === "RECORDED"
          ? "info"
          : "neutral";

  return (
    <Badge variant={variant} size="sm">
      {normalized}
    </Badge>
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

function getFinalResult(testData) {
  return (
    testData?.qa_final_result ||
    testData?.final_result ||
    testData?.result ||
    null
  );
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

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}
