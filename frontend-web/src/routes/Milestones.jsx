import NavButton from "../components/NavButton.jsx";
import { useCategories } from "../hooks/useCategories.jsx";
import { useMilestones, useCreateMilestone } from "../hooks/useMilestones.jsx";
import { useMilestoneSessions } from "@/hooks/useMilestoneSession.jsx";
import { useEffect, useState, useRef, useMemo } from "react";
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
  p-10 md:pl-15 md:pr-15 sm:pt-12  text-white
  flex flex-col
`;

const Milestones = () => {
  const { data: categories, isLoading, error } = useCategories();
  const { data: milestones } = useMilestones(null);
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

  // Selected Milestone Stats
  const [selectedMilestoneID, setSelectedMilestoneID] = useState(null);
  const { data: milestoneSessions, isLoading: milestoneSessionsLoading } =
    useMilestoneSessions(selectedMilestoneID);
  const [numberSessions, setNumberSessions] = useState("");
  const [totalHours, setTotalHours] = useState(0);
  const [remainderMinutes, setReaminderMinutes] = useState(0);
  const [selectedMilestone, setSelectedMilestone] = useState("");

  const handleRowClick = (rowData) => {
    setSelectedMilestone(rowData);
    setSelectedMilestoneID(rowData.milestone_user_datetime_uid);
  };

  // Sessions
  const selectedSessions = useMemo(() => {
    if (!milestoneSessions || !selectedMilestoneID) {
      return []; // no data, nothing selected
    }
    var selectedSessions = milestoneSessions.filter(
      (session) => session.milestone_user_datetime_uid === selectedMilestoneID
    );
    // setNumberSessions(String(selectedSessions.length));
    // const totalMinutes = milestoneSessions
    //   .filter(
    //     (session) => session.milestone_user_datetime_uid === selectedMilestoneID
    //   )
    //   .reduce((sum, currentItem) => {
    //     // Add the 'minutes' from the current item to the running sum
    //     return sum + currentItem.minutes;
    //   }, 0);
    // setTotalHours(Math.floor(totalMinutes / 60));
    // setReaminderMinutes(totalMinutes % 60);
    return selectedSessions;
  }, [milestoneSessions, selectedMilestoneID]);

  const milestoneMinutes = useMemo(() => {
    return selectedSessions.reduce((sum, currentItem) => {
      return sum + currentItem.minutes;
    }, 0);
  }, [selectedSessions]);
  const milestoneNumberSessions = selectedSessions.length;
  const milestoneHours = Math.floor(milestoneMinutes / 60);
  const milestoneMinutesRemainder = milestoneMinutes % 60;

  // Adding new one
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
        <div className="font-lexand text-xl mb-10">Milestones</div>
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
          <ScrollArea className="h-[150px] rounded-md w-full overflow-x-auto relative">
            {/* overflow-x-auto causes bottom margin */}
            <div className="relative min-w-full">
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
                      <TableRow
                        key={row.id}
                        onClick={() => handleRowClick(row.original)}
                      >
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
        <div className="mt-5 flex flex-row gap-5 md:gap-30 justify-center items-center w-full md:pl-10 md:pr-10 mb-3">
          <div className="bg-coolgray rounded-full flex flex-col justify-center font-lexend md:min-w-40 md:min-h-24 p-4 md:p-6">
            <span className="font-extralight text-sm md:text-lg">
              Total Time
            </span>
            <span className="md:text-2xl">
              {milestoneHours > 0 && <span>{milestoneHours} hrs</span>}
              {milestoneHours > 0 && milestoneMinutesRemainder > 0 && (
                <span> </span>
              )}
              {milestoneMinutesRemainder > 0 && (
                <span>{milestoneMinutesRemainder} min</span>
              )}
            </span>
          </div>
          <div className="font-lexend md:text-2xl mb-2">
            {selectedMilestone !== "" && selectedMilestone.milestone}{" "}
          </div>
          <div className="bg-coolgray rounded-full flex flex-col justify-center font-lexend md:min-w-40 md:min-h-24 p-4 md:p-6">
            <span className="font-extralight text-sm md:text-lg">
              Number Sessions{" "}
            </span>
            <span className="md:text-2xl">
              {milestoneNumberSessions != 0 && milestoneNumberSessions}
            </span>
          </div>
        </div>
        {/* TODO: Little Chart - with forecasting */}
        {/* Sessions Log */}
        <div className="flex flex-col mt-6 md:ml-10 md:mr-10 bg-coolgray rounded-lg gap-1">
          <div className="rounded-lg pt-3 text-lg">
            <span className="border-b border-gray-400 pb-1 "> Sessions</span>
          </div>
          <div className=" pt-2 pb-4 pr-4 pl-4 text-sm">
            {selectedSessions ? (
              selectedSessions.map((item) => (
                <div className="pb-3">
                  {item.event_startdate} - {item.event_name} - {item.minutes}{" "}
                  min
                </div>
              ))
            ) : (
              <div className=""></div>
            )}
          </div>
        </div>
        {/* TODO: Saved Items */}

        <div className="fixed bottom-4 right-4 p-1 rounded-full ">
          <NavButton direction="up" />
        </div>
      </div>
    </div>
  );
};

export default Milestones;
