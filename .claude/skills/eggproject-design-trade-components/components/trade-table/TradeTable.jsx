/* global React */
/*
 * EggProject · TradeTable — the specialised dark, live-stats blotter, powered by
 * TanStack Table (@tanstack/react-table v8) like every table in this system.
 * Sorting and multi-row selection run through `useReactTable`; the dark toolbar,
 * aggregate stats strip, sparklines and status pills are the EggProject visual layer
 * (the .tt-* classes in tradetable.css). window.ReactTable is loaded by the host HTML.
 */
const { useState, useMemo } = React;

/* ============ Icons ============ */
const SortIcon = ({ direction }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5 L6 2 L9 5"   opacity={direction === 'asc'  ? 1 : 0.3}/>
    <path d="M3 7 L6 10 L9 7"  opacity={direction === 'desc' ? 1 : 0.3}/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6 L4.5 8.5 L9 3"/>
  </svg>
);
const DashIcon = () => (
  <svg width="11" height="3" viewBox="0 0 11 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 1.5 L9 1.5"/>
  </svg>
);

/* ============ Sample trade data ============ */
const TRADES = [
  { id: 'T-10472', time: '14:32:18', symbol: 'AAPL',  name: 'Apple Inc.',          side: 'buy',  qty: 250,   price: 213.47, value: 53367.50,  change: +1.84,  pnl: +982.40,   status: 'filled',     trader: 'AK' },
  { id: 'T-10471', time: '14:31:54', symbol: 'NVDA',  name: 'NVIDIA Corp.',        side: 'buy',  qty: 80,    price: 1247.30, value: 99784.00, change: +3.62,  pnl: +3482.50,  status: 'filled',     trader: 'JS' },
  { id: 'T-10470', time: '14:28:12', symbol: 'TSLA',  name: 'Tesla, Inc.',         side: 'sell', qty: 120,   price: 318.92, value: 38270.40,  change: -2.18,  pnl: -854.20,   status: 'filled',     trader: 'BT' },
  { id: 'T-10469', time: '14:24:07', symbol: 'MSFT',  name: 'Microsoft Corp.',     side: 'buy',  qty: 400,   price: 472.18, value: 188872.00, change: +0.92,  pnl: +1728.00,  status: 'filled',     trader: 'AK' },
  { id: 'T-10468', time: '14:18:55', symbol: 'BTC-USD', name: 'Bitcoin',           side: 'buy',  qty: 0.85,  price: 94218.40, value: 80085.64, change: +5.41,  pnl: +4326.80,  status: 'filled',     trader: 'NK' },
  { id: 'T-10467', time: '14:12:33', symbol: 'AMZN',  name: 'Amazon.com, Inc.',    side: 'sell', qty: 175,   price: 198.62, value: 34758.50,  change: -0.74,  pnl: -257.20,   status: 'partial',    trader: 'JS' },
  { id: 'T-10466', time: '13:58:21', symbol: 'META',  name: 'Meta Platforms',      side: 'buy',  qty: 90,    price: 587.04, value: 52833.60,  change: +2.07,  pnl: +1094.30,  status: 'filled',     trader: 'BT' },
  { id: 'T-10465', time: '13:42:09', symbol: 'GOOGL', name: 'Alphabet Inc. (A)',   side: 'sell', qty: 220,   price: 184.55, value: 40601.00,  change: -1.32,  pnl: -536.80,   status: 'filled',     trader: 'AK' },
  { id: 'T-10464', time: '13:31:47', symbol: 'ETH-USD', name: 'Ethereum',          side: 'buy',  qty: 12.5,  price: 3284.10, value: 41051.25,  change: +4.18,  pnl: +1647.30,  status: 'pending',    trader: 'NK' },
  { id: 'T-10463', time: '13:18:02', symbol: 'AMD',   name: 'Advanced Micro Dev.', side: 'sell', qty: 600,   price: 142.78, value: 85668.00,  change: -3.04,  pnl: -2680.40,  status: 'rejected',   trader: 'JS' },
];

/* ============ Indeterminate checkbox ============ */
function Checkbox({ checked, indeterminate, onChange, label }) {
  const state = indeterminate ? 'partial' : checked ? 'on' : 'off';
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'on' ? 'true' : state === 'partial' ? 'mixed' : 'false'}
      aria-label={label}
      className={`data-table-checkbox data-table-checkbox--${state}`}
      onClick={(event) => { event.stopPropagation(); onChange(event); }}
    >
      {state === 'on' && <CheckIcon/>}
      {state === 'partial' && <DashIcon/>}
    </button>
  );
}

/* ============ Number formatting ============ */
const formatMoney = (value, decimalPlaces = 2) => value.toLocaleString('en-US', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
const formatQuantity = (value) => value < 10 ? value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '') : value.toLocaleString('en-US');
const formatSign = (value, decimalPlaces = 2) => (value > 0 ? '+' : '') + formatMoney(value, decimalPlaces);

