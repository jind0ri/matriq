"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Sparkle, Upload, VideoCamera } from "phosphor-react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import CameraCapture from "@/components/ui/CameraCapture";
import { apiClient, getStoredUser } from "@/services/apiClient";

export default function Page() {
  const router = useRouter();
  const user = getStoredUser();
  const [form, setForm] = useState({ clientName: "", projectId: "", branchLabel: "Main Laboratory - Marikina", branchId: 1, staff: user?.name || "Current User", file: null });
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!form.file) return setPreviewUrl("");
    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  function handleCameraCapture(file) {
    setForm({ ...form, file });
    setShowCamera(false);
    setResult(null);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setForm({ ...form, file });
    setResult(null);
  }

  function clearImage() {
    setForm({ ...form, file: null });
    setResult(null);
    setPreviewUrl("");
  }

  async function analyze() {
    setError("");
    setIsAnalyzing(true);
    const fd = new FormData();
    fd.append("image", form.file);
    fd.append("client_name", form.clientName);
    fd.append("project_id", form.projectId);
    fd.append("branch_id", String(form.branchId));
    fd.append("device_metadata", JSON.stringify({ source: "frontend-intake", branch_label: form.branchLabel }));
    try {
      setResult((await apiClient.classify(fd)).classification);
    } catch (e) {
      setError(e.message || "Classification failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function getConfidenceColor(score) {
    if (score >= 0.85) return "#16a34a";
    if (score >= 0.70) return "#ca8a04";
    return "#dc2626";
  }

  function getDecisionLabel(decision) {
    if (decision === "AUTO_ACCEPTED") return "Auto-Accepted";
    if (decision === "MANUAL_REVIEW_QUEUE") return "Manual Review";
    if (decision === "MANDATORY_OVERRIDE") return "Requires Override";
    return decision || "PENDING";
  }

  function getDecisionBadgeClass(decision) {
    if (decision === "AUTO_ACCEPTED") return "badgeSuccess";
    if (decision === "MANUAL_REVIEW_QUEUE") return "badgeWarning";
    if (decision === "MANDATORY_OVERRIDE") return "badgeDanger";
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
          <button className="backButton" onClick={() => router.push('/technical')}>
            <ArrowLeft size={28} />
          </button>
          <div className="pageHeader">
            <h1>SAMPLE INTAKE TERMINAL</h1>
            <p>Coordinate physical sample handover with digital responsibility</p>
          </div>
        </div>
        <div className="grid">
          <Card title="Client & Project Metadata" subtitle="Enter the basic information for the sample registration.">
            <div className="form">
              <Input label="Client / Contractor" name="clientName" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
              <Input label="Project Identifier" name="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} />
              <Input label="Registry Branch" name="branch" value={form.branchLabel} onChange={() => {}} readOnly />
              <Input label="Terminal Staff" name="staff" value={form.staff} onChange={() => {}} readOnly />
            </div>
          </Card>
          <Card title="AI Material Identification" subtitle="Upload or capture the sample image for classification.">
            <div className="panel">
              <div className="uploadBox">
                <input id="sample-upload" type="file" accept="image/*" onChange={handleFileChange} className="hiddenInput" />
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="preview" className="previewImage" />
                    <div className="imageActions">
                      <label htmlFor="sample-upload" className="imageActionBtn">
                        <Upload size={18} />
                        Replace
                      </label>
                      <button type="button" className="imageActionBtn" onClick={() => setShowCamera(true)}>
                        <VideoCamera size={18} />
                        Retake
                      </button>
                      <button type="button" className="imageActionBtn danger" onClick={clearImage}>
                        Clear
                      </button>
                    </div>
                    <p className="uploadText">{form.file?.name}</p>
                  </>
                ) : (
                  <>
                    <div className="cameraIconWrap">
                      <Camera size={48} />
                    </div>
                    <p className="uploadHint">Select how to provide the sample image</p>
                    <div className="captureOptions">
                      <button type="button" className="captureBtn primary" onClick={() => setShowCamera(true)}>
                        <VideoCamera size={22} />
                        <span>Use Camera</span>
                      </button>
                      <label htmlFor="sample-upload" className="captureBtn secondary">
                        <Upload size={22} />
                        <span>Upload File</span>
                      </label>
                    </div>
                    <p className="uploadText">No image selected yet.</p>
                  </>
                )}
              </div>
              <div className="actions">
                <Button onClick={analyze} fullWidth disabled={!form.file || !form.clientName || !form.projectId || isAnalyzing}>
                  {isAnalyzing ? "Analyzing..." : "Analyze Image"}
                </Button>
                {error && <p className="errorText">{error}</p>}
                {result?.sample_registration?.sample_id && <p className="helperText">Sample ID: {result.sample_registration.sample_id}</p>}
                {result?.manual_review_queue?.review_case_id && <p className="helperText reviewNotice">Queued for manual review as {result.manual_review_queue.review_case_id}</p>}
              </div>
              <div className="resultCard">
                <div className="resultTop">
                  <div className="resultTitle">
                    <Sparkle size={18} />
                    <span>ANALYSIS RESULT</span>
                  </div>
                  <div className={`resultBadge ${result ? getDecisionBadgeClass(result.decision) : ''}`}>
                    {result ? getDecisionLabel(result.decision) : 'PENDING'}
                  </div>
                </div>
                <div className="resultGrid">
                  <div>
                    <p className="resultLabel">CLASSIFICATION</p>
                    <h3>{result?.predicted_label || '-'}</h3>
                  </div>
                  <div>
                    <p className="resultLabel">CONFIDENCE</p>
                    <h3 style={result ? { color: getConfidenceColor(result.confidence_score) } : {}}>
                      {result ? `${Math.round(result.confidence_score * 100)}%` : '-'}
                    </h3>
                    {result && result.confidence_score < 0.85 && (
                      <p className="confidenceNote">Below 85% threshold</p>
                    )}
                  </div>
                  <div>
                    <p className="resultLabel">MODEL VERSION</p>
                    <h3>{result?.model_version || '-'}</h3>
                  </div>
                  <div>
                    <p className="resultLabel">ROUTING</p>
                    <h3>{result ? getDecisionLabel(result.decision) : '-'}</h3>
                  </div>
                </div>
                {result?.device_metadata?.anomaly_flags?.length > 0 && (
                  <div className="anomalyAlert">
                    <p><strong>Warning:</strong> This image may not be a valid construction material sample.</p>
                    <p className="anomalyDetails">
                      Detected issues: {result.device_metadata.anomaly_flags.map(f => f.replace(/_/g, ' ')).join(', ')}
                    </p>
                  </div>
                )}
                {result && result.decision !== "AUTO_ACCEPTED" && (
                  <div className="routingAlert">
                    {result.decision === "MANUAL_REVIEW_QUEUE" ? (
                      <p>This sample has been queued for Senior Technician review due to confidence between 70-84%.</p>
                    ) : (
                      <p>This sample requires mandatory override by a Senior Technician due to low confidence (&lt;70%).</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
      <style jsx>{`
        .page { display: flex; flex-direction: column; gap: 28px; }
        .titleRow { display: flex; align-items: center; gap: 16px; }
        .backButton { border: none; background: transparent; cursor: pointer; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .panel { display: flex; flex-direction: column; gap: 16px; }
        .uploadBox, .resultCard { border: 1px solid #e5e7eb; border-radius: 18px; background: #fafafa; padding: 18px; }
        .hiddenInput { display: none; }
        .cameraIconWrap { display: flex; justify-content: center; color: #9ca3af; margin-bottom: 8px; }
        .uploadHint { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 16px; }
        .captureOptions { display: flex; gap: 12px; justify-content: center; margin-bottom: 12px; }
        .captureBtn { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; border-radius: 12px; padding: 14px 20px; font-weight: 600; font-size: 14px; border: none; transition: all 0.2s; }
        .captureBtn.primary { background: #2563eb; color: #fff; }
        .captureBtn.primary:hover { background: #1d4ed8; }
        .captureBtn.secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .captureBtn.secondary:hover { background: #f9fafb; border-color: #9ca3af; }
        .imageActions { display: flex; gap: 8px; justify-content: center; margin: 12px 0 8px; }
        .imageActionBtn { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border: 1px solid #d1d5db; border-radius: 10px; padding: 8px 14px; font-weight: 600; font-size: 13px; background: #fff; color: #374151; transition: all 0.2s; }
        .imageActionBtn:hover { background: #f3f4f6; }
        .imageActionBtn.danger { color: #dc2626; border-color: #fecaca; }
        .imageActionBtn.danger:hover { background: #fef2f2; }
        .previewImage { width: 100%; max-height: 260px; object-fit: contain; border-radius: 14px; background: white; }
        .uploadText { text-align: center; font-size: 13px; color: #6b7280; }
        .resultGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .resultBadge { border-radius: 999px; background: #e2e8f0; padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .resultBadge.badgeSuccess { background: #dcfce7; color: #166534; }
        .resultBadge.badgeWarning { background: #fef9c3; color: #854d0e; }
        .resultBadge.badgeDanger { background: #fee2e2; color: #991b1b; }
        .resultTop { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .resultTitle { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #374151; }
        .resultLabel { font-size: 11px; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }
        .confidenceNote { font-size: 11px; color: #ca8a04; margin-top: 2px; }
        .routingAlert { margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 10px; font-size: 13px; color: #92400e; }
        .anomalyAlert { margin-top: 16px; padding: 12px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 10px; font-size: 13px; color: #991b1b; }
        .anomalyDetails { font-size: 12px; margin-top: 4px; color: #b91c1c; }
        .helperText { font-size: 13px; color: #475569; }
        .helperText.reviewNotice { color: #ca8a04; font-weight: 500; }
        .errorText { font-size: 12px; color: #dc2626; }
        @media (max-width: 900px) {
          .grid { grid-template-columns: 1fr; }
          .form { grid-template-columns: 1fr; }
          .captureOptions { flex-direction: column; }
          .captureBtn { justify-content: center; }
        }
      `}</style>
    </>
  );
}
