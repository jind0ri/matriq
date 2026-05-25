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

const STATUS_FILTERS = {
  ALL: "All",
  PAYMENT_FOLLOW_UP: "Payment Follow-up",
  READY: "Ready to Invoice",
  INVOICED: "Invoiced",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

const PAYMENT_STATUSES = {
  DOWNPAYMENT: "Downpayment Paid",
  PO: "PO Submitted",
  FULLY_PAID: "Fully Paid",
};

const BILLING_COLUMNS = [
  { key: "sample_id", label: "Sample ID", width: "135px" },
  { key: "client_name", label: "Client", width: "135px" },
  { key: "material_type", label: "Material", width: "170px" },
  { key: "branch_id", label: "Branch", width: "115px" },
  { key: "payment_status", label: "Payment", width: "150px" },
  { key: "invoice_status", label: "Billing", width: "140px" },
  { key: "amount", label: "Amount", align: "right", width: "115px" },
  { key: "action", label: "Action", align: "right", width: "190px" },
];

export default function BillingPage() {
  const user = getStoredUser();

  const isAdmin = user?.role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [samples, setSamples] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS.ALL);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingSampleId, setCreatingSampleId] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentRecord, setSelectedPaymentRecord] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(
    PAYMENT_STATUSES.DOWNPAYMENT,
  );
  const [amountPaid, setAmountPaid] = useState("");
  const [balance, setBalance] = useState("");
  const [billingNotes, setBillingNotes] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [creditTermsDays, setCreditTermsDays] = useState("30");
  const [paymentModalError, setPaymentModalError] = useState("");

  const [error, setError] = useState("");

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

  function canActOnItem(item) {
    if (isAdmin) return true;
    return Number(item?.branch_id) === Number(userBranchId);
  }

  function getBranchLockNote(item, actionLabel = "action") {
    if (canActOnItem(item)) return null;

    return `Read-only · ${formatBranch(item?.branch_id)} record. Your assigned branch is ${formatBranch(
      userBranchId,
    )}, so ${actionLabel} is locked.`;
  }

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

