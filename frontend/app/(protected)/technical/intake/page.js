"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Sparkle, Camera } from "phosphor-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function IntakePage() {
  const [form, setForm] = useState({
    clientName: "",
    projectId: "",
    branch: "Main Laboratory - Marikina",
    staff: "Current User",
    file: null,
    aiLabel: "",
    confidence: "",
  });

  const [errors, setErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;

    setForm((prev) => ({
      ...prev,
      file,
    }));

    setErrors((prev) => ({
      ...prev,
      file: "",
    }));
  }

  useEffect(() => {
    if (!form.file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(form.file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [form.file]);

  function handleAnalyze() {
    if (!form.file) {
      setErrors((prev) => ({
        ...prev,
        file: "Please select an image first.",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      aiLabel: "Concrete",
      confidence: "91%",
    }));

    setErrors((prev) => ({
      ...prev,
      aiLabel: "",
    }));
  }

  function handleRegister() {
    const nextErrors = {};

    if (!form.clientName.trim()) {
      nextErrors.clientName = "Client / Contractor is required.";
    }

    if (!form.projectId.trim()) {
      nextErrors.projectId = "Project Identifier is required.";
    }

    if (!form.file) {
      nextErrors.file = "Please upload a sample image.";
    }

    if (!form.aiLabel) {
      nextErrors.aiLabel = "Please analyze the image first.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    alert("Sample registered successfully (mock).");
  }

  return (
    <>
      <div className="page">
        <div className="titleRow">
          <button className="backButton" type="button" aria-label="Go back">
            <ArrowLeft size={28} weight="regular" />
          </button>

          <div className="pageHeader">
            <h1>SAMPLE INTAKE TERMINAL</h1>
            <p>
              Coordinate physical sample handover with digital responsibility
            </p>
          </div>
        </div>

        <div className="grid">
          <Card
            title="Client & Project Metadata"
            subtitle="Enter the basic information for the sample registration."
            className="metaCard"
          >
            <div className="form">
              <Input
                label="Client / Contractor"
                name="clientName"
                value={form.clientName}
                onChange={handleChange}
                placeholder="Enter client or contractor name"
                error={errors.clientName}
              />

              <Input
                label="Project Identifier"
                name="projectId"
                value={form.projectId}
                onChange={handleChange}
                placeholder="Enter project ID"
                error={errors.projectId}
              />

              <Input
                label="Registry Branch"
                name="branch"
                value={form.branch}
                onChange={handleChange}
                placeholder="Branch name"
                readOnly
              />

              <Input
                label="Terminal Staff"
                name="staff"
                value={form.staff}
                onChange={handleChange}
                placeholder="Staff name"
                readOnly
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
                  onChange={handleFileChange}
                  className="hiddenInput"
                />

                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Sample preview"
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
                      <Camera size={56} weight="regular" />
                    </div>

                    <label htmlFor="sample-upload" className="uploadTrigger">
                      Upload or Capture Sample
                    </label>

                    <p className="uploadText">No image selected yet.</p>
                  </>
                )}

                {errors.file && (
                  <span className="errorText">{errors.file}</span>
                )}
              </div>

              <div className="actions">
                {!form.aiLabel ? (
                  <Button onClick={handleAnalyze} fullWidth>
                    Analyze Image
                  </Button>
                ) : (
                  <>
                    <button
                      className="confirmButton"
                      type="button"
                      onClick={handleRegister}
                    >
                      <span>CONFIRM GLOBAL REGISTRY</span>
                      <span className="arrow">→</span>
                    </button>

                    <p className="helperText">
                      Registration data will be buffered locally and synced to
                      central database upon confirmation
                    </p>
                  </>
                )}
              </div>

              <div className="resultCard">
                <div className="resultTop">
                  <div className="resultTitle">
                    <Sparkle size={18} weight="bold" />
                    <span>ANALYSIS SUCCESS</span>
                  </div>

                  <div className="resultBadge">AUTO-IDENTIFIED</div>
                </div>

                <div className="resultGrid">
                  <div>
                    <p className="resultLabel">CLASSIFICATION</p>
                    <h3>{form.aiLabel || "-"}</h3>
                  </div>

                  <div>
                    <p className="resultLabel">CERTAINTY</p>
                    <h2 className="certaintyValue">{form.confidence || "-"}</h2>
                  </div>
                </div>

                {errors.aiLabel && (
                  <span className="errorText">{errors.aiLabel}</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .cameraIconWrap {
          width: 96px;
          height: 96px;
          border-radius: 28px;
          background: #ffffff;
          border: 1px solid #e3e3e3;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9a9a9a;
        }

        :global(.metaCard) {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }

        :global(.metaCard .header) {
          margin-bottom: 22px;
        }

        :global(.metaCard h2) {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: #7f7f7f;
          text-transform: uppercase;
        }

        :global(.metaCard p) {
          display: none;
        }

        .page {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .titleRow {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .backButton {
          border: none;
          background: transparent;
          padding: 0;
          margin-top: 4px;
          color: #8a8a8a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .backButton:hover {
          color: #4b4b4b;
        }

        .pageHeader h1 {
          margin: 0;
          font-size: 26px;
          letter-spacing: 0.8px;
          color: #0f172a;
        }

        .pageHeader p {
          margin-top: 4px;
          color: #8b8b8b;
          font-size: 14px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 28px;
          align-items: start;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .panel {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .uploadBox {
          min-height: 280px;
          border: 1.5px dashed #cfcfcf;
          border-radius: 28px;
          background: #f7f7f4;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          gap: 16px;
        }

        .hiddenInput {
          display: none;
        }

        .uploadTrigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 220px;
          height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #d8d8d8;
          color: #2d2d2d;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .uploadTrigger:hover {
          border-color: #5d8dee;
          box-shadow: 0 0 0 3px rgba(93, 141, 238, 0.12);
        }

        .secondaryUpload {
          min-width: 180px;
        }

        .uploadText {
          margin: 0;
          color: #8b8b8b;
          font-size: 14px;
          word-break: break-word;
        }

        .previewImage {
          width: 100%;
          max-height: 260px;
          object-fit: cover;
          border-radius: 20px;
          border: 1px solid #e5e5e5;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .confirmButton {
          width: 100%;
          min-height: 72px;
          border: none;
          border-radius: 22px;
          background: #080026;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.4px;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            opacity 0.2s ease;
        }

        .confirmButton:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        .arrow {
          font-size: 28px;
          line-height: 1;
        }

        .helperText {
          margin: 0;
          font-size: 12px;
          color: #9a9a9a;
          line-height: 1.5;
          text-align: left;
        }

        .resultCard {
          border: 1.5px solid #2f7cff;
          background: #f7f7f4;
          border-radius: 26px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .resultTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .resultTitle {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1f2937;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }

        .resultTitle :global(svg) {
          color: #2f7cff;
        }

        .resultBadge {
          background: #0f6be9;
          color: #ffffff;
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }

        .resultGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .resultLabel {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 700;
          color: #8a8a8a;
          letter-spacing: 0.5px;
        }

        .resultGrid h3 {
          margin: 0;
          font-size: 18px;
          line-height: 1.3;
          color: #2d2d2d;
        }

        .certaintyValue {
          margin: 0;
          font-size: 34px;
          line-height: 1;
          color: #0f8a28;
          font-weight: 700;
        }

        .errorText {
          color: #dc2626;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
