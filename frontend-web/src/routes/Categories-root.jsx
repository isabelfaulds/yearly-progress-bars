import NavButton from "../components/NavButton.jsx";
import { useCategories } from "../hooks/useCategories.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  pl-5 pr-5 pb-5 text-white
  flex flex-col
`;

const CategoriesRoot = () => {
  const { data: categories, isLoading, error } = useCategories();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("categories", categories);
  }, [categories]);

  if (isLoading) {
    return (
      <div className={baseContainerClasses}>
        <div>Loading...</div>
      </div>
    );
  }

  const handleCategorySelect = (selectedCategory) => {
    console.log("navigating", selectedCategory.category.toLowerCase());
    navigate(selectedCategory.category.toLowerCase());
  };

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
      <div className="flex flex-col items-center justify-center h-screen">
        <div
          className="
                  relative z-10 rounded-lg
                  shadow-lg
                  overflow-y-auto 
                  grid grid-cols-2 sm:grid-cols-3 gap-2 p-5
                  text-center text-xl lg:text-2xl
            "
        >
          {categories.map((categoryItem, itemIndex) => (
            <div
              key={categoryItem.category}
              className="py-3 px-3 md:py-5 md:px-5 lg:px-8 lg:py-8 font-lexend bg-coolgray cursor-pointer transition-colors rounded-md 
                    flex items-center text-center justify-between hover:bg-gray-600"
              onClick={() => handleCategorySelect(categoryItem)}
            >
              <span>{categoryItem.category}</span>
            </div>
          ))}
        </div>
        <div className="fixed bottom-4 right-4 p-1 rounded-full ">
          <NavButton direction="up" />
        </div>
      </div>
    </div>
  );
};

export default CategoriesRoot;
