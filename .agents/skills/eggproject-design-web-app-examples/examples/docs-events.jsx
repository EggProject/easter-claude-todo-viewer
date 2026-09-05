/* global React, ReactDOM */
/*
 * EggProject · docs demo — webhook events table.
 * Powered by TanStack Table (@tanstack/react-table) — the mandatory table engine.
 * Renders the same .param-table markup the demo's CSS targets, now sortable.
 */
const { useState } = React;
const { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } = window.ReactTable;

const EVENTS = [
  { event: 'project.created', since: 'v1.0', sinceVal: 1.0,
    fires: () => <>A new project is opened in the portal.<span className="type" style={{ display: 'block' }}>Includes engagement type &amp; team.</span></> },
  { event: 'project.updated', since: 'v1.0', sinceVal: 1.0,
    fires: () => <>Scope, dates, or team membership changes.</> },
  { event: 'invoice.sent', since: 'v1.0', sinceVal: 1.0,
    fires: () => <>An invoice transitions from <code className="code-inline">draft</code> → <code className="code-inline">sent</code>.</> },
  { event: 'invoice.paid', since: 'v1.2', sinceVal: 1.2,
    fires: () => <>Payment is confirmed by the payment processor.</> },
  { event: 'comment.created', since: 'v2.0', sinceVal: 2.0,
    fires: () => <>Any project comment, including mentions.</> },
  { event: 'member.invited', since: 'v2.4', sinceVal: 2.4, isNew: true,
    fires: () => <>A new team member is invited to the workspace.</> },
];

const SortCaret = ({ direction }) => (
  <svg className="portal-caret" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5 L6 2 L9 5" opacity={direction === 'asc' ? 1 : 0.32}/>
    <path d="M3 7 L6 10 L9 7" opacity={direction === 'desc' ? 1 : 0.32}/>
  </svg>
);

const columns = [
  { accessorKey: 'event', header: 'Event', cell: ({ getValue }) => getValue() },
  { id: 'fires', header: 'Fires when', enableSorting: false, cell: ({ row }) => row.original.fires() },
  { id: 'since', accessorFn: (record) => record.sinceVal, header: 'Stable since',
    cell: ({ row }) => (
      <>{row.original.since}{row.original.isNew && <span className="badge badge--yolk" style={{ marginLeft: 4, fontSize: 10 }}>new</span>}</>
    ) },
];

function EventsTable() {
  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: EVENTS, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  return (
    <table className="param-table">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const column = header.column;
              const sorted = column.getIsSorted();
              return (
                <th key={header.id} onClick={column.getToggleSortingHandler()}
                    style={{ cursor: column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}>
                  <span className="props-table-header">
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
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

ReactDOM.createRoot(document.getElementById('param-table-mount')).render(<EventsTable/>);
