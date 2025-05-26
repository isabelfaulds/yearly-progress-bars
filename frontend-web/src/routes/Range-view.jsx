import RadarChart from "../components/RadarChart.jsx";
import CustomDayPicker from "../components/DayPicker.jsx";
import { useState, useEffect, useRef, useCallback } from "react";
import { addDays, format, isBefore, isEqual } from "date-fns";
import { FunnelIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import LineChart from "../components/LineChart.jsx";
import CategoryTotals from "../components/CategoryTotals.jsx";

function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

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

const RangeView = () => {
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
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  // selected categories
  const [selectedCategoriesMap, setSelectedCategoriesMap] = useState(new Map());
  const [eventsByDate, setEventsByDate] = useState(new Map());

  // memoized if passed to children
  const fetchAndCacheEventsForDateRange = useCallback(
    async (startDateObj, endDateObj) => {
      const eventDays = getDaysBetweenDates(startDateObj, endDateObj);
      console.log("Days to potentially fetch events for:", eventDays);

      setEventsByDate((prevEventsByDate) => {
        const newEventsMap = new Map(prevEventsByDate); // Copy cache
        const fetchPromises = []; // Track promises
        for (const day of eventDays) {
          // If day not in eventsMap, fetch
          if (!newEventsMap.has(day)) {
            console.log(`Fetching events for ${day}...`);
            const fetchPromise = fetch(
              import.meta.env.VITE_CLOUDFRONT_CALENDAR_EVENTS +
                `?event_date=${day}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
              }
            )
              .then((response) => {
                if (response.status === 200) {
                  return response.json();
                } else {
                  console.warn(
                    `Failed to fetch events for ${day}: Status ${response.status}`
                  );
                  return { events: [] }; // Return an empty if fail
                }
              })
              .then((data) => {
                console.log(`Received events for ${day}:`, data.events);
                newEventsMap.set(day, data.events); // Store events for the day
              })
              .catch((error) => {
                console.error(`Error fetching events for ${day}:`, error);
                newEventsMap.set(day, []); // Store an empty array for errors
              });
            fetchPromises.push(fetchPromise);
          } else {
            console.log(`Events for ${day} already in cache.`);
          }
        }

        // Wait for all fetches to complete then update
        if (fetchPromises.length > 0) {
          Promise.allSettled(fetchPromises).then(() => {
            // Reset final combined state, force re-render
            setEventsByDate((finalMap) => new Map(newEventsMap));
            console.log("Update - eventsByDate");
          });
        } else {
          // If nothing new, will return prev copy
        }
        return newEventsMap;
      });
    },
    []
  );

  // Refresh date map on date selection changes
  useEffect(() => {
    if (startDate.date && endDate.date) {
      fetchAndCacheEventsForDateRange(startDate.date, endDate.date);
    }
  }, [startDate, endDate, fetchAndCacheEventsForDateRange]);

  // Update Start & End on changes from DayPicker
  const handleRangeUpdate = (newRange) => {
    console.log("Parent received new range - From:", newRange?.from);
    console.log("Parent received new range - To:", newRange?.to);
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

  // Update Category Map on Selections
  const handleCategoryToggle = (clickedCategory) => {
    setSelectedCategoriesMap((prevSelectedMap) => {
      const newMap = new Map(prevSelectedMap);
      if (newMap.has(clickedCategory.category)) {
        newMap.delete(clickedCategory.category);
      } else {
        newMap.set(clickedCategory.category, clickedCategory);
      }
      return newMap;
    });
  };

  // Hide Selectors on Outside Clicks
  useEffect(() => {
    const handlePointerDownOutside = (event) => {
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

  // Get Categories, Reset Selected
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
        }));

        setCategories([...formattedCategories]);

        const initialSelectedMap = new Map();
        formattedCategories.forEach((cat) =>
          initialSelectedMap.set(cat.category, cat)
        );
        setSelectedCategoriesMap(initialSelectedMap);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }
  useEffect(() => {
    getCategories();
    console.log("refreshed", startDate.date, endDate.date);
  }, []);

  const daysInCurrentRange = getDaysBetweenDates(startDate.date, endDate.date);
  const numberOfDays = daysInCurrentRange.length;

  // Grab needed dates from map
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

  // Apply the category filter to the events within the current date range
  const filteredEventsForVisuals = getAllEventsInDateRange().filter(
    (event) => event.category && selectedCategoriesMap.has(event.category)
  );

  return (
    <div
      className="
      // scrollable full background display
        w-screen min-h-screen h-auto m-0
        bg-[#000000] bg-cover bg-center
        // global margins
        pt-5 pl-5 pr-5 pb-5 sm:pt-12 sm:pl-20 text-white
        flex flex-col 
      "
    >
      <div className="flex flex-col">
        {/* Date Range Display & Toggle */}
        <div className="flex flex-row ">
          <div className="bg-gradient-to-tl from-blue-300 to-orange-100 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold text-gray-800 mr-4">
            {startDate.day}
          </div>
          <div
            className="text-sm md:text-l mb-2 pl-2
            bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex items-center cursor-pointer"
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
        {/* Categories Filter Button */}
        <div className="items-start">
          <button
            className="text-sm md:text-l ml-2 mt-2 mb-2 pl-2
            bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex cursor-pointer"
            onClick={toggleCategories}
          >
            <FunnelIcon className="h-6 w-6 text-blue-500 ml-2 mr-2 " />
            Categories
          </button>
        </div>
        {/* Categories Filter */}
        {isCategoriesOpen && (
          // Overlay over content
          <div className="relative z-10">
            <div className="absolute top-0 left-0">
              <div
                ref={categoriesRef}
                className="
                  relative z-10 rounded-lg
                  bg-gray-700 shadow-lg
                  overflow-y-auto max-h-48 mt-2
                  grid grid-cols-2 gap-2 p-2 
            "
              >
                {categories.map((categoryItem, itemIndex) => {
                  const isCategorySelected = selectedCategoriesMap.has(
                    categoryItem.category
                  );
                  return (
                    <div
                      key={categoryItem.category}
                      className={`
                    px-4 py-2 cursor-pointer transition-colors rounded-md text-sm
                    flex items-center justify-between
                    ${
                      isCategorySelected
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "hover:bg-gray-600"
                    }
                  `}
                      onClick={() => handleCategoryToggle(categoryItem)}
                    >
                      <span className="truncate">{categoryItem.category}</span>
                      <CheckCircleIcon
                        className={`w-5 h-5 text-white ml-2 ${
                          isCategorySelected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {/* Charts */}
        <div className="flex flex-col md:flex-row items-center">
          {/* Line Chart */}
          {/* Keep chart in its own stable container, else drops */}
          <div className="p-4 rounded-lg shadow-lg h-[350px] md:h-[400px] w-full md:w-2/3">
            <LineChart
              events={filteredEventsForVisuals}
              categories={categories.filter((item) =>
                selectedCategoriesMap.has(item.category)
              )}
              daysArray={daysInCurrentRange}
            />
          </div>

          {/* Radar Chart */}
          {/* Keep chart in its own stable container, else drops */}
          <div className="p-4 rounded-lg shadow-lg w-full md:w-1/3 mt-4 md:mt-0 h-80 md:h-96">
            <RadarChart
              events={filteredEventsForVisuals}
              categories={categories.filter((item) =>
                selectedCategoriesMap.has(item.category)
              )}
              days={numberOfDays}
            />
          </div>
          {/* /Charts */}
        </div>

        {/* Totals Table  */}
        <div className="mx-auto md:w-1/2 flex flex-row ">
          <CategoryTotals
            events={filteredEventsForVisuals}
            categories={categories.filter((item) =>
              selectedCategoriesMap.has(item.category)
            )}
          ></CategoryTotals>
        </div>
      </div>
    </div>
  );
};

export default RangeView;
