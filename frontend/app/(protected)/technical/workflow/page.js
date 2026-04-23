"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/ui/Dropdown";
import {
  ArrowClockwise,
  CheckCircle,
  ClipboardText,
  Eye,
  FloppyDisk,
  Medal,
  WarningCircle,
} from "phosphor-react";

const API_BASE_URL = "http://localhost:8000";

function getStatusClass(status) {
  if (status === "Released") return "released";
  if (status === "For Review") return "review";
  if (status === "In Testing") return "testing";
  if (status === "Up-To-Standard") return "standard";
  if (status === "Archived") return "archived";
  return "registered";
}

function normalizeBranch(branchId) {
  if (branchId === "1" || branchId === 1) return "Marikina";
  if (branchId === "2" || branchId === 2) return "Pateros";
  return "Unassigned";
}

function getMaterialLabel(materialType) {
  if (!materialType) return "Unknown";

  const normalized = materialType.toLowerCase();

  if (normalized.includes("concrete")) return "Concrete";
  if (normalized.includes("soil")) return "Soil Aggregates";
  if (normalized.includes("steel") || normalized.includes("rsb")) {
    return "Reinforcing Steel Bar (RSB)";
  }

  return materialType;
}

function getFrontendRole(rawRole) {
  switch (rawRole) {
    case "Lab Technician":
      return "technician";
    case "Senior Technician":
      return "senior_technician";
    case "QA Engineer":
      return "qa_engineer";
    case "Administrator":
      return "admin";
    case "Accounting Staff":
      return "accounting";
    default:
      return "";
  }
}

