"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  const isAdmin = user?.role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [samples, setSamples] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");

  const [loading, setLoading] = useState(true);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState(String(BASE_FEE));
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [selectedSampleDetails, setSelectedSampleDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const branchOptions = useMemo(() => {
    if (isAdmin) {
      return [
        { label: "All Branches", value: "All" },
        { label: "Marikina", value: "1" },
        { label: "Pateros", value: "2" },
      ];
    }

    const otherBranch =
      Number(userBranchId) === 1
        ? { label: "Pateros", value: "2" }
        : { label: "Marikina", value: "1" };

    return [
      { label: "All Branches", value: "All" },
      { label: "My Branch", value: "My" },
      otherBranch,
    ];
  }, [isAdmin, userBranchId]);

  const branchLabel = getBranchViewLabel(branchFilter, userBranchId);
  const isCloudMonitoring = !isAdmin && branchFilter === "All";
  const isOtherBranchView =
    !isAdmin &&
    branchFilter !== "All" &&
    branchFilter !== "My" &&
    Number(resolveBranchFilter(branchFilter, userBranchId)) !==
      Number(userBranchId);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [sampleData, invoiceData] = await Promise.all([
        apiClient.getAccountingBilling(),
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

  useEffect(() => {
    if (!isAdmin && branchFilter !== "All" && branchFilter !== "My") {
      const resolved = resolveBranchFilter(branchFilter, userBranchId);
      const isOwnBranch = Number(resolved) === Number(userBranchId);

      if (isOwnBranch) {
        setBranchFilter("My");
      }
    }
  }, [branchFilter, isAdmin, userBranchId]);

  const visibleSamples = useMemo(() => {
    return filterItemsByBranchView(samples, branchFilter, userBranchId);
  }, [samples, branchFilter, userBranchId]);

  const visibleInvoices = useMemo(() => {
    return filterItemsByBranchView(invoices, branchFilter, userBranchId);
  }, [invoices, branchFilter, userBranchId]);

  const actionAllowedSamples = useMemo(() => {
    if (isAdmin) return visibleSamples;

    return visibleSamples.filter(
      (item) => Number(item.branch_id) === Number(userBranchId),
    );
  }, [visibleSamples, isAdmin, userBranchId]);

  const actionAllowedInvoices = useMemo(() => {
    if (isAdmin) return visibleInvoices;

    return visibleInvoices.filter(
      (item) => Number(item.branch_id) === Number(userBranchId),
    );
  }, [visibleInvoices, isAdmin, userBranchId]);

  const invoiceBySampleId = useMemo(() => {
    const map = new Map();

    visibleInvoices.forEach((invoice) => {
      const existing = map.get(invoice.sample_id);

      if (!existing) {
        map.set(invoice.sample_id, invoice);
        return;
      }

      if (existing.status === "Cancelled" && invoice.status !== "Cancelled") {
        map.set(invoice.sample_id, invoice);
      }
    });

    return map;
  }, [visibleInvoices]);

  const releasedSamples = useMemo(() => {
    return visibleSamples.filter(
      (item) =>
        item.current_state === "Released" || item.current_state === "Archived",
    );
  }, [visibleSamples]);

  const actionAllowedReleasedSamples = useMemo(() => {
    return actionAllowedSamples.filter(
      (item) =>
        item.current_state === "Released" || item.current_state === "Archived",
    );
  }, [actionAllowedSamples]);

  const activeInvoiceSampleIds = useMemo(() => {
    return new Set(
      actionAllowedInvoices
        .filter((invoice) => invoice.status !== "Cancelled")
        .map((invoice) => invoice.sample_id),
    );
  }, [actionAllowedInvoices]);

  const invoiceableSamples = useMemo(() => {
    return actionAllowedReleasedSamples.filter(
      (item) =>
        item.current_state === "Released" &&
        !activeInvoiceSampleIds.has(item.sample_id),
    );
  }, [actionAllowedReleasedSamples, activeInvoiceSampleIds]);

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
    return releasedSamples.slice(0, 6).map((sample) => {
      const invoice = invoiceBySampleId.get(sample.sample_id);

      return {
        ...sample,
        invoice,
        billing_status: getBillingStatus(sample, invoice),
      };
    });
  }, [releasedSamples, invoiceBySampleId]);

  const selectedSample = useMemo(() => {
    return invoiceableSamples.find(
      (sample) => sample.sample_id === selectedSampleId,
    );
  }, [invoiceableSamples, selectedSampleId]);

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

  function openSampleDetails(sample) {
    setSelectedSampleDetails(sample);
    setDetailsOpen(true);
  }

  function closeSampleDetails() {
    setDetailsOpen(false);
    setSelectedSampleDetails(null);
  }

  async function handleCreateInvoice() {
    setModalError("");

    if (!selectedSampleId) {
      setModalError("Please select a released sample.");
      return;
    }

    if (!isAdmin && Number(selectedSample?.branch_id) !== Number(userBranchId)) {
      setModalError(
        `Invoice creation is locked to your assigned branch: ${formatBranch(
          userBranchId,
        )}.`,
      );
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
          <Select
            className="branchSelect"
            name="branchFilter"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          >
            {branchOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

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
                ? isAdmin
                  ? "No released samples available for invoicing."
                  : "No released samples from your assigned branch are available for invoicing."
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

      {(isAdmin || isCloudMonitoring || isOtherBranchView) && (
        <section className="adminNotice">
          <strong>
            {isAdmin ? "Administrator View" : "Cloud-Synced Monitoring"}
          </strong>
          <span>
            {isAdmin
              ? "You can view and manage accounting records from all branches."
              : isCloudMonitoring
                ? `You are viewing all cloud-synced accounting records. Invoice creation remains locked to your assigned branch: ${formatBranch(
                    userBranchId,
                  )}.`
                : `You are viewing ${branchLabel} accounting records for monitoring. Invoice creation remains locked to your assigned branch: ${formatBranch(
                    userBranchId,
                  )}.`}
          </span>
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
              subtitle="Invoices stored in the database. Open the invoices page to update payment status safely."
              actions={
                <Link href="/accounting/invoices" className="textAction">
                  View All
                </Link>
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
                        <Link href="/accounting/invoices" className="rowAction">
                          Open
                        </Link>
                      </td>
                    </tr>
                  )}
                />
              )}
            </Card>

            <Card
              title="Released Samples"
              subtitle="Samples ready for invoice preparation or payment review. Click a row to view details."
              actions={
                <Link href="/accounting/billing" className="textAction">
                  View All
                </Link>
              }
            >
              {billableSamples.length === 0 ? (
                <EmptyState
                  title="No released samples yet"
                  description="Samples for this branch view will appear here after QA release."
                />
              ) : (
                <Table
                  columns={SAMPLE_COLUMNS}
                  data={billableSamples}
                  emptyText="No released samples yet."
                  density="comfortable"
                  variant="minimal"
                  className="sampleTable"
                  renderRow={(item) => (
                    <tr
                      key={item.sample_id}
                      className="clickableRow"
                      onClick={() => openSampleDetails(item)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSampleDetails(item);
                        }
                      }}
                    >
                      <td>{item.sample_id}</td>
                      <td>
                        {normalizeMaterialName(
                          item.material_type || item.ai_predicted_label,
                        )}
                      </td>
                      <td>{formatBranch(item.branch_id)}</td>
                      <td>
                        <BillingStatusBadge status={item.billing_status} />
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
        description={
          isAdmin
            ? "Create a stored invoice for a released sample."
            : `Create a stored invoice for a released ${formatBranch(
                userBranchId,
              )} sample.`
        }
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
            description={
              isAdmin
                ? "Only released samples without an active invoice can be invoiced."
                : "Only released samples from your assigned branch without an active invoice can be invoiced."
            }
          />
        ) : (
          <div className="invoiceForm">
            {modalError && <div className="modalError">{modalError}</div>}

            <Select
              label="Released Sample"
              name="selectedSampleId"
              value={selectedSampleId}
              required
              onChange={(event) => setSelectedSampleId(event.target.value)}
            >
              {invoiceableSamples.map((sample) => (
                <option key={sample.sample_id} value={sample.sample_id}>
                  {sample.sample_id} — {sample.client_name || "No client"} —{" "}
                  {formatBranch(sample.branch_id)}
                </option>
              ))}
            </Select>

            <Input
              label="Invoice Amount"
              name="invoiceAmount"
              type="number"
              value={invoiceAmount}
              required
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
                    {normalizeMaterialName(
                      selectedSample.material_type ||
                        selectedSample.ai_predicted_label,
                    )}
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

      <Modal
        open={detailsOpen}
        title="Sample Billing Details"
        description="Billing, invoice, and payment context for this sample."
        onClose={closeSampleDetails}
        size="lg"
        footer={
          selectedSampleDetails?.invoice?.invoice_id ? (
            <Link href="/accounting/invoices" className="footerButton">
              Open Invoices
            </Link>
          ) : (
            <Link href="/accounting/billing" className="footerButton">
              Open Billing Queue
            </Link>
          )
        }
      >
        {selectedSampleDetails && (
          <SampleBillingDetails record={selectedSampleDetails} />
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

        .headerActions {
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        .headerActions :global(.branchSelect) {
          width: 150px;
          min-width: 150px;
          flex: 0 0 150px;
        }

        .headerActions > :global(button),
        .headerActions > :global(a) {
          width: auto;
          min-width: 0;
          min-height: 34px;
          border-radius: var(--radius-md) !important;
        }

        .adminNotice,
        .warningNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          font-size: var(--text-xs);
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
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
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

        :global(.textAction),
        :global(.rowAction),
        :global(.footerButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.footerButton) {
          min-height: 34px;
          padding: 0 14px;
        }

        :global(.textAction:hover),
        :global(.rowAction:hover),
        :global(.footerButton:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
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
          font-weight: 500;
          line-height: 1.45;
        }

        .invoicePreview {
          display: grid;
          gap: 9px;
          border: 1px solid var(--color-border-soft);
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
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .invoicePreview strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.right) {
          text-align: right;
        }

        :global(.sampleTable .clickableRow) {
          cursor: pointer;
          transition: background-color var(--transition-base);
        }

        :global(.sampleTable .clickableRow:hover) {
          background: var(--color-overlay);
        }

        :global(.sampleTable .clickableRow:focus-visible) {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          background: var(--color-overlay);
        }

        @media (max-width: 1100px) {
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .contentGrid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            width: 100%;
            justify-content: flex-start;
          }

          .headerActions :global(.branchSelect),
          .headerActions > :global(button),
          .headerActions > :global(a) {
            width: 100%;
            min-width: 0;
            flex: 1 1 100%;
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

function SampleBillingDetails({ record }) {
  const metadata = record.device_metadata || {};
  const payment = metadata.payment || {};
  const invoice = record.invoice || null;
  const history = Array.isArray(payment.payment_history)
    ? payment.payment_history
    : [];

  return (
    <div className="details">
      <section className="detailGrid">
        <Detail label="Sample ID" value={record.sample_id} />
        <Detail label="Client" value={record.client_name} />
        <Detail label="Project Reference" value={record.project_reference} />
        <Detail
          label="Material"
          value={normalizeMaterialName(
            record.material_type || record.ai_predicted_label,
          )}
        />
        <Detail label="Branch" value={formatBranch(record.branch_id)} />
        <Detail label="Lifecycle Status" value={record.current_state} />
        <Detail label="Billing Status" value={record.billing_status} />
        <Detail
          label="Test Result"
          value={getFinalResult(metadata.test_data) || "No Result"}
        />
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Invoice</h3>
          {invoice ? (
            <InvoiceStatusBadge status={invoice.status} />
          ) : (
            <Badge variant="warning" size="sm">
              No Invoice
            </Badge>
          )}
        </div>

        <div className="detailGrid">
          <Detail label="Invoice ID" value={invoice?.invoice_id} />
          <Detail
            label="Invoice Amount"
            value={invoice ? formatCurrency(invoice.amount) : "-"}
          />
          <Detail label="Invoice Status" value={invoice?.status} />
          <Detail
            label="Created By"
            value={
              invoice?.created_by_name ||
              invoice?.created_by_display ||
              invoice?.created_by_full_name ||
              formatUser(invoice?.created_by)
            }
          />
          <Detail label="Created At" value={formatDate(invoice?.created_at)} />
          <Detail label="Paid At" value={formatDate(invoice?.paid_at)} />
          <Detail label="Invoice Notes" value={invoice?.notes} wide />
        </div>
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Payment Metadata</h3>
          <PaymentStatusBadge status={payment.payment_status} />
        </div>

        <div className="detailGrid">
          <Detail
            label="Payment Status"
            value={payment.payment_status || "Unpaid"}
          />
          <Detail
            label="Amount Paid"
            value={formatCurrency(payment.amount_paid)}
          />
          <Detail label="Balance" value={formatCurrency(payment.balance)} />
          <Detail
            label="Updated By"
            value={
              payment.payment_updated_by_name ||
              payment.payment_updated_by_display ||
              payment.payment_updated_by_full_name ||
              formatUser(payment.payment_updated_by)
            }
          />
          <Detail
            label="Updated At"
            value={formatDate(payment.payment_updated_at)}
          />
          <Detail
            label="Release Cleared"
            value={payment.financially_cleared_for_release ? "Yes" : "No"}
          />
          <Detail label="Billing Notes" value={payment.billing_notes} wide />
          <Detail
            label="Confirmation Note"
            value={payment.confirmation_note}
            wide
          />
        </div>
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Payment History</h3>
          <span>{history.length} record(s)</span>
        </div>

        {history.length === 0 ? (
          <p className="emptyHistory">No payment history recorded yet.</p>
        ) : (
          <div className="historyList">
            {history
              .slice()
              .reverse()
              .map((entry, index) => (
                <div className="historyItem" key={`${entry.updated_at}-${index}`}>
                  <div>
                    <strong>
                      {entry.from_status || "-"} → {entry.to_status || "-"}
                    </strong>
                    <span>
                      {entry.updated_by_name ||
                        entry.updated_by_display ||
                        entry.updated_by_full_name ||
                        formatUser(entry.updated_by)}
                      {" · "}
                      {formatDate(entry.updated_at)}
                    </span>
                  </div>

                  <p>
                    {entry.billing_notes ||
                      entry.confirmation_note ||
                      "No notes."}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .details {
          display: grid;
          gap: 16px;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .sectionBox {
          display: grid;
          gap: 13px;
          padding: 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .sectionTitle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sectionTitle h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .sectionTitle span {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 400;
        }

        .emptyHistory {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 400;
        }

        .historyList {
          display: grid;
          gap: 10px;
        }

        .historyItem {
          display: grid;
          gap: 5px;
          padding: 11px 12px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
        }

        .historyItem div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .historyItem strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .historyItem span,
        .historyItem p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        @media (max-width: 640px) {
          .detailGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Detail({ label, value, wide = false }) {
  return (
    <div className={wide ? "detail wide" : "detail"}>
      <span>{label}</span>
      <strong>{formatEmpty(value)}</strong>

      <style jsx>{`
        .detail {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .detail.wide {
          grid-column: 1 / -1;
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
          line-height: 1.45;
          overflow-wrap: anywhere;
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

function BillingStatusBadge({ status }) {
  const variant =
    status === "Paid"
      ? "success"
      : status === "Cancelled"
        ? "danger"
        : status === "Invoiced"
          ? "info"
          : "warning";

  return (
    <Badge variant={variant} size="sm">
      {status || "Ready"}
    </Badge>
  );
}

function PaymentStatusBadge({ status }) {
  const variant =
    status === "Fully Paid"
      ? "success"
      : status === "PO Submitted"
        ? "info"
        : status === "Downpayment Paid"
          ? "warning"
          : "danger";

  return (
    <Badge variant={variant} size="sm">
      {status || "Unpaid"}
    </Badge>
  );
}

function getBillingStatus(sample, invoice) {
  if (invoice?.status === "Paid") return "Paid";
  if (invoice?.status === "Pending") return "Invoiced";
  if (invoice?.status === "Cancelled") return "Cancelled";

  if (sample.current_state === "Released") return "Ready";
  if (sample.current_state === "Archived") return "Paid";

  return "Ready";
}

function getFinalResult(testData) {
  if (!testData) return null;
  return testData.qa_final_result || testData.final_result || testData.result || null;
}

function resolveBranchFilter(value, userBranchId) {
  if (value === "All") return "All";
  if (value === "My") return Number(userBranchId);
  return Number(value);
}

function filterItemsByBranchView(items, branchFilter, userBranchId) {
  const resolvedBranch = resolveBranchFilter(branchFilter, userBranchId);

  if (resolvedBranch === "All") return Array.isArray(items) ? items : [];

  return (Array.isArray(items) ? items : []).filter(
    (item) => Number(item?.branch_id) === Number(resolvedBranch),
  );
}

function getBranchViewLabel(branchFilter, userBranchId) {
  if (branchFilter === "All") return "all branches";
  if (branchFilter === "My") return `${formatBranch(userBranchId)} branch`;
  return `${formatBranch(branchFilter)} branch`;
}

function normalizeMaterialName(value) {
  if (!value) return "-";

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "rsb" ||
    normalized === "rebar" ||
    normalized === "reinforcing steel" ||
    normalized === "reinforcing steel bar" ||
    normalized === "steel bar" ||
    normalized === "metal" ||
    normalized.includes("rsb") ||
    normalized.includes("rebar") ||
    normalized.includes("reinforcing") ||
    normalized.includes("steel") ||
    normalized.includes("metal")
  ) {
    return "Reinforcing Steel Bar";
  }

  if (
    normalized === "soil aggregates" ||
    normalized === "soil aggregate" ||
    normalized === "soil_aggregates" ||
    normalized === "soil-aggregates" ||
    normalized === "aggregate" ||
    normalized === "aggregates" ||
    normalized.includes("soil") ||
    normalized.includes("aggregate")
  ) {
    return "Soil Aggregates";
  }

  if (
    normalized === "concrete" ||
    normalized === "cement concrete" ||
    normalized.includes("concrete") ||
    normalized.includes("cement")
  ) {
    return "Concrete";
  }

  return formatLabel(value);
}

function formatLabel(value) {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBranch(branchId) {
  if (Number(branchId) === 1) return "Marikina";
  if (Number(branchId) === 2) return "Pateros";
  return branchId ? `Branch ${branchId}` : "-";
}

function formatUser(userId) {
  if (!userId) return "-";

  const value = String(userId);

  if (Number.isNaN(Number(value))) {
    return value;
  }

  return `User ${value}`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatEmpty(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `₱${Number(value || 0).toLocaleString()}`;
}