"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient, getStoredUser } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";

const INVOICE_COLUMNS = [
  { key: "invoice_id", label: "Invoice ID", width: "130px" },
  { key: "sample_id", label: "Sample ID", width: "130px" },
  { key: "client_name", label: "Client", width: "160px" },
  { key: "material_type", label: "Material", width: "160px" },
  { key: "amount", label: "Amount", align: "right", width: "120px" },
  { key: "status", label: "Status", width: "120px" },
  { key: "action", label: "Action", align: "right", width: "155px" },
];

const ACTION_MARK_PAID = "mark_paid";
const ACTION_CANCEL = "cancel";

export default function InvoicesPage() {
  const user = getStoredUser();
  const isAdmin = user?.role === "Administrator";
  const userBranchId = Number(user?.branch_id);

  const [invoices, setInvoices] = useState([]);
  const [branchFilter, setBranchFilter] = useState(isAdmin ? "All" : "My");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedDetailsInvoice, setSelectedDetailsInvoice] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionNote, setActionNote] = useState("");
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

  function canActOnInvoice(invoice) {
    if (isAdmin) return true;
    return Number(invoice?.branch_id) === Number(userBranchId);
  }

  function getBranchLockNote(invoice, actionLabel = "invoice update") {
    if (canActOnInvoice(invoice)) return null;

    return `Read-only · ${formatBranch(invoice?.branch_id)} invoice. Your assigned branch is ${formatBranch(
      userBranchId,
    )}, so ${actionLabel} is locked.`;
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const res = await apiClient.getAccountingInvoices();
      setInvoices(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err.message || "Failed to load invoices.");
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

  const visibleInvoices = useMemo(() => {
    return filterItemsByBranchView(invoices, branchFilter, userBranchId);
  }, [invoices, branchFilter, userBranchId]);

  const activeInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => invoice.status !== "Cancelled");
  }, [visibleInvoices]);

  const pendingInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => invoice.status === "Pending");
  }, [visibleInvoices]);

  const paidInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => invoice.status === "Paid");
  }, [visibleInvoices]);

  const cancelledInvoices = useMemo(() => {
    return visibleInvoices.filter((invoice) => invoice.status === "Cancelled");
  }, [visibleInvoices]);

  const outstandingAmount = useMemo(() => {
    return pendingInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );
  }, [pendingInvoices]);

  const collectedAmount = useMemo(() => {
    return paidInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );
  }, [paidInvoices]);

  function openDetailsModal(invoice) {
    setSelectedDetailsInvoice(invoice);
    setDetailsModalOpen(true);
  }

  function closeDetailsModal() {
    setDetailsModalOpen(false);
    setSelectedDetailsInvoice(null);
  }

  function openActionModal(invoice, action) {
    if (!canActOnInvoice(invoice)) {
      setError(getBranchLockNote(invoice, "invoice status update"));
      return;
    }

    setSelectedInvoice(invoice);
    setSelectedAction(action);
    setModalError("");

    if (action === ACTION_MARK_PAID) {
      setActionNote(`Invoice ${invoice.invoice_id} marked as paid.`);
    } else if (action === ACTION_CANCEL) {
      setActionNote(`Invoice ${invoice.invoice_id} cancelled.`);
    } else {
      setActionNote("");
    }

    setConfirmModalOpen(true);
  }

  function closeActionModal() {
    if (updating) return;

    setConfirmModalOpen(false);
    setSelectedInvoice(null);
    setSelectedAction(null);
    setActionNote("");
    setModalError("");
  }

  async function handleConfirmAction() {
    if (!selectedInvoice || !selectedAction) return;

    if (!canActOnInvoice(selectedInvoice)) {
      setModalError(
        getBranchLockNote(selectedInvoice, "invoice status update"),
      );
      return;
    }

    setUpdating(true);
    setModalError("");

    try {
      const nextStatus =
        selectedAction === ACTION_MARK_PAID ? "Paid" : "Cancelled";

      await apiClient.updateInvoiceStatus(selectedInvoice.invoice_id, {
        status: nextStatus,
        notes: actionNote,
      });

      closeActionModal();
      closeDetailsModal();
      await loadData();
    } catch (err) {
      setModalError(err.message || "Failed to update invoice.");
    } finally {
      setUpdating(false);
    }
  }

  const modalTitle =
    selectedAction === ACTION_CANCEL
      ? "Cancel Invoice"
      : "Mark Invoice as Paid";

  const modalDescription =
    selectedAction === ACTION_CANCEL
      ? "Confirm that this pending invoice should be cancelled."
      : "Confirm that payment has been received for this invoice.";

  const confirmButtonLabel =
    selectedAction === ACTION_CANCEL
      ? updating
        ? "Cancelling..."
        : "Confirm Cancel"
      : updating
        ? "Updating..."
        : "Confirm Paid";

  const confirmButtonVariant =
    selectedAction === ACTION_CANCEL ? "danger" : "success";

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Invoices</h1>
          <p>
            Review generated invoices and update payment status for{" "}
            <strong>{branchLabel}</strong>. Click a row to view invoice details.
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
        </div>
      </header>

      {(isAdmin || isCloudMonitoring || isOtherBranchView) && (
        <section className="adminNotice">
          <strong>
            {isAdmin ? "Administrator Invoice View" : "Cloud-Synced Monitoring"}
          </strong>
          <span>
            {isAdmin
              ? "You can view and update invoice records across all branches."
              : isCloudMonitoring
                ? `You are viewing all cloud-synced invoice records. Paid and cancel actions remain locked to your assigned branch: ${formatBranch(
                    userBranchId,
                  )}.`
                : `You are viewing ${branchLabel} invoice records for monitoring. Paid and cancel actions remain locked to your assigned branch: ${formatBranch(
                    userBranchId,
                  )}.`}
          </span>
        </section>
      )}

      {loading && <Loader label="Loading invoices..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="summary">
            <SummaryItem
              label="Active Invoices"
              value={activeInvoices.length}
            />
            <SummaryItem label="Pending" value={pendingInvoices.length} />
            <SummaryItem label="Paid" value={paidInvoices.length} />
            <SummaryItem label="Cancelled" value={cancelledInvoices.length} />
            <SummaryItem
              label="Outstanding"
              value={formatCurrency(outstandingAmount)}
            />
            <SummaryItem
              label="Collected"
              value={formatCurrency(collectedAmount)}
            />
          </section>

          <Card
            title="Invoice Records"
            subtitle="Stored invoices from the accounting module."
          >
            {visibleInvoices.length === 0 ? (
              <EmptyState
                title="No invoices found"
                description="Created invoices will appear here."
              />
            ) : (
              <Table
                columns={INVOICE_COLUMNS}
                data={visibleInvoices}
                emptyText="No invoices found."
                density="comfortable"
                variant="minimal"
                className="invoiceTable"
                renderRow={(item) => (
                  <tr
                    key={item.invoice_id}
                    className="clickableRow"
                    onClick={() => openDetailsModal(item)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetailsModal(item);
                      }
                    }}
                  >
                    <td>{item.invoice_id}</td>
                    <td>{item.sample_id}</td>
                    <td>{item.client_name || "-"}</td>
                    <td>
                      {normalizeMaterialName(
                        item.material_type || item.ai_predicted_label,
                      )}
                    </td>
                    <td className="right">{formatCurrency(item.amount)}</td>
                    <td>
                      <InvoiceStatusBadge status={item.status} />
                    </td>
                    <td
                      className="right actionCell"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <InvoiceActions
                        invoice={item}
                        canAct={canActOnInvoice(item)}
                        onMarkPaid={() =>
                          openActionModal(item, ACTION_MARK_PAID)
                        }
                        onCancel={() => openActionModal(item, ACTION_CANCEL)}
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
        open={detailsModalOpen}
        title="Invoice Details"
        description="Invoice, sample, and payment information for review."
        onClose={closeDetailsModal}
        size="lg"
        footer={
          selectedDetailsInvoice?.status === "Pending" ? (
            canActOnInvoice(selectedDetailsInvoice) ? (
              <div className="detailsFooter">
                <Button
                  variant="success"
                  onClick={() =>
                    openActionModal(selectedDetailsInvoice, ACTION_MARK_PAID)
                  }
                >
                  Mark Paid
                </Button>

                <Button
                  variant="danger"
                  onClick={() =>
                    openActionModal(selectedDetailsInvoice, ACTION_CANCEL)
                  }
                >
                  Cancel Invoice
                </Button>
              </div>
            ) : (
              <div className="readOnlyFooter">
                {getBranchLockNote(
                  selectedDetailsInvoice,
                  "invoice status update",
                )}
              </div>
            )
          ) : null
        }
      >
        {selectedDetailsInvoice && (
          <InvoiceDetails invoice={selectedDetailsInvoice} />
        )}
      </Modal>

      <Modal
        open={confirmModalOpen}
        title={modalTitle}
        description={modalDescription}
        onClose={closeActionModal}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeActionModal}
              disabled={updating}
            >
              Close
            </Button>

            <Button
              variant={confirmButtonVariant}
              onClick={handleConfirmAction}
              disabled={updating}
            >
              {confirmButtonLabel}
            </Button>
          </>
        }
      >
        {selectedInvoice && (
          <div className="modalBody">
            {modalError && <div className="modalError">{modalError}</div>}

            <div className="invoiceDetails">
              <div>
                <span>Invoice ID</span>
                <strong>{selectedInvoice.invoice_id}</strong>
              </div>

              <div>
                <span>Sample ID</span>
                <strong>{selectedInvoice.sample_id}</strong>
              </div>

              <div>
                <span>Client</span>
                <strong>{selectedInvoice.client_name || "-"}</strong>
              </div>

              <div>
                <span>Branch</span>
                <strong>{formatBranch(selectedInvoice.branch_id)}</strong>
              </div>

              <div>
                <span>Amount</span>
                <strong>{formatCurrency(selectedInvoice.amount)}</strong>
              </div>
            </div>

            <Textarea
              label={
                selectedAction === ACTION_CANCEL
                  ? "Cancellation Note"
                  : "Payment Note"
              }
              name="actionNote"
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              rows={3}
              helperText={
                selectedAction === ACTION_CANCEL
                  ? "This note will be saved with the cancelled invoice."
                  : "This note will be saved in the invoice and sample payment history."
              }
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
          justify-content: space-between;
          align-items: flex-start;
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

        .adminNotice {
          display: grid;
          gap: 4px;
          border-radius: var(--radius-md);
          padding: 12px 14px;
          background: var(--color-info-bg);
          color: var(--color-info);
          border: 1px solid var(--color-info-border);
          font-size: var(--text-xs);
          line-height: 1.5;
        }

        .adminNotice strong {
          color: inherit;
          font-size: var(--text-xs);
          font-weight: 600;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid var(--color-border-soft);
          border-bottom: 1px solid var(--color-border-soft);
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 500;
        }

        .rowActions {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          white-space: nowrap;
        }

        .rowAction {
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
          cursor: pointer;
          white-space: nowrap;
          box-shadow: none;
          transition:
            background-color var(--transition-base),
            border-color var(--transition-base),
            color var(--transition-base);
        }

        .rowAction:hover {
          background: var(--color-overlay);
          border-color: var(--color-border);
          color: var(--color-brand);
          text-decoration: none;
        }

        .rowAction.danger {
          color: var(--color-danger);
          border-color: var(--color-danger-border);
          background: var(--color-surface);
        }

        .rowAction.danger:hover {
          background: var(--color-danger-bg);
          border-color: var(--color-danger-border);
          color: var(--color-danger);
          text-decoration: none;
        }

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

        .readOnlyFooter {
          max-width: 420px;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.45;
          text-align: left;
        }

        .mutedText {
          color: var(--color-text-muted);
          font-size: var(--text-xs);
          font-weight: 400;
        }

        .modalBody {
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

        .invoiceDetails {
          display: grid;
          gap: 9px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-overlay);
          padding: 13px;
        }

        .invoiceDetails div {
          display: grid;
          grid-template-columns: 90px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .invoiceDetails span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .invoiceDetails strong {
          color: var(--color-text-primary);
          font-size: var(--text-xs);
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .detailsFooter {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          width: 100%;
        }

        :global(.right) {
          text-align: right;
        }

        :global(.invoiceTable table) {
          min-width: 980px;
        }

        :global(.invoiceTable .clickableRow) {
          cursor: pointer;
          transition: background-color var(--transition-base);
        }

        :global(.invoiceTable .clickableRow:hover) {
          background: var(--color-overlay);
        }

        :global(.invoiceTable .clickableRow:focus-visible) {
          outline: 2px solid var(--color-brand);
          outline-offset: -2px;
          background: var(--color-overlay);
        }

        :global(.invoiceTable td.actionCell) {
          overflow: visible;
          text-overflow: unset;
          white-space: nowrap;
        }

        @media (max-width: 1080px) {
          .summary {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
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

          .summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .detailsFooter {
            flex-direction: column;
            align-items: stretch;
          }
        }

        @media (max-width: 520px) {
          .summary {
            grid-template-columns: 1fr;
          }

          .invoiceDetails div {
            grid-template-columns: 1fr;
            gap: 3px;
          }
        }
      `}</style>
    </div>
  );
}

function InvoiceActions({ invoice, canAct, onMarkPaid, onCancel }) {
  if (invoice.status !== "Pending") {
    return invoice.status === "Paid" ? (
      <span className="mutedText">Paid</span>
    ) : invoice.status === "Cancelled" ? (
      <span className="mutedText">Cancelled</span>
    ) : (
      <span className="mutedText">{invoice.status || "-"}</span>
    );
  }

  if (!canAct) {
    return <span className="readOnlyAction">Read-only</span>;
  }

  return (
    <div className="rowActions">
      <button type="button" className="rowAction" onClick={onMarkPaid}>
        Paid
      </button>

      <button type="button" className="rowAction danger" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="summaryItem">
      <span>{label}</span>
      <strong>{value}</strong>

      <style jsx>{`
        .summaryItem {
          display: grid;
          gap: 6px;
          min-width: 0;
          text-align: center;
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
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.25;
        }
      `}</style>
    </div>
  );
}

function InvoiceDetails({ invoice }) {
  return (
    <div className="details">
      <section className="detailGrid">
        <Detail label="Invoice ID" value={invoice.invoice_id} />
        <Detail label="Sample ID" value={invoice.sample_id} />
        <Detail label="Client" value={invoice.client_name} />
        <Detail
          label="Material"
          value={normalizeMaterialName(
            invoice.material_type || invoice.ai_predicted_label,
          )}
        />
        <Detail label="Branch" value={formatBranch(invoice.branch_id)} />
        <Detail label="Amount" value={formatCurrency(invoice.amount)} />
        <Detail label="Status" value={invoice.status} />
        <Detail
          label="Created By"
          value={
            invoice.created_by_name ||
            invoice.created_by_display ||
            invoice.created_by_full_name ||
            formatUser(invoice.created_by)
          }
        />
        <Detail label="Created At" value={formatDate(invoice.created_at)} />
        <Detail label="Updated At" value={formatDate(invoice.updated_at)} />
        <Detail label="Paid At" value={formatDate(invoice.paid_at)} />
        <Detail label="Sample State" value={invoice.current_state} />
        <Detail label="Notes" value={invoice.notes} wide />
      </section>

      <section className="sectionBox">
        <div className="sectionTitle">
          <h3>Invoice Status</h3>
          <InvoiceStatusBadge status={invoice.status} />
        </div>

        <p>
          Payment changes should be made carefully. Marking an invoice as paid
          will also update the linked sample payment metadata.
        </p>
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
          gap: 8px;
          padding: 14px;
          border: 1px solid var(--color-border-soft);
          border-radius: var(--radius-md);
          background: var(--color-surface);
        }

        .sectionTitle {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .sectionTitle h3 {
          margin: 0;
          color: var(--color-text-primary);
          font-size: var(--text-sm);
          font-weight: 600;
        }

        p {
          margin: 0;
          color: var(--color-text-secondary);
          font-size: var(--text-xs);
          line-height: 1.5;
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