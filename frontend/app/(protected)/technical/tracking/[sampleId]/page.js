"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Clock,
  CalendarBlank,
  CheckSquare,
  Stack,
} from "phosphor-react";

const API_BASE_URL = "http://localhost:8000";

function normalizeBranch(branchId) {
  if (branchId === "1" || branchId === 1) return "Marikina";
  if (branchId === "2" || branchId === 2) return "Pateros";
  return "Unassigned";
}

function getMaterialLabel(materialType) {
  if (!materialType) return "Unknown Material";

  const value = materialType.toLowerCase();

  if (value.includes("concrete")) return "Concrete";
  if (value.includes("soil")) return "Soil Aggregates";
  if (value.includes("steel") || value.includes("rsb")) {
    return "Reinforcing Steel Bar (RSB)";
  }

  return materialType;
}

function getStatusClass(status) {
  switch (status) {
    case "Registered":
      return "registered";
    case "Up-To-Standard":
      return "standard";
    case "In Testing":
      return "testing";
    case "For Review":
      return "for-review";
    case "Released":
      return "released";
    case "Archived":
      return "archived";
    default:
      return "registered";
  }
}

function getLifecycleDescription(status) {
  switch (status) {
    case "Registered":
      return "Sample intake has been recorded and is awaiting standards checking.";
    case "Up-To-Standard":
      return "Sample has been marked up-to-standard and is ready for active testing.";
    case "In Testing":
      return "Technical testing is currently in progress.";
    case "For Review":
      return "Testing is complete and the sample is awaiting review.";
    case "Released":
      return "Sample has been approved and released.";
    case "Archived":
      return "Sample record has been archived.";
    default:
      return "Lifecycle state available.";
  }
}

function canValidate(rawRole, currentUserRole) {
  return (
    rawRole === "Senior Technician" ||
    rawRole === "QA Engineer" ||
    currentUserRole === "senior_technician" ||
    currentUserRole === "qa_engineer"
  );
}

