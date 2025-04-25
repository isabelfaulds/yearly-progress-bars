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
  const [editingCell, setEditingCell] = useState({ index: null, field: null }); // { index: row index, field: 'minutes' | 'hours' }
  const [editedValues, setEditedValues] = useState({}); // Store edited values for each row and field
  const editedInputRef = useRef(null);

  function titleCase(str) {
    return str
      .toLowerCase()
      .split(" ")
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  async function getCategories() {
    try {
      const categoryResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_CATEGORIES,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (categoryResponse.status === 200) {
        const responseData = await categoryResponse.json();
        const formattedCategories = responseData.categories.map((item) => ({
          ...item,
          category: titleCase(item.category),
          totalHours: Math.floor(item.minutes / 60),
          remainderMinutes: item.minutes % 60,
        }));
        setCategories(formattedCategories);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  const handleTimeClick = (index, field, currentValue) => {
    setEditingCell({ index, field });
    setEditedValues((prev) => ({
      ...prev,
      [`${index}-${field}`]: currentValue,
    }));
    setTimeout(() => {
      editedInputRef.current?.focus();
    }, 0);
  };

  const handleTextChange = (e) => {
    const { value } = e.target;
    setEditedValues((prev) => ({
      ...prev,
      [`${editingCell.index}-${editingCell.field}`]: value,
    }));
  };

  const handleBlur = (index, field) => {
    if (editingCell.index === index && editingCell.field === field) {
      const value = editedValues[`${index}-${field}`]?.trim();
      if (value === "") {
        setEditingCell({ index: null, field: null });
        return;
      }

      const updatedCategories = categories.map((cat, i) => {
        if (i === index) {
          let newMinutes = cat.minutes;

          if (field === "hours") {
            const newHours = parseInt(value);
            newMinutes = newHours * 60 + cat.remainderMinutes;
          } else if (field === "minutes") {
            const newRemainderMinutes = parseInt(value);
            newMinutes = cat.totalHours * 60 + newRemainderMinutes;
          }

          return {
            ...cat,
            minutes: newMinutes,
            totalHours: Math.floor(newMinutes / 60),
            remainderMinutes: newMinutes % 60,
          };
        }
        return cat;
      });
      setCategories(updatedCategories);
      setEditingCell({ index: null, field: null });
    }
  };

  const handleKeyDown = (e, index, field) => {
    if (e.key === "Enter") {
      handleBlur(index, field);
    } else if (e.key === "Escape") {
      setEditingCell({ index: null, field: null });
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  useEffect(() => {
    console.log("categories changed", categories);
  }, [categories]);

  const addCategory = (e) => {
    e.preventDefault();
    if (newCategory.trim() !== "" && timeAmount.trim() !== "") {
      const minutes =
        timeUnit === "hours"
          ? parseInt(timeAmount.trim()) * 60
          : parseInt(timeAmount.trim());

      const parsedCategory = {
        category: newCategory.trim(),
        minutes: minutes,
        totalHours: Math.floor(minutes / 60),
        remainderMinutes: minutes % 60,
      };
      setCategories([...categories, parsedCategory]);
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

      {/* Saved Categories */}
      <div className="flex flex-col pl-4 mt-5 items-center">
        <ul className="pt-3 px-4 mb-4 w-full">
          {categories.map((item, index) => (
            <li
              key={index}
              className="grid
          grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto]
          text-white
          items-center
          py-5 border-b border-gray-500
          gap-2
          "
            >
              <span className="py-1 text-gray-200 pr-5">{item.category}</span>

              {/* Editable Hours */}
              {editingCell.index === index && editingCell.field === "hours" ? (
                <input
                  ref={editedInputRef}
                  type="number"
                  value={
                    editedValues.hasOwnProperty(`${index}-hours`)
                      ? editedValues[`${index}-hours`]
                      : item.totalHours
                  }
                  onChange={handleTextChange}
                  onBlur={() => handleBlur(index, "hours")}
                  onKeyDown={(e) => handleKeyDown(e, index, "hours")}
                  className="bg-gray-700 rounded-full px-2 py-1 mr-1 outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: `40px` }}
                />
              ) : (
                <div
                  onClick={() =>
                    handleTimeClick(index, "hours", item.totalHours)
                  }
                  className="bg-gray-800 rounded-full px-2 py-1 mr-1 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                  style={{ width: `40px` }}
                >
                  {item.totalHours}
                </div>
              )}
              <span className="sm:px-1 px-1">hrs</span>

              {/* Editable Minutes */}
              {editingCell.index === index &&
              editingCell.field === "minutes" ? (
                <input
                  ref={editedInputRef}
                  type="number"
                  value={
                    editedValues.hasOwnProperty(`${index}-minutes`)
                      ? editedValues[`${index}-minutes`]
                      : item.remainderMinutes
                  }
                  onChange={handleTextChange}
                  onBlur={() => handleBlur(index, "minutes")}
                  onKeyDown={(e) => handleKeyDown(e, index, "minutes")}
                  className="bg-gray-700 rounded-full px-2 py-1 mr-1 outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: `40px` }}
                />
              ) : (
                <div
                  onClick={() =>
                    handleTimeClick(index, "minutes", item.remainderMinutes)
                  }
                  className="bg-gray-800 rounded-full px-2 py-1 mr-1 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                  style={{ width: `40px` }}
                >
                  {item.remainderMinutes}
                </div>
              )}
              <span className="sm:px-1 px-1">min</span>
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
        {/* New Category */}
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
