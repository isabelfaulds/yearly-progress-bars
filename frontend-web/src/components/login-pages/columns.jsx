import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const getColumns = (
  categories = [],
  setInternalData,
  { nameKey = "summary", nameHeader = "Name", idKey = "id" } = {}
) => {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => {
              const checked = !!value;
              setInternalData((prev) =>
                prev.map((item) => ({
                  ...item,
                  selected: checked,
                }))
              );
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
              item[idKey] === row.original[idKey]
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

    {
      accessorKey: nameKey,
      header: nameHeader,
      cell: ({ row }) => (
        <div className="font-lexend items-center max-w-[120px] sm:max-w-[225px] md:max-w-[400px] lg:max-w-[800px] break-words whitespace-normal">
          {row.original[nameKey]}
        </div>
      ),
    },

    {
      id: "defaultCategory",
      header: "Default Category",
      cell: ({ row }) => {
        const item = row.original;
        const handleDropdownChange = (value) => {
          setInternalData((prev) =>
            prev.map((i) =>
              i[idKey] === item[idKey] ? { ...i, defaultCategory: value } : i
            )
          );
        };

        return (
          <div className="flex items-center justify-center">
            <Select onValueChange={handleDropdownChange}>
              <SelectTrigger className="w-[180px] data-[placeholder]:text-gray-400">
                <SelectValue placeholder={item.defaultCategory || "None set"} />
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
