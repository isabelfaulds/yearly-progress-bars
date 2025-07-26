import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { useState } from "react";
import { NumberInput } from "../ui/number-input";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/useCategories.jsx";

const CreateAccountStep1 = ({ onNext }) => {
  const { refetch: categoriesRefetch } = useCategories();

  const handleSave = () => {
    postCategories();
    onNext();
  };
  const [categories, setNewCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({
    category: "",
    hours: null,
    minutes: null,
  });

  const columns = [
    { accessorKey: "category", header: "Category" },
    { accessorKey: "hours", header: "Hours" },
    { accessorKey: "remainderMinutes", header: "Minutes" },
  ];
  const table = useReactTable({
    data: categories || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getColumnCanResize: () => true,
  });

  const handleCategoryAdd = () => {
    if (newCategory.category != "") {
      const totalMinutes = Math.min(
        Number(newCategory.hours || 0) * 60 + Number(newCategory.minutes || 0),
        24 * 60
      );

      const totalHours = Math.floor(totalMinutes / 60);
      const remainderMinutes = totalMinutes % 60;

      // new category replaces prev, case insensitive, category
      setNewCategories((prevCategories) => {
        const filtered = prevCategories.filter(
          (cat) =>
            cat.category.toLowerCase() !== newCategory.category.toLowerCase()
        );

        return [
          ...filtered,
          {
            category: newCategory.category,
            hours: totalHours === 0 ? null : totalHours,
            minutes: totalMinutes === 0 ? null : totalMinutes,
            remainderMinutes: remainderMinutes === 0 ? null : remainderMinutes,
          },
        ];
      });
      setNewCategory({
        category: "",
        hours: "",
        minutes: "",
      });
    }
  };

  async function postCategories() {
    try {
      const payload = { add: [] };
      categories.forEach((cat) => {
        payload.add.push({
          category: cat.category.toLowerCase(),
          minutes: cat.minutes,
        });
      });
      if (payload.add.length > 0) {
        const categoryResponse = await fetch(
          import.meta.env.VITE_CLOUDFRONT_CATEGORIES,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );
        if (categoryResponse.status === 200) {
          console.log("Updated - Categories");
          await categoriesRefetch();
        }
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  return (
    <div className="initial-container">
      <div className="mb-10">
        <div className="text-xl mb-4">Define some initial categories</div>
        <div className="text-[14px]">Make changes later in Settings</div>
      </div>

      <div className="flex flex-col gap-1">
        <div>
          <div className="text-left mb-1 text-[15px]">Category</div>
          <Input
            type="title"
            value={newCategory.category}
            className="rounded-md mb-4"
            placeholder="Category"
            onChange={(e) =>
              setNewCategory((prevCategory) => ({
                ...prevCategory,
                category: e.target.value,
              }))
            }
          />
          <div className="text-[14px]">Can be generic or specific</div>
        </div>
        <div>
          <div className="mt-4 text-left mb-1 text-[15px]">
            {" "}
            Ideal Daily Amount{" "}
          </div>
          <div className="flex flex-row gap-3 m-3">
            <NumberInput
              placeholder="Hours"
              value={newCategory.hours}
              max={24}
              onValueChange={(val) =>
                setNewCategory((prev) => ({
                  ...prev,
                  hours: val,
                }))
              }
            />
            <NumberInput
              placeholder="Minutes"
              value={newCategory.minutes}
              // max={60}
              onValueChange={(val) =>
                setNewCategory((prev) => ({
                  ...prev,
                  minutes: val,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCategoryAdd();
                }
              }}
            />
            <Button
              onClick={handleCategoryAdd}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCategoryAdd();
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>
        {/* TODO: Frequency */}
      </div>
      <div className="mt-6 table-container">
        <Table>
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
                ></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="m-3 flex flex-col gap-3 mx-auto">
        <Button onClick={handleSave} className="mx-auto p-2 max-w-1/3">
          Save & Continue
        </Button>
      </div>
    </div>
  );
};

export default CreateAccountStep1;
