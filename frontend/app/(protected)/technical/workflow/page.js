"use client";

import { useMemo, useState } from "react";
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

const WORKFLOW_ITEMS = [
  {
    id: "BRS-2026-001",
    material: "Concrete (Beam)",
    type: "concrete",
    branch: "Pateros",
    client: "Build-Build-Build Corp",
    project: "Cavite-Laguna Express Way",
    assignedTo: "Tech. Jon",
    status: "In Test",
    aiConfidence: 96,
    needsValidation: false,
    updatedAt: "02/16/2026 2:15 PM",
  },
  {
    id: "BRS-2026-002",
    material: "Cement (Ready-mix)",
    type: "cement",
    branch: "Marikina",
    client: "Metro Manila Concrete Solutions",
    project: "SLEX Elevated Extension",
    assignedTo: "Senior Technician",
    status: "Registered",
    aiConfidence: 82,
    needsValidation: true,
    updatedAt: "02/16/2026 1:40 PM",
  },
  {
    id: "BRS-2026-003",
    material: "Soil Aggregate (Subbase)",
    type: "soil",
    branch: "Pateros",
    client: "Luzon Dev Corp",
    project: "North Road Widening",
    assignedTo: "QA Engineer",
    status: "For Review",
    aiConfidence: 90,
    needsValidation: false,
    updatedAt: "02/16/2026 11:10 AM",
  },
  {
    id: "BRS-2026-004",
    material: "Concrete Aggregate (Fine)",
    type: "concrete",
    branch: "Marikina",
    client: "Metro Link Holdings",
    project: "Bridge Retrofit Project",
    assignedTo: "QA Engineer",
    status: "Released",
    aiConfidence: 94,
    needsValidation: false,
    updatedAt: "02/16/2026 9:45 AM",
  },
  {
    id: "BRS-2026-005",
    material: "Reinforcing Steel Bars",
    type: "steel",
    branch: "Marikina",
    client: "North Axis Structures",
    project: "Pasig Support Works",
    assignedTo: "Tech. Angel",
    status: "In Test",
    aiConfidence: 91,
    needsValidation: false,
    updatedAt: "02/16/2026 8:20 AM",
  },
];

function getStatusClass(status) {
  if (status === "Released") return "released";
  if (status === "For Review") return "review";
  if (status === "In Test") return "testing";
  return "registered";
}

