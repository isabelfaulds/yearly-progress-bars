import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NavButton from "../components/NavButton.jsx";
import { useCategoryIconPreference } from "../hooks/useCatIconPreference.jsx";

import { ChevronRightIcon, MinusCircleIcon } from "@heroicons/react/24/solid";
import {} from "@heroicons/react/24/solid";
import StyledSubmitButton from "../components/SubmitButton";
import StyledSelect from "../components/StyledSelect";
import StyledInput from "../components/StyledSubmit";
import { useCategories } from "../hooks/useCategories.jsx";
import { useQueryClient } from "@tanstack/react-query";
import CatIconComponent from "../assets/cat.svg?react";
import { CubeIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button.jsx";

const baseContainerClasses = `bg-[#000000] bg-cover bg-center 
    w-screen min-h-screen m-0 flex flex-col
    pt-10 px-3 pb-10
    sm:pt-12  sm:px-20`;

function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const CategorySettings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dbCategories, isLoading, error } = useCategories();
  const [categories, setCategories] = useState([]);
  const { isCatIcon, toggleIcon } = useCategoryIconPreference();
  const [cubeIconSelect, setCubeIconSelect] = useState(false);

  useEffect(() => {
    setCubeIconSelect(!isCatIcon);
  }, [isCatIcon]);

  useEffect(() => {
    if (dbCategories) {
      const formattedCategories = dbCategories.map((item) => ({
        ...item,
        category: titleCase(item.category),
        totalHours: Math.floor(item.minutes / 60),
        remainderMinutes: item.minutes % 60,
        changeStatus: null,
      }));
      setCategories([...formattedCategories]);
    }
  }, [dbCategories]);

  const [newCategory, setNewCategory] = useState("");
  const [timeAmount, setTimeAmount] = useState("");
  const [timeUnit, setTimeUnit] = useState("minutes");
  const [editingCell, setEditingCell] = useState({ index: null, field: null }); // { index: row index, field: 'minutes' | 'hours' }
  const [editedValues, setEditedValues] = useState({}); // Store edited values for each row and field
  const [deletes, setDeletes] = useState([]);
  const editedInputRef = useRef(null);
  const [categoryIconUpdate, setCategoryIconUpdate] = useState(false);

  const handleSaveAndNavigate = async () => {
    try {
      if (categoryIconUpdate) {
        toggleIcon();
        console.log("Updated - Category Icon");
      }
      await postCategories();
      queryClient.invalidateQueries(["categories"]);
      navigate(-1);
    } catch (error) {
      console.error("Error saving categories:", error);
    }
  };

  async function postCategories() {
    try {
      const payload = { add: [], update: [], delete: deletes };
      categories.forEach((cat) => {
        if (cat.changeStatus === "add") {
          payload.add.push({
            category: cat.category.toLowerCase(),
            minutes: cat.minutes,
          });
        } else if (cat.changeStatus === "update") {
          payload.update.push({
            category_uid: cat.category_uid,
            minutes: cat.minutes,
          });
        }
      });
      if (
        payload.add.length > 0 ||
        payload.update.length > 0 ||
        payload.delete.length > 0
      ) {
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
        }
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  const handleCategoryIconToggle = () => {
    setCubeIconSelect(!cubeIconSelect);
    setCategoryIconUpdate(!categoryIconUpdate);
  };

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

          let newStatus =
            cat.changeStatus !== "add" ? "update" : cat.changeStatus;

          return {
            ...cat,
            minutes: newMinutes,
            totalHours: Math.floor(newMinutes / 60),
            remainderMinutes: newMinutes % 60,
            changeStatus: newStatus,
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
        changeStatus: "add",
      };
      setCategories([...categories, parsedCategory]);
      setNewCategory("");
      setTimeAmount("");
    }
  };

  const deleteCategory = (categoryToDelete) => {
    let changeStatusToDelete = null;
    let categoryIndexToDelete = -1;
    let categoryUIDToDelete = null;

    categories.forEach((cat, index) => {
      if (cat.category === categoryToDelete) {
        changeStatusToDelete = cat.changeStatus;
        categoryIndexToDelete = index;
        categoryUIDToDelete = cat.category_uid;
      }
    });

    if (changeStatusToDelete !== "add" && categoryUIDToDelete !== null) {
      setDeletes([...deletes, { category_uid: categoryUIDToDelete }]);
    }
    setCategories(
      categories.filter((cat) => cat.category !== categoryToDelete)
    );
  };

  if (isLoading) {
    return (
      <div className={baseContainerClasses}>
        <div>Loading Settings...</div>
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
      {/* Header */}
      <div className="flex flex-row items-center justify-between w-full pr-2 gap-x-3">
        <div className="text-white pl-6 text-base sm:text-2xl py-4 font-lexend">
          Category Settings
        </div>
        <button
          onClick={handleSaveAndNavigate}
          className="p-1 sm:p-2
          text-white rounded-full rounded-full
          outline-1 
          outline-gray-400
          shadow-lg
          bg-gray-800
        hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-900
          hover:shadow-xl
          hover:ring-1
          hover:ring-gray-900
          flex items-center
          pl-6 sm:pl-7 pr-3
          text-sm sm:text-base
          "
        >
          <span className="mr-2 font-lexend">Save</span>
          <ChevronRightIcon
            className="text-gray-00 h-6 w-6
          hover:shadow-xl "
          />
        </button>
      </div>
      <div className="pt-3 px-4 w-full">
        <hr className="border-t border-gray-300 my-4" />
      </div>

      {/* Navigation Icon */}
      <div className="flex items-center gap-3 pl-8">
        <span className="text-gray-300 text-sm sm:text-base font-lexend">
          Nav Icon Style
        </span>
        <button
          onClick={handleCategoryIconToggle}
          className={`relative w-24 h-12 rounded-full p-0 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
      ${cubeIconSelect ? "bg-gray-700" : "bg-gray-700"}
    `}
        >
          {/* Track */}
          <div className="relative w-full h-full">
            {/* Thumb with sliding animation */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 h-10 w-10 rounded-full bg-blue-600 shadow-md transition-all duration-300 flex items-center justify-center
          ${cubeIconSelect ? "left-1" : "left-[calc(100%-2.75rem)]"}
        `}
            >
              {cubeIconSelect ? (
                <CubeIcon className="w-6 h-6 text-white" />
              ) : (
                <CatIconComponent className="w-6 h-6 text-white" />
              )}
            </div>

            {/* Not Selected Icon */}
            <div className="flex justify-between w-full h-full px-2">
              <CubeIcon
                className={`mt-3 ml-2 w-6 h-6 transition-opacity ${
                  cubeIconSelect ? "opacity-0" : "opacity-70"
                }`}
              />
              <CatIconComponent
                className={`mt-3 mr-2 w-6 h-6 transition-opacity ${
                  !cubeIconSelect ? "opacity-0" : "opacity-70"
                }`}
              />
            </div>
          </div>
        </button>
      </div>

      {/* Saved Categories */}
      <div className="flex flex-col test mt-1 items-center text-sm">
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
              <span className="text-xs sm:text-sm sm:px-1">hr</span>

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
              <span className="text-xs sm:text-sm sm:px-1">min</span>
              <button
                aria-label="Delete Category"
                onClick={() => deleteCategory(item.category)}
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
                w-5 sm:w-6
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
      <div className="fixed bottom-4 right-4 p-1 rounded-full ">
        <NavButton direction="up" />
      </div>
    </div>
  );
};

export default CategorySettings;