const paymentFollowUpSamples = useMemo(() => {
  return visibleSamples.filter((sample) => {
    const payment = getPaymentMetadata(sample);
    const paymentStatus = payment.payment_status || "Unpaid";

    return (
      ["Registered", "For Review"].includes(sample.current_state) &&
      paymentStatus !== "Fully Paid"
    );
  });
}, [visibleSamples]);

  const releasedSamples = useMemo(() => {
    return visibleSamples.filter(
      (sample) =>
        sample.current_state === "Released" ||
        sample.current_state === "Archived",
    );
  }, [visibleSamples]);

  const accountingQueueSamples = useMemo(() => {
    const map = new Map();

    paymentFollowUpSamples.forEach((sample) => {
      map.set(sample.sample_id, sample);
    });

    releasedSamples.forEach((sample) => {
      map.set(sample.sample_id, sample);
    });

    return Array.from(map.values());
  }, [paymentFollowUpSamples, releasedSamples]);

  const billingRows = useMemo(() => {
    return accountingQueueSamples.map((sample) => {
      const invoice = invoiceBySampleId.get(sample.sample_id);
      const billingStatus = getBillingStatus(sample, invoice);
      const payment = getPaymentMetadata(sample);

      return {
        ...sample,
        invoice,
        payment,
        payment_status: payment.payment_status || "Unpaid",
        billing_status: billingStatus,
        invoice_id: invoice?.invoice_id || null,
        invoice_amount: invoice?.amount || BASE_FEE,
      };
    });
  }, [accountingQueueSamples, invoiceBySampleId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return billingRows.filter((item) => {
      const material = normalizeMaterialName(
        item.material_type || item.ai_predicted_label,
      );

      const matchesSearch =
        !q ||
        item.sample_id?.toLowerCase().includes(q) ||
        item.client_name?.toLowerCase().includes(q) ||
        item.project_reference?.toLowerCase().includes(q) ||
        material.toLowerCase().includes(q) ||
        item.payment_status?.toLowerCase().includes(q) ||
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
        if (item.billing_status === STATUS_FILTERS.PAYMENT_FOLLOW_UP) {
          acc.followUps += 1;
        }

        if (item.billing_status === STATUS_FILTERS.READY) acc.ready += 1;
        if (item.billing_status === STATUS_FILTERS.INVOICED) acc.invoiced += 1;
        if (item.billing_status === STATUS_FILTERS.PAID) acc.paid += 1;
        if (item.billing_status === STATUS_FILTERS.CANCELLED) {
          acc.cancelled += 1;
        }

        return acc;
      },
      {
        followUps: 0,
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

  async function handleCreateInvoice(sample) {
    if (!canActOnItem(sample)) {
      setError(getBranchLockNote(sample, "invoice creation"));
      return;
    }

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

  function openPaymentModal(record) {
    if (!canActOnItem(record)) {
      setError(getBranchLockNote(record, "payment update"));
      return;
    }

    const payment = record.payment || {};

    setSelectedPaymentRecord(record);
    setPaymentStatus(
      payment.payment_status && payment.payment_status !== "Unpaid"
        ? payment.payment_status
        : PAYMENT_STATUSES.DOWNPAYMENT,
    );
    setAmountPaid(payment.amount_paid ? String(payment.amount_paid) : "");
    setBalance(payment.balance ? String(payment.balance) : "");
    setBillingNotes(payment.billing_notes || "");
    setConfirmationNote(payment.confirmation_note || "");
    setPoNumber(payment.po_number || "");
    setCreditTermsDays(payment.credit_terms_days ? String(payment.credit_terms_days) : "30");
    setPaymentModalError("");
    setPaymentModalOpen(true);
  }

  function closePaymentModal() {
    if (updatingPayment) return;

    setPaymentModalOpen(false);
    setSelectedPaymentRecord(null);
    setPaymentStatus(PAYMENT_STATUSES.DOWNPAYMENT);
    setAmountPaid("");
    setBalance("");
    setBillingNotes("");
    setConfirmationNote("");
    setPoNumber("");
    setCreditTermsDays("30");
    setPaymentModalError("");
  }

  async function handleUpdatePayment() {
    if (!selectedPaymentRecord) return;

    setPaymentModalError("");

    const currentPayment = selectedPaymentRecord.payment || {};
    const currentPaymentStatus = currentPayment.payment_status || "Unpaid";

    if (paymentStatus === currentPaymentStatus) {
      setPaymentModalError(
        "Please select a different payment status before saving.",
      );
      return;
    }

    if (!canActOnItem(selectedPaymentRecord)) {
      setPaymentModalError(
        getBranchLockNote(selectedPaymentRecord, "payment update"),
      );
      return;
    }

    const parsedAmountPaid = amountPaid === "" ? null : Number(amountPaid);
    const parsedBalance = balance === "" ? null : Number(balance);

    if (
      amountPaid !== "" &&
      (!Number.isFinite(parsedAmountPaid) || parsedAmountPaid < 0)
    ) {
      setPaymentModalError("Amount paid must be a valid non-negative number.");
      return;
    }

    if (
      balance !== "" &&
      (!Number.isFinite(parsedBalance) || parsedBalance < 0)
    ) {
      setPaymentModalError("Balance must be a valid non-negative number.");
      return;
    }

    if (
      paymentStatus === PAYMENT_STATUSES.FULLY_PAID &&
      confirmationNote.trim().length < 8
    ) {
      setPaymentModalError(
        "Confirmation note is required when marking a sample as Fully Paid.",
      );
      return;
    }

    if (
      paymentStatus === PAYMENT_STATUSES.PO &&
      !isAccreditedBilling(selectedPaymentRecord)
    ) {
      setPaymentModalError(
        "Only accredited billing clients can be marked as PO Submitted.",
      );
      return;
    }

    if (
      paymentStatus === PAYMENT_STATUSES.PO &&
      !poNumber.trim()
    ) {
      setPaymentModalError("Purchase order number is required for PO Submitted.");
      return;
    }

    if (
      paymentStatus === PAYMENT_STATUSES.PO &&
      !creditTermsDays
    ) {
      setPaymentModalError("Credit terms are required for PO Submitted.");
      return;
    }

    setUpdatingPayment(true);

    try {
      await apiClient.updateSamplePayment(selectedPaymentRecord.sample_id, {
        payment_status: paymentStatus,
        amount_paid: parsedAmountPaid,
        balance: parsedBalance,
        billing_notes: billingNotes.trim(),
        confirmation_note: confirmationNote.trim(),
        po_number: paymentStatus === PAYMENT_STATUSES.PO ? poNumber.trim() : "",
        credit_terms_days:
          paymentStatus === PAYMENT_STATUSES.PO ? Number(creditTermsDays) : null,
      });

      closePaymentModal();
      closeDetails();
      await loadData();
    } catch (err) {
      setPaymentModalError(err.message || "Failed to update payment status.");
    } finally {
      setUpdatingPayment(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{isAdmin ? "Billing Oversight" : "Billing Queue"}</h1>
          <p>
            Review payment follow-ups, released samples, and invoice readiness
            for <strong>{branchLabel}</strong>.
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

          <Link href="/accounting/invoices" className="textLink">
            View Invoices
          </Link>

          <Button variant="secondary" size="sm" onClick={loadData}>
            Refresh
          </Button>
        </div>
      </header>

      {(isAdmin || isCloudMonitoring || isOtherBranchView) && (
        <section className="adminNotice">
          <strong>
            {isAdmin ? "Administrator Billing View" : "Cloud-Synced Monitoring"}
          </strong>
          <span>
            {isAdmin
              ? "You can view and manage billing records from all branches."
              : isCloudMonitoring
                ? `You are viewing all cloud-synced billing records. Payment and invoice actions remain locked to your assigned branch: ${formatBranch(
                  userBranchId,
                )}.`
                : `You are viewing ${branchLabel} billing records for monitoring. Payment and invoice actions remain locked to your assigned branch: ${formatBranch(
                  userBranchId,
                )}.`}
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
              label="Follow-ups"
              value={stats.followUps}
              note="For Review samples needing full payment"
              variant="warning"
            />

            <StatCard
              label="Ready"
              value={stats.ready}
              note="Released samples without active invoice"
              variant="info"
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
                label: "Payment Follow-ups",
                value: paymentFollowUpSamples.length,
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
              Use Billing to update sample payment readiness such as Downpayment
              Paid, PO Submitted, or Fully Paid. Use Invoices to mark invoice
              records as Paid or Cancelled.
            </span>
          </section>

          <section className="toolbar">
            <Input
              name="billingSearch"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search sample, client, project, material, payment, or invoice..."
            />

            <Select
              name="statusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value={STATUS_FILTERS.ALL}>All Billing Statuses</option>
              <option value={STATUS_FILTERS.PAYMENT_FOLLOW_UP}>
                Payment Follow-up
              </option>
              <option value={STATUS_FILTERS.READY}>Ready to Invoice</option>
              <option value={STATUS_FILTERS.INVOICED}>Invoiced</option>
              <option value={STATUS_FILTERS.PAID}>Paid</option>
              <option value={STATUS_FILTERS.CANCELLED}>Cancelled</option>
            </Select>
          </section>

          <Card
            title="Billing Records"
            subtitle="Payment follow-ups and released samples with invoice state. Click a row to view details."
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
                      {normalizeMaterialName(
                        item.material_type || item.ai_predicted_label,
                      )}
                    </td>
                    <td>{formatBranch(item.branch_id)}</td>
                    <td>
                      <PaymentStatusBadge status={item.payment_status} />
                    </td>
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
                        canAct={canActOnItem(item)}
                        creatingSampleId={creatingSampleId}
                        onCreateInvoice={handleCreateInvoice}
                        onUpdatePayment={openPaymentModal}
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
        description="Sample, payment, and invoice context for accounting review."
        onClose={closeDetails}
        size="lg"
        footer={
          selectedRecord ? (
            <div className="modalFooterActions">
              {canActOnItem(selectedRecord) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="equalFooterButton"
                  onClick={() => openPaymentModal(selectedRecord)}
                >
                  Update Payment
                </Button>
              ) : (
                <span className="readOnlyFooter">
                  {getBranchLockNote(selectedRecord, "payment update")}
                </span>
              )}

              {selectedRecord?.invoice?.invoice_id && (
                <Link href="/accounting/invoices" className="footerButton">
                  Open Invoices
                </Link>
              )}
            </div>
          ) : null
        }
      >
        {selectedRecord && <BillingDetails record={selectedRecord} />}
      </Modal>

      <Modal
        open={paymentModalOpen}
        title="Update Payment"
        description="Update sample-level payment status used for testing and release clearance."
        onClose={closePaymentModal}
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closePaymentModal}
              disabled={updatingPayment}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleUpdatePayment}
              disabled={updatingPayment}
            >
              {updatingPayment ? "Updating..." : "Save Payment"}
            </Button>
          </>
        }
      >
        {selectedPaymentRecord && (
          <div className="paymentForm">
            {paymentModalError && (
              <div className="modalError">{paymentModalError}</div>
            )}

            <div className="paymentContext">
              <div>
                <span>Sample ID</span>
                <strong>{selectedPaymentRecord.sample_id}</strong>
              </div>

              <div>
                <span>Client</span>
                <strong>{selectedPaymentRecord.client_name || "-"}</strong>
              </div>

              <div>
                <span>Branch</span>
                <strong>{formatBranch(selectedPaymentRecord.branch_id)}</strong>
              </div>

              <div>
                <span>Invoice</span>
                <strong>
                  {selectedPaymentRecord.invoice?.invoice_id || "No invoice"}
                </strong>
              </div>
            </div>

            <Select
              label="Payment Status"
              name="paymentStatus"
              value={paymentStatus}
              required
              onChange={(event) => setPaymentStatus(event.target.value)}
            >
              <option value={PAYMENT_STATUSES.DOWNPAYMENT}>
                Downpayment Paid
              </option>
              {isAccreditedBilling(selectedPaymentRecord) && (
                <option value={PAYMENT_STATUSES.PO}>PO Submitted</option>
              )}
              <option value={PAYMENT_STATUSES.FULLY_PAID}>Fully Paid</option>
            </Select>

            {paymentStatus === PAYMENT_STATUSES.PO && (
              <div className="paymentGrid">
                <Input
                  label="Purchase Order Number"
                  name="poNumber"
                  value={poNumber}
                  required
                  onChange={(event) => setPoNumber(event.target.value)}
                  placeholder="e.g. PO-2026-001"
                />

                <Select
                  label="Credit Terms"
                  name="creditTermsDays"
                  value={creditTermsDays}
                  required
                  onChange={(event) => setCreditTermsDays(event.target.value)}
                >
                  <option value="15">15 days</option>
                  <option value="30">30 days</option>
                  <option value="45">45 days</option>
                  <option value="60">60 days</option>
                </Select>
              </div>
            )}

            <div className="paymentGrid">
              <Input
                label="Amount Paid"
                name="amountPaid"
                type="number"
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                placeholder="e.g. 1250"
              />

              <Input
                label="Balance"
                name="balance"
                type="number"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                placeholder="e.g. 1250"
              />
            </div>

            <Textarea
              label="Billing Notes"
              name="billingNotes"
              value={billingNotes}
              onChange={(event) => setBillingNotes(event.target.value)}
              placeholder="e.g. 50% downpayment received."
              rows={3}
            />

            <Textarea
              label="Confirmation Note"
              name="confirmationNote"
              value={confirmationNote}
              required={paymentStatus === PAYMENT_STATUSES.FULLY_PAID}
              onChange={(event) => setConfirmationNote(event.target.value)}
              placeholder={
                paymentStatus === PAYMENT_STATUSES.FULLY_PAID
                  ? "Required when marking as fully paid."
                  : "Optional payment confirmation note."
              }
              rows={3}
            />
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

        :global(.textLink),
        :global(.footerButton),
        :global(.equalFooterButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 128px;
          min-width: 128px;
          min-height: 34px;
          padding: 0 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md) !important;
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          box-shadow: none;
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.textLink:hover),
        :global(.footerButton:hover),
        :global(.equalFooterButton:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        :global(.rowAction) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 10px;
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
          cursor: pointer;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        :global(.rowAction:hover) {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        :global(.textLink),
        :global(.textLink:hover),
        :global(.textLink:focus),
        :global(.textLink:active),
        :global(.footerButton),
        :global(.footerButton:hover),
        :global(.footerButton:focus),
        :global(.footerButton:active),
        :global(.rowAction),
        :global(.rowAction:hover),
        :global(.rowAction:focus),
        :global(.rowAction:active) {
          text-decoration: none !important;
        }

        :global(.rowAction:disabled) {
          opacity: 0.55;
          cursor: not-allowed;
          background: var(--color-overlay);
          color: var(--color-text-muted);
        }

        .adminNotice,
        .notice {
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

        .notice {
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          border: 1px solid var(--color-border-soft);
        }

        .adminNotice strong,
        .notice strong {
          color: inherit;
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

        .toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 12px;
          align-items: end;
        }

        .mutedText {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 400;
          white-space: nowrap;
        }

        .modalFooterActions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .modalFooterActions :global(button),
        .modalFooterActions :global(a) {
          width: 128px;
          min-width: 128px;
          min-height: 34px;
          border-radius: var(--radius-md) !important;
        }

        .readOnlyFooter {
          max-width: 360px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
          text-align: left;
        }

        .paymentForm {
          display: grid;
          gap: 14px;
        }

        .paymentGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
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

        .paymentContext {
          display: grid;
          gap: 9px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          padding: 13px;
        }

        .paymentContext div {
          display: grid;
          grid-template-columns: 90px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .paymentContext span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .paymentContext strong {
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

        :global(.billingTable table) {
          min-width: 1120px;
        }

        :global(.billingTable .clickableRow) {
          cursor: pointer;
          transition: background-color var(--transition-base);
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

        @media (max-width: 880px) {
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

          .toolbar,
          .paymentGrid {
            grid-template-columns: 1fr;
          }

          .modalFooterActions {
            flex-direction: column;
            align-items: stretch;
          }

          .modalFooterActions :global(button),
          .modalFooterActions :global(a) {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 520px) {
          .statsRow {
            grid-template-columns: 1fr;
          }

          .paymentContext div {
            grid-template-columns: 1fr;
            gap: 3px;
          }
        }
      `}</style>
    </div>
  );
}

function BillingAction({
  item,
  canAct,
  creatingSampleId,
  onCreateInvoice,
  onUpdatePayment,
}) {
  if (!canAct) {
    return (
      <span className="readOnlyAction">
        Read-only
        <style jsx>{`
          .readOnlyAction {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 30px;
            padding: 0 10px;
            border: 1px solid var(--color-border-soft);
            border-radius: var(--radius-md);
            background: var(--color-overlay);
            color: var(--color-text-muted);
            font-size: var(--text-xs);
            font-weight: 500;
            line-height: 1;
            white-space: nowrap;
          }
        `}</style>
      </span>
    );
  }

  return (
    <div className="actionGroup">
      <button
        type="button"
        className="rowAction"
        onClick={() => onUpdatePayment(item)}
      >
        Payment
      </button>

      {item.billing_status === STATUS_FILTERS.PAYMENT_FOLLOW_UP ? (
        <span className="mutedText">Not Released</span>
      ) : item.billing_status === STATUS_FILTERS.READY ? (
        <button
          type="button"
          className="rowAction"
          disabled={creatingSampleId === item.sample_id}
          onClick={() => onCreateInvoice(item)}
        >
          {creatingSampleId === item.sample_id ? "Creating..." : "Invoice"}
        </button>
      ) : item.invoice?.invoice_id ? (
        <Link
          href="/accounting/invoices"
          className="rowAction"
          title={`Open invoice ${item.invoice.invoice_id}`}
        >
          Invoice
        </Link>
      ) : (
        <span className="mutedText">No Invoice</span>
      )}

      <style jsx>{`
        .actionGroup {
          display: inline-flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

function BillingDetails({ record }) {
  const metadata = record.device_metadata || {};
  const payment = record.payment || metadata.payment || {};
  const invoice = record.invoice || null;
  const history = Array.isArray(payment.payment_history)
    ? payment.payment_history
    : [];

  return (
    <div className="details">
      <SampleImagePreview sampleId={record.sample_id} />
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
        <Detail label="Payment Status" value={payment.payment_status} />
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
          <Detail label="Client Type" value={payment.client_type} />
          <Detail label="PO Number" value={payment.po_number} />
          <Detail
            label="Credit Terms"
            value={
              payment.credit_terms_days
                ? `${payment.credit_terms_days} days`
                : "-"
            }
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
              payment.payment_updated_by_username ||
              formatUser(payment.payment_updated_by)
            }
          />
          <Detail
            label="Updated At"
            value={formatDate(payment.payment_updated_at)}
          />
          <Detail
            label="Testing Cleared"
            value={payment.financially_cleared_for_testing ? "Yes" : "No"}
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
                <div
                  className="historyItem"
                  key={`${entry.updated_at}-${index}`}
                >
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

function SampleImagePreview({ sampleId }) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!sampleId) return;

    let objectUrl = "";

    async function loadImage() {
      setFailed(false);
      setImageUrl("");

      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      if (!token) {
        setFailed(true);
        return;
      }

      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

        const response = await fetch(
          `${baseUrl}/api/samples/${sampleId}/image`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Image not available");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch {
        setFailed(true);
      }
    }

    loadImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sampleId]);

  if (!sampleId || failed) {
    return (
      <section className="imageBox">
        <div className="imageEmpty">No sample image available.</div>

        <style jsx>{`
          .imageBox {
            display: grid;
            gap: 10px;
            padding: 14px;
            border: 1px solid var(--color-border-soft);
            border-radius: var(--radius-md);
            background: var(--color-surface);
          }

          .imageEmpty {
            display: grid;
            place-items: center;
            min-height: 170px;
            border: 1px dashed var(--color-border-soft);
            border-radius: var(--radius-md);
            background: var(--color-overlay);
            color: var(--color-text-secondary);
            font-size: var(--text-xs);
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="imageBox">
      <div className="imageHeader">
        <div>
          <h3>Sample Image</h3>
          <p>Uploaded image used for AI material identification.</p>
        </div>
      </div>

      <div className="imageFrame">
        {imageUrl ? (
          <img src={imageUrl} alt={`Uploaded sample image for ${sampleId}`} />
        ) : (
          <div className="imageEmpty">Loading sample image...</div>
        )}
      </div>

      <style jsx>{`
        .imageBox {
          display: grid;
          gap: 12px;
          padding: 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .imageHeader h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        .imageHeader p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
        }

        .imageFrame {
          overflow: hidden;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
        }

        .imageFrame img {
          display: block;
          width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        .imageEmpty {
          display: grid;
          place-items: center;
          min-height: 170px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
        }
      `}</style>
    </section>
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

function BillingStatusBadge({ status }) {
  const variant =
    status === STATUS_FILTERS.PAID
      ? "success"
      : status === STATUS_FILTERS.CANCELLED
        ? "danger"
        : status === STATUS_FILTERS.INVOICED
          ? "info"
          : status === STATUS_FILTERS.PAYMENT_FOLLOW_UP
            ? "warning"
            : "neutral";

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

  const payment = getPaymentMetadata(sample);
  const paymentStatus = payment.payment_status || "Unpaid";

if (
  ["Registered", "For Review"].includes(sample.current_state) &&
  paymentStatus !== PAYMENT_STATUSES.FULLY_PAID
) {
  return STATUS_FILTERS.PAYMENT_FOLLOW_UP;
}

  if (sample.current_state === "Released") return STATUS_FILTERS.READY;
  if (sample.current_state === "Archived") return STATUS_FILTERS.PAID;

  return STATUS_FILTERS.PAYMENT_FOLLOW_UP;
}

function getPaymentMetadata(sample) {
  const metadata = sample.device_metadata || {};
  return metadata.payment || {};
}

function getFinalResult(testData) {
  if (!testData) return null;
  return (
    testData.qa_final_result || testData.final_result || testData.result || null
  );
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

function isAccreditedBilling(record) {
  const payment = record?.payment || record?.device_metadata?.payment || {};
  return payment.client_type === "Accredited Billing Client";
}