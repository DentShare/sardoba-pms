import { render, screen, fireEvent } from '@testing-library/react';
import { Table, type Column } from './Table';

interface TestItem {
  id: number;
  name: string;
  email: string;
}

const testColumns: Column<TestItem>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (item) => item.name,
  },
  {
    key: 'email',
    header: 'Email',
    render: (item) => item.email,
  },
];

const testData: TestItem[] = [
  { id: 1, name: 'Alice', email: 'alice@test.com' },
  { id: 2, name: 'Bob', email: 'bob@test.com' },
  { id: 3, name: 'Charlie', email: 'charlie@test.com' },
];

describe('Table', () => {
  // ─── Headers and rows ─────────────────────────────────────────────────

  it('renders column headers', () => {
    render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
      />,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders all data rows', () => {
    render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
      />,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@test.com')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('bob@test.com')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('charlie@test.com')).toBeInTheDocument();
  });

  it('renders the correct number of rows', () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
      />,
    );

    // Header row + 3 data rows
    const rows = container.querySelectorAll('tr');
    expect(rows).toHaveLength(4);
  });

  // ─── Empty state ──────────────────────────────────────────────────────

  it('shows default empty message when data is empty', () => {
    render(
      <Table
        columns={testColumns}
        data={[]}
        rowKey={(item) => item.id}
      />,
    );

    expect(screen.getByText('Нет данных')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(
      <Table
        columns={testColumns}
        data={[]}
        rowKey={(item) => item.id}
        emptyMessage="No guests found"
      />,
    );

    expect(screen.getByText('No guests found')).toBeInTheDocument();
  });

  it('renders empty state with correct colspan', () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={[]}
        rowKey={(item) => item.id}
      />,
    );

    const emptyCell = container.querySelector('td[colspan]');
    expect(emptyCell).toHaveAttribute('colspan', '2');
  });

  // ─── Row click ────────────────────────────────────────────────────────

  it('calls onRowClick when a row is clicked', () => {
    const handleRowClick = jest.fn();
    render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
        onRowClick={handleRowClick}
      />,
    );

    fireEvent.click(screen.getByText('Alice'));
    expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
  });

  it('applies cursor-pointer class when onRowClick is provided', () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
        onRowClick={jest.fn()}
      />,
    );

    const dataRows = container.querySelectorAll('tbody tr');
    dataRows.forEach((row) => {
      expect(row.className).toContain('cursor-pointer');
    });
  });

  // ─── Loading state ────────────────────────────────────────────────────

  it('shows skeleton rows when loading', () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={[]}
        rowKey={(item) => item.id}
        isLoading={true}
        skeletonRows={3}
      />,
    );

    const skeletonRows = container.querySelectorAll('tr.animate-pulse');
    expect(skeletonRows).toHaveLength(3);
  });

  it('shows 5 skeleton rows by default when loading', () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={[]}
        rowKey={(item) => item.id}
        isLoading={true}
      />,
    );

    const skeletonRows = container.querySelectorAll('tr.animate-pulse');
    expect(skeletonRows).toHaveLength(5);
  });

  it('does not show data rows when loading', () => {
    render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
        isLoading={true}
      />,
    );

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  // ─── Sorting ──────────────────────────────────────────────────────────

  it('calls onSort when a sortable column header is clicked', () => {
    const handleSort = jest.fn();
    const sortableColumns: Column<TestItem>[] = [
      { ...testColumns[0], sortable: true },
      testColumns[1],
    ];

    render(
      <Table
        columns={sortableColumns}
        data={testData}
        rowKey={(item) => item.id}
        onSort={handleSort}
        sortConfig={null}
      />,
    );

    fireEvent.click(screen.getByText('Name'));
    expect(handleSort).toHaveBeenCalledWith('name');
  });

  it('does not call onSort when a non-sortable column header is clicked', () => {
    const handleSort = jest.fn();
    const sortableColumns: Column<TestItem>[] = [
      { ...testColumns[0], sortable: true },
      testColumns[1], // not sortable
    ];

    render(
      <Table
        columns={sortableColumns}
        data={testData}
        rowKey={(item) => item.id}
        onSort={handleSort}
        sortConfig={null}
      />,
    );

    fireEvent.click(screen.getByText('Email'));
    expect(handleSort).not.toHaveBeenCalled();
  });

  // ─── Custom className ─────────────────────────────────────────────────

  it('applies custom className to container', () => {
    const { container } = render(
      <Table
        columns={testColumns}
        data={testData}
        rowKey={(item) => item.id}
        className="custom-table"
      />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-table');
  });
});
