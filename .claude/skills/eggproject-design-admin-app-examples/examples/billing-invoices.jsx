/* global React, ReactDOM */
/*
 * EggProject · billing demo — invoice table.
 * Powered by TanStack Table (@tanstack/react-table) — the mandatory table engine.
 * Renders the same .inv-table markup the demo's CSS targets, now sortable.
 */
const { useState } = React;
const { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } = window.ReactTable;

const INVOICES = [
  { number: 'INV-2026-042', client: 'Lumenwerk',     tone: 'blue',   sub: 'Portal v2 · May retainer', dateMain: '15 May 2026', dateSub: 'due 29 May', dateVal: 20260515, status: 'sent',    statusLabel: 'Sent',    amount: 18400 },
  { number: 'INV-2026-041', client: 'Northbeam',     tone: 'yolk',   sub: 'Sales console · May retainer', dateMain: '14 May 2026', dateSub: 'due 28 May', dateVal: 20260514, status: 'sent',    statusLabel: 'Sent',    amount: 14000 },
  { number: 'INV-2026-038', client: 'Halifax & Co.', tone: 'ink',    sub: 'Migration · phase 3', dateMain: '18 Apr 2026', dateSub: 'due 2 May · 13d late', dateVal: 20260418, status: 'overdue', statusLabel: 'Overdue', amount: 10400, danger: true },
  { number: 'INV-2026-040', client: 'Aper',          tone: 'teal',   sub: 'Identity refresh · Spark', dateMain: '8 May 2026', dateSub: 'paid 12 May', dateVal: 20260508, status: 'paid',    statusLabel: 'Paid',    amount: 8400 },
  { number: 'INV-2026-039', client: 'Polyfold',      tone: 'violet', sub: 'Pilot project', dateMain: '4 May 2026', dateSub: 'paid 5 May', dateVal: 20260504, status: 'paid',    statusLabel: 'Paid',    amount: 2400 },
  { number: 'DRAFT-009',    client: 'Northbeam',     tone: 'slate',  sub: 'Audit · Spark', dateMain: '—', dateSub: 'not sent', dateVal: 0, status: 'draft',  statusLabel: 'Draft',   amount: 4800, draft: true },
];

const STATUS_RANK = { overdue: 0, sent: 1, draft: 2, paid: 3 };
const fmtEur = (number) => '€' + number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SortCaret = ({ direction }) => (
  <svg className="inv-caret" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5 L6 2 L9 5" opacity={direction === 'asc' ? 1 : 0.32}/>
    <path d="M3 7 L6 10 L9 7" opacity={direction === 'desc' ? 1 : 0.32}/>
  </svg>
);
const Kebab = () => (
  <button aria-label="Invoice actions"><svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="12.5" cy="8" r="1.5"/></svg></button>
);

const columns = [
  { accessorKey: 'number', header: 'Number', size: 110,
    cell: ({ row }) => <span className="invoice-number" style={row.original.danger ? { color: 'var(--ep-danger)' } : row.original.draft ? { color: 'var(--ep-fg-faint)' } : null}>{row.original.number}</span> },
  { accessorKey: 'client', header: 'Client',
    cell: ({ row }) => (
      <div className="inv-client">
        <span className={`avatar avatar--sm avatar--${row.original.tone}`}>{row.original.client.split(/[\s&]+/).filter(Boolean).slice(0,2).map(w => w[0]).join('').toUpperCase()}</span>
        <div><strong>{row.original.client}</strong><small>{row.original.sub}</small></div>
      </div>
    ) },
  { id: 'date', accessorFn: (record) => record.dateVal, header: 'Issued · due',
    cell: ({ row }) => (
      <div className="inv-date" style={row.original.danger ? { color: 'var(--ep-danger)' } : null}>
        {row.original.dateMain}<small style={row.original.danger ? { color: 'var(--ep-danger)' } : null}>{row.original.dateSub}</small>
      </div>
    ) },
  { accessorKey: 'status', header: 'Status', sortingFn: (a, b) => STATUS_RANK[a.original.status] - STATUS_RANK[b.original.status],
    cell: ({ row }) => <span className={`pill-status pill-status--${row.original.status}`}>{row.original.statusLabel}</span> },
  { accessorKey: 'amount', header: 'Amount', meta: { right: true },
    cell: ({ row }) => <span className="inv-amount" style={row.original.draft ? { color: 'var(--ep-fg-muted)' } : null}>{fmtEur(row.original.amount)}</span> },
  { id: 'actions', header: '', enableSorting: false, cell: () => <span className="inv-actions"><Kebab/></span> },
];

function InvoiceTable() {
  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: INVOICES, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  return (
    <table className="inv-table">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const column = header.column;
              const right = column.columnDef.meta && column.columnDef.meta.right;
              const sorted = column.getIsSorted();
              return (
                <th key={header.id}
                    style={{ width: column.id === 'number' ? 110 : undefined, textAlign: right ? 'right' : undefined, cursor: column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                    onClick={column.getToggleSortingHandler()}>
                  <span className={`invoice-table-header ${right ? 'invoice-table-header--right' : ''}`}>
                    {flexRender(column.columnDef.header, header.getContext())}
                    {column.getCanSort() && <SortCaret direction={sorted || null}/>}
                  </span>
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} style={row.original.danger ? { background: 'var(--ep-danger-bg)' } : null}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

ReactDOM.createRoot(document.getElementById('inv-table-mount')).render(<InvoiceTable/>);
