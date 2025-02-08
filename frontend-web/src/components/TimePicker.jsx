import { useState, useRef } from "react";

const TimePicker = ({ label, onTimeSelect, defaultTime }) => {
  const [selectedTime, setSelectedTime] = useState(defaultTime);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h % 12 === 0 ? 12 : h % 12;
      const minute = m === 0 ? "00" : m;
      const period = h < 12 ? "AM" : "PM";
      times.push(`${hour}:${minute} ${period}`);
    }
  }
  times.push(`11:59 PM`);

  const handleSelect = (time) => {
    setSelectedTime(time);
    setIsOpen(false);
    if (onTimeSelect) onTimeSelect(time);
  };

  return (
    <div className="relative w-40 mb-4">
      <label className="block text-gray-700 mb-2">{label}</label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border border-gray-300 rounded-lg text-left bg-white focus:outline-none"
      >
        {selectedTime}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          {times.map((time, index) => (
            <div
              key={index}
              className={`p-2 text-gray-700 cursor-pointer hover:bg-blue-100 ${
                selectedTime === time ? "bg-blue-200 font-semibold" : ""
              }`}
              onClick={() => handleSelect(time)}
            >
              {time}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimePicker;
