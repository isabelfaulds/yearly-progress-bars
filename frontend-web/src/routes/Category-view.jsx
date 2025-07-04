import CustomDayPicker from "../components/DayPicker.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import { addDays, format, isBefore, isEqual } from "date-fns";
import LineChart from "../components/charts/LineChart.jsx";
import NavButton from "../components/NavButton.jsx";
import { useCategories } from "../hooks/useCategories.jsx";
import { useEventsForRange } from "../hooks/useEventsForRange.jsx";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import NoteCard from "../components/NoteCard.jsx";
import AddNoteCard from "../components/AddNoteCard";
import StyledInput from "../components/StyledSubmit.jsx";
import StyledSubmitButton from "../components/SubmitButton.jsx";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useItems, useCreateItem } from "../hooks/useSavedItem.jsx";

const baseContainerClasses = `
  // scrollable full background display
  w-screen min-h-screen h-auto m-0
  bg-[#000000] bg-cover bg-center
  // global margins
  pt-5 pl-5 pr-5 pb-5 sm:pt-12 sm:pl-20 text-white
  flex flex-col
`;

// array of all days
function getDaysBetweenDates(startDate, endDate) {
  console.log("days between", startDate, endDate);
  const dates = [];
  let currentDate = new Date(startDate);
  while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
    dates.push(format(currentDate, "yyyy-MM-dd"));
    currentDate = addDays(currentDate, 1);
  }
  return dates;
}

// category to slug string
function categoryToSlug(category) {
  return category.toLowerCase().replace(/ /g, "-");
}

