import { useState, useRef, useEffect } from "react";
import Chart from "chart.js/auto";
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import { useAuthContext } from "../hooks/useAuth.jsx";
import { Bars2Icon } from "@heroicons/react/24/solid";
import NavButton from "../components/NavButton.jsx";

const Day = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [calendarEvents, setCalendarEvents] = useState([
    ["Cat1", "EventA", 60],
    ["Cat2", "EventB", 20],
    ["Cat3", "EventC", 10],
    ["Cat4", "EventD", 10],
  ]);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editedText, setEditedText] = useState("");
  const editedTextRef = useRef(null);

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
        setCalendarEvents([
          ["Category1", "Event2"],
          ["Category3", "Event4"],
          ["Category5", "Event6"],
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
        return [editedText, event[1]];
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

  useEffect(() => {
    const dailyMotivators = {
      Cat1: 0,
      Cat2: 1,
      Cat3: 1,
      Cat4: 0,
    };
    let motivatorKeys = Object.keys(dailyMotivators);
    let motivatorValues = Object.values(dailyMotivators);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    const ctx = chartRef.current.getContext("2d");

    chartInstance.current = new Chart(ctx, {
      type: "radar",
      data: {
        labels: motivatorKeys,
        datasets: [
          {
            label: "",
            data: motivatorValues,
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
            suggestedMax: 1,
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

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="bg-[#000000] bg-cover bg-center w-screen min-h-screen m-0 flex flex-col md:flex-row pt-10 pl-1 sm:pt-12 sm:pl-20 px-4 sm:px-20">
      <div className="flex flex-col md:w-3/4 md:pr-4 items-start">
        {" "}
        {/* First column: graph, title */}
        <div className="text-white text-2xl font-bold mb-4">
          Day Events Chart
        </div>
        <div className="p-8 rounded-lg shadow-lg">
          <canvas ref={chartRef} width="400" height="400" />
        </div>
      </div>
      {/* Second column: button and events */}

      <div className="flex flex-col md:w-1/2 md:pl-4 md:mt-80">
        <div className="flex justify-end items-end">
          <button
            onClick={() => (window.location.href = "/")}
            className="p-3 text-white rounded-full shadow-lg focus:outline-none hover:border-2 flex items-center"
          >
            Sync Calendar Events
            <ArrowPathRoundedSquareIcon className="h-6 w-6 text-blue-500 ml-2" />
          </button>
        </div>
        <div className="flex flex-col mt-4 space-y-2">
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
                  className="bg-gray-700 text-white rounded-full px-3 py-1 mr-2 outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: `${Math.max(editedText.length * 8, 80)}px` }}
                />
              ) : (
                <div
                  onClick={() => handleCategoryClick(index, event[0])}
                  className="bg-gray-800 text-white rounded-full px-3 py-1 mr-6 mb-1 cursor-pointer hover:bg-gray-700 transition-colors"
                >
                  {event[0] || "No Category"}
                </div>
              )}

              <span className="text-white">{event[1] || ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-4 right-4 p-3 text-white rounded-full ">
        <NavButton />
      </div>
    </div>
  );
};

export default Day;
