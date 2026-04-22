"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/ui/Dropdown";
import {
  Camera,
  UploadSimple,
  Cpu,
  WarningCircle,
  CheckCircle,
  FloppyDisk,
  ArrowRight,
} from "phosphor-react";

const API_BASE_URL = "http://localhost:8000";

const BRANCH_OPTIONS = [
  { label: "Marikina", value: "marikina" },
  { label: "Pateros", value: "pateros" },
];

const MATERIAL_PRESETS = {
  concrete: {
    label: "Concrete",
    confidence: 92,
    badge: "AUTO-ACCEPT",
    status: "Registered",
    color: "green",
    notes:
      "Confidence meets threshold. Classification may proceed to automatic registration.",
  },
  cement: {
    label: "Cement / Ready-mix",
    confidence: 82,
    badge: "MANUAL REVIEW",
    status: "Pending Validation",
    color: "orange",
    notes:
      "Confidence is below threshold. Senior Technician review is required before progression.",
  },
  soil: {
    label: "Soil / Aggregate",
    confidence: 88,
    badge: "AUTO-ACCEPT",
    status: "Registered",
    color: "blue",
    notes:
      "Classification is accepted and ready for digital registration.",
  },
};

export default function TechnicalIntakePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const currentUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  const displayName = currentUser?.name || currentUser?.full_name || "Tech. Jon";

  const defaultBranch =
    currentUser?.branch?.toLowerCase() === "marikina" ? "marikina" : "pateros";

  const [form, setForm] = useState({
    client: "",
    project: "",
    branch: defaultBranch,
    personnel: displayName,
  });

  const [imageName, setImageName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [classifyState, setClassifyState] = useState("idle");
  const [selectedMockType, setSelectedMockType] = useState("concrete");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canRegister = useMemo(() => {
    return (
      form.client.trim() &&
      form.project.trim() &&
      imageName &&
      result &&
      classifyState === "done"
    );
  }, [form.client, form.project, imageName, result, classifyState]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.client.trim()) nextErrors.client = "Client / contractor is required.";
    if (!form.project.trim()) nextErrors.project = "Project identifier is required.";
    if (!imageName) nextErrors.image = "Please upload or capture a sample image.";
    if (!result) nextErrors.classification = "Run AI identification first.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageName(file.name);
    setErrors((prev) => ({ ...prev, image: "" }));
    setClassifyState("idle");
    setResult(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
  }

  function handleRunClassification() {
    if (!imageName) {
      setErrors((prev) => ({
        ...prev,
        image: "Upload an image first before running identification.",
      }));
      return;
    }

    setClassifyState("loading");

    setTimeout(() => {
      const preset = MATERIAL_PRESETS[selectedMockType];
      setResult({
        predictedLabel: preset.label,
        confidence: preset.confidence,
        decision: preset.badge,
        finalStatus: preset.status,
        color: preset.color,
        notes: preset.notes,
        modelVersion: "vision-cnn-v1.0.3",
        timestamp: new Date().toLocaleString(),
      });
      setClassifyState("done");
      setErrors((prev) => ({ ...prev, classification: "" }));
      showToast("AI material identification completed.");
    }, 1100);
  }

  async function handleRegisterSample() {
    const valid = validateForm();
    if (!valid) return;

    setIsSaving(true);

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("You are not logged in.");
      }

      const response = await fetch(`${API_BASE_URL}/api/samples`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_name: form.client,
          project_id: form.project,
          material_type: result.predictedLabel,
          notes: `Captured by ${form.personnel}. Source image: ${imageName}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to register sample."
        );
      }

      showToast(
        result.confidence >= 85
          ? "Sample registered successfully."
          : "Sample saved and routed for senior validation."
      );

      router.push("/technical/registry");
    } catch (error) {
      console.error("Sample registration failed:", error);
      showToast(error.message || "Registration failed.");
    } finally {
      setIsSaving(false);
    }
  }

  const classificationTone =
    result?.color === "green"
      ? "success"
      : result?.color === "orange"
      ? "warning"
      : "info";

  return (
    <>
      <div className="page">
        {toast && <div className="toast">{toast}</div>}

        <div className="header">
          <div>
            <h1>Sample Intake Terminal</h1>
            <p>
              Capture project metadata, upload sample image, and run AI-based
              material identification before registration.
            </p>
          </div>

          <div className="headerActions">
            <button
              type="button"
              className="secondaryButton"
              onClick={() => router.push("/technical/registry")}
            >
              View Registry
            </button>
          </div>
        </div>

        <div className="contentGrid">
          <div className="panel">
            <div className="panelHeader">
              <h3>Client & Project Metadata</h3>
              <span>Required intake fields</span>
            </div>

            <div className="formGrid">
              <div className="field">
                <label>Client / Contractor</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => updateField("client", e.target.value)}
                  placeholder="Enter client or contractor name"
                />
                {errors.client && <small className="error">{errors.client}</small>}
              </div>

              <div className="field">
                <label>Project Identifier</label>
                <input
                  type="text"
                  value={form.project}
                  onChange={(e) => updateField("project", e.target.value)}
                  placeholder="Enter project name or reference"
                />
                {errors.project && <small className="error">{errors.project}</small>}
              </div>

              <div className="field">
                <label>Registry Branch</label>
                <Dropdown
                  options={BRANCH_OPTIONS}
                  value={form.branch}
                  onChange={(value) => updateField("branch", value)}
                />
              </div>

              <div className="field">
                <label>Terminal Staff</label>
                <input type="text" value={form.personnel} readOnly />
              </div>
            </div>

            <div className="infoCard">
              <strong>Camera Support</strong>
              <p>
                Mobile devices can capture sample images directly using the back
                camera. Desktop users can upload an image file normally.
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h3>AI Material Identification</h3>
              <span>Vision-assisted intake</span>
            </div>

            <div className="uploadCard">
              <div className="previewBox">
                {previewUrl ? (
                  <img src={previewUrl} alt="Sample preview" className="previewImage" />
                ) : (
                  <div className="previewPlaceholder">
                    <Camera size={34} />
                    <span>No image uploaded yet</span>
                  </div>
                )}
              </div>

              <div className="uploadActions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hiddenInput"
                  onChange={handleImageChange}
                />

                <button
                  type="button"
                  className="secondaryButton"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadSimple size={16} />
                  Upload or Capture Image
                </button>

                <Dropdown
                  options={[
                    { label: "Mock: Concrete", value: "concrete" },
                    { label: "Mock: Cement / Ready-mix", value: "cement" },
                    { label: "Mock: Soil / Aggregate", value: "soil" },
                  ]}
                  value={selectedMockType}
                  onChange={setSelectedMockType}
                />
              </div>

              <div className="fileMeta">
                <span>
                  <strong>Selected file:</strong> {imageName || "None"}
                </span>
                {errors.image && <small className="error">{errors.image}</small>}
              </div>
            </div>

            <div className="classifyRow">
              <button
                type="button"
                className="primaryButton"
                onClick={handleRunClassification}
                disabled={classifyState === "loading"}
              >
                <Cpu size={16} />
                {classifyState === "loading"
                  ? "Processing..."
                  : "Run AI Identification"}
              </button>
            </div>

            {result && (
              <div className={`resultCard ${classificationTone}`}>
                <div className="resultTop">
                  <div>
                    <h4>{result.predictedLabel}</h4>
                    <p>{result.notes}</p>
                  </div>

                  <span className={`decisionBadge ${classificationTone}`}>
                    {result.decision}
                  </span>
                </div>

                <div className="resultGrid">
                  <div className="resultItem">
                    <span>Confidence</span>
                    <strong>{result.confidence}%</strong>
                  </div>

                  <div className="resultItem">
                    <span>Lifecycle Result</span>
                    <strong>{result.finalStatus}</strong>
                  </div>

                  <div className="resultItem">
                    <span>Model Version</span>
                    <strong>{result.modelVersion}</strong>
                  </div>

                  <div className="resultItem">
                    <span>Inference Time</span>
                    <strong>{result.timestamp}</strong>
                  </div>
                </div>

                {result.confidence < 85 ? (
                  <div className="notice warningNotice">
                    <WarningCircle size={16} />
                    Senior Technician manual validation is required before this
                    sample can proceed normally in the workflow.
                  </div>
                ) : (
                  <div className="notice successNotice">
                    <CheckCircle size={16} />
                    Classification meets threshold and is ready for automatic
                    registration.
                  </div>
                )}
              </div>
            )}

            {!result && (
              <div className="emptyResult">
                Run AI identification after uploading an image to populate the
                classification card.
              </div>
            )}

            {errors.classification && (
              <small className="error topSpace">{errors.classification}</small>
            )}
          </div>
        </div>

        <div className="footerBar">
          <button
            type="button"
            className="secondaryButton"
            onClick={() => router.push("/technical")}
          >
            Back to Dashboard
          </button>

          <button
            type="button"
            className="primaryButton"
            onClick={handleRegisterSample}
            disabled={!canRegister || isSaving}
          >
            <FloppyDisk size={16} />
            {isSaving ? "Saving..." : "Confirm Registration"}
            {!isSaving && <ArrowRight size={16} />}
          </button>
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
          color: #1f2937;
          font-size: 15px;
          font-weight: 700;
        }

        h4 {
          margin: 0;
          font-size: 16px;
          color: #111827;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .panel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .panelHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .panelHeader span {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          font-size: 12px;
          font-weight: 700;
          color: #374151;
        }

        .field input {
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

        .field input:hover {
          border-color: #9ca3af;
        }

        .field input:focus {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
        }

        .field input[readonly] {
          background: #f8fafc;
        }

        .error {
          color: #dc2626;
          font-size: 11px;
          font-weight: 600;
        }

        .topSpace {
          margin-top: -8px;
        }

        .infoCard {
          border: 1px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 16px;
          padding: 14px 16px;
        }

        .infoCard strong {
          display: block;
          font-size: 12px;
          color: #1f2937;
          margin-bottom: 6px;
        }

        .infoCard p {
          margin: 0;
          font-size: 12px;
          color: #4b5563;
        }

        .uploadCard {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .previewBox {
          min-height: 250px;
          border: 1px dashed #cbd5e1;
          border-radius: 18px;
          background: #f8fafc;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .previewImage {
          width: 100%;
          height: 250px;
          object-fit: cover;
          display: block;
        }

        .previewPlaceholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 700;
        }

        .hiddenInput {
          display: none;
        }

        .uploadActions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .fileMeta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: #4b5563;
        }

        .classifyRow {
          display: flex;
          justify-content: flex-start;
        }

        .resultCard {
          border-radius: 18px;
          padding: 18px;
          border: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .resultCard.success {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .resultCard.warning {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .resultCard.info {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .resultTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .resultTop p {
          margin-top: 4px;
          font-size: 12px;
        }

        .decisionBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 112px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .decisionBadge.success {
          background: #dcfce7;
          color: #166534;
        }

        .decisionBadge.warning {
          background: #ffedd5;
          color: #c2410c;
        }

        .decisionBadge.info {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .resultGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .resultItem {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 14px;
          padding: 12px 14px;
        }

        .resultItem span {
          display: block;
          font-size: 11px;
          color: #6b7280;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .resultItem strong {
          font-size: 14px;
          color: #111827;
        }

        .notice {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          border-radius: 12px;
          padding: 12px 14px;
        }

        .warningNotice {
          background: #fff1e6;
          color: #9a3412;
        }

        .successNotice {
          background: #dcfce7;
          color: #166534;
        }

        .emptyResult {
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          padding: 20px;
          color: #6b7280;
          font-size: 13px;
          background: #fafafa;
        }

        .footerBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .primaryButton,
        .secondaryButton {
          height: 44px;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .primaryButton {
          border: none;
          background: #080026;
          color: #ffffff;
        }

        .primaryButton:hover:not(:disabled) {
          background: #14004a;
        }

        .primaryButton:disabled {
          background: #c7c9d1;
          cursor: not-allowed;
        }

        .secondaryButton {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #1f2937;
        }

        .secondaryButton:hover {
          border-color: #9ca3af;
          background: #f9fafb;
        }

        @media (max-width: 980px) {
          .header {
            flex-direction: column;
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }

          .formGrid,
          .resultGrid {
            grid-template-columns: 1fr;
          }

          .uploadActions,
          .footerBar {
            flex-direction: column;
            align-items: stretch;
          }

          .resultTop {
            flex-direction: column;
          }

          .primaryButton,
          .secondaryButton {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}