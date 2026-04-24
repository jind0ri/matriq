"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Sparkle } from "phosphor-react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function Page() {
  const router = useRouter();
  const user = getStoredUser();

  const userBranchId = Number(user?.branch_id || 1);

  const branchLabelMap = {
    1: "Main Laboratory - Marikina",
    2: "Pateros Branch",
  };

  const [form, setForm] = useState({
    clientName: "",
    clientAddress: "",
    projectId: "",
    structureDetails: "",
    requestedTestType: "",
    branchLabel: branchLabelMap[userBranchId] || `Branch ${userBranchId}`,
    branchId: userBranchId,
    staff: user?.name || "Current User",

    clientType: "Walk-in",
    paymentRequirement: "50% Downpayment or Full Payment",
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
    if (!form.file) {
      setPreviewUrl("");
      return;
    }

    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  function updateForm(nextValues) {
    setForm((prev) => ({ ...prev, ...nextValues }));
    setResult(null);
    setError("");
  }

  async function analyze() {
    if (isAnalyzing || result?.sample_registration?.sample_id) return;

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
          payment_requirement: form.paymentRequirement,
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
    } catch (e) {
      setError(e.message || "Classification failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const createdSampleId = result?.sample_registration?.sample_id;
  const confidencePercent =
    result?.confidence_score !== undefined
      ? Math.round(Number(result.confidence_score) * 100)
      : null;

  return (
    <>
      <div className="page">
        <div className="titleRow">
          <button
            className="backButton"
            onClick={() => router.push("/technical")}
          >
            <ArrowLeft size={28} />
          </button>

          <div className="pageHeader">
            <h1>SAMPLE INTAKE TERMINAL</h1>
            <p>
              Register TRF, payment, sample slip, and AI classification data.
            </p>
          </div>
        </div>

        <div className="grid">
          <Card
            title="Client & TRF Metadata"
            subtitle="Capture test request form details for sample registration."
          >
            <div className="form">
              <Input
                label="Client / Contractor"
                value={form.clientName}
                onChange={(e) => updateForm({ clientName: e.target.value })}
              />

              <Input
                label="Client Address"
                value={form.clientAddress}
                onChange={(e) => updateForm({ clientAddress: e.target.value })}
              />

              <Input
                label="Project Identifier"
                value={form.projectId}
                onChange={(e) => updateForm({ projectId: e.target.value })}
              />

              <Input
                label="Structure / Design Details"
                value={form.structureDetails}
                onChange={(e) =>
                  updateForm({ structureDetails: e.target.value })
                }
                placeholder="e.g. SLAB 3000 psi @ 7 days"
              />

              <Input
                label="Requested Test Type"
                value={form.requestedTestType}
                onChange={(e) =>
                  updateForm({ requestedTestType: e.target.value })
                }
                placeholder="e.g. Concrete Compression Test"
              />

              <Input
                label="Registry Branch"
                value={form.branchLabel}
                onChange={() => {}}
                readOnly
              />

              <Input
                label="Terminal Staff"
                value={form.staff}
                onChange={() => {}}
                readOnly
              />
            </div>
          </Card>

          <Card
            title="Payment Information"
            subtitle="Record payment requirement before testing and release."
          >
            <div className="form">
              <label className="field">
                <span>Client Type</span>
                <select
                  value={form.clientType}
                  onChange={(e) => updateForm({ clientType: e.target.value })}
                >
                  <option>Walk-in</option>
                  <option>Quotation</option>
                </select>
              </label>

              <label className="field">
                <span>Payment Method</span>
                <select
                  value={form.paymentRequirement}
                  onChange={(e) =>
                    updateForm({ paymentRequirement: e.target.value })
                  }
                >
                  <option>50% Downpayment</option>
                  <option>Full Payment</option>
                  <option>Purchase Order</option>
                </select>
              </label>

              <label className="field">
                <span>Payment Status</span>
                <select
                  value={form.paymentStatus}
                  onChange={(e) =>
                    updateForm({ paymentStatus: e.target.value })
                  }
                >
                  <option>Unpaid</option>
                  <option>Downpayment Paid</option>
                  <option>Purchase Order Provided</option>
                  <option>Fully Paid</option>
                </select>
              </label>

              <Input
                label="Amount Paid"
                value={form.amountPaid}
                onChange={(e) => updateForm({ amountPaid: e.target.value })}
                placeholder="e.g. 2500"
              />

              <Input
                label="Balance"
                value={form.balance}
                onChange={(e) => updateForm({ balance: e.target.value })}
                placeholder="e.g. 2500"
              />

              <Input
                label="Billing Notes"
                value={form.billingNotes}
                onChange={(e) => updateForm({ billingNotes: e.target.value })}
              />
            </div>
          </Card>

          <Card
            title="Lab Tech Test Slip"
            subtitle="Record physical sample inspection before testing."
          >
            <div className="form">
              <label className="checkField">
                <input
                  type="checkbox"
                  checked={form.actualSampleChecked}
                  onChange={(e) =>
                    updateForm({ actualSampleChecked: e.target.checked })
                  }
                />
                <span>Actual sample checked</span>
              </label>

              <Input
                label="Voids / Cracks Observed"
                value={form.voidsCracks}
                onChange={(e) => updateForm({ voidsCracks: e.target.value })}
                placeholder="e.g. No visible cracks"
              />

              <Input
                label="Weight"
                value={form.weight}
                onChange={(e) => updateForm({ weight: e.target.value })}
                placeholder="e.g. 8.2 kg"
              />

              <Input
                label="Diameter"
                value={form.diameter}
                onChange={(e) => updateForm({ diameter: e.target.value })}
                placeholder="e.g. 150 mm"
              />

              <Input
                label="Reference Test IDs"
                value={form.referenceTestIds}
                onChange={(e) =>
                  updateForm({ referenceTestIds: e.target.value })
                }
                placeholder="e.g. CT-001, CT-002"
              />

              <Input
                label="Condition Notes"
                value={form.conditionNotes}
                onChange={(e) => updateForm({ conditionNotes: e.target.value })}
              />
            </div>
          </Card>

          <Card
            title="AI Material Identification"
            subtitle="Upload or capture the sample image for classification."
          >
            <div className="panel">
              <div className="uploadBox">
                <input
                  id="sample-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    updateForm({ file: e.target.files?.[0] || null })
                  }
                  className="hiddenInput"
                />

                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="preview"
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
                      <Camera size={56} />
                    </div>
                    <label htmlFor="sample-upload" className="uploadTrigger">
                      Upload or Capture Sample
                    </label>
                    <p className="uploadText">No image selected yet.</p>
                  </>
                )}
              </div>

              <div className="actions">
                <Button
                  onClick={analyze}
                  fullWidth
                  disabled={
                    isAnalyzing ||
                    !form.file ||
                    !form.clientName.trim() ||
                    !form.projectId.trim() ||
                    !form.requestedTestType.trim() ||
                    !!createdSampleId
                  }
                >
                  {isAnalyzing
                    ? "Analyzing..."
                    : createdSampleId
                      ? "Sample Created"
                      : "Analyze Image"}
                </Button>

                {error && <p className="errorText">{error}</p>}

                {createdSampleId && (
                  <div className="createdBox">
                    <p className="helperText">
                      Sample ID: <strong>{createdSampleId}</strong>
                    </p>
                    <button
                      type="button"
                      className="linkButton"
                      onClick={() =>
                        router.push(`/technical/tracking/${createdSampleId}`)
                      }
                    >
                      View Sample Record
                    </button>
                  </div>
                )}

                {result?.manual_review_queue?.review_case_id && (
                  <p className="helperText">
                    Queued for review as{" "}
                    {result.manual_review_queue.review_case_id}.
                  </p>
                )}
              </div>

              <div className="resultCard">
                <div className="resultTop">
                  <div className="resultTitle">
                    <Sparkle size={18} />
                    <span>ANALYSIS RESULT</span>
                  </div>
                  <div className="resultBadge">
                    {result?.decision || "PENDING"}
                  </div>
                </div>

                <div className="resultGrid">
                  <div>
                    <p className="resultLabel">CLASSIFICATION</p>
                    <h3>
                      {result?.predicted_label_db ||
                        result?.predicted_label ||
                        "-"}
                    </h3>
                  </div>

                  <div>
                    <p className="resultLabel">CONFIDENCE</p>
                    <h3>
                      {confidencePercent !== null
                        ? `${confidencePercent}%`
                        : "-"}
                    </h3>
                  </div>

                  <div>
                    <p className="resultLabel">MODEL VERSION</p>
                    <h3>{result?.model_version || "-"}</h3>
                  </div>

                  <div>
                    <p className="resultLabel">ROUTING</p>
                    <h3>{result?.decision || "-"}</h3>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .titleRow {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .backButton {
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .pageHeader h1 {
          margin: 0;
          font-size: 24px;
        }

        .pageHeader p {
          margin: 4px 0 0;
          color: #64748b;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }

        .form {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field span {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        select {
          height: 44px;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 0 12px;
          background: #fff;
          color: #111827;
        }

        .checkField {
          grid-column: span 2;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }

        .checkField input {
          width: 18px;
          height: 18px;
        }

        .panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .uploadBox,
        .resultCard {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #fafafa;
          padding: 18px;
        }

        .hiddenInput {
          display: none;
        }

        .uploadTrigger {
          display: inline-flex;
          cursor: pointer;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 600;
          background: #fff;
        }

        .secondaryUpload {
          margin-top: 12px;
        }

        .previewImage {
          width: 100%;
          max-height: 260px;
          object-fit: contain;
          border-radius: 14px;
          background: white;
        }

        .cameraIconWrap {
          color: #cbd5e1;
          margin-bottom: 10px;
        }

        .uploadText {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .resultGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .resultBadge {
          border-radius: 999px;
          background: #e2e8f0;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 700;
        }

        .resultTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .resultTitle {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 800;
          color: #334155;
        }

        .resultLabel {
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
          margin-bottom: 4px;
        }

        .resultGrid h3 {
          margin: 0;
          font-size: 15px;
          color: #111827;
        }

        .helperText {
          font-size: 13px;
          color: #475569;
        }

        .errorText {
          font-size: 12px;
          color: #dc2626;
        }

        .createdBox {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          border-radius: 14px;
          padding: 12px;
        }

        .linkButton {
          margin-top: 6px;
          border: none;
          background: transparent;
          color: #166534;
          font-weight: 800;
          cursor: pointer;
          padding: 0;
        }

        @media (max-width: 900px) {
          .grid,
          .form,
          .resultGrid {
            grid-template-columns: 1fr;
          }

          .checkField {
            grid-column: span 1;
          }
        }
      `}</style>
    </>
  );
}
