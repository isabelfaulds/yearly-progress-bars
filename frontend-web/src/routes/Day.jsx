import { useState, useRef, useEffect } from "react";
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/outline";
import NavButton from "../components/NavButton.jsx";
import { DateTime } from "luxon";
import RadarChart from "../components/RadarChart.jsx";
import useMediaQuery from "../hooks/useMediaQuery";
import { useCategories } from "../hooks/useCategories.jsx";

const baseContainerClasses = `bg-[#000000]
    /* Layout */
    flex flex-col
    w-screen min-h-screen h-auto m-0
    md:flex-row

    /* Background */
    bg-[#000000] bg-cover bg-center

    /* Spacing */
    pt-5 pl-5 pr-5 px-4 pb-5
    sm:pt-12 sm:pl-20 sm:px-20

    text-white`;

const Day = () => {
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.toLocaleDateString("en-US", { month: "long" });
  const weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const year = currentDate.toLocaleDateString("en-US", { year: "numeric" });
  const isMediumScreenOrLarger = useMediaQuery("(min-width: 768px)");

  function titleCase(str) {
    return str
      .toLowerCase()
      .split(" ")
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

  // Patch event category
  async function patchEvent(event_uid, category_uid, category) {
    try {
      const url = `${
        import.meta.env.VITE_CLOUDFRONT_CALENDAR_EVENTS
      }/${encodeURIComponent(event_uid)}`;

      const eventResponse = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_uid: category_uid,
          category: category.toLowerCase(),
        }),
        credentials: "include",
      });
      if (eventResponse.status === 200) {
        console.log("Update - Event Category");
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  // Get all day events
  async function getEvents() {
    try {
      const todaysDate = DateTime.now().toFormat("yyyy-MM-dd");
      const eventResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_CALENDAR_EVENTS +
          `?event_date=${todaysDate}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (eventResponse.status === 200) {
        const responseData = await eventResponse.json();
        setCalendarEvents(responseData.events);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  const [calendarEvents, setCalendarEvents] = useState([]);
  const { data: categories, isLoading, error } = useCategories();
  const [todayCategories, setTodayCategories] = useState([]);

  useEffect(() => {
    if (categories) {
      setTodayCategories([
        { category_uid: "placeholder", category: "Placeholder", minutes: 0 },
        ...categories,
      ]);
    }
  }, [categories]);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const editedTextRef = useRef(null);

  const [filteredCategories, setFilteredCategories] = useState(todayCategories);
  const [expandUp, setExpandUp] = useState(false);
  const categoryBubbleRef = useRef(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownItemRefs = useRef([]);

  // Edit category, open list of categories for filtering
  const handleCategoryClick = (index) => {
    setEditingIndex(index);
    setEditedText("");
    setExpandUp(false);
    setHighlightedIndex(-1);
    setTimeout(() => {
      editedTextRef.current?.focus();
      // expand up if near page end
      if (categoryBubbleRef.current) {
        const bubbleRect = categoryBubbleRef.current.getBoundingClientRect();

        const viewportHeight = window.innerHeight;
        const dropdownHeightEstimate = Math.min(todayCategories.length, 6) * 36; // 36 from item height

        if (
          bubbleRect.bottom + dropdownHeightEstimate > viewportHeight &&
          bubbleRect.top > dropdownHeightEstimate / 2
        ) {
          setExpandUp(true);
        } else {
          setExpandUp(false);
        }
      }
    }, 0);
    setFilteredCategories(todayCategories);
  };

  // Filter Category edit
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setEditedText(newText);

    const filtered = todayCategories.filter((categoryItem) =>
      categoryItem.category.toLowerCase().startsWith(newText.toLowerCase())
    );
    setFilteredCategories(filtered);
    setHighlightedIndex(-1); // highlighted row reset
  };

  // Navigate out of edit
  const handleBlur = () => {
    setEditingIndex(null);
    setFilteredCategories(todayCategories);
    setHighlightedIndex(-1); // highlighted row reset
  };

  // Update Category key navigation
  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      if (
        // On enter select highlighted
        highlightedIndex >= 0 &&
        filteredCategories.length > highlightedIndex
      ) {
        handleDropdownItemClick(
          index,
          filteredCategories[highlightedIndex].category
        );
      } else if (filteredCategories.length > 0) {
        // On enter select first
        handleDropdownItemClick(index, filteredCategories[0].category);
      } else {
        // On enter and no options, exit
        handleBlur();
      }
      setHighlightedIndex(-1);
    } else if (e.key === "Escape") {
      // exit
      setEditingIndex(null);
      setFilteredCategories(todayCategories);
      setHighlightedIndex(-1);
    } else if (e.key === "ArrowDown") {
      // navigate down
      setHighlightedIndex((prevIndex) =>
        prevIndex < filteredCategories.length - 1 ? prevIndex + 1 : prevIndex
      );
    } else if (e.key === "ArrowUp") {
      // navigate up
      setHighlightedIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : -1));
    }
  };

  const handleDropdownItemClick = (eventIndex, selectedCategory) => {
    // Get event UID
    let eventUID;
    const updatedEvents = calendarEvents.map((event, i) => {
      if (i === eventIndex) {
        eventUID = event.event_uid;
        return { ...event, category: selectedCategory };
      }
      return event;
    });
    // get category UID
    const categoryUID = todayCategories.find(
      (item) => item.category && item.category === selectedCategory
    ).category_uid;
    // update array
    setCalendarEvents(updatedEvents);
    // send to db
    patchEvent(eventUID, categoryUID, selectedCategory);

    // reset filters
    setFilteredCategories(todayCategories);
    setEditingIndex(null);
    setHighlightedIndex(-1);
  };

  // Trigger gcal sync
  const handleSync = async () => {
    try {
      const eventResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_SYNC_GCAL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (eventResponse.status === 200) {
        getEvents();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  // Trigger event categorization
  const handleCategorize = async () => {
    try {
      const unlabeledEvents = calendarEvents
        .filter((event) => event.category === "Placeholder")
        .map((event) => ({
          eventName: event.event_name,
          eventUID: event.event_uid,
        }));
      const categoriesArr = todayCategories
        .filter((item) => item.category_uid !== "placeholder")
        .map((item) => item.category.toLowerCase());
      const eventResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_CATEGORIZE,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            events: unlabeledEvents,
            categories: categoriesArr,
          }),
        }
      );
      if (eventResponse.status === 200) {
        const responseData = await eventResponse.json();
        const labeledEvents = responseData.LabeledEvents;
        setCalendarEvents((prevEvents) =>
          prevEvents.map((event) => {
            const labeledMatch = labeledEvents.find(
              (le) => le.eventUID === event.event_uid
            );
            return labeledMatch
              ? { ...event, category: titleCase(labeledMatch.category) }
              : event;
          })
        );
      }
    } catch (error) {
      console.error("Categorization failed:", error);
    }
  };

  // Scroll category select drop down as needed
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownItemRefs.current[highlightedIndex]) {
      dropdownItemRefs.current[highlightedIndex].scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex, filteredCategories]);

  useEffect(() => {
    dropdownItemRefs.current = [];
  }, [filteredCategories]);

  useEffect(() => {
    getEvents();
  }, []);

  if (isLoading) {
    return (
      <div className={baseContainerClasses}>
        <div>Loading Day View...</div>
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
      <div className="flex flex-col md:w-3/4 md:pr-4 items-start ">
        {/* First column: graph, title */}
        <div className="flex flex-row">
          <div className="bg-gradient-to-tl from-blue-300 to-orange-100 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold text-gray-800 mr-4">
            {day}
          </div>
          <div className="text-l mb-2 pl-2">
            {weekday}, {month} {year}
          </div>
        </div>
        <div className="p-8 rounded-lg shadow-lg">
          <RadarChart
            events={calendarEvents}
            categories={todayCategories.filter(
              (item) => item.category_uid !== "placeholder"
            )}
          />
        </div>
      </div>
      {/* Second column: button and events */}

      <div className="flex flex-col  md:w-1/2 md:pl-4 md:mt-80">
        <div className="flex justify-end items-end space-x-3">
          <button
            onClick={handleSync}
            className="bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex items-center"
          >
            Sync Events
            <ArrowPathRoundedSquareIcon className="h-6 w-6 text-blue-500 ml-2" />
          </button>
          <button
            onClick={handleCategorize}
            className="bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex items-center"
          >
            Categorize
            <SparklesIcon className="h-6 w-6 text-blue-500 ml-2" />
          </button>
        </div>
        {/* events */}
        <div className="flex flex-col flex-grow mt-2 space-y-2 p-1">
          {calendarEvents.map((event, index) => (
            <div key={index} className="flex items-center">
              {editingIndex === index ? (
                // editable
                <div className="relative">
                  <input
                    ref={editedTextRef}
                    type="text"
                    value={editedText}
                    onChange={handleTextChange}
                    onBlur={() => handleBlur()}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="bg-gray-700 rounded-full px-3 py-1 mr-2 outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      width: `${Math.max(editedText.length * 8, 80)}px`,
                    }}
                  />
                  {/* drop down */}
                  <div className="relative" ref={categoryBubbleRef}>
                    <div
                      className={`absolute left-0
                  bg-gray-700 rounded-md shadow-lg z-10
                  overflow-y-auto max-h-48
                  ${expandUp ? "bottom-[100%] mb-10" : "mt-2"}`}
                    >
                      {filteredCategories.map((categoryItem, itemIndex) => (
                        <div
                          key={categoryItem.id}
                          onMouseDown={() =>
                            handleDropdownItemClick(
                              index,
                              categoryItem.category
                            )
                          }
                          ref={(el) =>
                            (dropdownItemRefs.current[itemIndex] = el)
                          }
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-600 transition-colors
                            ${
                              itemIndex === highlightedIndex
                                ? "bg-blue-500"
                                : ""
                            }`}
                        >
                          {categoryItem.category}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleCategoryClick(index)}
                  className="bg-gray-800 rounded-full px-3 py-1 mr-6 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {event.category || "No Category"}
                </div>
              )}

              <span>{event.event_name || ""} </span>
            </div>
          ))}
        </div>
      </div>

      <div className=" fixed top-4 sm:bottom-4  md:top-auto right-4 p-1 rounded-full ">
        <NavButton direction={isMediumScreenOrLarger ? "up" : "down"} />
      </div>
    </div>
  );
};

export default Day;
