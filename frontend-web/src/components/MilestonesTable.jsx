import { useMilestones, useDeleteMilestone } from "../hooks/useMilestones.jsx";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MilestoneTable = ({ categoryFilter, includesCategory }) => {
  const { data: milestones, isLoading, error } = useMilestones(null);

  const { mutate: deleteMilestone } = useDeleteMilestone();

  const [globalFilter, setGlobalFilter] = useState("");
  const columns = [
    {
      accessorKey: "milestone",
      header: "Milestone",
      className: "w-[200px] sm:min-w-[400px]",
    },
    ...(includesCategory
      ? [
          {
            accessorKey: "category",
            header: "Category",
            className: "w-[50px]",
          },
        ]
      : []),
    // TODO: add minutes invested agg to milestones table
    // {
    //   accessorKey: "minutes_invested",
    //   header: "Time Invested",
    //   className: "w-[100px]",
    // },
    {
      accessorKey: "target_date",
      header: "Target Date",
      className: "w-[50px]",
    },
    {
      accessorKey: "timeframe_weeks",
      header: "Timeframe Weeks",
      className: "w-[50px]",
    },
    {
      accessorKey: "created_timestamp",
      header: "Created Date",
      className: "w-[50px]",
    },
  ];

  const handleDelete = (e) => {
    deleteMilestone(e.milestone_user_datetime_uid);
    console.log("Milestone - deleted");
  };

  const filteredMilestones = (milestones || []).filter((milestone) => {
    // If categoryFilter is null, show all milestones
    if (categoryFilter === null) {
      return true;
    }
    return milestone.category?.toLowerCase() === categoryFilter.toLowerCase();
  });

  const table = useReactTable({
    data: filteredMilestones || [],
    columns,
    state: { globalFilter },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getColumnCanResize: () => true,
  });

  if (isLoading) {
    return (
      <div className="">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    console.log("Error - Loading : ", error.message);
    return (
      <div className="">
        <div>Error Loading</div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="flex flex-col text-white ">
        {/* Searchable Milestones Table*/}
        <div className="font-lexand bg-coolgray rounded-lg p-3">
          {/* Search Input */}
          <div
            className="flex flex-row gap-2 items-center min-w-full max-w-sm
               rounded-md
               transition-all duration-200 mb-1.5"
          >
            <MagnifyingGlassIcon className="w-6 h-6 text-gray-500" />
            <input
              placeholder="Search Milestones"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-gray-300 placeholder-gray-400"
            />
          </div>
          {/* Table Header & Rows Container */}
          <ScrollArea className="h-[150px] mb-2 rounded-md w-full overflow-x-auto relative">
            {/* overflow-x-auto causes bottom margin */}
            <div className="relative min-w-full">
              <Table className="min-w-full">
                {/* fix scroll sticky top-0 , doesnt work if overflow property set*/}
                <TableHeader className="bg-coolgray sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      <TableHead className="w-[1%] text-left"> </TableHead>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={`text-left px-4 py-2 bg-coolgray
                            ${header.column.columnDef.className || ""}`}
                          style={{
                            width: header.getSize(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>

                {/* Scrollable Body */}
                <TableBody className="min-w-full">
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        onClick={() => handleRowClick(row.original)}
                      >
                        {/* Edit  */}
                        <TableCell className="px-2 text-left w-[1%]">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <EllipsisVerticalIcon className="h-5 text-white" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              className="bg-slate-800 text-white"
                            >
                              {/* TODO: Edit */}
                              {/* <DropdownMenuItem>
                                <PencilIcon className="h-2 text-blue-50" />
                                Edit
                              </DropdownMenuItem> */}
                              <DropdownMenuItem
                                onClick={() => handleDelete(row.original)}
                              >
                                <TrashIcon className="h-2 text-blue-50" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        {/* Row Cells */}
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={`px-4 py-2 ${
                              cell.column.columnDef.className || ""
                            }`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
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
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default MilestoneTable;