export default function WorkflowPage() {
  const router = useRouter();

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const role = currentUser?.role || "technician";

  const isTechnician = role === "technician";
  const isSeniorTechnician = role === "senior_technician";
  const isQAEngineer = role === "qa_engineer";

  const [items, setItems] = useState(WORKFLOW_ITEMS);
  const [branch, setBranch] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  const pageMeta = useMemo(() => {
    if (isSeniorTechnician) {
      return {
        title: "Validation Workflow",
        subtitle:
          "Review low-confidence AI classifications and record manual validation decisions.",
      };
    }

    if (isQAEngineer) {
      return {
        title: "Release Review Workflow",
        subtitle:
          "Review finalized samples, authorize release, and manage report-ready records.",
      };
    }

    return {
      title: "Testing Workflow",
      subtitle:
        "Monitor assigned samples, continue technical encoding, and progress testing work.",
    };
  }, [isSeniorTechnician, isQAEngineer]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  function updateItem(sampleId, updates) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === sampleId
          ? {
              ...item,
              ...updates,
              updatedAt: new Date().toLocaleString(),
            }
          : item
      )
    );
  }

  function handleStartTesting(sampleId) {
    updateItem(sampleId, {
      status: "In Test",
      assignedTo: currentUser?.name || "Technician",
    });
    showToast("Sample moved to In Test.");
  }

  function handleFinalizeForReview(sampleId) {
    updateItem(sampleId, {
      status: "For Review",
      assignedTo: "QA Engineer",
    });
    showToast("Sample moved to For Review.");
  }

  function handleConfirmValidation(sampleId) {
    updateItem(sampleId, {
      needsValidation: false,
      assignedTo: "Technician",
    });
    showToast("Manual validation confirmed.");
  }

  function handleOverrideValidation(sampleId) {
    updateItem(sampleId, {
      needsValidation: false,
      assignedTo: "Technician",
      status: "Registered",
    });
    showToast("AI result overridden and validation recorded.");
  }

  function handleAuthorizeRelease(sampleId) {
    updateItem(sampleId, {
      status: "Released",
      assignedTo: "QA Engineer",
    });
    showToast("Sample released successfully.");
  }

  function handleReturnToInTest(sampleId) {
    updateItem(sampleId, {
      status: "In Test",
      assignedTo: "Technician",
    });
    showToast("Sample returned to In Test.");
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
        (item) => item.status === "For Review" || item.status === "Released"
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
    const inTest = items.filter((item) => item.status === "In Test").length;
    const forReview = items.filter((item) => item.status === "For Review").length;
    const released = items.filter((item) => item.status === "Released").length;
    const validation = items.filter((item) => item.needsValidation).length;

    if (isSeniorTechnician) {
      return [
        { label: "Needs Validation", value: validation },
        { label: "Registered", value: registered },
        { label: "In Test", value: inTest },
        { label: "For Review", value: forReview },
      ];
    }

    if (isQAEngineer) {
      return [
        { label: "For Review", value: forReview },
        { label: "Released", value: released },
        { label: "Pending Validation", value: validation },
        { label: "Review Queue", value: forReview + released },
      ];
    }

    return [
      { label: "Registered", value: registered },
      { label: "In Test", value: inTest },
      { label: "For Review", value: forReview },
      { label: "Released", value: released },
    ];
  }, [items, isSeniorTechnician, isQAEngineer]);

  const statusOptions = useMemo(() => {
    if (isSeniorTechnician) {
      return [
        { label: "Validation Queue", value: "validation" },
        { label: "All Statuses", value: "all" },
        { label: "Registered", value: "registered" },
        { label: "In Test", value: "in_test" },
      ];
    }

    if (isQAEngineer) {
      return [
        { label: "All Statuses", value: "all" },
        { label: "For Review", value: "for_review" },
        { label: "Released", value: "released" },
      ];
    }

    return [
      { label: "All Statuses", value: "all" },
      { label: "Registered", value: "registered" },
      { label: "In Test", value: "in_test" },
      { label: "For Review", value: "for_review" },
      { label: "Released", value: "released" },
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
              onClick={() => handleStartTesting(item.id)}
            >
              <ArrowClockwise size={16} weight="bold" />
              <span>Start Testing</span>
            </button>
          ) : item.status === "In Test" ? (
            <>
              <button
                type="button"
                style={primaryActionStyle}
                onClick={() => router.push(`/technical/tracking/${item.id}`)}
              >
                <ClipboardText size={16} weight="bold" />
                <span>Continue Encoding</span>
              </button>

              <button
                type="button"
                style={secondaryActionStyle}
                onClick={() => handleFinalizeForReview(item.id)}
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
            onClick={() => router.push(`/technical/tracking/${item.id}`)}
          >
            <Eye size={16} weight="bold" />
            <span>Review Details</span>
          </button>

          <button
            type="button"
            style={secondaryActionStyle}
            onClick={() => handleConfirmValidation(item.id)}
          >
            <CheckCircle size={16} weight="bold" />
            <span>Confirm AI Result</span>
          </button>

          <button
            type="button"
            style={primaryActionStyle}
            onClick={() => handleOverrideValidation(item.id)}
          >
            <FloppyDisk size={16} weight="bold" />
            <span>Override Result</span>
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
              onClick={() => handleReturnToInTest(item.id)}
            >
              <ArrowClockwise size={16} weight="bold" />
              <span>Return to In Test</span>
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
            {filteredItems.map((item) => (
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
                    <p>{item.aiConfidence}%</p>
                  </div>

                  <div>
                    <span className="label">Updated At</span>
                    <p>{item.updatedAt}</p>
                  </div>
                </div>

                <div className="actionRow">{renderActions(item)}</div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="emptyState">
                No workflow items matched your current filters.
              </div>
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

        .topButton:hover {
          border-color: #9ca3af;
          background: #f8fafc;
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
          min-width: 96px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .statusBadge.registered {
          background: #eff6ff;
          color: #1d4ed8;
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

        .actionButton {
          min-height: 42px;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          line-height: 1;
          white-space: nowrap;
          transition: all 0.2s ease;
        }

        .actionButton span {
          color: inherit;
        }

        .actionButton :global(svg) {
          flex-shrink: 0;
        }

        .primaryAction {
          border: none;
          background: #080026;
          color: #ffffff;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(8, 0, 38, 0.16);
        }

        .primaryAction:hover {
          background: #14004a;
          transform: translateY(-1px);
        }

        .secondaryAction {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #1f2937;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
        }

        .secondaryAction:hover {
          border-color: #94a3b8;
          background: #f8fafc;
          transform: translateY(-1px);
        }

        .mutedAction {
          border: 1px solid #e5e7eb;
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
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

          .actionButton,
          .topButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}