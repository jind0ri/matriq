"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Sparkle } from "phosphor-react";
import { useRouter } from "next/navigation";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
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
    requestedTestType: "",
    branchLabel,
    branchId: userBranchId,
    staff: staffName,

    clientType: "Walk-in",
    paymentStatus: "Unpaid",
    amountPaid: "",
    balance: "",
    billingNotes: "",

    actualSampleChecked: false,
    voidsCracks: "",
    weight: "",
    diameter: "",
    referenceTestIds: "",
    conditionNotes: "",

    file: null,
  });

  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const createdSampleId = result?.sample_registration?.sample_id;

  const confidencePercent =
    result?.confidence_score !== undefined
      ? Math.round(Number(result.confidence_score) * 100)
      : null;

  const missingRequiredFields = useMemo(() => {
    const missing = [];

    if (!form.clientName.trim()) missing.push("Client / Contractor");
    if (!form.projectId.trim()) missing.push("Project Identifier");
    if (!form.requestedTestType.trim()) missing.push("Requested Test Type");
    if (!form.clientType) missing.push("Client Type");
    if (!form.paymentStatus) missing.push("Payment Status");
    if (!form.actualSampleChecked) missing.push("Actual Sample Checked");
    if (!form.file) missing.push("Sample Image");
    if (!form.amountPaid.trim()) missing.push("Amount Paid");

    return missing;
  }, [
    form.clientName,
    form.projectId,
    form.requestedTestType,
    form.clientType,
    form.paymentStatus,
    form.amountPaid,
    form.actualSampleChecked,
    form.file,
  ]);

  const canAnalyze = useMemo(() => {
    return (
      !isAnalyzing && missingRequiredFields.length === 0 && !createdSampleId
    );
  }, [isAnalyzing, missingRequiredFields.length, createdSampleId]);

  function updateForm(nextValues) {
    setForm((prev) => ({ ...prev, ...nextValues }));
    setResult(null);
    setError("");
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
          requested_test_type: form.requestedTestType.trim(),
          registry_branch: form.branchLabel,
          branch_id: form.branchId,
          terminal_staff: form.staff,
        },

        payment: {
          client_type: form.clientType,
          payment_status: form.paymentStatus,
          amount_paid: form.amountPaid,
          balance: form.balance,
          billing_notes: form.billingNotes.trim(),
        },

        test_slip: {
          actual_sample_checked: form.actualSampleChecked,
          voids_cracks: form.voidsCracks.trim(),
          weight: form.weight.trim(),
          diameter: form.diameter.trim(),
          reference_test_ids: form.referenceTestIds.trim(),
          condition_notes: form.conditionNotes.trim(),
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

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Sample Intake</h1>
          <p>
            Register TRF, payment, inspection, and AI classification details for{" "}
            <strong>{form.branchLabel}</strong>.
          </p>
        </div>
      </header>

      <section className="statusStrip">
        <div>
          <span>Branch</span>
          <strong>{form.branchLabel}</strong>
        </div>

        <div>
          <span>Terminal Staff</span>
          <strong>{form.staff}</strong>
        </div>

        <div>
          <span>Status</span>
          <strong>{createdSampleId ? "Sample Created" : "Draft Intake"}</strong>
        </div>
      </section>

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

              <Input
                label="Requested Test Type"
                value={form.requestedTestType}
                required
                onChange={(event) =>
                  updateForm({ requestedTestType: event.target.value })
                }
                placeholder="e.g. Concrete Compression Test"
              />

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
            subtitle="Record the payment condition before testing and release."
          >
            <div className="formGrid">
              <Select
                label="Client Type"
                name="clientType"
                value={form.clientType}
                required
                onChange={(event) =>
                  updateForm({ clientType: event.target.value })
                }
              >
                <option value="Walk-in">Walk-in</option>
                <option value="Quotation">Quotation</option>
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
                <option value="PO Submitted">PO Submitted</option>
                <option value="Fully Paid">Fully Paid</option>
              </Select>

              <Input
                label="Amount Paid"
                value={form.amountPaid}
                required
                onChange={(event) =>
                  updateForm({ amountPaid: event.target.value })
                }
                placeholder="e.g. 2500"
              />

              <Input
                label="Balance"
                value={form.balance}
                onChange={(event) =>
                  updateForm({ balance: event.target.value })
                }
                placeholder="e.g. 2500"
              />

              <Textarea
                label="Billing Notes"
                value={form.billingNotes}
                onChange={(event) =>
                  updateForm({ billingNotes: event.target.value })
                }
                rows={3}
              />
            </div>
          </Card>

          <Card
            title="Lab Tech Test Slip"
            subtitle="Record physical sample inspection before test encoding."
          >
            <div className="formGrid">
              <label className="checkField">
                <input
                  type="checkbox"
                  checked={form.actualSampleChecked}
                  onChange={(event) =>
                    updateForm({ actualSampleChecked: event.target.checked })
                  }
                />
                <span>
                  Actual sample checked <em>Required</em>
                </span>
              </label>

              <Input
                label="Voids / Cracks Observed"
                value={form.voidsCracks}
                onChange={(event) =>
                  updateForm({ voidsCracks: event.target.value })
                }
                placeholder="e.g. No visible cracks"
              />

              <Input
                label="Weight"
                value={form.weight}
                onChange={(event) => updateForm({ weight: event.target.value })}
                placeholder="e.g. 8.2 kg"
              />

              <Input
                label="Diameter"
                value={form.diameter}
                onChange={(event) =>
                  updateForm({ diameter: event.target.value })
                }
                placeholder="e.g. 150 mm"
              />

              <Input
                label="Reference Test IDs"
                value={form.referenceTestIds}
                onChange={(event) =>
                  updateForm({ referenceTestIds: event.target.value })
                }
                placeholder="e.g. CT-001, CT-002"
              />

              <Textarea
                label="Condition Notes"
                value={form.conditionNotes}
                onChange={(event) =>
                  updateForm({ conditionNotes: event.target.value })
                }
                rows={3}
              />
            </div>
          </Card>
        </section>

        <aside className="sideColumn">
          <Card
            title="AI Material Identification"
            subtitle="Upload the sample image for classification."
          >
            <div className="panel">
              <div className="uploadBox">
                <input
                  id="sample-upload"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    updateForm({ file: event.target.files?.[0] || null })
                  }
                  className="hiddenInput"
                />

                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Selected sample preview"
                      className="previewImage"
                    />

                    <label
                      htmlFor="sample-upload"
                      className="uploadTrigger secondaryUpload"
                    >
                      Change Image
                    </label>

                    <p className="uploadText">{form.file?.name}</p>
                  </>
                ) : (
                  <>
                    <div className="cameraIconWrap">
                      <Camera size={42} weight="duotone" />
                    </div>

                    <label htmlFor="sample-upload" className="uploadTrigger">
                      Upload or Capture Sample
                    </label>

                    <p className="uploadText">No image selected yet.</p>
                  </>
                )}
              </div>

              {missingRequiredFields.length > 0 && !createdSampleId && (
                <div className="requiredBox">
                  <span>Required before analysis</span>
                  <p>{missingRequiredFields.join(", ")}</p>
                </div>
              )}

              <Button
                onClick={analyze}
                fullWidth
                disabled={!canAnalyze}
                variant={createdSampleId ? "secondary" : "primary"}
              >
                {isAnalyzing
                  ? "Analyzing..."
                  : createdSampleId
                    ? "Sample Created"
                    : "Analyze Image"}
              </Button>

              {error && <div className="errorBox">{error}</div>}

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
                <div className="reviewBox">
                  Queued for review as{" "}
                  <strong>{result.manual_review_queue.review_case_id}</strong>.
                </div>
              )}

              <div className="resultCard">
                <div className="resultTop">
                  <div className="resultTitle">
                    <Sparkle size={16} weight="regular" />
                    <span>Analysis Result</span>
                  </div>

                  <DecisionBadge decision={result?.decision} />
                </div>

                <div className="resultGrid">
                  <ResultItem
                    label="Classification"
                    value={
                      result?.predicted_label_db || result?.predicted_label
                    }
                  />

                  <ResultItem
                    label="Confidence"
                    value={
                      confidencePercent !== null ? `${confidencePercent}%` : "-"
                    }
                  />

                  <ResultItem
                    label="Model Version"
                    value={result?.model_version}
                  />

                  <ResultItem label="Routing" value={result?.decision} />
                </div>
              </div>
            </div>
          </Card>
        </aside>
      </div>

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

        .statusStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid var(--color-border-soft);
          border-bottom: 1px solid var(--color-border-soft);
        }

        .statusStrip div {
          display: grid;
          gap: 5px;
          text-align: center;
          min-width: 0;
        }

        .statusStrip span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .statusStrip strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 390px;
          gap: 18px;
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

        .panel {
          display: grid;
          gap: 14px;
        }

        .panel :global(button) {
          box-shadow: none;
        }

        .panel :global(button:hover:not(:disabled)) {
          box-shadow: none;
        }

        .panel :global(.btn.primary) {
          background: color-mix(in srgb, var(--color-brand) 72%, white);
          border-color: color-mix(in srgb, var(--color-brand) 55%, white);
          color: #ffffff;
        }

        .panel :global(.btn.primary:hover:not(:disabled)) {
          background: var(--color-brand);
          border-color: var(--color-brand);
        }

        .uploadBox {
          display: grid;
          justify-items: center;
          text-align: center;
          gap: 10px;
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-lg);
          background: color-mix(
            in srgb,
            var(--color-overlay) 42%,
            var(--color-surface)
          );
          padding: 22px 16px;
        }

        .resultCard {
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-lg);
          background: var(--color-surface);
          padding: 15px;
        }

        .hiddenInput {
          display: none;
        }

        .uploadTrigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          cursor: pointer;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          padding: 0 13px;
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          background: var(--color-surface);
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base),
            box-shadow var(--transition-base);
        }

        .uploadTrigger:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          box-shadow: none;
        }

        .secondaryUpload {
          margin-top: 12px;
        }

        .previewImage {
          width: 100%;
          max-height: 230px;
          object-fit: contain;
          border-radius: var(--radius-md);
          background: var(--color-surface);
          border: 1px solid var(--color-border-soft);
        }

        .cameraIconWrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          color: var(--color-text-muted);
          background: color-mix(
            in srgb,
            var(--color-overlay) 70%,
            var(--color-surface)
          );
        }

        .uploadText {
          margin: 0;
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          line-height: 1.45;
          overflow-wrap: anywhere;
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
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .requiredBox p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.45;
        }

        .errorBox {
          border: 1px solid var(--color-danger-border);
          border-radius: var(--radius-md);
          background: var(--color-danger-bg);
          color: var(--color-danger);
          padding: 11px 12px;
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1.45;
        }

        .createdBox {
          display: grid;
          gap: 5px;
          border: 1px solid
            color-mix(in srgb, var(--color-success-border) 70%, white);
          background: color-mix(in srgb, var(--color-success-bg) 70%, white);
          color: var(--color-success);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .createdBox span {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .createdBox strong {
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .linkButton {
          justify-self: start;
          margin-top: 3px;
          border: none;
          background: transparent;
          color: var(--color-success);
          font-size: var(--text-xs);
          font-weight: 500;
          cursor: pointer;
          padding: 0;
        }

        .linkButton:hover {
          text-decoration: underline;
        }

        .reviewBox {
          border: 1px solid
            color-mix(in srgb, var(--color-warning-border) 70%, white);
          background: color-mix(in srgb, var(--color-warning-bg) 70%, white);
          color: var(--color-warning);
          border-radius: var(--radius-md);
          padding: 11px 12px;
          font-size: var(--text-xs);
          font-weight: 400;
          line-height: 1.45;
        }

        .resultTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .resultTitle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .resultGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
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
          .statusStrip,
          .formGrid,
          .resultGrid {
            grid-template-columns: 1fr;
          }

          .statusStrip div {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}

function DecisionBadge({ decision }) {
  const label = decision || "Pending";

  const variant =
    decision === "AUTO_ACCEPTED"
      ? "success"
      : decision === "MANUAL_REVIEW"
        ? "warning"
        : decision === "REJECTED"
          ? "danger"
          : "neutral";

  return (
    <Badge variant={variant} size="sm">
      {formatDecision(label)}
    </Badge>
  );
}

function ResultItem({ label, value }) {
  return (
    <div className="resultItem">
      <span>{label}</span>
      <strong>{formatEmpty(value)}</strong>

      <style jsx>{`
        .resultItem {
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
          overflow-wrap: anywhere;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

function formatDecision(value) {
  if (!value) return "Pending";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatEmpty(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}
