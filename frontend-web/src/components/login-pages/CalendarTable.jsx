import React, {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { getColumns } from "./columns";
import { Scroll } from "lucide-react";

const CalendarTable = forwardRef(({ data, categories }, ref) => {
  const [internalData, setInternalData] = useState(data || []);

  // Include fetched categories in table column component
  const columns = useMemo(
    () => getColumns(categories, setInternalData),
    [categories]
  );

  // Create table with columns
  const table = useReactTable({
    data: internalData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  // Get checkbox , dropdown column updates
  useEffect(() => {
    setInternalData(data || []);
  }, [data]);
  useImperativeHandle(ref, () => ({
    getCurrentState: () => internalData,
  }));

  return (
    <div className="rounded-md m-3 font-lex">
      <ScrollArea className="rounded-md w-full relative overflow-x-auto">
        <Table className="rounded-md min-w-[600px]">
          <TableHeader className="bg-slate-800 px-4">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : typeof header.column.columnDef.header === "function"
                      ? // Render header content , components
                        header.column.columnDef.header(header.getContext())
                      : header.column.columnDef.header}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id} // react table id
                  data-state={row.getIsSelected() && "selected"}
                  className="bg-coolgray"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {/* Render cell content , components */}
                      {cell.column.columnDef.cell(cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
});

export default CalendarTable;
