import { useState, useRef, useEffect } from "react";
import Chart from "chart.js/auto";
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import NavButton from "../components/NavButton.jsx";

function calculateCategoryPercentages(todayEvents, todayCategories) {
  const categoryTotals = {};
  const categoryPercentages = [];

  todayCategories.forEach((category) => {
    categoryTotals[category.Category] = 0;
  });

  // sum
  todayEvents.forEach((event) => {
    if (categoryTotals.hasOwnProperty(event.Category)) {
      categoryTotals[event.Category] += event.Time;
    }
  });

  // percentage
  todayCategories.forEach((category) => {
    const totalTime = categoryTotals[category.Category] || 0;
    const categoryTimeLimit = category.Time;
    const percentage = Math.min((totalTime / categoryTimeLimit) * 100, 100);
    categoryPercentages[category.Category] = percentage;
  });

  return categoryPercentages;
}

const Day = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  // TODO: remove dummy data
  const [calendarEvents, setCalendarEvents] = useState([
    {
      Category: "Cat1",
      Event: "Extra long event with many things happening3",
      Time: 0,
    },
    {
      Category: "Cat2",
      Event: "Extra long event with many things happening",
      Time: 15,
    },
    {
      Category: "Cat3",
      Event: "Extra long event with many things happening2",
      Time: 10,
    },
    {
      Category: "Cat3",
      Event: "Extra long event with many things happening4",
      Time: 10,
    },
    {
      Category: "Cat3",
      Event: "Extra long event with many things happening45",
      Time: 10,
    },
    {
      Category: "Cat3",
      Event: "Extra long event with many things happening456",
      Time: 10,
    },
  ]);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const editedTextRef = useRef(null);

  // TODO : replace with nosql call
  const handleSync = async () => {
    try {
      const authCheckResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_AUTH_CHECK,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (authCheckResponse.status === 200) {
        // TODO: remove dummy data

        setCalendarEvents([
          { Category: "Cat1", Event: "EventA", Time: 0 },
          { Category: "Cat2", Event: "EventA", Time: 15 },
          { Category: "Cat3", Event: "EventA", Time: 10 },
          { Category: "Cat3", Event: "EventA", Time: 10 },
        ]);
      }
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

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
        return { ...event, Category: editedText };
      }
      return event;
    });
    setCalendarEvents(updatedEvents);
    setEditingIndex(null);
    renderChart(updatedEvents);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter") {
      handleBlur(index);
    } else if (e.key === "Escape") {
      setEditingIndex(null);
    }
  };

  // chart
  const renderChart = (events) => {
    // TODO: remove dummy data

    let todayCategories = [
      { Category: "Cat1", Time: 60 },
      { Category: "Cat2", Time: 20 },
      { Category: "Cat3", Time: 60 },
      { Category: "Cat4", Time: 20 },
    ];
    let todayResult = calculateCategoryPercentages(events, todayCategories);
    let categoryKeys = Object.keys(todayResult);
    let categoryValues = Object.values(todayResult);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    const ctx = chartRef.current.getContext("2d");

    chartInstance.current = new Chart(ctx, {
      type: "radar",
      data: {
        labels: categoryKeys,
        datasets: [
          {
            label: "",
            data: categoryValues,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "rgb(255, 99, 132)",
            pointBackgroundColor: "rgb(255, 99, 132)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgb(255, 99, 132)",
            fill: true,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          r: {
            // radar chart scales under 'r'
            angleLines: {
              display: true,
              color: "rgba(255, 255, 255, 0.9)",
            },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: {
              display: false,
              stepSize: 1,
              color: "#FFFFFF",
              backdropColor: "transparent",
              showLabelBackdrop: false,
            },
            pointLabels: {
              fontSize: 16,
              color: "#FFFFFF",
              backdropColor: "transparent",
              font: {
                backgroundColor: "transparent",
              },
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  };

  useEffect(() => {
    renderChart(calendarEvents);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [calendarEvents]);

  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.toLocaleDateString("en-US", { month: "long" });
  // .toUpperCase();
  const weekday = currentDate.toLocaleDateString("en-US", { weekday: "long" });
  const year = currentDate.toLocaleDateString("en-US", { year: "numeric" });

  // .toCase();

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
          <canvas
            ref={chartRef}
            className="w-full h-80 sm:w-3/4 sm:h-96 md:w-2/3 md:h-96 lg:w-1/2 lg:h-96"
          />
        </div>
      </div>
      {/* Second column: button and events */}

      <div className="flex flex-col  md:w-1/2 md:pl-4 md:mt-80">
        <div className="flex justify-end items-end">
          <button
            onClick={handleSync()}
            className="bg-gradient-to-tl from-black-300 to-gray-800 p-3 rounded-full shadow-lg focus:outline-none hover:border-2 flex items-center"
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
                  onClick={() => handleCategoryClick(index, event.Category)}
                  className="bg-gray-800 rounded-full px-3 py-1 mr-6 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {event.Category || "No Category"}
                </div>
              )}

              <span>{event.Event || ""} </span>
            </div>
          ))}
        </div>
      </div>

      <div className=" fixed top-4 sm:bottom-2  md:top-auto right-4 p-1 rounded-full ">
        <NavButton />
      </div>
    </div>
  );
};

export default Day;
