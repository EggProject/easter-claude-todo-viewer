/* global React, ReactDOM */
/*
 * EggProject · live-trading demo — recent trades table.
 * Powered by TanStack Table (@tanstack/react-table) — the mandatory table engine.
 * Renders the same .trades__table markup the demo's CSS targets, now sortable.
 */
const { useState } = React;
const { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } = window.ReactTable;

const TRADES = [
  { tone: 'success', anim: 'halo',   title: 'Filled',    sym: 'BTCUSDT',  side: 'Long',  size: 0.184, sizeTxt: '0.184', entry: 67920.10, entryTxt: '67,920.10', pnl: 72.40,  pnlTxt: '+$72.40', sign: 'pos', ts: '14:32:08' },
  { tone: 'info',    anim: 'pulse',  title: 'Open',      sym: 'ETHUSDT',  side: 'Long',  size: 2.40,  sizeTxt: '2.40',  entry: 3402.18,  entryTxt: '3,402.18',  pnl: 39.46,  pnlTxt: '+$39.46', sign: 'pos', ts: '14:28:14' },
  { tone: 'warning', anim: 'blink',  title: 'Pending',   sym: 'SOLUSDT',  side: 'Short', size: 12.0,  sizeTxt: '12.0',  entry: 183.50,   entryTxt: '183.50',    pnl: -17.52, pnlTxt: '−$17.52', sign: 'neg', ts: '14:24:02' },
  { tone: 'danger',  anim: 'hollow', title: 'Cancelled', sym: 'LINKUSDT', side: 'Long',  size: 120,   sizeTxt: '120',   entry: null,     entryTxt: '—',         pnl: null,   pnlTxt: '—',       sign: 'none', ts: '14:18:55' },
  { tone: 'success', anim: 'halo',   title: 'Filled',    sym: 'BTCUSDT',  side: 'Short', size: 0.080, sizeTxt: '0.080', entry: 68310.00, entryTxt: '68,310.00', pnl: 12.18,  pnlTxt: '+$12.18', sign: 'pos', ts: '14:11:42' },
];

const STATUS_RANK = { Filled: 0, Open: 1, Pending: 2, Cancelled: 3 };
const numericSort = (a, b, key) => {
  const aValue = a.original[key], bValue = b.original[key];
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;
  return aValue - bValue;
};

const SortCaret = ({ direction }) => (
  <svg className="trd-caret" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5 L6 2 L9 5" opacity={direction === 'asc' ? 1 : 0.3}/>
    <path d="M3 7 L6 10 L9 7" opacity={direction === 'desc' ? 1 : 0.3}/>
  </svg>
);

const columns = [
  { id: 'status', accessorFn: (row) => STATUS_RANK[row.title], header: 'Status',
    cell: ({ row }) => <span className={`ep-dot ep-dot--${row.original.tone} ep-dot--${row.original.anim}`} title={row.original.title}></span> },
  { accessorKey: 'sym', header: 'Symbol', meta: { className: 'sym' }, cell: ({ getValue }) => getValue() },
  { accessorKey: 'side', header: 'Side', cell: ({ getValue }) => getValue() },
  { id: 'size', accessorFn: (row) => row.size, header: 'Size', meta: { className: 'num' }, sortingFn: (a, b) => numericSort(a, b, 'size'),
    cell: ({ row }) => row.original.sizeTxt },
  { id: 'entry', accessorFn: (row) => row.entry, header: 'Entry', meta: { className: 'num' }, sortingFn: (a, b) => numericSort(a, b, 'entry'),
    cell: ({ row }) => row.original.entryTxt },
  { id: 'pnl', accessorFn: (row) => row.pnl, header: 'P&L', meta: { className: 'num' }, sortingFn: (a, b) => numericSort(a, b, 'pnl'),
    cell: ({ row }) => <span className={row.original.sign === 'pos' ? 'pos' : row.original.sign === 'neg' ? 'neg' : ''} style={row.original.sign === 'none' ? { color: 'var(--ep-fg-faint)' } : null}>{row.original.pnlTxt}</span> },
  { accessorKey: 'ts', header: 'Time', meta: { className: 'ts' }, cell: ({ getValue }) => getValue() },
];

function TradesTable() {
  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: TRADES, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  return (
    <table className="trades__table">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const column = header.column;
              const meta = column.columnDef.meta || {};
              const sorted = column.getIsSorted();
              return (
                <th key={header.id} className={meta.className === 'num' ? 'num' : undefined}
                    onClick={column.getToggleSortingHandler()}
                    style={{ cursor: 'pointer', userSelect: 'none' }}>
                  <span className={`trade-table-header ${meta.className === 'num' ? 'trade-table-header--right' : ''}`}>
                    {flexRender(column.columnDef.header, header.getContext())}
                    <SortCaret direction={sorted || null}/>
                  </span>
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta || {};
              return (
                <td key={cell.id} className={meta.className || undefined}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

ReactDOM.createRoot(document.getElementById('trades-table-mount')).render(<TradesTable/>);
