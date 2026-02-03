/**
 * SimpleDataTable Component
 * A simpler, reusable data table with sorting, filtering, and pagination
 * Easier to integrate than the full shadcn DataTable
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SearchIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
  /** Unique key for the column */
  id: string;
  /** Header text */
  header: string;
  /** Accessor function or key */
  accessor: keyof T | ((row: T) => React.ReactNode);
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Cell renderer */
  cell?: (value: unknown, row: T) => React.ReactNode;
  /** Column width */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

export interface SimpleDataTableProps<T extends Record<string, unknown>> {
  /** Data array */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Row key accessor */
  getRowKey?: (row: T, index: number) => string | number;
  /** Enable search */
  searchable?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Fields to search in */
  searchFields?: (keyof T)[];
  /** Enable pagination */
  paginated?: boolean;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Selected row IDs */
  selectedRows?: (string | number)[];
  /** Empty state message */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode */
  compact?: boolean;
}

export function SimpleDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  getRowKey = (_, index) => index,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchFields,
  paginated = true,
  pageSizeOptions = [10, 20, 50],
  defaultPageSize = 10,
  onRowClick,
  selectedRows = [],
  emptyMessage = 'No data to display',
  className,
  compact = false,
}: SimpleDataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Get value from row using accessor
  const getValue = (row: T, accessor: keyof T | ((row: T) => React.ReactNode)): unknown => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    const fieldsToSearch = searchFields || columns.map(c => 
      typeof c.accessor === 'string' ? c.accessor : c.id
    ) as (keyof T)[];

    return data.filter(row => {
      return fieldsToSearch.some(field => {
        const value = row[field];
        if (value == null) return false;
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchFields, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    const column = columns.find(c => c.id === sortColumn);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = getValue(a, column.accessor);
      const bVal = getValue(b, column.accessor);
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    const start = pageIndex * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pageIndex, pageSize, paginated]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort click
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      {searchable && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9"
            />
          </div>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              {sortedData.length} results
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width }}
                  className={cn(
                    column.sortable && 'cursor-pointer select-none hover:bg-muted',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    compact && 'py-2'
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortColumn === column.id && (
                      sortDirection === 'asc' 
                        ? <ArrowUpIcon className="size-3" />
                        : <ArrowDownIcon className="size-3" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const rowKey = getRowKey(row, index);
                const isSelected = selectedRows.includes(rowKey);
                
                return (
                  <TableRow
                    key={rowKey}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-primary/5'
                    )}
                    onClick={() => onRowClick?.(row)}
                    data-state={isSelected ? 'selected' : undefined}
                  >
                    {columns.map((column) => {
                      const value = getValue(row, column.accessor);
                      const rendered = column.cell 
                        ? column.cell(value, row)
                        : String(value ?? '');
                      
                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            compact && 'py-2'
                          )}
                        >
                          {rendered}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && sortedData.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
              >
                <ChevronsLeftIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex(prev => prev - 1)}
                disabled={pageIndex === 0}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <span className="px-2 text-muted-foreground">
                {pageIndex + 1} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex(prev => prev + 1)}
                disabled={pageIndex >= totalPages - 1}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => setPageIndex(totalPages - 1)}
                disabled={pageIndex >= totalPages - 1}
              >
                <ChevronsRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SimpleDataTable;
