import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const getColumns = (categories = [], setInternalData) => {
  return [
    // Checkbox Column
    {
      id: "select", // column id
      header: ({ table }) => (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => {
              const checked = !!value;
              // Update internal state
              setInternalData((prev) =>
                prev.map((item) => ({
                  ...item,
                  selected: checked,
                }))
              );
              // Update table selection state
              table.toggleAllPageRowsSelected(checked);
            }}
            aria-label="Select all"
          />
          <span>Include</span>
        </div>
      ),
      cell: ({ row }) => {
        const handleCheckboxChange = (value) => {
          row.toggleSelected(!!value);
          setInternalData((prev) =>
            prev.map((item) =>
              item.calendarID === row.original.calendarID
                ? { ...item, selected: !!value }
                : item
            )
          );
        };

        return (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={handleCheckboxChange}
            aria-label="Select row"
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },

    // Name Column
    {
      accessorKey: "summary",
      header: "Calendar Name",
      cell: ({ row }) => (
        <div className="font-lexend items-cente max-w-[120px] sm:max-w-[225px] md:max-w-[400px] lg:md:max-w-[800px] break-words whitespace-normal">
          {row.original.summary}
        </div>
      ),
    },

    // Dropdown Column
    {
      id: "defaultCategory",
      header: "Default Category",
      cell: ({ row }) => {
        const calendarItem = row.original;
        const handleDropdownChange = (value) => {
          setInternalData((prev) =>
            prev.map((item) =>
              item.calendarID === row.original.calendarID
                ? { ...item, defaultCategory: value }
                : item
            )
          );
        };

        return (
          <div className="flex items-center justify-center">
            <Select onValueChange={handleDropdownChange}>
              <SelectTrigger className="w-[180px]  data-[placeholder]:text-gray-400">
                <SelectValue
                  placeholder={calendarItem.defaultCategory || "None set"}
                />
              </SelectTrigger>
              <SelectContent className="bg-slate-600 text-white">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <SelectItem
                      key={category.category_uid}
                      value={category.category || "Placeholder"}
                    >
                      {category.category || "Placeholder"}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    Loading categories...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
};