const CategoryView = () => {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const titleCaseCategory = categorySlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Title Case
    .join(" ");
  // Date Range
  const [startDate, setStartDate] = useState(() => {
    const from = addDays(new Date(), -7);
    return {
      day: from.getDate(),
      month: format(from, "MMMM"),
      weekday: format(from, "EEEE"),
      year: format(from, "yyyy"),
      date: from,
    };
  });
  const [endDate, setEndDate] = useState(() => {
    const to = new Date();
    return {
      day: to.getDate(),
      month: format(to, "MMMM"),
      weekday: format(to, "EEEE"),
      year: format(to, "yyyy"),
      date: to,
    };
  });
  const [currentSelectedRange, setCurrentSelectedRange] = useState({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  // Refs for popup containers
  const calendarRef = useRef(null);
  const categoriesRef = useRef(null);
  const optionsRef = useRef(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemOptionsOpen, setItemOptionsOpen] = useState(-1);
  const [newItem, setNewItem] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: categories, isLoading, error } = useCategories();
  const { eventsByDate, eventsIsLoading, eventsIsError } = useEventsForRange(
    startDate.date,
    endDate.date
  );
  const { data: savedItems } = useItems(categorySlug);
  const { mutate: addNewItem } = useCreateItem(categorySlug);

  // Update Start & End from DayPicker
  const handleRangeUpdate = (newRange) => {
    console.log("Update - From:", newRange?.from);
    console.log("Update - To:", newRange?.to);
    setCurrentSelectedRange(newRange);

    if (newRange.from) {
      setStartDate({
        day: newRange.from.getDate(),
        month: format(newRange.from, "MMMM"),
        weekday: format(newRange.from, "EEEE"),
        year: format(newRange.from, "yyyy"),
        date: newRange.from,
      });
    }
    if (newRange.to) {
      setEndDate({
        day: newRange.to.getDate(),
        month: format(newRange.to, "MMMM"),
        weekday: format(newRange.to, "EEEE"),
        year: format(newRange.to, "yyyy"),
        date: newRange.to,
      });
    }
  };

  // Toggle Date Range Selector
  const toggleCalendar = () => {
    setIsCalendarOpen(!isCalendarOpen);
    // If opening calendar, close categories filter
    if (!isCalendarOpen) {
      setIsCategoriesOpen(false);
    }
  };

  // Toggle Category Selector
  const toggleCategories = () => {
    setIsCategoriesOpen(!isCategoriesOpen);
    // If opening categories filter, close calendar
    if (!isCategoriesOpen) {
      setIsCalendarOpen(false);
    }
  };

  const submitAddItem = () => {
    const payload = {
      category: categorySlug,
      url: newItem,
    };
    if (newTitle) {
      payload.title = newTitle;
    }
    if (newDescription) {
      payload.description = newDescription;
    }
    console.log("Update - new saved item", payload);

    addNewItem(payload);
    setNewItem("");
    setNewTitle("");
    setNewDescription("");
  };

  // Navigate categories
  const handleCategoryToggle = (clickedCategory) => {
    console.log("navigating to ", categoryToSlug(clickedCategory.category));
    navigate(`/categories/${categoryToSlug(clickedCategory.category)}`);
  };

  const handleOptionsClick = (clickedItem) => {
    setItemOptionsOpen(clickedItem.id);
  };

  const handleDelete = (clickedIndex) => {
    console.log(`Delete - Item ${clickedIndex}`);
    setItems((items) => items.filter((item) => item.id !== clickedIndex));
  };

  // Close Selectors on Outside Clicks
  useEffect(() => {
    const handlePointerDownOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target))
        setItemOptionsOpen(-1);
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        isCalendarOpen
      ) {
        setIsCalendarOpen(false);
      }

      if (
        categoriesRef.current &&
        !categoriesRef.current.contains(event.target) &&
        isCategoriesOpen
      ) {
        setIsCategoriesOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, [isCalendarOpen, isCategoriesOpen]);

  const daysInCurrentRange = getDaysBetweenDates(startDate.date, endDate.date);

  // Get Date Filtered Events
  const getAllEventsInDateRange = useCallback(() => {
    const allEvents = [];
    const daysInCurrentRange = getDaysBetweenDates(
      startDate.date,
      endDate.date
    );
    for (const day of daysInCurrentRange) {
      if (eventsByDate.has(day)) {
        allEvents.push(...eventsByDate.get(day));
      }
    }
    return allEvents;
  }, [eventsByDate, startDate, endDate]);

  // Apply the category filter
  const filteredEventsForVisuals = getAllEventsInDateRange().filter(
    (event) => event.category === titleCaseCategory
  );

  useEffect(() => {
    console.log(filteredEventsForVisuals);
  }, [filteredEventsForVisuals]);

  if (isLoading) {
    return (
      <div className={baseContainerClasses}>
        <div>Loading...</div>
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
      <div className="flex flex-col">
        {/* Categories Filter Button */}
        <div className="relative items-center">
          <button
            className="font-lexend text-lg md:text-l mt-2 mb-2 pl-5 pr-5
            bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex cursor-pointer"
            onClick={toggleCategories}
          >
            {titleCaseCategory}
          </button>

          {/* Categories Filter */}
          {isCategoriesOpen && (
            // Overlay over content
            <div className="relative z-10">
              <div className="absolute top-0 left-0">
                <div
                  ref={categoriesRef}
                  className="
                  relative z-10 rounded-lg
                  bg-coolgray shadow-lg
                  overflow-y-auto max-h-48 mt-1
                  grid grid-cols-2 gap-2 p-2 
            "
                >
                  {categories?.map((categoryItem, itemIndex) => (
                    <div
                      key={categoryItem.category}
                      className="px-4 py-2 cursor-pointer transition-colors rounded-md text-sm
                    flex items-center justify-between hover:bg-gray-600"
                      onClick={() => handleCategoryToggle(categoryItem)}
                    >
                      <span className="truncate">{categoryItem.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Date Range Display & Toggle */}
        <div className="flex flex-col">
          <div className="flex flex-row">
            <div
              className="text-sm md:text-l mb-2 pl-2
            bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex items-start cursor-pointer"
              onClick={toggleCalendar}
            >
              {`${startDate.weekday}, ${startDate.month} ${startDate.day}, ${startDate.year} - ${endDate.weekday}, ${endDate.month} ${endDate.day}, ${endDate.year}`}
            </div>
          </div>
          {/* Calendar Popup */}
          {isCalendarOpen && (
            // Overlay over content
            <div ref={calendarRef} className="relative z-10">
              <div className="absolute top-0 left-0">
                <CustomDayPicker
                  initialRange={currentSelectedRange}
                  onRangeChange={handleRangeUpdate}
                />
              </div>
            </div>
          )}
        </div>

        {/* Line Chart */}
        <div className="flex flex-row items-center justify-center">
          <div className="p-4 mr-1 rounded-lg shadow-lg h-[200px] md:h-[225px] w-3/4 ">
            <LineChart
              events={filteredEventsForVisuals}
              categories={categories.filter(
                (item) => item.category === titleCaseCategory
              )}
              daysArray={daysInCurrentRange}
              showLegend={false}
            />
          </div>
        </div>
      </div>
      {/* TODO: Add Milestones */}
      <div className="m-2 mt-3">
        <div className="font-lexend">Milestones</div>
      </div>
      <div className="m-2 mt-3">
        <div className="font-lexend mb-3">Saved Items</div>
        {isAddItemOpen && (
          <div className="w-full m-2 mb-3">
            <div className="m-1">
              <StyledInput
                type="text"
                placeholder="Save a URL https://...    "
                onChange={(e) => setNewItem(e.target.value)}
              />
              <StyledSubmitButton onClick={submitAddItem}>
                Add
              </StyledSubmitButton>
            </div>
            <div className="m-1">
              <div className="m-2">
                <StyledInput
                  type="text"
                  placeholder="(Optional) Title"
                  onChange={(e) => setNewTitle(e.target.value)}
                />
                <StyledInput
                  type="text"
                  placeholder="(Optional) Notes"
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        {/* Saved Items Grid */}
        {/* Grid container for the cards */}
        <div
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 
      lg:grid-cols-4 gap-4 w-2/3 mx-auto"
        >
          <AddNoteCard onAddClick={() => setIsAddItemOpen(!isAddItemOpen)} />
          {savedItems?.map((item) => (
            <div key={item.saved_item_uid} className="relative">
              <NoteCard
                key={item.saved_item_uid}
                note={item}
                onOptionsClick={handleOptionsClick}
              />
              {itemOptionsOpen === item.saved_item_uid && (
                <div className="absolute top-10 right-2 bg-gray-800 text-white rounded shadow-md">
                  {/* Your dropdown menu */}
                  <button
                    ref={optionsRef}
                    className="hover:bg-gray-700 p-2"
                    onClick={() => handleDelete(item.saved_item_uid)}
                  >
                    <div className="flex flex-row">
                      <TrashIcon className="h-5 mr-2" /> Delete
                    </div>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="fixed bottom-4 right-4 p-1 rounded-full ">
        <NavButton direction="up" />
      </div>
    </div>
  );
};

export default CategoryView;
