"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Sparkle,
  Upload,
  VideoCamera,
  ImageSquare,
  X,
} from "phosphor-react";
import { useRouter } from "next/navigation";

import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import CameraCapture from "@/components/ui/CameraCapture";
import { apiClient, getStoredUser } from "@/services/apiClient";

const BRANCH_LABELS = {
  1: "Main Laboratory - Marikina",
  2: "Pateros Branch",
};

export default function Page() {
  const router = useRouter();
  const user = getStoredUser();

  const userBranchId = Number(user?.branch_id || 1);
  const branchLabel = BRANCH_LABELS[userBranchId] || `Branch ${userBranchId}`;
  const staffName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    user?.email ||
    "Current User";

  const [form, setForm] = useState({
    clientName: "",
    clientAddress: "",
    projectId: "",
    structureDetails: "",
    requestedTestCode: "",
    requestedTestKey: "",
    requestedTestType: "",
    requestedTestStandard: "",
    requestedTestCategory: "",
    requestedTestUnitPrice: null,
    branchLabel,
    branchId: userBranchId,
    staff: staffName,

    clientType: "Walk-in",
    paymentStatus: "Unpaid",

    file: null,
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testCodes, setTestCodes] = useState([]);
  const [loadingTestCodes, setLoadingTestCodes] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      branchLabel,
      branchId: userBranchId,
      staff: staffName,
    }));
  }, [branchLabel, userBranchId, staffName]);

  useEffect(() => {
    if (!form.file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  useEffect(() => {
    let mounted = true;

    async function loadTestCodes() {
      setLoadingTestCodes(true);

      try {
        const codes = await apiClient.getTestCodes();

        if (mounted) {
          setTestCodes(Array.isArray(codes) ? codes : []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Failed to load test codes.");
        }
      } finally {
        if (mounted) {
          setLoadingTestCodes(false);
        }
      }
    }

    loadTestCodes();

    return () => {
      mounted = false;
    };
  }, []);

  const createdSampleId = result?.sample_registration?.sample_id;

  const confidencePercent =
    result?.confidence_score !== undefined
      ? Math.round(Number(result.confidence_score) * 100)
      : null;

  const anomalyFlags =
    result?.preprocessing?.anomaly_flags ||
    result?.device_metadata?.anomaly_flags ||
    result?.device_metadata?.preprocessing?.anomaly_flags ||
    [];

  const missingRequiredFields = useMemo(() => {
    const missing = [];

    if (!form.clientName.trim()) missing.push("Client / Contractor");
    if (!form.projectId.trim()) missing.push("Project Identifier");
    if (!form.requestedTestCode) missing.push("Requested Test Type");
    if (!form.requestedTestKey) missing.push("Supported Test Mapping");
    if (!form.clientType) missing.push("Client Type");
    if (!form.paymentStatus) missing.push("Payment Status");
    if (
      form.clientType === "Accredited Billing Client" &&
      form.paymentStatus === "PO Submitted" &&
      !form.poNumber.trim()
    ) {
      missing.push("Purchase Order Number");
    }

    if (!form.file) missing.push("Sample Image");

    return missing;
  }, [
    form.clientName,
    form.projectId,
    form.requestedTestCode,
    form.clientType,
    form.paymentStatus,
    form.file,
  ]);

  const canAnalyze =
    !isAnalyzing && missingRequiredFields.length === 0 && !createdSampleId;

  function updateForm(nextValues) {
    setForm((prev) => ({ ...prev, ...nextValues }));
    setResult(null);
    setError("");
  }

  function handleCameraCapture(file) {
    updateForm({ file });
    setShowCamera(false);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    updateForm({ file });
  }

  function clearImage() {
    updateForm({ file: null });
    setPreviewUrl("");
  }

  function handleRequestedTestChange(event) {
    const selectedCode = event.target.value;
    const selectedTest = testCodes.find((item) => item.code === selectedCode);

    updateForm({
      requestedTestCode: selectedCode,
      requestedTestKey: selectedTest?.test_type || "",
      requestedTestType: selectedTest?.name || "",
      requestedTestStandard: selectedTest?.standard || "",
      requestedTestCategory: selectedTest?.category || "",
      requestedTestUnitPrice: selectedTest?.unit_price ?? null,
    });
  }

  function handleClientTypeChange(event) {
    const clientType = event.target.value;

    updateForm({
      clientType,
      paymentStatus: "Unpaid",
    });
  }

  async function analyze() {
    if (!canAnalyze) return;

    setError("");
    setIsAnalyzing(true);

    const fd = new FormData();

    fd.append("image", form.file);
    fd.append("client_name", form.clientName.trim());
    fd.append("project_id", form.projectId.trim());
    fd.append("branch_id", String(form.branchId));

    fd.append(
      "device_metadata",
      JSON.stringify({
        source: "frontend-intake",
        branch_label: form.branchLabel,
        original_filename: form.file?.name || null,

        trf: {
          client_name: form.clientName.trim(),
          client_address: form.clientAddress.trim(),
          project_identifier: form.projectId.trim(),
          structure_details: form.structureDetails.trim(),
          requested_test_code: form.requestedTestCode,
          requested_test_key: form.requestedTestKey,
          requested_test_type: form.requestedTestType,
          requested_test_standard: form.requestedTestStandard,
          requested_test_category: form.requestedTestCategory,
          requested_test_unit_price: form.requestedTestUnitPrice,
          registry_branch: form.branchLabel,
          branch_id: form.branchId,
          terminal_staff: form.staff,
        },

        payment: {
          client_type: form.clientType,
          payment_status: form.paymentStatus,
        },
      }),
    );

    try {
      const response = await apiClient.classify(fd);
      setResult(response.classification);
    } catch (err) {
      setError(err.message || "Classification failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function goToCreatedSample() {
    if (!createdSampleId) return;
    router.push(`/technical/tracking/${createdSampleId}`);
  }

  function getConfidenceColor(score) {
    if (score >= 0.85) return "#16a34a";
    if (score >= 0.7) return "#ca8a04";
    return "#dc2626";
  }

  function getDecisionLabel(decision) {
    if (decision === "AUTO_ACCEPTED") return "Auto-Accepted";
    if (decision === "MANUAL_REVIEW_QUEUE") return "Manual Review";
    if (decision === "MANUAL_REVIEW") return "Manual Review";
    if (decision === "MANDATORY_OVERRIDE") return "Requires Override";
    if (decision === "REJECTED") return "Rejected";
    return decision || "Pending";
  }

  function getDecisionBadgeClass(decision) {
    if (decision === "AUTO_ACCEPTED") return "badgeSuccess";
    if (decision === "MANUAL_REVIEW_QUEUE" || decision === "MANUAL_REVIEW") {
      return "badgeWarning";
    }
    if (decision === "MANDATORY_OVERRIDE" || decision === "REJECTED") {
      return "badgeDanger";
    }
    return "";
  }

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="page">
        <div className="titleRow">
          <button
            type="button"
            className="backButton"
            onClick={() => router.push("/technical")}
            aria-label="Back to technical dashboard"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="pageHeader">
            <h1>SAMPLE INTAKE TERMINAL</h1>
            <p>Coordinate physical sample handover with digital responsibility</p>
          </div>
        </div>

        <div className="grid">
          <section className="mainColumn">
            <Card
              title="Client & TRF Metadata"
              subtitle="Capture the request form details used for registration."
            >
              <div className="formGrid">
                <Input
                  label="Client / Contractor"
                  value={form.clientName}
                  required
                  onChange={(event) =>
                    updateForm({ clientName: event.target.value })
                  }
                />

                <Input
                  label="Client Address"
                  value={form.clientAddress}
                  onChange={(event) =>
                    updateForm({ clientAddress: event.target.value })
                  }
                />

                <Input
                  label="Project Identifier"
                  value={form.projectId}
                  required
                  onChange={(event) =>
                    updateForm({ projectId: event.target.value })
                  }
                />

                <Select
                  label="Requested Test Type"
                  name="requestedTestCode"
                  value={form.requestedTestCode}
                  required
                  onChange={handleRequestedTestChange}
                  disabled={loadingTestCodes}
                >
                  <option value="">
                    {loadingTestCodes ? "Loading test options..." : "Select requested test"}
                  </option>

                  {testCodes
                    .filter((test) => test.test_type)
                    .map((test) => (
                      <option key={test.code} value={test.code}>
                        {test.code} — {test.name} ({test.standard})
                      </option>
                    ))}
                </Select>

                <Textarea
                  label="Structure / Design Details"
                  value={form.structureDetails}
                  onChange={(event) =>
                    updateForm({ structureDetails: event.target.value })
                  }
                  placeholder="e.g. SLAB 3000 psi @ 7 days"
                  rows={3}
                />

                <Input
                  label="Registry Branch"
                  value={form.branchLabel}
                  readOnly
                />

                <Input label="Terminal Staff" value={form.staff} readOnly />
              </div>
            </Card>

            <Card
              title="Payment Information"
              subtitle="Record the current payment status before testing and release."
            >
              <div className="formGrid">
                <Select
                  label="Client Type"
                  name="clientType"
                  value={form.clientType}
                  required
                  onChange={handleClientTypeChange}
                >
                  <option value="Walk-in">Walk-in</option>
                  <option value="Accredited Billing Client">Accredited Billing Client</option>
                </Select>

                <Select
                  label="Payment Status"
                  name="paymentStatus"
                  value={form.paymentStatus}
                  required
                  onChange={(event) =>
                    updateForm({ paymentStatus: event.target.value })
                  }
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Downpayment Paid">Downpayment Paid</option>
                </Select>
              </div>
            </Card>
          </section>

          <aside className="sideColumn">
            <Card
              title="AI Material Identification"
              subtitle="Upload or capture the sample image for classification."
            >
              <div className="aiPanel">
                <section
                  className={previewUrl ? "uploadArea hasPreview" : "uploadArea"}
                >
                  <input
                    id="sample-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hiddenInput"
                  />

                  {previewUrl ? (
                    <>
                      <div className="previewFrame">
                        <img
                          src={previewUrl}
                          alt="Selected sample preview"
                          className="previewImage"
                        />

                        <button
                          type="button"
                          className="clearPreview"
                          onClick={clearImage}
                          aria-label="Clear selected image"
                        >
                          <X size={15} weight="bold" />
                        </button>
                      </div>

                      <div className="fileMeta">
                        <span>Selected Image</span>
                        <strong>{form.file?.name || "Sample image"}</strong>
                      </div>

                      <div className="imageActions">
                        <label htmlFor="sample-upload" className="imageActionBtn">
                          <Upload size={17} />
                          Replace
                        </label>

                        <button
                          type="button"
                          className="imageActionBtn"
                          onClick={() => setShowCamera(true)}
                        >
                          <VideoCamera size={17} />
                          Retake
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="emptyVisual">
                        <div className="cameraIconWrap">
                          <Camera size={35} weight="duotone" />
                        </div>

                        <div>
                          <strong>Add sample image</strong>
                          <p>
                            Capture from camera or upload a file for AI
                            classification.
                          </p>
                        </div>
                      </div>

                      <div className="captureOptions">
                        <button
                          type="button"
                          className="captureBtn primary"
                          onClick={() => setShowCamera(true)}
                        >
                          <VideoCamera size={20} weight="fill" />
                          <span>Use Camera</span>
                        </button>

                        <label
                          htmlFor="sample-upload"
                          className="captureBtn secondary"
                        >
                          <Upload size={20} />
                          <span>Upload File</span>
                        </label>
                      </div>

                      <div className="uploadFootnote">
                        <ImageSquare size={15} />
                        <span>No image selected yet.</span>
                      </div>
                    </>
                  )}
                </section>

                {missingRequiredFields.length > 0 && !createdSampleId && (
                  <div className="requiredBox">
                    <span>Required before analysis</span>
                    <p>{missingRequiredFields.join(", ")}</p>
                  </div>
                )}

                <div className="analysisActions">
                  <Button
                    onClick={analyze}
                    fullWidth
                    disabled={!canAnalyze}
                    variant={createdSampleId ? "secondary" : "primary"}
                  >
                    {isAnalyzing
                      ? "Analyzing Sample..."
                      : createdSampleId
                        ? "Sample Created"
                        : "Analyze Image"}
                  </Button>

                  {error && <p className="errorText">{error}</p>}

                  {createdSampleId && (
                    <div className="createdBox">
                      <span>Sample ID</span>
                      <strong>{createdSampleId}</strong>

                      <button
                        type="button"
                        className="linkButton"
                        onClick={goToCreatedSample}
                      >
                        View Sample Record
                      </button>
                    </div>
                  )}

                  {result?.manual_review_queue?.review_case_id && (
                    <p className="helperText reviewNotice">
                      Queued for manual review as{" "}
                      <strong>{result.manual_review_queue.review_case_id}</strong>
                    </p>
                  )}
                </div>

                <section className="resultCard">
                  <div className="resultTop">
                    <div className="resultTitle">
                      <span className="sparkleIcon">
                        <Sparkle size={16} weight="fill" />
                      </span>
                      <div>
                        <strong>Analysis Result</strong>
                        <small>AI classification summary</small>
                      </div>
                    </div>

                    <div
                      className={`resultBadge ${result ? getDecisionBadgeClass(result.decision) : ""
                        }`}
                    >
                      {result ? getDecisionLabel(result.decision) : "Pending"}
                    </div>
                  </div>

                  <div className="resultGrid">
                    <ResultMetric
                      label="Classification"
                      value={
                        result?.predicted_label_db ||
                        result?.predicted_label ||
                        "-"
                      }
                    />

                    <ResultMetric
                      label="Confidence"
                      value={
                        confidencePercent !== null ? `${confidencePercent}%` : "-"
                      }
                      valueStyle={
                        result
                          ? {
                            color: getConfidenceColor(
                              Number(result.confidence_score),
                            ),
                          }
                          : {}
                      }
                      note={
                        result && Number(result.confidence_score) < 0.85
                          ? "Below 85% threshold"
                          : null
                      }
                    />

                    <ResultMetric
                      label="Model Version"
                      value={result?.model_version || "-"}
                    />

                    <ResultMetric
                      label="Routing"
                      value={result ? getDecisionLabel(result.decision) : "-"}
                    />
                  </div>

                  {Array.isArray(anomalyFlags) && anomalyFlags.length > 0 && (
                    <div className="anomalyAlert">
                      <strong>Image quality warning</strong>
                      <p>
                        This image may not be a valid construction material sample.
                      </p>
                      <span>
                        Detected issues:{" "}
                        {anomalyFlags
                          .map((flag) => String(flag).replace(/_/g, " "))
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {result && result.decision !== "AUTO_ACCEPTED" && (
                    <div className="routingAlert">
                      {result.decision === "MANUAL_REVIEW_QUEUE" ||
                        result.decision === "MANUAL_REVIEW" ? (
                        <p>
                          This sample has been queued for Senior Technician
                          review because the confidence score is below the
                          auto-acceptance threshold.
                        </p>
                      ) : (
                        <p>
                          This sample requires Senior Technician override due to
                          low model confidence.
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 28px;
          color: var(--color-text-primary);
        }

        .titleRow {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .backButton {
          width: 42px;
          height: 42px;
          border: 1px solid var(--color-border-soft);
          border-radius: 14px;
          background: var(--color-surface);
          color: var(--color-text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .backButton:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
        }

        .pageHeader h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .pageHeader p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(360px, 480px);
          gap: 20px;
          align-items: start;
        }

        .mainColumn {
          display: grid;
          gap: 18px;
          min-width: 0;
        }

        .sideColumn {
          display: grid;
          gap: 18px;
          min-width: 0;
          position: sticky;
          top: 18px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .checkField {
          grid-column: 1 / -1;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .checkField input {
          width: 17px;
          height: 17px;
          accent-color: var(--color-brand);
        }

        .checkField em {
          margin-left: 6px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-style: normal;
          font-weight: 400;
        }

        .aiPanel {
          display: grid;
          gap: 16px;
        }

        .uploadArea {
          position: relative;
          display: grid;
          gap: 16px;
          border: 1px solid var(--color-border-soft);
          border-radius: 22px;
          background:
            radial-gradient(
              circle at top,
              color-mix(in srgb, var(--color-brand) 8%, transparent),
              transparent 36%
            ),
            color-mix(in srgb, var(--color-overlay) 45%, var(--color-surface));
          padding: 20px;
          overflow: hidden;
        }

        .uploadArea::before {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px dashed
            color-mix(in srgb, var(--color-border) 70%, transparent);
          border-radius: 18px;
          pointer-events: none;
        }

        .uploadArea.hasPreview::before {
          display: none;
        }

        .hiddenInput {
          display: none;
        }

        .emptyVisual {
          position: relative;
          z-index: 1;
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 12px;
          padding: 10px 8px 0;
        }

        .cameraIconWrap {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface);
          border: 1px solid var(--color-border-soft);
          color: var(--color-text-muted);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .emptyVisual strong {
          display: block;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 700;
        }

        .emptyVisual p {
          max-width: 300px;
          margin: 5px auto 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .captureOptions {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .captureBtn {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          cursor: pointer;
          border-radius: 14px;
          padding: 0 14px;
          font-weight: 700;
          font-size: var(--text-sm);
          border: 1px solid transparent;
        }

        .captureBtn.primary {
          background: var(--color-brand);
          color: #ffffff;
          border-color: var(--color-brand);
          box-shadow: 0 12px 22px
            color-mix(in srgb, var(--color-brand) 26%, transparent);
        }

        .captureBtn.secondary {
          background: var(--color-surface);
          color: var(--color-text-primary);
          border-color: var(--color-border-soft);
        }

        .captureBtn.secondary:hover {
          border-color: var(--color-border);
          color: var(--color-brand);
          background: var(--color-overlay);
        }

        .uploadFootnote {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: var(--color-text-muted);
          font-size: var(--text-xs);
        }

        .previewFrame {
          position: relative;
          border-radius: 18px;
          background: var(--color-surface);
          border: 1px solid var(--color-border-soft);
          overflow: hidden;
        }

        .previewImage {
          width: 100%;
          max-height: 285px;
          object-fit: contain;
          display: block;
          background: var(--color-surface);
        }

        .clearPreview {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid var(--color-border-soft);
          background: color-mix(in srgb, var(--color-surface) 92%, transparent);
          color: var(--color-text-muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          backdrop-filter: blur(12px);
        }

        .clearPreview:hover {
          color: var(--color-danger);
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);
        }

        .fileMeta {
          display: grid;
          gap: 3px;
          padding: 0 2px;
        }

        .fileMeta span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .fileMeta strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .imageActions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .imageActionBtn {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
          border: 1px solid var(--color-border-soft);
          border-radius: 12px;
          padding: 0 12px;
          font-weight: 700;
          font-size: var(--text-xs);
          background: var(--color-surface);
          color: var(--color-text-primary);
        }

        .imageActionBtn:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
        }

        .requiredBox {
          display: grid;
          gap: 5px;
          padding: 11px 12px;
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border-soft);
          background: var(--color-overlay);
        }

        .requiredBox span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .requiredBox p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .analysisActions {
          display: grid;
          gap: 8px;
        }

        .createdBox {
          display: grid;
          gap: 5px;
          border: 1px solid var(--color-success-border);
          background: var(--color-success-bg);
          color: var(--color-success);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .createdBox span {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .createdBox strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 700;
        }

        .linkButton {
          justify-self: start;
          margin-top: 3px;
          border: none;
          background: transparent;
          color: var(--color-success);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }

        .linkButton:hover {
          text-decoration: underline;
        }

        .helperText,
        .errorText {
          margin: 0;
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .helperText {
          color: var(--color-text-secondary);
        }

        .helperText strong {
          color: var(--color-text-primary);
        }

        .helperText.reviewNotice {
          color: var(--color-warning);
          font-weight: 500;
        }

        .errorText {
          color: var(--color-danger);
          font-weight: 500;
        }

        .resultCard {
          border: 1px solid var(--color-border-soft);
          border-radius: 20px;
          background: var(--color-surface);
          padding: 16px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
        }

        .resultTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .resultTitle {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .sparkleIcon {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: color-mix(
            in srgb,
            var(--color-brand) 12%,
            var(--color-surface)
          );
          color: var(--color-brand);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .resultTitle strong {
          display: block;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 800;
          line-height: 1.2;
        }

        .resultTitle small {
          display: block;
          margin-top: 2px;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 500;
        }

        .resultBadge {
          flex-shrink: 0;
          border-radius: 999px;
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border-soft);
          padding: 7px 11px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .resultBadge.badgeSuccess {
          background: var(--color-success-bg);
          color: var(--color-success);
          border-color: var(--color-success-border);
        }

        .resultBadge.badgeWarning {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border-color: var(--color-warning-border);
        }

        .resultBadge.badgeDanger {
          background: var(--color-danger-bg);
          color: var(--color-danger);
          border-color: var(--color-danger-border);
        }

        .resultGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .routingAlert,
        .anomalyAlert {
          margin-top: 14px;
          padding: 12px;
          border-radius: 14px;
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .routingAlert {
          background: var(--color-warning-bg);
          border: 1px solid var(--color-warning-border);
          color: var(--color-warning);
        }

        .routingAlert p,
        .anomalyAlert p {
          margin: 0;
        }

        .anomalyAlert {
          display: grid;
          gap: 4px;
          background: var(--color-danger-bg);
          border: 1px solid var(--color-danger-border);
          color: var(--color-danger);
        }

        .anomalyAlert strong {
          font-size: var(--text-xs);
          font-weight: 800;
        }

        .anomalyAlert span {
          color: var(--color-danger);
          opacity: 0.88;
          font-size: 11px;
        }

        @media (max-width: 1080px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .sideColumn {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .formGrid,
          .resultGrid,
          .captureOptions,
          .imageActions {
            grid-template-columns: 1fr;
          }

          .titleRow {
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  );
}

function ResultMetric({ label, value, valueStyle = {}, note = null }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong style={valueStyle}>{value}</strong>
      {note && <small>{note}</small>}

      <style jsx>{`
        .metric {
          min-width: 0;
          display: grid;
          gap: 4px;
          border: 1px solid var(--color-border-soft);
          border-radius: 14px;
          background: color-mix(
            in srgb,
            var(--color-overlay) 42%,
            var(--color-surface)
          );
          padding: 12px;
        }

        span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 800;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        small {
          color: var(--color-warning);
          font-size: 10px;
          font-weight: 600;
          line-height: 1.3;
        }
      `}</style>
    </div>
  );
}