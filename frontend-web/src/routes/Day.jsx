import { useState, useRef, useEffect } from "react";
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import NavButton from "../components/NavButton.jsx";
import { DateTime } from "luxon";
import RadarChart from "../components/RadarChart.jsx";
import { useLocation } from "react-router-dom";

const Day = () => {
  const location = useLocation();
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.toLocaleDateString("en-US", { month: "long" });
  const weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const year = currentDate.toLocaleDateString("en-US", { year: "numeric" });

  function titleCase(str) {
    return str
      .toLowerCase()
      .split(" ")
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }

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
        setTodayCategories(formattedCategories);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [todayCategories, setTodayCategories] = useState([]);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const editedTextRef = useRef(null);

  const handleCategoryClick = (index, currentText) => {
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

    const updatedEvents = calendarEvents.map((event, i) => {
      if (i === index) {
        return { ...event, category: titleCase(editedText) };
      }
      return event;
    });
    setCalendarEvents(updatedEvents);
    setEditingIndex(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      handleBlur(index);
    } else if (e.key === "Escape") {
      setEditingIndex(null);
    }
  };

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
        const responseData = await eventResponse.json();
        getEvents();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  useEffect(() => {
    console.log("Updated - Categories");
    if (location.state?.refreshCategories) {
      getCategories();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    getCategories();
    getEvents();
  }, []);

  return (
    <div
      className="bg-[#000000] 
    /* Layout */
    flex flex-col
    w-screen min-h-screen m-0
    md:flex-row
    
    /* Background */
    bg-[#000000] bg-cover bg-center
    
    /* Spacing */
    pt-5 pl-5 pr-5 px-4 pb-5
    sm:pt-12 sm:pl-20 sm:px-20
    
    text-white"
    >
      <div className="flex flex-col md:w-3/4 md:pr-4 items-start ">
        {" "}
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
          <RadarChart events={calendarEvents} categories={todayCategories} />
        </div>
      </div>
      {/* Second column: button and events */}

      <div className="flex flex-col  md:w-1/2 md:pl-4 md:mt-80">
        <div className="flex justify-end items-end">
          <button
            onClick={handleSync}
            className="bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none border-2 border-transparent hover:border-gray-800 hover:bg-gray-700 transition-colors flex items-center"
          >
            Sync Events
            <ArrowPathRoundedSquareIcon className="h-6 w-6 text-blue-500 ml-2" />
          </button>
        </div>
        {/* events */}
        <div className="flex flex-col flex-grow mt-2 space-y-2 p-1">
          {calendarEvents.map((event, index) => (
            <div key={index} className="flex items-center">
              {editingIndex === index ? (
                <input
                  ref={editedTextRef}
                  type="text"
                  value={editedText}
                  onChange={handleTextChange}
                  onBlur={() => handleBlur(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="bg-gray-700 rounded-full px-3 py-1 mr-2 outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: `${Math.max(editedText.length * 8, 80)}px` }}
                />
              ) : (
                <div
                  onClick={() => handleCategoryClick(index, event.category)}
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
        <NavButton />
      </div>
    </div>
  );
};

export default Day;