export default function TrackingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sampleId = params?.sampleId;

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const rawRole =
    typeof window !== "undefined" ? localStorage.getItem("role") || "" : "";

  const frontendRole = currentUser?.role || rawRole || "";

  const [activeTab, setActiveTab] = useState("overview");
  const [sample, setSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [finalMaterialType, setFinalMaterialType] = useState("");
  const [justification, setJustification] = useState("");
  const [validationError, setValidationError] = useState("");
  const [validationSuccess, setValidationSuccess] = useState("");
  const [isSubmittingValidation, setIsSubmittingValidation] = useState(false);

  async function fetchSample(showRefresh = false) {
    try {
      if (showRefresh) setRefreshing(true);
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(`${API_BASE_URL}/api/samples/${sampleId}`, {
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
            : "Failed to load sample details."
        );
      }

      if (!data || !data.sample_id) {
        throw new Error("Sample not found");
      }

      setSample(data);
      setFinalMaterialType(data.material_type || "");
    } catch (err) {
      console.error("Failed to fetch sample:", err);
      setError(err.message || "Failed to load sample details.");
      setSample(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleValidate(approved) {
    try {
      setValidationError("");
      setValidationSuccess("");

      if (!finalMaterialType.trim()) {
        setValidationError("Final material type is required.");
        return;
      }

      if (!justification.trim() || justification.trim().length < 5) {
        setValidationError("Justification is required and must be at least 5 characters.");
        return;
      }

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("You are not logged in.");
      }

      setIsSubmittingValidation(true);

      const response = await fetch(`${API_BASE_URL}/api/validate/${sample.sample_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          final_material_type: finalMaterialType,
          justification: justification.trim(),
          approved,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Validation failed."
        );
      }

      setValidationSuccess(
        approved
          ? "Validation submitted successfully. Sample approved."
          : "Validation submitted successfully. Sample returned for further testing."
      );

      await fetchSample(true);
    } catch (err) {
      console.error("Validation failed:", err);
      setValidationError(err.message || "Validation failed.");
    } finally {
      setIsSubmittingValidation(false);
    }
  }

  useEffect(() => {
    if (sampleId) {
      fetchSample();
    }
  }, [sampleId]);

  const derived = useMemo(() => {
    if (!sample) return null;

    const materialLabel = getMaterialLabel(sample.material_type);
    const branchLabel = normalizeBranch(sample.branch_id);
    const updatedAt = sample.updated_at
      ? new Date(sample.updated_at).toLocaleString()
      : sample.created_at
      ? new Date(sample.created_at).toLocaleString()
      : "—";

    return {
      materialLabel,
      branchLabel,
      updatedAt,
      lifecycleDescription: getLifecycleDescription(sample.current_state),
      isConcrete: materialLabel === "Concrete",
      isSoil: materialLabel === "Soil Aggregates",
      isSteel: materialLabel === "Reinforcing Steel Bar (RSB)",
      canGenerateReport: sample.current_state === "Released",
      canReview:
        sample.current_state === "For Review" &&
        canValidate(rawRole, frontendRole),
    };
  }, [sample, rawRole, frontendRole]);

  if (loading) {
    return <div style={{ padding: 40 }}>Loading sample details...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 700 }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => fetchSample(true)}
          style={{
            border: "1px solid #d1d5db",
            background: "#fff",
            borderRadius: 10,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {refreshing ? "Refreshing..." : "Retry"}
        </button>
      </div>
    );
  }

  if (!sample || !derived) {
    return <div style={{ padding: 40 }}>Sample not found.</div>;
  }

  const isReleased = sample.current_state === "Released";
  const isForReview = sample.current_state === "For Review";

  return (
    <>
      <div className="page">
        <div className="topRow">
          <div className="leftHeader">
            <button className="backBtn" onClick={() => router.back()}>
              <ArrowLeft size={24} />
            </button>

            <div>
              <h1>{derived.materialLabel}</h1>
              <p>Sample ID: {sample.sample_id}</p>
            </div>

            <span className={`status ${getStatusClass(sample.current_state)}`}>
              {sample.current_state.toUpperCase()}
            </span>
          </div>

          <div className="actionHeader">
            <button
              className="secondaryBtn"
              type="button"
              onClick={() => fetchSample(true)}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {derived.canGenerateReport && (
              <button className="primaryBtn" type="button">
                <FileText size={16} />
                GENERATE BRS REPORT
              </button>
            )}
          </div>
        </div>

        <div className="tabs">
          <button
            className={activeTab === "overview" ? "tab active" : "tab"}
            onClick={() => setActiveTab("overview")}
          >
            <Stack size={16} />
            OVERVIEW
          </button>

          <button
            className={activeTab === "audit" ? "tab active" : "tab"}
            onClick={() => setActiveTab("audit")}
          >
            <Clock size={16} />
            AUDIT TRAIL
          </button>
        </div>

        {activeTab === "overview" ? (
          <div className="overviewLayout">
            <div className="metaBlock">
              <div className="metaTitle">SAMPLE DETAILS</div>

              <div className="metaRow">
                <span>PROJECT</span>
                <strong>{sample.project_id}</strong>
              </div>

              <div className="metaRow">
                <span>CLIENT</span>
                <strong>{sample.client_name}</strong>
              </div>

              <div className="metaRow">
                <span>LAB BRANCH</span>
                <strong>{derived.branchLabel}</strong>
              </div>

              <div className="metaRow">
                <span>RECORDED BY</span>
                <strong>{sample.registered_by_role || "Laboratory Staff"}</strong>
              </div>

              <div className="metaRow">
                <span>DECISION</span>
                <strong>{sample.decision || "Pending"}</strong>
              </div>
            </div>

            <div className="contentArea">
              <div className="topInputs">
                <div className="field">
                  <label>
                    <CalendarBlank size={14} />
                    Current Lifecycle State
                  </label>
                  <div className="inputPill">{sample.current_state}</div>
                </div>

                <div className="field">
                  <label>
                    <Clock size={14} />
                    Last Updated
                  </label>
                  <div className="inputPill">{derived.updatedAt}</div>
                </div>
              </div>

              <div className="summaryCard">
                <h3>Lifecycle Summary</h3>
                <p>{derived.lifecycleDescription}</p>
              </div>

              <div className="summaryCard">
                <h3>Material Classification</h3>
                <p>
                  <strong>{derived.materialLabel}</strong>
                  {sample.material_type &&
                    sample.material_type !== derived.materialLabel &&
                    ` (${sample.material_type})`}
                </p>
              </div>

              <div className="summaryCard">
                <h3>Notes</h3>
                <p>{sample.notes || "No notes recorded for this sample yet."}</p>
              </div>

              {sample.ai_predicted_label && (
                <div className="summaryCard">
                  <h3>AI Result</h3>
                  <p>
                    Predicted Label: <strong>{sample.ai_predicted_label}</strong>
                  </p>
                  <p>
                    Confidence:{" "}
                    <strong>
                      {typeof sample.ai_confidence_score === "number"
                        ? `${sample.ai_confidence_score}%`
                        : "—"}
                    </strong>
                  </p>
                  <p>
                    Model Version: <strong>{sample.model_version || "—"}</strong>
                  </p>
                </div>
              )}

              {derived.canReview && (
                <div className="validationCard">
                  <h3>Validation Required</h3>

                  <div className="field">
                    <label>Final Material Type</label>
                    <select
                      value={finalMaterialType}
                      onChange={(e) => setFinalMaterialType(e.target.value)}
                    >
                      <option value="Concrete">Concrete</option>
                      <option value="Soil Aggregates">Soil Aggregates</option>
                      <option value="Reinforcing Steel Bar (RSB)">
                        Reinforcing Steel Bar (RSB)
                      </option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Justification</label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Explain why you approve or reject this classification."
                    />
                  </div>

                  {validationError && (
                    <div className="validationError">{validationError}</div>
                  )}

                  {validationSuccess && (
                    <div className="validationSuccess">{validationSuccess}</div>
                  )}

                  <div className="validationButtons">
                    <button
                      type="button"
                      className="rejectBtn"
                      disabled={isSubmittingValidation}
                      onClick={() => handleValidate(false)}
                    >
                      {isSubmittingValidation ? "Submitting..." : "Reject"}
                    </button>

                    <button
                      type="button"
                      className="approveBtn"
                      disabled={isSubmittingValidation}
                      onClick={() => handleValidate(true)}
                    >
                      {isSubmittingValidation ? "Submitting..." : "Approve"}
                    </button>
                  </div>
                </div>
              )}

              {derived.isConcrete && (
                <div className="infoCard">
                  <h3>Concrete Sample</h3>
                  <p>
                    This record is ready for later integration of concrete-specific
                    standards and test parameters.
                  </p>
                </div>
              )}

              {derived.isSoil && (
                <div className="infoCard">
                  <h3>Soil Aggregates Sample</h3>
                  <p>
                    This record is ready for later integration of soil/aggregate
                    standards and testing inputs.
                  </p>
                </div>
              )}

              {derived.isSteel && (
                <div className="infoCard">
                  <h3>Reinforcing Steel Bar (RSB) Sample</h3>
                  <p>
                    This record is ready for later integration of RSB standards and
                    compliance checks.
                  </p>
                </div>
              )}

              {isReleased && (
                <div className="complianceCard">
                  <div className="complianceIcon">
                    <CheckSquare size={34} weight="bold" />
                  </div>

                  <div className="complianceText">
                    <h3>RELEASE READY</h3>
                    <p>Sample has already reached the Released stage.</p>
                    <span>
                      Report generation and final record viewing can proceed from
                      this point.
                    </span>
                  </div>
                </div>
              )}

              {isForReview && !derived.canReview && (
                <div className="reviewCard">
                  <div className="reviewText">
                    <h3>AWAITING REVIEW</h3>
                    <p>
                      This sample is currently in the For Review stage and should be
                      checked by the review role assigned in the workflow.
                    </p>
                    <span>
                      Only Senior Technician or QA Engineer accounts can submit
                      validation from this screen.
                    </span>
                  </div>
                </div>
              )}

              {frontendRole === "technician" && (
                <div className="roleNote">
                  Technician view: sample details are loaded from the backend and are
                  ready for future standards/testing field integration.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="auditLayout">
            <div className="metaBlock">
              <div className="metaTitle">SAMPLE DETAILS</div>

              <div className="metaRow">
                <span>PROJECT</span>
                <strong>{sample.project_id}</strong>
              </div>

              <div className="metaRow">
                <span>CLIENT</span>
                <strong>{sample.client_name}</strong>
              </div>

              <div className="metaRow">
                <span>LAB BRANCH</span>
                <strong>{derived.branchLabel}</strong>
              </div>

              <div className="metaRow">
                <span>RECORDED BY</span>
                <strong>{sample.registered_by_role || "Laboratory Staff"}</strong>
              </div>
            </div>

            <div className="auditContent">
              <div className="timeline">
                <div className="timelineItem">
                  <div className="timelineStamp">
                    <span className="auditDot" />
                    <span>{derived.updatedAt}</span>
                  </div>

                  <div className="auditCard">
                    <h4>Lifecycle State</h4>
                    <p>{sample.current_state}</p>
                    <span>Decision: {sample.decision || "Pending"}</span>
                  </div>
                </div>

                <div className="timelineItem">
                  <div className="timelineStamp">
                    <span className="auditDot" />
                    <span>{derived.updatedAt}</span>
                  </div>

                  <div className="auditCard">
                    <h4>Material Classification</h4>
                    <p>{derived.materialLabel}</p>
                    <span>Sample ID: {sample.sample_id}</span>
                  </div>
                </div>

                <div className="timelineItem">
                  <div className="timelineStamp">
                    <span className="auditDot" />
                    <span>{derived.updatedAt}</span>
                  </div>

                  <div className="auditCard">
                    <h4>Notes</h4>
                    <p>{sample.notes || "No notes recorded."}</p>
                    <span>Branch: {derived.branchLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .topRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .leftHeader {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .actionHeader {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .backBtn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        h1 {
          margin: 0;
          font-size: 22px;
          color: #333333;
        }

        p {
          margin: 2px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .status {
          font-size: 11px;
          font-weight: 700;
          margin-left: 12px;
          letter-spacing: 0.4px;
          padding: 8px 12px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .registered {
          background: #eff6ff;
          color: #1d4ed8;
        }

        .standard {
          background: #ede9fe;
          color: #6d28d9;
        }

        .testing {
          background: #fef3c7;
          color: #b45309;
        }

        .for-review {
          background: #e0f2fe;
          color: #0369a1;
        }

        .released {
          background: #ecfdf5;
          color: #047857;
        }

        .archived {
          background: #f3f4f6;
          color: #6b7280;
        }

        .primaryBtn,
        .secondaryBtn,
        .approveBtn,
        .rejectBtn {
          border: none;
          padding: 10px 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          justify-content: center;
        }

        .primaryBtn,
        .approveBtn {
          background: #080026;
          color: white;
        }

        .secondaryBtn {
          background: #ffffff;
          color: #1f2937;
          border: 1px solid #d1d5db;
        }

        .rejectBtn {
          background: #ffffff;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .tabs {
          display: flex;
          gap: 24px;
          border-bottom: 1px solid #e5e7eb;
          justify-content: flex-start;
        }

        .tab {
          background: transparent;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 0;
          font-size: 12px;
          color: #9a9a9a;
          cursor: pointer;
        }

        .tab.active {
          color: #333333;
          border-bottom: 2px solid #333333;
        }

        .overviewLayout,
        .auditLayout {
          display: grid;
          grid-template-columns: 0.85fr 1.65fr;
          gap: 48px;
          align-items: start;
        }

        .metaBlock {
          padding-top: 20px;
        }

        .metaTitle {
          font-size: 11px;
          font-weight: 700;
          color: #8a8a8a;
          margin-bottom: 18px;
          letter-spacing: 0.4px;
        }

        .metaRow {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 18px;
          margin-bottom: 12px;
          align-items: start;
        }

        .metaRow span {
          font-size: 10px;
          color: #a0a0a0;
          font-weight: 600;
        }

        .metaRow strong {
          font-size: 11px;
          color: #333333;
          font-weight: 700;
          line-height: 1.35;
        }

        .contentArea,
        .auditContent {
          display: flex;
          flex-direction: column;
          gap: 22px;
          max-width: 760px;
        }

        .topInputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #9a9a9a;
          font-weight: 600;
        }

        .field select,
        .field textarea {
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          color: #1f2937;
          background: #ffffff;
          outline: none;
        }

        .field textarea {
          min-height: 110px;
          resize: vertical;
        }

        .inputPill {
          min-height: 38px;
          border-radius: 10px;
          background: #d9d9d9;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 700;
          color: #333333;
        }

        .summaryCard,
        .infoCard,
        .roleNote,
        .validationCard {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          padding: 18px;
        }

        .summaryCard h3,
        .infoCard h3,
        .validationCard h3 {
          margin: 0 0 8px;
          font-size: 13px;
          color: #1f2937;
        }

        .summaryCard p,
        .infoCard p {
          margin: 0 0 6px;
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
        }

        .validationCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 2px solid #bfdbfe;
          background: #f8fbff;
        }

        .validationButtons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .validationError {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .validationSuccess {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          color: #166534;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .roleNote {
          font-size: 12px;
          color: #6b7280;
          background: #f8fafc;
        }

        .complianceCard {
          border: 2px solid #188b2a;
          border-radius: 18px;
          padding: 28px 26px;
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: 620px;
        }

        .complianceIcon {
          width: 52px;
          height: 52px;
          border: 2px solid #188b2a;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #188b2a;
          flex-shrink: 0;
        }

        .complianceText h3 {
          margin: 0 0 4px;
          font-size: 12px;
          color: #188b2a;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .complianceText p {
          margin: 0 0 6px;
          font-size: 11px;
          color: #333333;
          font-weight: 600;
        }

        .complianceText span {
          display: block;
          font-size: 11px;
          color: #4b5563;
          line-height: 1.4;
        }

        .reviewCard {
          border: 2px solid #0072f5;
          border-radius: 18px;
          padding: 24px 22px;
          max-width: 620px;
          background: #f8fbff;
        }

        .reviewText h3 {
          margin: 0 0 6px;
          font-size: 12px;
          color: #0072f5;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .reviewText p {
          margin: 0 0 6px;
          font-size: 11px;
          color: #333333;
          font-weight: 600;
        }

        .reviewText span {
          display: block;
          font-size: 11px;
          color: #4b5563;
          line-height: 1.4;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 26px;
        }

        .timelineItem {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .timelineStamp {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #8a8a8a;
        }

        .auditDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0072f5;
          display: inline-block;
        }

        .auditCard {
          max-width: 520px;
          background: #d9d9d9;
          border-radius: 10px;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.08);
          padding: 18px 18px 16px;
        }

        .auditCard h4 {
          margin: 0 0 10px;
          font-size: 11px;
          color: #333333;
        }

        .auditCard p {
          margin: 0 0 10px;
          font-size: 11px;
          color: #333333;
          line-height: 1.45;
        }

        .auditCard span {
          font-size: 11px;
          color: #8a8a8a;
        }

        @media (max-width: 980px) {
          .topRow {
            flex-direction: column;
            align-items: flex-start;
          }

          .overviewLayout,
          .auditLayout {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .metaBlock {
            padding-top: 0;
          }

          .topInputs {
            grid-template-columns: 1fr;
          }

          .complianceCard,
          .reviewCard {
            max-width: 100%;
          }

          .primaryBtn,
          .secondaryBtn,
          .approveBtn,
          .rejectBtn {
            width: 100%;
            justify-content: center;
          }

          .validationButtons {
            flex-direction: column;
          }

          .actionHeader {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </>
  );
}