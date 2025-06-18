import NavButton from "../components/NavButton.jsx";
import { useCategories } from "../hooks/useCategories.jsx";
import { useMilestones, useCreateMilestone } from "../hooks/useMilestones.jsx";
import { useEffect, useState, useRef } from "react";
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
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { ScrollArea, ScrollBar } from "../components/ui/scroll-area";
import { Input } from "@/components/ui/input.jsx";
import { NumberInput } from "@/components/ui/number-input.jsx";
import SearachableDropdown from "../components/Dropdown.jsx";
import { Button } from "@/components/ui/button.jsx";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  p-10 pl-15 pr-15 sm:pt-12  text-white
  flex flex-col
`;

const Milestones = () => {
  const { data: categories, isLoading, error } = useCategories();
  const {
    data: milestones,
    isLoading: isMilestoneLoading,
    isError: isMilestoneError,
    error: milestoneError,
  } = useMilestones(null);

  const { mutate: addNewMilestone } = useCreateMilestone();
  const [globalFilter, setGlobalFilter] = useState("");
  const [isAddMilestoneOpen, setIsAddMilestoneOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    milestone: "",
    category: null,
    timeFrameWeeks: null,
    timeFrameMonths: null,
  });
  const columns = [
    {
      accessorKey: "milestone",
      header: "Milestone",
      className: "w-[200px] sm:min-w-[400px]",
    },
    {
      accessorKey: "minutes_invested",
      header: "Time Invested",
      className: "w-[100px]",
    },
    {
      accessorKey: "timeframe_weeks",
      header: "Timeframe Weeks",
      className: "w-[50px]",
    },
    {
      accessorKey: "category",
      header: "Category",
      className: "w-[50px]",
    },
  ];

  const handleCategory = (e) => {
    setNewMilestone((prevMilestone) => ({
      ...prevMilestone,
      category: e.label,
    }));
  };

  const submitAddMilestone = () => {
    if (typeof newMilestone.category === "string") {
      newMilestone.category = newMilestone.category.toLowerCase();
    }
    console.log("Create - new milestone", newMilestone);
    const payload = Object.fromEntries(
      Object.entries(newMilestone).filter(
        ([key, value]) => value !== null && value !== undefined
      )
    );
    addNewMilestone(payload);
    const nullifiedMilestone = Object.fromEntries(
      Object.keys(newMilestone).map((key) => [key, null])
    );
    setNewMilestone(nullifiedMilestone);
  };

  const table = useReactTable({
    data: milestones || [],
    columns,
    state: { globalFilter },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getColumnCanResize: () => true,
  });

  if (isLoading) {
    return (
      <div className={baseContainerClasses}>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    console.log("Error - Loading : ", error.message);
    return (
      <div className={baseContainerClasses}>
        <div>Error Loading</div>
      </div>
    );
  }

  return (
    <div className={baseContainerClasses}>
      <div className="flex flex-col text-white ">
        <div className="font-lexand text-xl mb-3">Milestones</div>
        {/* Searchable Milestones Table*/}
        <div className="font-lexand m-3 bg-coolgray rounded-lg p-3">
          {/* Search Input */}
          <div
            className="flex flex-row gap-2 items-center min-w-full max-w-sm
               rounded-md
               transition-all duration-200"
          >
            <MagnifyingGlassIcon className="w-6 h-6 text-gray-500" />
            <input
              placeholder="Search by name..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-gray-300 placeholder-gray-400"
            />
          </div>
          {/* Table Header & Rows Container */}
          <ScrollArea className="h-[100px] rounded-md w-full overflow-x-auto relative">
            <div className="overflow-x-scroll relative min-w-full">
              <Table className="min-w-full">
                {/* fix scroll sticky top-0 , doesnt work if overflow property set*/}
                <TableHeader className="bg-coolgray sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
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
                      <TableRow key={row.id}>
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

          <div
            className="mt-3 flex flex-row items-center gap-3 text-sm"
            onClick={() => setIsAddMilestoneOpen(!isAddMilestoneOpen)}
          >
            <PlusCircleIcon className="h-6 w-6 text-gray-400" />
            New Milestone
          </div>
          {isAddMilestoneOpen && (
            <div className="m-4 gap-2">
              <div className="flex flex-row gap-2 m-2">
                <Input
                  type="title"
                  className="rounded-md w-2/3"
                  placeholder="Milestone"
                  onChange={(e) =>
                    setNewMilestone((prevMilestone) => ({
                      ...prevMilestone,
                      milestone: e.target.value,
                    }))
                  }
                />
                <SearachableDropdown
                  values={categories.map((item) => ({
                    value: item.category_uid,
                    label: item.category,
                  }))}
                  placeholder="Optional: Category"
                  onSelect={handleCategory}
                />
              </div>
              <div className="flex w-full flex-row gap-2 m-2">
                <NumberInput
                  placeholder="Optional: weeks goal"
                  className="w-full rounded-md rounded-r-none"
                  onValueChange={(e) =>
                    setNewMilestone((prevMilestone) => ({
                      ...prevMilestone,
                      timeFrameWeeks: e,
                    }))
                  }
                />
                <NumberInput
                  placeholder="Optional: months goal"
                  className="w-full rounded-md rounded-r-none"
                  onValueChange={(e) =>
                    setNewMilestone((prevMilestone) => ({
                      ...prevMilestone,
                      timeFrameMonths: e,
                    }))
                  }
                />
                <Button
                  onClick={submitAddMilestone}
                  className="font-lexand font-light w-1/5 border-gray-400 border rounded-full"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* TODO: Bubble Stats: Time , Sessions */}
        {/* TODO: Little Chart - with forecasting */}
        {/* TODO: Sessions Logs */}
        {/* TODO: Saved Items */}

        <div className="fixed bottom-4 right-4 p-1 rounded-full ">
          <NavButton direction="up" />
        </div>
      </div>
    </div>
  );
};

export default Milestones;
