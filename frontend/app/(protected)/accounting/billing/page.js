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

const BASE_FEE = 2500;

const STATUS_FILTERS = {
  ALL: "All",
  READY: "Ready to Invoice",
  INVOICED: "Invoiced",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const BILLING_COLUMNS = [
  { key: "sample_id", label: "Sample ID", width: "135px" },
  { key: "client_name", label: "Client", width: "135px" },
  { key: "material_type", label: "Material", width: "170px" },
  { key: "branch_id", label: "Branch", width: "115px" },
  { key: "invoice_status", label: "Billing Status", width: "155px" },
  { key: "amount", label: "Amount", align: "right", width: "115px" },
  { key: "action", label: "Action", align: "right", width: "120px" },
];

export default function BillingPage() {
  const user = getStoredUser();

  const [samples, setSamples] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS.ALL);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingSampleId, setCreatingSampleId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.role === "Administrator";
  const userBranchId = user?.branch_id;

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
      setError(err.message || "Failed to load billing data.");
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
      (sample) => Number(sample.branch_id) === Number(userBranchId),
    );
  }, [samples, isAdmin, userBranchId]);

  const visibleInvoices = useMemo(() => {
    if (isAdmin) return invoices;

    return invoices.filter(
      (invoice) => Number(invoice.branch_id) === Number(userBranchId),
    );
  }, [invoices, isAdmin, userBranchId]);

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
      (sample) =>
        sample.current_state === "Released" ||
        sample.current_state === "Archived",
    );
  }, [visibleSamples]);

  const billingRows = useMemo(() => {
    return releasedSamples.map((sample) => {
      const invoice = invoiceBySampleId.get(sample.sample_id);
      const billingStatus = getBillingStatus(sample, invoice);

      return {
        ...sample,
        invoice,
        billing_status: billingStatus,
        invoice_id: invoice?.invoice_id || null,
        invoice_amount: invoice?.amount || BASE_FEE,
      };
    });
  }, [releasedSamples, invoiceBySampleId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return billingRows.filter((item) => {
      const matchesSearch =
        !q ||
        item.sample_id?.toLowerCase().includes(q) ||
        item.client_name?.toLowerCase().includes(q) ||
        item.project_reference?.toLowerCase().includes(q) ||
        item.material_type?.toLowerCase().includes(q) ||
        item.invoice_id?.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === STATUS_FILTERS.ALL ||
        item.billing_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [billingRows, search, statusFilter]);

  const stats = useMemo(() => {
    return billingRows.reduce(
      (acc, item) => {
        if (item.billing_status === STATUS_FILTERS.READY) acc.ready += 1;
        if (item.billing_status === STATUS_FILTERS.INVOICED) acc.invoiced += 1;
        if (item.billing_status === STATUS_FILTERS.PAID) acc.paid += 1;
        if (item.billing_status === STATUS_FILTERS.CANCELLED) {
          acc.cancelled += 1;
        }

        return acc;
      },
      {
        ready: 0,
        invoiced: 0,
        paid: 0,
        cancelled: 0,
      },
    );
  }, [billingRows]);

  const outstandingAmount = useMemo(() => {
    return visibleInvoices
      .filter((invoice) => invoice.status === "Pending")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  }, [visibleInvoices]);

  const collectedAmount = useMemo(() => {
    return visibleInvoices
      .filter((invoice) => invoice.status === "Paid")
      .reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  }, [visibleInvoices]);

  const branchLabel = isAdmin ? "All Branches" : formatBranch(userBranchId);

  async function handleCreateInvoice(sample) {
    setCreatingSampleId(sample.sample_id);
    setError("");

    try {
      await apiClient.createInvoice({
        sample_id: sample.sample_id,
        amount: BASE_FEE,
        notes: `Invoice created from billing page for ${sample.sample_id}.`,
      });

      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create invoice.");
    } finally {
      setCreatingSampleId("");
    }
  }

  function openDetails(record) {
    setSelectedRecord(record);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedRecord(null);
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{isAdmin ? "Billing Oversight" : "Billing Queue"}</h1>
          <p>
            Review released samples and invoice readiness for{" "}
            <strong>{branchLabel}</strong>.
          </p>
        </div>

        <div className="headerActions">
          <Link href="/accounting/invoices" className="textLink">
            View Invoices
          </Link>

          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>
      </header>

      {isAdmin && (
        <section className="adminNotice">
          <strong>Administrator Billing View</strong>
          <span>
            You are viewing all branch billing records. Invoice payment changes
            should still be handled carefully because they update financial
            release metadata.
          </span>
        </section>
      )}

      {loading && <Loader label="Loading billing data..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="statsRow">
            <StatCard
              label="Ready"
              value={stats.ready}
              note="Released samples without active invoice"
              variant="warning"
            />

            <StatCard
              label="Invoiced"
              value={stats.invoiced}
              note="Pending invoice records"
              variant="info"
            />

            <StatCard
              label="Paid"
              value={stats.paid}
              note="Fully paid invoice records"
              variant="success"
            />

            <StatCard
              label="Cancelled"
              value={stats.cancelled}
              note="Cancelled invoice records"
              variant="danger"
            />
          </section>

          <MetricStrip
            items={[
              {
                label: "Released Samples",
                value: releasedSamples.length,
              },
              {
                label: "Outstanding",
                value: formatCurrency(outstandingAmount),
              },
              {
                label: "Collected",
                value: formatCurrency(collectedAmount),
              },
              {
                label: "Branch Scope",
                value: branchLabel,
              },
            ]}
          />

          <section className="notice">
            <strong>Billing rule</strong>
            <span>
              Click a row to view billing details. Released samples can be
              invoiced. Marking an invoice as paid from the invoices page will
              also update the linked sample payment metadata to Fully Paid.
            </span>
          </section>

          <section className="toolbar">
            <Input
              name="billingSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sample, client, project, material, or invoice..."
            />

            <Select
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value={STATUS_FILTERS.ALL}>All Billing Statuses</option>
              <option value={STATUS_FILTERS.READY}>Ready to Invoice</option>
              <option value={STATUS_FILTERS.INVOICED}>Invoiced</option>
              <option value={STATUS_FILTERS.PAID}>Paid</option>
              <option value={STATUS_FILTERS.CANCELLED}>Cancelled</option>
            </Select>
          </section>

          <Card
            title="Billing Records"
            subtitle="Released samples with their invoice state. Click a row to view details."
          >
            {filteredRows.length === 0 ? (
              <EmptyState
                title="No billing records found"
                description="Released samples will appear here once ready for billing."
              />
            ) : (
              <Table
                columns={BILLING_COLUMNS}
                data={filteredRows}
                emptyText="No billing records found."
                density="comfortable"
                variant="minimal"
                className="billingTable"
                renderRow={(item) => (
                  <tr
                    key={item.sample_id}
                    className="clickableRow"
                    onClick={() => openDetails(item)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetails(item);
                      }
                    }}
                  >
                    <td>{item.sample_id}</td>
                    <td>{item.client_name || "-"}</td>
                    <td>
                      {item.material_type || item.ai_predicted_label || "-"}
                    </td>
                    <td>{formatBranch(item.branch_id)}</td>
                    <td>
                      <BillingStatusBadge status={item.billing_status} />
                    </td>
                    <td className="right">
                      {item.invoice ? formatCurrency(item.invoice.amount) : "-"}
                    </td>
                    <td
                      className="right actionCell"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <BillingAction
                        item={item}
                        creatingSampleId={creatingSampleId}
                        onCreateInvoice={handleCreateInvoice}
                      />
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={detailsOpen}
        title="Billing Details"
        description="Sample, invoice, and payment context for accounting review."
        onClose={closeDetails}
        size="lg"
        footer={
          selectedRecord?.invoice?.invoice_id ? (
            <Link href="/accounting/invoices" className="footerButton">
              Open Invoices
            </Link>
          ) : null
        }
      >
        {selectedRecord && <BillingDetails record={selectedRecord} />}
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
          gap: 10px;
          flex-wrap: wrap;
        }

        .textLink,
        .rowAction {
          border: none;
          background: transparent;
          color: var(--color-brand);
          font-size: var(--text-xs);
          font-weight: 900;
          padding: 0;
          cursor: pointer;
          text-decoration: none;
          white-space: nowrap;
        }

        .textLink:hover,
        .rowAction:hover {
          color: var(--color-brand-dark);
          text-decoration: underline;
          transform: none;
          box-shadow: none;
        }

        .footerButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 14px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-brand);
          color: #ffffff;
          font-size: var(--text-xs);
          font-weight: 900;
          text-decoration: none;
          line-height: 1;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            transform var(--transition-base),
            box-shadow var(--transition-base);
        }

        .footerButton:hover {
          background: var(--color-brand-dark);
          border-color: var(--color-brand-dark);
          text-decoration: none;
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }

        .adminNotice,
        .notice {
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

        .notice {
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border);
        }

        .adminNotice strong,
        .notice strong {
          color: inherit;
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

        .toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 12px;
          align-items: end;
        }

        .mutedText {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 800;
          white-space: nowrap;
        }

        :global(.right) {
          text-align: right;
        }

        :global(.billingTable table) {
          min-width: 980px;
        }

        :global(.billingTable .clickableRow) {
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            box-shadow var(--transition-base);
        }

        :global(.billingTable .clickableRow:hover) {
          background: var(--color-overlay);
        }

        :global(.billingTable .clickableRow:focus-visible) {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          background: var(--color-overlay);
        }

        :global(.billingTable td.actionCell) {
          overflow: visible;
          text-overflow: unset;
          white-space: nowrap;
        }

        :global(.billingTable th:last-child),
        :global(.billingTable td:last-child) {
          padding-right: 18px;
        }

        @media (max-width: 1100px) {
          .statsRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .header {
            flex-direction: column;
          }

          .headerActions {
            justify-content: flex-start;
          }

          .toolbar {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 520px) {
          .statsRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function BillingAction({ item, creatingSampleId, onCreateInvoice }) {
  if (item.billing_status === STATUS_FILTERS.READY) {
    return (
      <button
        type="button"
        className="rowAction"
        disabled={creatingSampleId === item.sample_id}
        onClick={() => onCreateInvoice(item)}
      >
        {creatingSampleId === item.sample_id ? "Creating..." : "Create"}
      </button>
    );
  }

  if (item.invoice?.invoice_id) {
    return (
      <Link
        href="/accounting/invoices"
        className="rowAction"
        title={`Open invoice ${item.invoice.invoice_id}`}
      >
        Invoice
      </Link>
    );
  }

  return <span className="mutedText">No Action</span>;
}

function BillingDetails({ record }) {
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
          value={record.material_type || record.ai_predicted_label}
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
            value={invoice?.created_by_name || formatUser(invoice?.created_by)}
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
          <Detail label="Amount Paid" value={formatCurrency(payment.amount_paid)} />
          <Detail label="Balance" value={formatCurrency(payment.balance)} />
          <Detail
            label="Updated By"
            value={
              payment.payment_updated_by_name ||
              payment.payment_updated_by_display ||
              payment.payment_updated_by_full_name ||
              payment.payment_updated_by_username ||
              formatUser(payment.payment_updated_by)
            }
          />
          <Detail label="Updated At" value={formatDate(payment.payment_updated_at)} />
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
                        entry.updated_by_username ||
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
          border: 1px solid var(--color-border);
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
          font-weight: 900;
        }

        .sectionTitle span {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 800;
        }

        .emptyHistory {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          font-weight: 700;
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
          font-weight: 900;
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
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 800;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
      `}</style>
    </div>
  );
}

function BillingStatusBadge({ status }) {
  const variant =
    status === STATUS_FILTERS.PAID
      ? "success"
      : status === STATUS_FILTERS.CANCELLED
        ? "danger"
        : status === STATUS_FILTERS.INVOICED
          ? "info"
          : "warning";

  return (
    <Badge variant={variant} size="sm">
      {status}
    </Badge>
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
  if (invoice?.status === "Paid") return STATUS_FILTERS.PAID;
  if (invoice?.status === "Pending") return STATUS_FILTERS.INVOICED;
  if (invoice?.status === "Cancelled") return STATUS_FILTERS.CANCELLED;

  if (sample.current_state === "Released") return STATUS_FILTERS.READY;
  if (sample.current_state === "Archived") return STATUS_FILTERS.PAID;

  return STATUS_FILTERS.READY;
}

function getFinalResult(testData) {
  if (!testData) return null;
  return testData.qa_final_result || testData.result || null;
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