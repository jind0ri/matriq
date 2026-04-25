"use client";

export default function Table({
  columns = [],
  data = [],
  emptyText = "No records found.",
  renderRow,
  className = "",
  density = "comfortable",
  variant = "default",
}) {
  return (
    <>
      <div className={["matriqTable", density, variant, className].join(" ")}>
        <div className="matriqTableWrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key || column.label}
                    className={column.align === "right" ? "right" : ""}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.length > 0 &&
                data.map((item, index) =>
                  renderRow ? (
                    renderRow(item, index)
                  ) : (
                    <tr key={item.id || item.sample_id || index}>
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={column.align === "right" ? "right" : ""}
                        >
                          {formatCellValue(item[column.key])}
                        </td>
                      ))}
                    </tr>
                  ),
                )}

              {data.length === 0 && (
                <tr>
                  <td className="emptyCell" colSpan={columns.length || 1}>
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .matriqTable {
          width: 100%;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xs);
          overflow: hidden;
        }

        .matriqTable.minimal {
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: none;
        }

        .matriqTableWrap {
          width: 100%;
          overflow-x: auto;
        }

        .matriqTableWrap::-webkit-scrollbar {
          height: 8px;
        }

        .matriqTableWrap::-webkit-scrollbar-track {
          background: var(--color-overlay);
        }

        .matriqTableWrap::-webkit-scrollbar-thumb {
          background: var(--color-border-strong);
          border-radius: var(--radius-full);
          border: 2px solid var(--color-overlay);
        }

        :global(.matriqTable table) {
          width: 100%;
          min-width: 760px;
          border-collapse: separate;
          border-spacing: 0;
          table-layout: fixed;
        }

        :global(.matriqTable th) {
          text-align: left;
          padding: 14px 18px;
          background: var(--color-overlay);
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid var(--color-border);
          white-space: nowrap;
        }

        :global(.matriqTable td) {
          padding: 17px 18px;
          border-bottom: 1px solid var(--color-border-soft);
          color: var(--color-text-primary);
          font-size: 12px;
          font-weight: 650;
          line-height: 1.45;
          vertical-align: middle;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        :global(.matriqTable.compact th) {
          padding: 11px 14px;
        }

        :global(.matriqTable.compact td) {
          padding: 12px 14px;
          font-size: 11px;
        }

        :global(.matriqTable.comfortable th) {
          padding: 14px 18px;
        }

        :global(.matriqTable.comfortable td) {
          padding: 17px 18px;
        }

        :global(.matriqTable.spacious th) {
          padding: 16px 20px;
        }

        :global(.matriqTable.spacious td) {
          padding: 21px 20px;
        }

        :global(.matriqTable tbody tr) {
          background: var(--color-surface);
          transition: background-color var(--transition-base);
        }

        :global(.matriqTable tbody tr:hover) {
          background: color-mix(
            in srgb,
            var(--color-overlay) 68%,
            var(--color-surface)
          );
        }

        :global(.matriqTable tbody tr:last-child td) {
          border-bottom: none;
        }

        :global(.matriqTable .right) {
          text-align: right;
        }

        :global(.matriqTable .emptyCell) {
          text-align: center;
          color: var(--color-text-secondary);
          padding: 36px 18px;
          font-size: var(--text-sm);
          font-weight: 750;
          white-space: normal;
        }

        :global(.matriqTable a) {
          color: var(--color-brand);
          font-weight: 850;
          text-decoration: none;
        }

        :global(.matriqTable a:hover) {
          color: var(--color-brand-dark);
          text-decoration: underline;
          transform: none;
        }

        :global(.matriqTable .badge),
        :global(.matriqTable [class*="badge"]) {
          vertical-align: middle;
        }

        @media (max-width: 760px) {
          :global(.matriqTable table) {
            min-width: 700px;
          }

          :global(.matriqTable th) {
            padding: 12px 14px;
          }

          :global(.matriqTable td) {
            padding: 14px;
          }
        }
      `}</style>
    </>
  );
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
