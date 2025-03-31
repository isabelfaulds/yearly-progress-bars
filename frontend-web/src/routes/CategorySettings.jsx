import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { MinusCircleIcon } from "@heroicons/react/24/solid";

import { useNavigate } from "react-router-dom";

const CategorySettings = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [timeAmount, setTimeAmount] = useState("");
  const [timeUnit, setTimeUnit] = useState("minutes"); // Default to minutes

  useEffect(() => {
    // Load categories from localStorage or default
    const storedCategories = localStorage.getItem("userCategories");
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    }
  }, []);

  useEffect(() => {
    // Save categories to localStorage whenever it changes
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
    <div className="bg-[#000000] bg-cover bg-center w-screen min-h-screen m-0 flex flex-col items-start pt-10 pl-1 sm:pt-12 sm:pl-20 px-4 sm:px-20">
      <div className="text-white pl-8 text-2xl sm:text-2xl font-bold ">
        Settings
      </div>
      <button
        onClick={() => navigate(-1)}
        className="fixed top-7 right-4 p-3 text-white rounded-full rounded-full shadow-lg focus:outline-none hover:border-2"
      >
        <XMarkIcon className="text-gray-700 h-6 w-6" />
      </button>

      <div className="pt-3 px-4 w-full">
        <hr className="border-t border-gray-300 my-4" />
      </div>

      <div className="flex flex-col sm:pl-20 mt-15 ">
        <h2 className="text-2xl text-white font-semibold mb-4">Categories</h2>

        <ul className="mb-4">
          {categories.map((item) => (
            <li
              key={item.category}
              className="flex text-white items-center justify-between py-2 border-b border-gray-200"
            >
              {item.category} - {item.time} {item.unit}
              <button
                aria-label="Remove Category"
                onClick={() => removeCategory(item.category)}
                className="text-white hover:text-red-700 font-bold"
              >
                <MinusCircleIcon className="text-gray-700 h-6 w-6 hover:border-2 rounded-full hover:outline-white" />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={addCategory} className="flex items-center">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add Category"
            className="text-white border border-gray-300 rounded-md p-2 mr-2 flex-grow"
            required
          />
          <input
            type="text"
            value={timeAmount}
            onChange={(e) => setTimeAmount(e.target.value)}
            placeholder="Time Amount"
            className="text-white border border-gray-300 rounded-md p-2 mr-2 w-1/4"
            required
          />
          <select
            value={timeUnit}
            onChange={(e) => setTimeUnit(e.target.value)}
            className="text-white border border-gray-300 rounded-md p-2 mr-2"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Add
          </button>
        </form>
        <div className="grid grid-cols-2 items-center gap-2 sm:gap-4 pl-1"></div>
      </div>
    </div>
  );
};

export default CategorySettings;
