import CatIconComponent from "@/assets/cat.svg?react";
import { CubeIcon } from "@heroicons/react/24/outline";
import React from "react";

const CatCubeToggle = ({ cubeIconSelect, handleCategoryIconToggle }) => {
  return (
    <div className="flex items-center gap-3 pl-8">
      <span className="text-gray-300 text-sm sm:text-base font-lexend">
        Category Icon
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
  );
};

export default CatCubeToggle;
