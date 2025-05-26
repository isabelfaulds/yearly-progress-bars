import { useRef, useEffect } from "react";
import Chart from "chart.js/auto";

function calculateCategoryPercentages(graphEvents, eventCategories, days) {
  const categoryTotals = {};
  const categoryPercentages = [];

  eventCategories.forEach((category) => {
    categoryTotals[category.category] = 0;
  });

  graphEvents.forEach((event) => {
    if (categoryTotals.hasOwnProperty(event.category)) {
      categoryTotals[event.category] += event.minutes;
    }
  });

  eventCategories.forEach((category) => {
    const totalTime = categoryTotals[category.category] || 0;
    const categoryTimeLimit = category.minutes * days;
    const percentage = Math.min((totalTime / categoryTimeLimit) * 100, 100);
    categoryPercentages[category.category] = percentage;
  });

  return categoryPercentages;
}

const RadarChart = ({ events, categories, days = 1 }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const todayResult = calculateCategoryPercentages(events, categories, days);
    const categoryKeys = Object.keys(todayResult);
    const categoryValues = Object.values(todayResult);

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
          legend: { display: false },
        },
        scales: {
          r: {
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
              font: { backgroundColor: "transparent" },
            },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [events, categories, days]);

  return (
    <canvas
      ref={chartRef}
      className="w-full h-80 sm:w-3/4 sm:h-96 md:w-2/3 md:h-96 lg:w-1/2 lg:h-96"
    />
  );
};

export default RadarChart;