/* ============ Sparkline ============ */
function MiniSpark({ trend }) {
  const points = trend === 'up'
    ? [10, 12, 9, 14, 11, 16, 15, 19, 17, 22]
    : trend === 'down'
    ? [22, 19, 21, 16, 18, 14, 15, 11, 13, 9]
    : [14, 13, 15, 12, 16, 13, 15, 12, 14, 13];
  const max = 24, min = 4;
  const pathData = points.map((y, i) => {
    const x = (i / (points.length - 1)) * 40;
    const pointY = 14 - ((y - min) / (max - min)) * 14;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${pointY.toFixed(1)}`;
  }).join(' ');
  const color = trend === 'up' ? 'var(--ep-success)' : trend === 'down' ? 'var(--ep-danger)' : 'var(--ep-fg-faint)';
  return (
    <svg width="40" height="14" viewBox="0 0 40 14" fill="none" style={{ flexShrink: 0 }}>
      <path d={pathData} stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ============ Cell renderers ============ */
function Cell({ type, row, value }) {
  if (type === 'symbol') {
    const trend = row.change > 0 ? 'up' : row.change < 0 ? 'down' : 'flat';
    return (
      <div className="trade-table-symbol">
        <div className="trade-table-symbol__main">
          <strong>{row.symbol}</strong>
          <span>{row.name}</span>
        </div>
        <MiniSpark trend={trend}/>
      </div>
    );
  }
  if (type === 'side')   return <span className={`trade-table-side trade-table-side--${value}`}>{value === 'buy' ? 'BUY' : 'SELL'}</span>;
  if (type === 'num')    return <span className="trade-table-mono">{formatQuantity(value)}</span>;
  if (type === 'price')  return <span className="trade-table-mono">{formatMoney(value, 2)}</span>;
  if (type === 'value')  return <span className="trade-table-mono trade-table-strong">${formatMoney(value, 2)}</span>;
  if (type === 'change') {
    const isPositive = value >= 0;
    return (
      <span className={`trade-table-change ${isPositive ? 'is-pos' : 'is-neg'}`}>
        <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor" style={{ marginRight: 4 }}>
          {isPositive ? <path d="M4.5 1 L8 6 L1 6 Z"/> : <path d="M4.5 8 L1 3 L8 3 Z"/>}
        </svg>
        <span className="trade-table-mono">{formatSign(value, 2)}%</span>
      </span>
    );
  }
  if (type === 'pnl') {
    const isPositive = value >= 0;
    return <span className={`trade-table-pnl trade-table-mono ${isPositive ? 'is-pos' : 'is-neg'}`}>{formatSign(value, 2)}</span>;
  }
  if (type === 'status') {
    return (
      <span className={`trade-table-status trade-table-status--${value}`}>
        <span className="trade-table-status__dot"/>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </span>
    );
  }
  return <span className="trade-table-mono">{value}</span>;
}

/* ============ TradeTable ============ */
function TradeTable() {
  const reactTableLib = window.ReactTable;
  const { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } = reactTableLib;

  const [sorting, setSorting] = useState([{ id: 'time', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});
  const [active, setActive] = useState(null);

  const columns = useMemo(() => [
    {
      id: 'select', size: 44, enableSorting: false,
      meta: { align: 'center', type: 'cb' },
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} label="Select all trades" />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} indeterminate={false} onChange={row.getToggleSelectedHandler()} label={`Select trade ${row.original.id} ${row.original.symbol}`} />
      ),
    },
    { accessorKey: 'id',     header: 'ID',     size: 92,  meta: { align: 'left',  type: 'mono' } },
    { accessorKey: 'time',   header: 'Time',   size: 78,  meta: { align: 'left',  type: 'mono' } },
    { accessorKey: 'symbol', header: 'Symbol', size: 200, meta: { align: 'left',  type: 'symbol' }, cell: ({ row }) => <Cell type="symbol" row={row.original}/> },
    { accessorKey: 'side',   header: 'Side',   size: 64,  meta: { align: 'left',  type: 'side' },   cell: ({ getValue }) => <Cell type="side" value={getValue()}/> },
    { accessorKey: 'qty',    header: 'Qty',    size: 80,  meta: { align: 'right', type: 'num' },    cell: ({ getValue }) => <Cell type="num" value={getValue()}/> },
    { accessorKey: 'price',  header: 'Price',  size: 100, meta: { align: 'right', type: 'price' },  cell: ({ getValue }) => <Cell type="price" value={getValue()}/> },
    { accessorKey: 'value',  header: 'Value',  size: 130, meta: { align: 'right', type: 'value', grow: true }, cell: ({ getValue }) => <Cell type="value" value={getValue()}/> },
    { accessorKey: 'change', header: 'Change', size: 100, meta: { align: 'right', type: 'change' }, cell: ({ getValue }) => <Cell type="change" value={getValue()}/> },
    { accessorKey: 'pnl',    header: 'P&L',    size: 110, meta: { align: 'right', type: 'pnl' },    cell: ({ getValue }) => <Cell type="pnl" value={getValue()}/> },
    { accessorKey: 'status', header: 'Status', size: 110, meta: { align: 'left',  type: 'status' }, cell: ({ getValue }) => <Cell type="status" value={getValue()}/> },
  ], []);

  const table = useReactTable({
    data: TRADES,
    columns,
    state: { sorting, rowSelection },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const allRows = table.getRowModel().rows;
  const scope = selectedCount > 0 ? selectedRows : allRows;
  const totalValue = scope.reduce((sum, row) => sum + row.original.value, 0);
  const totalPnl   = scope.reduce((sum, row) => sum + row.original.pnl,   0);
  const sortState  = sorting[0];

  return (
    <div className="trade-table-wrapper">
      {/* Header strip — title + live stats */}
      <div className="trade-table-toolbar">
        <div className="trade-table-toolbar__title">
          <h2>Trade blotter</h2>
          <span className="trade-table-toolbar__live"><span className="trade-table-toolbar__live-dot"/>Live · NYSE open · TanStack</span>
        </div>
        <div className="trade-table-stats">
          <div className="trade-table-stat">
            <span className="trade-table-stat__label">{selectedCount > 0 ? `${selectedCount} selected` : 'All trades'}</span>
            <span className="trade-table-stat__value">{scope.length}</span>
          </div>
          <div className="trade-table-stat">
            <span className="trade-table-stat__label">Notional</span>
            <span className="trade-table-stat__value trade-table-mono">${formatMoney(totalValue, 0)}</span>
          </div>
          <div className="trade-table-stat">
            <span className="trade-table-stat__label">Net P&amp;L</span>
            <span className={`trade-table-stat__value trade-table-mono ${totalPnl >= 0 ? 'is-pos' : 'is-neg'}`}>{formatSign(totalPnl, 2)}</span>
          </div>
          <div className="trade-table-stat-actions">
            {selectedCount > 0 ? (
              <>
                <button className="trade-table-button">Square off</button>
                <button className="trade-table-button trade-table-button--danger">Cancel</button>
                <button className="trade-table-button trade-table-button--ghost" onClick={() => table.resetRowSelection()}>Clear</button>
              </>
            ) : (
              <button className="trade-table-button trade-table-button--primary">+ New order</button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="trade-table-scroll">
      <div className="trade-table" role="table" aria-label="Recent trades" style={{ minWidth: table.getTotalSize() }}>
        <div role="rowgroup">
        {table.getHeaderGroups().map((headerGroup) => (
          <div className="trade-table__header" role="row" key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const column = header.column;
              const meta = column.columnDef.meta || {};
              const sorted = column.getIsSorted();
              const canSort = column.getCanSort();
              const toggleSorting = column.getToggleSortingHandler();
              const handleSortKeyDown = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleSorting?.(event);
                }
              };
              return (
                <div
                  key={header.id}
                  role="columnheader"
                  aria-sort={canSort ? (sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none') : undefined}
                  tabIndex={canSort ? 0 : undefined}
                  className={[
                    'trade-table__cell', `trade-table__cell--${meta.align || 'left'}`,
                    meta.type === 'cb' ? 'trade-table__cell--checkbox' : 'trade-table__cell--header',
                    canSort ? 'is-sortable' : '',
                    sorted ? 'is-sorted' : '',
                  ].join(' ')}
                  style={{ width: header.getSize(), flex: meta.grow ? '1 0 auto' : '0 0 auto' }}
                  onClick={toggleSorting}
                  onKeyDown={canSort ? handleSortKeyDown : undefined}
                >
                  {flexRender(column.columnDef.header, header.getContext())}
                  {canSort && <SortIcon direction={sorted || null}/>}
                </div>
              );
            })}
          </div>
        ))}
        </div>

        <div className="trade-table__body" role="rowgroup">
          {allRows.map((row) => (
            <div
              key={row.id}
              role="row"
              className={`trade-table__row ${row.getIsSelected() ? 'is-selected' : ''} ${active === row.id ? 'is-active' : ''}`}
              onClick={() => setActive(row.id)}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta || {};
                return (
                  <div
                    key={cell.id}
                    role="cell"
                    className={`trade-table__cell trade-table__cell--${meta.align || 'left'} ${meta.type === 'cb' ? 'trade-table__cell--checkbox' : `trade-table__cell--${meta.type}`}`}
                    style={{ width: cell.column.getSize(), flex: meta.grow ? '1 0 auto' : '0 0 auto' }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* Footer / event readout */}
      <div className="trade-table-footer">
        <span>
          {active
            ? <>Inspecting <code>{active}</code> · {TRADES.find((r) => r.id === active)?.symbol} · click another row to switch · use checkboxes to multi-select</>
            : sortState
              ? <>Showing {allRows.length} trades · sorted by <code>{sortState.id}</code> <code>{sortState.desc ? 'desc' : 'asc'}</code> via TanStack</>
              : <>Showing {allRows.length} trades · <code>unsorted</code> via TanStack</>}
        </span>
        <span className="trade-table-footer__page">1–{allRows.length} of {allRows.length}</span>
      </div>
    </div>
  );
}

Object.assign(window, { TradeTable });
