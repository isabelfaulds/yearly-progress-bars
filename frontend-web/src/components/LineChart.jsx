import { useRef, useEffect } from "react";
import { Chart, registerables, Colors } from "chart.js";
import { format } from "date-fns";

Chart.register(...registerables, Colors);
Chart.defaults.font.family = "Inter";

function calculateDatasets(events, categories, daysArray) {
  const categoriesMap = new Map();
  categories.forEach((cat) => {
    categoriesMap.set(cat.category, cat);
  });
  // 1. Initialize datasets for each category with 0s for each day, ie {'Mindfulness': [0, 0, ...] , ...}
  let category_datasets = {};
  for (const category of categories) {
    category_datasets[category.category] = new Array(daysArray.length).fill(0);
  }
  // 2. Add each event's minutes to corresponding category's day index
  for (const event of events) {
    const dayIndex = daysArray.indexOf(event.start_date); // Both are'YYYY-MM-DD'
    if (category_datasets[event.category] && dayIndex !== -1) {
      category_datasets[event.category][dayIndex] += event.minutes;
    } else {
      console.warn(
        `Event with category '${event.category}' or date '${event.start_date}' could not be processed.`
      );
    }
  }
  // 3. Divide each day's total minutes by its category's time, convert to whole percentage
  const finalCategoryPercentages = {};
  // category dataset keys category names
  for (const categoryName in category_datasets) {
    if (category_datasets.hasOwnProperty(categoryName)) {
      // Skip prototype properties
      const dailyMinutesArray = category_datasets[categoryName];
      const categoryData = categoriesMap.get(categoryName);
      if (categoryData && categoryData.minutes !== undefined) {
        const categoryTime = categoryData.minutes;
        // iterate through the indices of the day arrays
        finalCategoryPercentages[categoryName] = dailyMinutesArray.map(
          (dailyMinutes) => {
            if (categoryTime === 0) {
              // Avoid division by zero
              return 1;
            }
            const percentage = (dailyMinutes / categoryTime) * 100;
            return Math.min(percentage, 100);
          }
        );
      } else {
        finalCategoryPercentages[categoryName] = new Array(
          daysArray.length
        ).fill(0);
        console.warn(`Missing minutes limit for category: ${categoryName}.`);
      }
    }
  }
  console.log("finalCategoryPercentages", finalCategoryPercentages);
  return finalCategoryPercentages;
}

function chartjsDatasets(categoryDatasets) {
  const palette = [
    "rgb(0,191,255)", // Blue
    "rgb(227,145,74)", // Orange
    "rgb(75, 192, 192)", // Teal
    "rgb(251, 89, 121)", // "Red" (Pink)
    "rgb(255, 214, 73)", // Yellow
    "rgb(162,155,254)", // Light Purple
    "rgb(125,7,255)", // Purple
    "rgb(102, 255, 153)", // Light Green
    "rgb(83, 102, 255)", // Indigo
  ];
  const datasets = [];
  let colorIndex = 0;
  for (const categoryName in categoryDatasets) {
    const baseColor = palette[colorIndex % palette.length];
    const backgroundColor = baseColor
      .replace("rgb(", "rgba(")
      .replace(")", `, 0.2)`); // 20% opacity
    const graphLine = {
      label: categoryName,
      data: categoryDatasets[categoryName],
      tension: 0.4,
      fill: true,
      borderColor: baseColor, // background fill full opacity
      backgroundColor: backgroundColor,
    };
    datasets.push(graphLine);
    colorIndex++;
  }
  return datasets;
}

const LineChart = ({ events, categories, daysArray }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  console.log("daysArray", daysArray);

  useEffect(() => {
    const results = calculateDatasets(events, categories, daysArray);
    const data = {
      labels: daysArray,
      datasets: chartjsDatasets(results),
    };
    console.log(data);

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    const options = {
      display: true,
      responsive: true,
      maintainAspectRatio: false,
      fullSize: true,
      plugins: {
        legend: {
          position: "bottom",
          align: "start",
          labels: {
            color: "#FFFFFF",
            font: {
              size: 13,
              weight: "normal",
            },
            boxWidth: 15,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 10,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
      colors: {
        forceOverride: true,
      },
      scales: {
        x: {
          type: "category", // 'category' for string labels
          ticks: {
            color: "#FFFFFF",
            callback: function (val, index, ticks) {
              const dateString = this.getLabelForValue(val);
              const date = new Date(dateString + "T00:00:00");
              return [
                format(date, "EEE"), // First Line Short Day
                format(date, "MMM d"), // Second Line Short Month , day
              ];
            },
            autoSkip: true, // Try to skip labels if they overlap
            maxRotation: 0, // Prevent rotating
            minRotation: 0, // Prevent rotating
            stepSize: daysArray.length > 7 ? 2 : 1, // Skip labels
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
          },
        },
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false,
      },
    };

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: data,
      options: options,
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [events, categories, daysArray]);

  return <canvas ref={chartRef} className="w-full h-full" />;
};

export default LineChart;
