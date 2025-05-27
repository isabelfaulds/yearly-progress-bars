import { useState } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addDays } from "date-fns";

const CustomDayPicker = ({ onRangeChange, initialRange }) => {
  const [range, setRange] = useState(initialRange);
  const defaultClassNames = getDefaultClassNames();
  console.log("defaultclassnames", defaultClassNames);

  // Default 7 days before today
  const defaultSelected = {
    from: addDays(new Date(), -7),
    to: new Date(),
  };

  const selectedRange = range || defaultSelected;

  //  Date Selection Handler
  const handleRangeSelect = (newRange) => {
    setRange(newRange);
    if (onRangeChange) {
      onRangeChange(newRange); // parent update
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-lg shadow-lg flex flex-col items-center justify-center">
      <DayPicker
        animate
        mode="range"
        selected={selectedRange}
        onSelect={handleRangeSelect}
        captionLayout="dropdown"
        startMonth={new Date(2025, 0)}
        endMonth={new Date()}
        classNames={{
          today: "font-bold text-blue-400",
          day: "rdp-day hover:bg-blue-300 hover:rounded-full",
          selected: "hover:!rounded-none text-black",
          chevron: "fill-blue-400",
        }}
      />
    </div>
  );
};

export default CustomDayPicker;
