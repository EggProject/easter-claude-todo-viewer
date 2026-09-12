/* global React, ReactDOM */
/*
 * EggProject · settings demo — team members table.
 * Powered by TanStack Table (@tanstack/react-table) — the mandatory table engine.
 * Renders the same .members markup the demo's CSS targets, now sortable.
 */
const { useState } = React;
const { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } = window.ReactTable;

const MEMBERS = [
  { name: 'Anna Kovács · you', initials: 'AK', tone: 'blue',   email: 'anna@northbeam.co', roleType: 'admin',    role: 'Admin',    joined: 'Jan 2021', joinedVal: 202101, action: 'menu' },
  { name: 'Márton Kovács',     initials: 'MK', tone: 'ink',    email: 'marton@egg.dev',    roleType: 'select',   role: 'Engineer', joined: 'Mar 2021', joinedVal: 202103, action: 'menu' },
  { name: 'Petra Dóra',        initials: 'PD', tone: 'yolk',   email: 'petra@egg.dev',     roleType: 'select',   role: 'Designer', joined: 'Jun 2022', joinedVal: 202206, action: 'menu' },
  { name: 'Tomáš Surányi',     initials: 'TS', tone: 'violet', email: 'tomas@egg.dev · invited 4 days ago', roleType: 'invited', role: 'Invited', joined: '—', joinedVal: 0, action: 'resend' },
];

const SortCaret = ({ direction }) => (
  <svg className="mem-caret" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 5 L6 2 L9 5" opacity={direction === 'asc' ? 1 : 0.32}/>
    <path d="M3 7 L6 10 L9 7" opacity={direction === 'desc' ? 1 : 0.32}/>
  </svg>
);

const RoleCell = ({ row }) => {
  const record = row.original;
  if (record.roleType === 'admin')   return <span className="badge badge--ink">{record.role}</span>;
  if (record.roleType === 'invited') return <span className="badge badge--warning"><span className="badge__dot"></span>{record.role}</span>;
  return (
    <button className="role-btn">{record.role}
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4"/></svg>
    </button>
  );
};

const columns = [
  { accessorKey: 'name', header: 'Person',
    cell: ({ row }) => (
      <div className="member">
        <span className={`avatar avatar--md avatar--${row.original.tone}`}>{row.original.initials}</span>
        <div><strong>{row.original.name}</strong><small>{row.original.email}</small></div>
      </div>
    ) },
  { accessorKey: 'role', header: 'Role', cell: ({ row }) => <RoleCell row={row}/> },
  { id: 'joined', accessorFn: (record) => record.joinedVal, header: 'Joined',
    cell: ({ row }) => <span className="design-mark-meta" style={{ textTransform: 'none', letterSpacing: 0 }}>{row.original.joined}</span> },
  { id: 'actions', header: '', enableSorting: false,
    cell: ({ row }) => row.original.action === 'resend'
      ? <button className="btn btn--ghost btn--sm">Resend</button>
      : <button className="btn btn--ghost btn--sm">⋯</button> },
];

function MembersTable() {
  const [sorting, setSorting] = useState([]);
  const table = useReactTable({
    data: MEMBERS, columns,
    state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });
  return (
    <table className="members">
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const column = header.column;
              const sorted = column.getIsSorted();
              return (
                <th key={header.id} onClick={column.getToggleSortingHandler()}
                    style={{ cursor: column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}>
                  <span className="mem-th">
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

ReactDOM.createRoot(document.getElementById('members-table-mount')).render(<MembersTable/>);
