import React, { useState, useEffect, useRef } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { MinusCircleIcon } from "@heroicons/react/24/solid";
import StyledSubmitButton from "../components/SubmitButton";
import StyledSelect from "../components/StyledSelect";
import StyledInput from "../components/StyledSubmit";
import { useNavigate } from "react-router-dom";

const CategorySettings = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [timeAmount, setTimeAmount] = useState("");
  const [timeUnit, setTimeUnit] = useState("minutes");

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const editedTextRef = useRef(null);

  const handleTimeClick = (index, currentText) => {
    setEditingIndex(index);
    setEditedText(currentText);
    // delay to allow render
    setTimeout(() => {
      editedTextRef.current?.focus();
    }, 0);
  };

  const handleTextChange = (e) => {
    setEditedText(e.target.value);
  };

  const handleBlur = (index) => {
    if (editedText.trim() === "") {
      setEditingIndex(null);
      return;
    }

    const updatedEvents = categories.map((event, i) => {
      if (i === index) {
        return { ...event, time: editedText };
      }
      return event;
    });
    setCategories(updatedEvents);
    setEditingIndex(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      handleBlur(index);
    } else if (e.key === "Escape") {
      setEditingIndex(null);
    }
  };

  useEffect(() => {
    const storedCategories = localStorage.getItem("userCategories");
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("userCategories", JSON.stringify(categories));
  }, [categories]);

  const addCategory = (e) => {
    e.preventDefault();
    if (newCategory.trim() !== "" && timeAmount.trim() !== "") {
      setCategories([
        ...categories,
        {
          category: newCategory.trim(),
          time: timeAmount.trim(),
          unit: timeUnit,
        },
      ]);
      setNewCategory("");
      setTimeAmount("");
    }
  };

  const removeCategory = (categoryToRemove) => {
    setCategories(
      categories.filter((cat) => cat.category !== categoryToRemove)
    );
  };

  return (
    <div
      className="bg-[#000000] bg-cover bg-center 
    w-screen min-h-screen m-0 flex flex-col
    pt-10 pl-1 px-4
    sm:pt-12  sm:px-20"
    >
      {/* Header */}
      <div className="flex flex-row items-center justify-between w-full pr-2">
        <div className="text-white pl-8 text-2xl sm:text-2xl  py-4 font-sans">
          Daily Settings
        </div>
        <button
          onClick={() => navigate(-1)}
          className="p-2
          text-white rounded-full rounded-full
          outline-1 
          outline-gray-400
          shadow-lg
          bg-gray-600
        hover:bg-gradient-to-r hover:from-gray-400 hover:to-gray-600
          hover:shadow-xl
          hover:ring-1
          hover:ring-gray-600
          "
        >
          <ChevronRightIcon
            className="text-gray-00 h-6 w-6
          hover:shadow-xl "
          />
        </button>
      </div>
      <div className="pt-3 px-4 w-full">
        <hr className="border-t border-gray-300 my-4" />
      </div>

      {/* content */}
      <div className="flex flex-col pl-4 mt-5 items-center">
        <ul className="pt-3 px-4 mb-4 w-full">
          {categories.map((item, index) => (
            <li
              key={index}
              className="grid
              grid-cols-[minmax(0,1fr)_auto_auto_auto] 
              text-white
              items-center // used for vertical centering
              py-5 border-b border-gray-500
              gap-2
              "
            >
              <span
                className="
  py-1
  text-gray-200
  pr-5
  
  "
              >
                {item.category}
              </span>
              {editingIndex === index ? (
                <input
                  ref={editedTextRef}
                  type="text"
                  value={editedText}
                  onChange={handleTextChange}
                  onBlur={() => handleBlur(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="bg-gray-700 rounded-full px-2 py-1 mr-1 outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: `${Math.max(editedText.length * 2, 80)}px` }}
                />
              ) : (
                <div
                  onClick={() => handleTimeClick(index, item.time)}
                  className="bg-gray-800 rounded-full px-2 py-1 mr-2 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                  style={{ width: `${Math.max(item.time.length * 8, 80)}px` }}
                >
                  {item.time}
                </div>
              )}
              <span className="sm:px-4 px-1">
                {item.unit === "minutes" ? "min" : "hr"}
              </span>
              <button
                aria-label="Remove Category"
                onClick={() => removeCategory(item.category)}
                className="bg-gradient-to-r from-gray-300 to-blue-300
        text-white
        font-medium
        rounded-full
        shadow-lg
        hover:shadow-xl
        hover:from-yellow-600 hover:to-blue-700
        active:scale-95
        active:shadow-inner
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2 focus:ring-blue-400
        focus:ring-offset-2 focus:ring-offset-black
        mb-1"
              >
                <MinusCircleIcon
                  className="
                text-gray-700
                h-6 w-6
                hover:border-2
                rounded-full
                hover:outline-white"
                />
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={addCategory}
          className="mt-2 flex flex-col md:flex-row gap-1"
        >
          <StyledInput
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add Category"
            required
          />
          <StyledInput
            type="number"
            value={timeAmount}
            onChange={(e) => setTimeAmount(e.target.value)}
            placeholder="Time Amount"
            required
          />
          <StyledSelect
            value={timeUnit}
            onChange={(e) => setTimeUnit(e.target.value)}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </StyledSelect>
          <StyledSubmitButton>Add</StyledSubmitButton>
        </form>
      </div>
    </div>
  );
};

export default CategorySettings;
