"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Loader from "@/components/ui/Loader";
import MetricStrip from "@/components/ui/MetricStrip";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import StatCard from "@/components/ui/StatCard";
import Table from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";

const BASE_FEE = 2500;

const INVOICE_COLUMNS = [
  { key: "invoice_id", label: "Invoice ID" },
  { key: "sample_id", label: "Sample ID" },
  { key: "client_name", label: "Client" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" },
];

const SAMPLE_COLUMNS = [
  { key: "sample_id", label: "Sample ID" },
  { key: "material_type", label: "Material" },
  { key: "branch_id", label: "Branch" },
  { key: "billing_status", label: "Billing Status" },
];

export default function AccountingDashboard() {
  const user = getStoredUser();

  const [samples, setSamples] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(String(BASE_FEE));
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const isAdmin = user?.role === "Administrator";
  const userBranchId = user?.branch_id;

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [sampleData, invoiceData] = await Promise.all([
        apiClient.getSamples(),
        apiClient.getAccountingInvoices(),
      ]);

      setSamples(Array.isArray(sampleData) ? sampleData : []);
      setInvoices(Array.isArray(invoiceData) ? invoiceData : []);
    } catch (err) {
      setError(err.message || "Failed to load accounting dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const visibleSamples = useMemo(() => {
    if (isAdmin) return samples;

    return samples.filter(
      (item) => Number(item.branch_id) === Number(userBranchId),
    );
  }, [samples, isAdmin, userBranchId]);

  const visibleInvoices = useMemo(() => {
    if (isAdmin) return invoices;

    return invoices.filter(
      (item) => Number(item.branch_id) === Number(userBranchId),
    );
  }, [invoices, isAdmin, userBranchId]);

  const releasedSamples = useMemo(() => {
    return visibleSamples.filter(
      (item) =>
        item.current_state === "Released" || item.current_state === "Archived",
    );
  }, [visibleSamples]);

  const activeInvoiceSampleIds = useMemo(() => {
    return new Set(
      visibleInvoices
        .filter((invoice) => invoice.status !== "Cancelled")
        .map((invoice) => invoice.sample_id),
    );
  }, [visibleInvoices]);

  const invoiceableSamples = useMemo(() => {
    return visibleSamples.filter(
      (item) =>
        item.current_state === "Released" &&
        !activeInvoiceSampleIds.has(item.sample_id),
    );
  }, [visibleSamples, activeInvoiceSampleIds]);

  const pendingInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => invoice.status === "Pending");
  }, [visibleInvoices]);

  const paidInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => invoice.status === "Paid");
  }, [visibleInvoices]);

  const outstandingBalance = useMemo(() => {
    return pendingInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );
  }, [pendingInvoices]);

  const paidAmount = useMemo(() => {
    return paidInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );
  }, [paidInvoices]);

  const totalBillableAmount = releasedSamples.length * BASE_FEE;

  const recentInvoices = useMemo(() => {
    return visibleInvoices.slice(0, 6);
  }, [visibleInvoices]);

  const billableSamples = useMemo(() => {
    return releasedSamples.slice(0, 6);
  }, [releasedSamples]);

  const selectedSample = useMemo(() => {
    return invoiceableSamples.find(
      (sample) => sample.sample_id === selectedSampleId,
    );
  }, [invoiceableSamples, selectedSampleId]);

  const branchLabel = isAdmin ? "All Branches" : formatBranch(userBranchId);

  function openCreateInvoiceModal() {
    const firstSample = invoiceableSamples[0];

    setSelectedSampleId(firstSample?.sample_id || "");
    setInvoiceAmount(String(BASE_FEE));
    setInvoiceNotes("");
    setModalError("");
    setInvoiceModalOpen(true);
  }

  function closeCreateInvoiceModal() {
    if (creatingInvoice) return;

    setInvoiceModalOpen(false);
    setModalError("");
  }

  async function handleCreateInvoice() {
    setModalError("");

    if (!selectedSampleId) {
      setModalError("Please select a released sample.");
      return;
    }

    const parsedAmount = Number(invoiceAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setModalError("Invoice amount must be greater than zero.");
      return;
    }

    setCreatingInvoice(true);

    try {
      await apiClient.createInvoice({
        sample_id: selectedSampleId,
        amount: parsedAmount,
        notes: invoiceNotes,
      });

      setInvoiceModalOpen(false);
      setSelectedSampleId("");
      setInvoiceAmount(String(BASE_FEE));
      setInvoiceNotes("");

      await loadData();
    } catch (err) {
      setModalError(err.message || "Failed to create invoice.");
    } finally {
      setCreatingInvoice(false);
    }
  }

  async function handleMarkPaid(invoiceId) {
    try {
      await apiClient.updateInvoiceStatus(invoiceId, {
        status: "Paid",
        notes: "Marked as paid from accounting dashboard.",
      });

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update invoice status.");
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Accounting Dashboard</h1>
          <p>
            Billing and payment overview for <strong>{branchLabel}</strong>.
          </p>
        </div>

        <div className="headerActions">
          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateInvoiceModal}
            disabled={invoiceableSamples.length === 0}
            title={
              invoiceableSamples.length === 0
                ? "No released samples available for invoicing."
                : "Create invoice"
            }
          >
            Create Invoice
          </Button>
        </div>
      </header>

      {!isAdmin && !userBranchId && (
        <section className="warningNotice">
          <strong>No branch assigned</strong>
          <span>
            This accounting account does not have a branch assigned, so billing
            records may not appear correctly.
          </span>
        </section>
      )}

      {isAdmin && (
        <section className="adminNotice">
          <strong>Administrator View</strong>
          <span>You are viewing accounting records from all branches.</span>
        </section>
      )}

      {loading && <Loader label="Loading accounting data..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Pending"
              value={pendingInvoices.length}
              note="Invoices awaiting payment"
              variant="warning"
            />

            <StatCard
              label="Paid"
              value={paidInvoices.length}
              note="Completed invoices"
              variant="success"
            />

            <StatCard
              label="Collected"
              value={formatCurrency(paidAmount)}
              note="Total paid invoice value"
              variant="brand"
            />

            <StatCard
              label="Outstanding"
              value={formatCurrency(outstandingBalance)}
              note="Pending invoice value"
              variant="danger"
            />
          </section>

          <MetricStrip
            items={[
              {
                label: "Billable Samples",
                value: releasedSamples.length,
              },
              {
                label: "Ready to Invoice",
                value: invoiceableSamples.length,
              },
              {
                label: "Total Billable Value",
                value: formatCurrency(totalBillableAmount),
              },
              {
                label: "Branch Scope",
                value: branchLabel,
              },
            ]}
          />

          <section className="contentGrid">
            <Card
              title="Recent Invoices"
              subtitle="Invoices stored in the database."
              actions={
                <button type="button" className="textAction">
                  View All
                </button>
              }
            >
              {recentInvoices.length === 0 ? (
                <EmptyState
                  title="No invoices yet"
                  description="Create an invoice from a released sample to begin tracking billing."
                />
              ) : (
                <Table
                  columns={INVOICE_COLUMNS}
                  data={recentInvoices}
                  emptyText="No invoices found."
                  density="comfortable"
                  variant="minimal"
                  renderRow={(item) => (
                    <tr key={item.invoice_id}>
                      <td>{item.invoice_id}</td>
                      <td>{item.sample_id}</td>
                      <td>{item.client_name || "-"}</td>
                      <td className="right">{formatCurrency(item.amount)}</td>
                      <td>
                        <InvoiceStatusBadge status={item.status} />
                      </td>
                      <td className="right">
                        {item.status === "Pending" ? (
                          <button
                            type="button"
                            className="rowAction"
                            onClick={() => handleMarkPaid(item.invoice_id)}
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="mutedText">Done</span>
                        )}
                      </td>
                    </tr>
                  )}
                />
              )}
            </Card>

            <Card
              title="Released Samples"
              subtitle="Samples ready for invoice preparation or payment review."
              actions={
                <button type="button" className="textAction">
                  View All
                </button>
              }
            >
              {billableSamples.length === 0 ? (
                <EmptyState
                  title="No released samples yet"
                  description="Samples for this branch will appear here after QA release."
                />
              ) : (
                <Table
                  columns={SAMPLE_COLUMNS}
                  data={billableSamples}
                  emptyText="No released samples yet."
                  density="comfortable"
                  variant="minimal"
                  renderRow={(item) => (
                    <tr key={item.sample_id}>
                      <td>{item.sample_id}</td>
                      <td>
                        {item.material_type || item.ai_predicted_label || "-"}
                      </td>
                      <td>{formatBranch(item.branch_id)}</td>
                      <td>
                        <BillingStatusBadge
                          status={item.current_state}
                          hasInvoice={activeInvoiceSampleIds.has(item.sample_id)}
                        />
                      </td>
                    </tr>
                  )}
                />
              )}
            </Card>
          </section>
        </>
      )}

      <Modal
        open={invoiceModalOpen}
        title="Create Invoice"
        description="Create a stored invoice for a released sample."
        onClose={closeCreateInvoiceModal}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeCreateInvoiceModal}
              disabled={creatingInvoice}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleCreateInvoice}
              disabled={creatingInvoice || !selectedSampleId}
            >
              {creatingInvoice ? "Creating..." : "Create Invoice"}
            </Button>
          </>
        }
      >
        {invoiceableSamples.length === 0 ? (
          <EmptyState
            title="No samples ready for invoice"
            description="Only released samples without an active invoice can be invoiced."
          />
        ) : (
          <div className="invoiceForm">
            {modalError && <div className="modalError">{modalError}</div>}

            <Select
              label="Released Sample"
              name="selectedSampleId"
              value={selectedSampleId}
              onChange={(event) => setSelectedSampleId(event.target.value)}
            >
              {invoiceableSamples.map((sample) => (
                <option key={sample.sample_id} value={sample.sample_id}>
                  {sample.sample_id} — {sample.client_name || "No client"}
                </option>
              ))}
            </Select>

            <Input
              label="Invoice Amount"
              name="invoiceAmount"
              type="number"
              value={invoiceAmount}
              onChange={(event) => setInvoiceAmount(event.target.value)}
              helperText="Default laboratory invoice amount can be adjusted before saving."
            />

            <Textarea
              label="Notes"
              name="invoiceNotes"
              value={invoiceNotes}
              onChange={(event) => setInvoiceNotes(event.target.value)}
              placeholder="Optional invoice notes..."
              rows={3}
            />

            {selectedSample && (
              <div className="invoicePreview">
                <div>
                  <span>Client</span>
                  <strong>{selectedSample.client_name || "-"}</strong>
                </div>

                <div>
                  <span>Material</span>
                  <strong>
                    {selectedSample.material_type ||
                      selectedSample.ai_predicted_label ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>Branch</span>
                  <strong>{formatBranch(selectedSample.branch_id)}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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

        .header h1 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: 18px;
          font-weight: 850;
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
          font-weight: 850;
        }

        .headerActions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .adminNotice,
        .warningNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .adminNotice {
          background: var(--color-info-bg);
          color: var(--color-info);
          border: 1px solid var(--color-info-border);
        }

        .warningNotice {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          border: 1px solid var(--color-warning-border);
        }

        .adminNotice strong,
        .warningNotice strong {
          font-size: var(--text-sm);
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 800;
        }

        .statsRow {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .contentGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
        }

        .textAction,
        .rowAction {
          border: none;
          background: transparent;
          color: var(--color-brand);
          font-size: var(--text-xs);
          font-weight: 900;
          padding: 0;
          cursor: pointer;
        }

        .textAction:hover,
        .rowAction:hover {
          color: var(--color-brand-dark);
          text-decoration: underline;
          transform: none;
          box-shadow: none;
        }

        .mutedText {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 800;
        }

        .invoiceForm {
          display: grid;
          gap: 14px;
        }

        .modalError {
          border: 1px solid var(--color-danger-border);
          border-radius: var(--radius-md);
          background: var(--color-danger-bg);
          color: var(--color-danger);
          padding: 11px 12px;
          font-size: var(--text-xs);
          font-weight: 800;
          line-height: 1.45;
        }

        .invoicePreview {
          display: grid;
          gap: 9px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          padding: 13px;
        }

        .invoicePreview div {
          display: grid;
          grid-template-columns: 90px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .invoicePreview span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .invoicePreview strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.right) {
          text-align: right;
        }

        @media (max-width: 1100px) {
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 520px) {
          .statsRow {
            grid-template-columns: 1fr;
          }

          .invoicePreview div {
            grid-template-columns: 1fr;
            gap: 3px;
          }
        }
      `}</style>
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const variant =
    status === "Paid"
      ? "success"
      : status === "Cancelled"
        ? "danger"
        : "warning";

  return (
    <Badge variant={variant} size="sm">
      {status || "Pending"}
    </Badge>
  );
}

function BillingStatusBadge({ status, hasInvoice }) {
  if (hasInvoice) {
    return (
      <Badge variant="info" size="sm">
        Invoiced
      </Badge>
    );
  }

  if (status === "Archived") {
    return (
      <Badge variant="success" size="sm">
        Paid
      </Badge>
    );
  }

  if (status === "Released") {
    return (
      <Badge variant="warning" size="sm">
        Ready
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" size="sm">
      {status || "-"}
    </Badge>
  );
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}