export default function WorkflowPage() {
  const router = useRouter();

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const rawRole =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";

  const frontendRole =
    currentUser?.role || getFrontendRole(rawRole) || "technician";

  const isTechnician = frontendRole === "technician";
  const isSeniorTechnician = frontendRole === "senior_technician";
  const isQAEngineer = frontendRole === "qa_engineer";

  const [items, setItems] = useState([]);
  const [branch, setBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pageMeta = useMemo(() => {
    if (isSeniorTechnician) {
      return {
        title: "Validation Workflow",
        subtitle:
          "Review low-confidence AI classifications and confirm material decisions before release review.",
      };
    }

    if (isQAEngineer) {
      return {
        title: "Release Review Workflow",
        subtitle:
          "Review finalized testing records, confirm findings, and authorize release-ready samples.",
      };
    }

    return {
      title: "Testing Workflow",
      subtitle:
        "Progress registered samples through standards checking, testing, and review preparation.",
    };
  }, [isSeniorTechnician, isQAEngineer]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  function mapSampleToWorkflowItem(sample) {
    const aiConfidence =
      typeof sample.ai_confidence_score === "number"
        ? Math.round(sample.ai_confidence_score)
        : 0;

    return {
      id: sample.sample_id,
      dbId: sample.id,
      material: getMaterialLabel(sample.material_type),
      type: sample.material_type,
      branch: normalizeBranch(sample.branch_id),
      client: sample.client_name,
      project: sample.project_id,
      assignedTo:
        sample.current_state === "For Review"
          ? "QA Engineer"
          : sample.current_state === "Released"
          ? "QA Engineer"
          : sample.current_state === "Archived"
          ? "QA Engineer"
          : "Lab Technician",
      status: sample.current_state,
      aiConfidence,
      needsValidation: aiConfidence > 0 && aiConfidence < 85,
      updatedAt: sample.updated_at
        ? new Date(sample.updated_at).toLocaleString()
        : sample.created_at
        ? new Date(sample.created_at).toLocaleString()
        : "—",
      raw: sample,
    };
  }

  async function fetchWorkflowItems(showRefreshState = false) {
    try {
      if (showRefreshState) setRefreshing(true);
      setLoading(true);

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(`${API_BASE_URL}/api/samples`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to fetch workflow items."
        );
      }

      const normalized = Array.isArray(data)
        ? data.map(mapSampleToWorkflowItem)
        : [];

      setItems(normalized);
    } catch (error) {
      console.error("Failed to fetch workflow items:", error);
      showToast(error.message || "Failed to load workflow.");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchWorkflowItems();
  }, []);

  async function updateSampleState(sampleId, currentState) {
    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/samples/${sampleId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_state: currentState,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to update workflow status."
        );
      }

      await fetchWorkflowItems();
    } catch (error) {
      console.error("Failed to update state:", error);
      showToast(error.message || "Failed to update sample state.");
    }
  }

  async function handleMoveToUpToStandard(sampleId) {
    await updateSampleState(sampleId, "Up-To-Standard");
    showToast("Sample moved to Up-To-Standard.");
  }

  async function handleMoveToInTesting(sampleId) {
    await updateSampleState(sampleId, "In Testing");
    showToast("Sample moved to In Testing.");
  }

  async function handleMoveToForReview(sampleId) {
    await updateSampleState(sampleId, "For Review");
    showToast("Sample moved to For Review.");
  }

  async function handleAuthorizeRelease(sampleId) {
    await updateSampleState(sampleId, "Released");
    showToast("Sample released successfully.");
  }

  async function handleArchive(sampleId) {
    await updateSampleState(sampleId, "Archived");
    showToast("Sample archived.");
  }

  function handleOpenValidation(sampleId) {
    router.push(`/technical/tracking/${sampleId}`);
  }

  const filteredItems = useMemo(() => {
    let base = [...items];

    if (branch !== "all") {
      base = base.filter((item) => item.branch.toLowerCase() === branch);
    }

    if (isSeniorTechnician) {
      base = base.filter((item) => item.needsValidation);
    } else if (isQAEngineer) {
      base = base.filter(
        (item) =>
          item.status === "For Review" ||
          item.status === "Released" ||
          item.status === "Archived"
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "validation") {
        base = base.filter((item) => item.needsValidation);
      } else {
        base = base.filter(
          (item) => item.status.toLowerCase().replaceAll(" ", "_") === statusFilter
        );
      }
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      base = base.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          item.material.toLowerCase().includes(q) ||
          item.client.toLowerCase().includes(q) ||
          item.project.toLowerCase().includes(q) ||
          item.assignedTo.toLowerCase().includes(q)
      );
    }

    return base;
  }, [items, branch, statusFilter, query, isSeniorTechnician, isQAEngineer]);

  const stats = useMemo(() => {
    const registered = items.filter((item) => item.status === "Registered").length;
    const upToStandard = items.filter(
      (item) => item.status === "Up-To-Standard"
    ).length;
    const inTesting = items.filter((item) => item.status === "In Testing").length;
    const forReview = items.filter((item) => item.status === "For Review").length;
    const released = items.filter((item) => item.status === "Released").length;
    const validation = items.filter((item) => item.needsValidation).length;

    if (isSeniorTechnician) {
      return [
        { label: "Needs Validation", value: validation },
        { label: "Registered", value: registered },
        { label: "Up-To-Standard", value: upToStandard },
        { label: "In Testing", value: inTesting },
      ];
    }

    if (isQAEngineer) {
      return [
        { label: "For Review", value: forReview },
        { label: "Released", value: released },
        { label: "Needs Validation", value: validation },
        { label: "Review Queue", value: forReview + released },
      ];
    }

    return [
      { label: "Registered", value: registered },
      { label: "Up-To-Standard", value: upToStandard },
      { label: "In Testing", value: inTesting },
      { label: "For Review", value: forReview },
    ];
  }, [items, isSeniorTechnician, isQAEngineer]);

  const statusOptions = useMemo(() => {
    if (isSeniorTechnician) {
      return [
        { label: "Validation Queue", value: "validation" },
        { label: "All Statuses", value: "all" },
        { label: "Registered", value: "registered" },
        { label: "Up-To-Standard", value: "up-to-standard" },
        { label: "In Testing", value: "in_testing" },
      ];
    }

    if (isQAEngineer) {
      return [
        { label: "All Statuses", value: "all" },
        { label: "For Review", value: "for_review" },
        { label: "Released", value: "released" },
        { label: "Archived", value: "archived" },
      ];
    }

    return [
      { label: "All Statuses", value: "all" },
      { label: "Registered", value: "registered" },
      { label: "Up-To-Standard", value: "up-to-standard" },
      { label: "In Testing", value: "in_testing" },
      { label: "For Review", value: "for_review" },
      { label: "Released", value: "released" },
      { label: "Archived", value: "archived" },
    ];
  }, [isSeniorTechnician, isQAEngineer]);

  const actionBaseStyle = {
    minHeight: "42px",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    lineHeight: 1,
    whiteSpace: "nowrap",
    textDecoration: "none",
  };

  const primaryActionStyle = {
    ...actionBaseStyle,
    border: "none",
    background: "#080026",
    color: "#ffffff",
    boxShadow: "0 4px 10px rgba(8, 0, 38, 0.16)",
    cursor: "pointer",
  };

  const secondaryActionStyle = {
    ...actionBaseStyle,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#1f2937",
    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.05)",
    cursor: "pointer",
  };

  const mutedActionStyle = {
    ...actionBaseStyle,
    border: "1px solid #e5e7eb",
    background: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
  };

  function renderActions(item) {
    if (isTechnician) {
      return (
        <>
          <button
            type="button"
            style={secondaryActionStyle}
            onClick={() => router.push(`/technical/tracking/${item.id}`)}
          >
            <Eye size={16} weight="bold" />
            <span>View Details</span>
          </button>

          {item.needsValidation ? (
            <button type="button" style={mutedActionStyle} disabled>
              <WarningCircle size={16} weight="bold" />
              <span>Await Validation</span>
            </button>
          ) : item.status === "Registered" ? (
            <button
              type="button"
              style={primaryActionStyle}
              onClick={() => handleMoveToUpToStandard(item.id)}
            >
              <CheckCircle size={16} weight="bold" />
              <span>Mark Up-To-Standard</span>
            </button>
          ) : item.status === "Up-To-Standard" ? (
            <button
              type="button"
              style={primaryActionStyle}
              onClick={() => handleMoveToInTesting(item.id)}
            >
              <ArrowClockwise size={16} weight="bold" />
              <span>Start Testing</span>
            </button>
          ) : item.status === "In Testing" ? (
            <>
              <button
                type="button"
                style={primaryActionStyle}
                onClick={() => router.push(`/technical/tracking/${item.id}`)}
              >
                <ClipboardText size={16} weight="bold" />
                <span>Continue Testing</span>
              </button>

              <button
                type="button"
                style={secondaryActionStyle}
                onClick={() => handleMoveToForReview(item.id)}
              >
                <Medal size={16} weight="bold" />
                <span>Move to For Review</span>
              </button>
            </>
          ) : item.status === "For Review" ? (
            <button type="button" style={mutedActionStyle} disabled>
              <Medal size={16} weight="bold" />
              <span>Await QA Review</span>
            </button>
          ) : (
            <button type="button" style={mutedActionStyle} disabled>
              <CheckCircle size={16} weight="bold" />
              <span>Completed</span>
            </button>
          )}
        </>
      );
    }

    if (isSeniorTechnician) {
      return (
        <>
          <button
            type="button"
            style={secondaryActionStyle}
            onClick={() => handleOpenValidation(item.id)}
          >
            <Eye size={16} weight="bold" />
            <span>Review Details</span>
          </button>

          <button
            type="button"
            style={primaryActionStyle}
            onClick={() => handleOpenValidation(item.id)}
          >
            <FloppyDisk size={16} weight="bold" />
            <span>Open Validation</span>
          </button>
        </>
      );
    }

    return (
      <>
        <button
          type="button"
          style={secondaryActionStyle}
          onClick={() => router.push(`/technical/tracking/${item.id}`)}
        >
          <Eye size={16} weight="bold" />
          <span>View Details</span>
        </button>

        {item.status === "For Review" ? (
          <>
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={() => handleMoveToInTesting(item.id)}
            >
              <ArrowClockwise size={16} weight="bold" />
              <span>Return to In Testing</span>
            </button>

            <button
              type="button"
              style={primaryActionStyle}
              onClick={() => handleAuthorizeRelease(item.id)}
            >
              <Medal size={16} weight="bold" />
              <span>Authorize Release</span>
            </button>
          </>
        ) : item.status === "Released" ? (
          <button
            type="button"
            style={secondaryActionStyle}
            onClick={() => handleArchive(item.id)}
          >
            <FloppyDisk size={16} weight="bold" />
            <span>Archive</span>
          </button>
        ) : (
          <button
            type="button"
            style={primaryActionStyle}
            onClick={() => router.push(`/technical/tracking/${item.id}`)}
          >
            <ClipboardText size={16} weight="bold" />
            <span>Generate Report</span>
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        <div className="header">
          <div>
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.subtitle}</p>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="topButton"
              onClick={() => fetchWorkflowItems(true)}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <button
              type="button"
              className="topButton"
              onClick={() => router.push("/technical/registry")}
            >
              Open Registry
            </button>
          </div>
        </div>

        <div className="statsRow">
          {stats.map((stat) => (
            <div key={stat.label} className="statCard">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>

        <div className="toolbar">
          <input
            type="text"
            className="searchInput"
            placeholder="Search by sample ID, material, client, project, or assignee"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <Dropdown
            options={[
              { label: "All Branches", value: "all" },
              { label: "Marikina", value: "marikina" },
              { label: "Pateros", value: "pateros" },
            ]}
            value={branch}
            onChange={setBranch}
          />

          <Dropdown
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>
              {isSeniorTechnician
                ? "Manual Validation Queue"
                : isQAEngineer
                ? "Release Authorization Queue"
                : "Assigned Workflow Items"}
            </h3>
            <span>{filteredItems.length} items</span>
          </div>

          <div className="cardList">
            {loading ? (
              <div className="emptyState">Loading workflow items...</div>
            ) : filteredItems.length === 0 ? (
              <div className="emptyState">
                No workflow items matched your current filters.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="workflowCard">
                  <div className="cardTop">
                    <div>
                      <strong>{item.id}</strong>
                      <p className="materialText">{item.material}</p>
                    </div>

                    <div className="topBadges">
                      {item.needsValidation && (
                        <span className="validationBadge">LOW CONFIDENCE</span>
                      )}
                      <span className={`statusBadge ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="detailsGrid">
                    <div>
                      <span className="label">Client</span>
                      <p>{item.client}</p>
                    </div>

                    <div>
                      <span className="label">Project</span>
                      <p>{item.project}</p>
                    </div>

                    <div>
                      <span className="label">Branch</span>
                      <p>{item.branch}</p>
                    </div>

                    <div>
                      <span className="label">Assigned To</span>
                      <p>{item.assignedTo}</p>
                    </div>

                    <div>
                      <span className="label">AI Confidence</span>
                      <p>{item.aiConfidence ? `${item.aiConfidence}%` : "—"}</p>
                    </div>

                    <div>
                      <span className="label">Updated At</span>
                      <p>{item.updatedAt}</p>
                    </div>
                  </div>

                  <div className="actionRow">{renderActions(item)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .toast {
          position: fixed;
          top: 92px;
          right: 24px;
          z-index: 80;
          background: #111827;
          color: #ffffff;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          color: #1f2937;
        }

        p {
          margin: 6px 0 0;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.45;
        }

        h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #1f2937;
        }

        .topButton {
          height: 42px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #1f2937;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .topButton:hover:not(:disabled) {
          border-color: #9ca3af;
          background: #f8fafc;
        }

        .topButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .statCard {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px;
        }

        .statCard span {
          font-size: 12px;
          color: #374151;
        }

        .statCard strong {
          display: block;
          margin-top: 8px;
          font-size: 24px;
          color: #111827;
        }

        .toolbar {
          display: grid;
          grid-template-columns: 1.5fr 0.75fr 0.75fr;
          gap: 14px;
          align-items: center;
        }

        .searchInput {
          height: 46px;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          padding: 0 14px;
          font-size: 13px;
          color: #1f2937;
          background: #ffffff;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .searchInput::placeholder {
          color: #9ca3af;
        }

        .searchInput:hover {
          border-color: #9ca3af;
        }

        .searchInput:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
        }

        .panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 20px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .panelHeader span {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
        }

        .cardList {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .workflowCard {
          border: 1px solid #dbe3ee;
          background: #ffffff;
          border-radius: 16px;
          padding: 20px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .workflowCard:hover {
          border-color: #cbd5e1;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
        }

        .cardTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .cardTop strong {
          display: block;
          font-size: 14px;
          color: #111827;
        }

        .materialText {
          margin-top: 4px;
          font-size: 13px;
          color: #374151;
        }

        .topBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .validationBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 110px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          background: #fff7ed;
          color: #c2410c;
        }

        .statusBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 108px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .statusBadge.registered {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .statusBadge.standard {
          background: #ede9fe;
          color: #6d28d9;
        }

        .statusBadge.testing {
          background: #fef3c7;
          color: #b45309;
        }

        .statusBadge.review {
          background: #e0f2fe;
          color: #0369a1;
        }

        .statusBadge.released {
          background: #ecfdf5;
          color: #047857;
        }

        .statusBadge.archived {
          background: #f3f4f6;
          color: #6b7280;
        }

        .detailsGrid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px 18px;
          margin-bottom: 18px;
        }

        .label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .detailsGrid p {
          margin: 0;
          font-size: 13px;
          color: #1f2937;
        }

        .actionRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .emptyState {
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          padding: 22px;
          text-align: center;
          color: #6b7280;
          font-size: 13px;
          background: #fafafa;
        }

        @media (max-width: 1080px) {
          .statsRow {
            grid-template-columns: 1fr 1fr;
          }

          .toolbar {
            grid-template-columns: 1fr;
          }

          .detailsGrid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 768px) {
          .header {
            flex-direction: column;
          }

          .detailsGrid {
            grid-template-columns: 1fr;
          }

          .actionRow {
            flex-direction: column;
          }

          .topButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}