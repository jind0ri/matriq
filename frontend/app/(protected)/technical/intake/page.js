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
  const [form, setForm] = useState({ clientName: "", projectId: "", branchLabel: "Main Laboratory - Marikina", branchId: 1, staff: user?.name || "Current User", file: null });
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!form.file) return setPreviewUrl("");
    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file]);

  async function analyze() {
    setError("");
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
    }
  }

  return <><div className="page"><div className="titleRow"><button className="backButton" onClick={() => router.push('/technical')}><ArrowLeft size={28} /></button><div className="pageHeader"><h1>SAMPLE INTAKE TERMINAL</h1><p>Coordinate physical sample handover with digital responsibility</p></div></div><div className="grid"><Card title="Client & Project Metadata" subtitle="Enter the basic information for the sample registration."><div className="form"><Input label="Client / Contractor" name="clientName" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} /><Input label="Project Identifier" name="projectId" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} /><Input label="Registry Branch" name="branch" value={form.branchLabel} onChange={() => {}} readOnly /><Input label="Terminal Staff" name="staff" value={form.staff} onChange={() => {}} readOnly /></div></Card><Card title="AI Material Identification" subtitle="Upload or capture the sample image for classification."><div className="panel"><div className="uploadBox"><input id="sample-upload" type="file" accept="image/*" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="hiddenInput" />{previewUrl ? <><img src={previewUrl} alt="preview" className="previewImage" /><label htmlFor="sample-upload" className="uploadTrigger secondaryUpload">Change Image</label><p className="uploadText">{form.file?.name}</p></> : <><div className="cameraIconWrap"><Camera size={56} /></div><label htmlFor="sample-upload" className="uploadTrigger">Upload or Capture Sample</label><p className="uploadText">No image selected yet.</p></>}</div><div className="actions"><Button onClick={analyze} fullWidth disabled={!form.file || !form.clientName || !form.projectId}>Analyze Image</Button>{error && <p className="errorText">{error}</p>}{result?.sample_registration?.sample_id && <p className="helperText">Sample ID: {result.sample_registration.sample_id}</p>}{result?.manual_review_queue?.review_case_id && <p className="helperText">Queued for review as {result.manual_review_queue.review_case_id}.</p>}</div><div className="resultCard"><div className="resultTop"><div className="resultTitle"><Sparkle size={18} /><span>ANALYSIS RESULT</span></div><div className="resultBadge">{result?.decision || 'PENDING'}</div></div><div className="resultGrid"><div><p className="resultLabel">CLASSIFICATION</p><h3>{result?.predicted_label || '-'}</h3></div><div><p className="resultLabel">CONFIDENCE</p><h3>{result ? `${Math.round(result.confidence_score * 100)}%` : '-'}</h3></div><div><p className="resultLabel">MODEL VERSION</p><h3>{result?.model_version || '-'}</h3></div><div><p className="resultLabel">ROUTING</p><h3>{result?.decision || '-'}</h3></div></div></div></div></Card></div></div><style jsx>{`.page{display:flex;flex-direction:column;gap:28px}.titleRow{display:flex;align-items:center;gap:16px}.backButton{border:none;background:transparent;cursor:pointer}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.form{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{display:flex;flex-direction:column;gap:16px}.uploadBox,.resultCard{border:1px solid #e5e7eb;border-radius:18px;background:#fafafa;padding:18px}.hiddenInput{display:none}.uploadTrigger{display:inline-flex;cursor:pointer;border:1px solid #d1d5db;border-radius:12px;padding:12px 16px;font-weight:600;background:#fff}.previewImage{width:100%;max-height:260px;object-fit:contain;border-radius:14px;background:white}.resultGrid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.resultBadge{border-radius:999px;background:#e2e8f0;padding:8px 12px;font-size:11px;font-weight:700}.resultTop{display:flex;justify-content:space-between;align-items:center}.helperText{font-size:13px;color:#475569}.errorText{font-size:12px;color:#dc2626}`}</style></>;
}
