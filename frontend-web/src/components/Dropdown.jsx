import React, { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input.jsx";

const SearachableDropdown = ({ values, placeholder = "", onSelect }) => {
  // Update Category key navigation
  const [editedText, setEditedText] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredValues, setFilteredValues] = useState(values);
  const [open, setOpen] = useState(false);

  const handleOptionSelection = useCallback(
    (selectedOption) => {
      setEditedText(selectedOption.label);
      setOpen(false);
      setHighlightedIndex(-1);
      setFilteredValues(values);
      if (onSelect) {
        onSelect(selectedOption); // Notify parent, pass obj
      }
    },
    [onSelect, values]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      // On enter select highlighted or first
      if (highlightedIndex >= 0 && filteredValues.length > highlightedIndex) {
        setEditedText(filteredValues[highlightedIndex].label);
        handleOptionSelection(filteredValues[highlightedIndex]);
      } else if (filteredValues.length > 0) {
        setEditedText(filteredValues[0].label);
        handleOptionSelection(filteredValues[0]);
      } else {
        // On enter and no options, exit
        handleBlur();
      }
      setHighlightedIndex(-1);
      setOpen(false);
    } else if (e.key === "Escape") {
      // exit
      setFilteredValues(values);
      setHighlightedIndex(-1);
      setOpen(!open);
    } else if (e.key === "ArrowDown") {
      // navigate down
      setHighlightedIndex((prevIndex) =>
        prevIndex < filteredValues.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === "ArrowUp") {
      // navigate up
      setHighlightedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : -1));
    }
  };

  // Navigate out of edit
  const handleBlur = () => {
    setFilteredValues(values);
    setHighlightedIndex(-1);
    setOpen(false); // highlighted row reset
  };

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setEditedText(newText);
    const filtered = values.filter((option) =>
      option.label.toLowerCase().startsWith(newText.toLowerCase())
    );
    setFilteredValues(filtered);
  };

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        value={editedText}
        onClick={() => setOpen(true)}
        onChange={handleTextChange}
        onBlur={() => handleBlur()}
        onKeyDown={(e) => handleKeyDown(e)}
        className="bg-gray-700 px-3 py-1 mr-2 outline-none focus:ring-2 rounded-md"
      />
      {open && (
        <div
          className="absolute left-0 z-10
          bg-gray-700
          rounded-b-lg
          overflow-y-auto max-h-60
          w-full
        "
        >
          {filteredValues.map((value, index) => (
            <div
              key={value.value}
              onMouseDown={(e) => {
                // onMouseDown to avoid input blur before selection
                e.preventDefault();
                handleOptionSelection(value);
              }}
              className={`px-3 py-0.5  cursor-pointer hover:bg-gray-600  ${
                index === highlightedIndex ? "bg-gray-500" : ""
              }`}
            >
              {value.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearachableDropdown;
