"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/services/apiClient";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import Modal from "@/components/ui/Modal";
import Table from "@/components/ui/Table";
import Textarea from "@/components/ui/Textarea";

const INVOICE_COLUMNS = [
  { key: "invoice_id", label: "Invoice ID" },
  { key: "sample_id", label: "Sample ID" },
  { key: "client_name", label: "Client" },
  { key: "material_type", label: "Material" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status" },
  { key: "action", label: "Action", align: "right" },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [modalError, setModalError] = useState("");

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

  const pendingInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "Pending");
  }, [invoices]);

  const paidInvoices = useMemo(() => {
    return invoices.filter((invoice) => invoice.status === "Paid");
  }, [invoices]);

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

  function openMarkPaidModal(invoice) {
    setSelectedInvoice(invoice);
    setPaymentNote(`Invoice ${invoice.invoice_id} marked as paid.`);
    setModalError("");
    setConfirmModalOpen(true);
  }

  function closeMarkPaidModal() {
    if (updating) return;

    setConfirmModalOpen(false);
    setSelectedInvoice(null);
    setPaymentNote("");
    setModalError("");
  }

  async function handleMarkPaid() {
    if (!selectedInvoice) return;

    setUpdating(true);
    setModalError("");

    try {
      await apiClient.updateInvoiceStatus(selectedInvoice.invoice_id, {
        status: "Paid",
        notes: paymentNote,
      });

      closeMarkPaidModal();
      await loadData();
    } catch (err) {
      setModalError(err.message || "Failed to mark invoice as paid.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Invoices</h1>
          <p>Review generated invoices and update payment status.</p>
        </div>

        <Button variant="secondary" size="sm" onClick={loadData}>
          Refresh
        </Button>
      </header>

      {loading && <Loader label="Loading invoices..." />}

      {!loading && error && (
        <Card>
          <div className="errorText">{error}</div>
        </Card>
      )}

      {!loading && !error && (
        <>
          <section className="summary">
            <div>
              <span>Total Invoices</span>
              <strong>{invoices.length}</strong>
            </div>

            <div>
              <span>Pending</span>
              <strong>{pendingInvoices.length}</strong>
            </div>

            <div>
              <span>Paid</span>
              <strong>{paidInvoices.length}</strong>
            </div>

            <div>
              <span>Outstanding</span>
              <strong>{formatCurrency(outstandingAmount)}</strong>
            </div>

            <div>
              <span>Collected</span>
              <strong>{formatCurrency(collectedAmount)}</strong>
            </div>
          </section>

          <Card
            title="Invoice Records"
            subtitle="Stored invoices from the accounting module."
          >
            {invoices.length === 0 ? (
              <EmptyState
                title="No invoices found"
                description="Created invoices will appear here."
              />
            ) : (
              <Table
                columns={INVOICE_COLUMNS}
                data={invoices}
                emptyText="No invoices found."
                density="comfortable"
                variant="minimal"
                renderRow={(item) => (
                  <tr key={item.invoice_id}>
                    <td>{item.invoice_id}</td>
                    <td>{item.sample_id}</td>
                    <td>{item.client_name || "-"}</td>
                    <td>{item.material_type || "-"}</td>
                    <td className="right">{formatCurrency(item.amount)}</td>
                    <td>
                      <InvoiceStatusBadge status={item.status} />
                    </td>
                    <td className="right">
                      {item.status === "Pending" ? (
                        <button
                          type="button"
                          className="rowAction"
                          onClick={() => openMarkPaidModal(item)}
                        >
                          Mark Paid
                        </button>
                      ) : item.status === "Paid" ? (
                        <span className="mutedText">Paid</span>
                      ) : (
                        <span className="mutedText">{item.status || "-"}</span>
                      )}
                    </td>
                  </tr>
                )}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        open={confirmModalOpen}
        title="Mark Invoice as Paid"
        description="Confirm that payment has been received for this invoice."
        onClose={closeMarkPaidModal}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={closeMarkPaidModal}
              disabled={updating}
            >
              Cancel
            </Button>

            <Button
              variant="success"
              onClick={handleMarkPaid}
              disabled={updating}
            >
              {updating ? "Updating..." : "Confirm Paid"}
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
                <span>Amount</span>
                <strong>{formatCurrency(selectedInvoice.amount)}</strong>
              </div>
            </div>

            <Textarea
              label="Payment Note"
              name="paymentNote"
              value={paymentNote}
              onChange={(event) => setPaymentNote(event.target.value)}
              rows={3}
              helperText="This note will be saved in the invoice and sample payment history."
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
          font-weight: 850;
          letter-spacing: -0.02em;
        }

        .header p {
          margin: 4px 0 0;
          color: var(--color-text-secondary);
          font-size: 11px;
          line-height: 1.45;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          padding: 14px 0;
          border-top: 1px solid var(--color-border-soft);
          border-bottom: 1px solid var(--color-border-soft);
        }

        .summary div {
          display: grid;
          gap: 6px;
          min-width: 0;
          text-align: center;
        }

        .summary span {
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .summary strong {
          color: var(--color-text-primary);
          font-size: 14px;
          font-weight: 850;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .errorText {
          color: var(--color-danger);
          font-size: var(--text-sm);
          font-weight: 800;
        }

        .rowAction {
          border: none;
          background: transparent;
          color: var(--color-brand);
          font-size: var(--text-xs);
          font-weight: 900;
          padding: 0;
          cursor: pointer;
          white-space: nowrap;
        }

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
          font-weight: 800;
          line-height: 1.45;
        }

        .invoiceDetails {
          display: grid;
          gap: 9px;
          border: 1px solid var(--color-border);
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
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .invoiceDetails strong {
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

        @media (max-width: 920px) {
          .summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .header {
            flex-direction: column;
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

function formatCurrency(value) {
  return `₱${Number(value || 0).toLocaleString()}`;
}