import React from "react";
import ReactECharts from "echarts-for-react"; // Or ReactEChartsCore for more control
import * as echarts from "echarts";
import useMediaQuery from "@/hooks/useMediaQuery";

function calculateCategoryPercentages(graphEvents, eventCategories, days) {
  const categoryTotals = {};
  const categoryLabels = [];
  const categoryValues = [];

  eventCategories.forEach((category) => {
    categoryTotals[category.category] = 0;
    categoryLabels.push(category.category);
  });

  graphEvents.forEach((event) => {
    if (categoryTotals.hasOwnProperty(event.category)) {
      categoryTotals[event.category] += event.minutes;
    }
  });

  eventCategories.forEach((category) => {
    const totalTime = categoryTotals[category.category] || 0;
    const categoryTimeLimit = category.minutes * days;
    const percentage = Math.min(
      Math.round((totalTime / categoryTimeLimit) * 100),
      100
    );
    categoryValues.push(percentage);
  });

  return { labels: categoryLabels, values: categoryValues };
}

const RadarChart = ({
  events,
  categories,
  days = 1,
  compact = false,
  muted = false,
}) => {
  var isScreenLarge = useMediaQuery("(min-width: 460px)");
  if (compact) {
    isScreenLarge = false;
  }

  if (!events || !categories || categories.length === 0) return null;
  const { labels: categoryKeys, values: categoryValues } =
    calculateCategoryPercentages(events, categories, days);

  const getOption = () => {
    const indicators = categoryKeys.map((key) => ({
      name: key,
      max: 100, // Set maximum value for each indicator
      min: 0, // Set minimum value for each indicator
    }));

    return {
      tooltip: {
        trigger: "item", // Show tooltip on hover
        backgroundColor: "#49585e", // Dark background
        borderColor: "#333", // Optional border
        borderWidth: 1,
        textStyle: {
          color: "#fff", // White text
          fontSize: 12,
          fontFamily: "Inter",
        },
        padding: 10,
        extraCssText:
          "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); border-radius: 5px;",
      },
      legend: {
        show: false,
      },
      // Radar chart configuration
      radar: {
        indicator: indicators, // axes
        center: ["50%", "50%"], // Center of the radar chart
        radius: isScreenLarge ? "62%" : "50%",
        shape: "circle",
        startAngle: 90, // Starting angle of the first axis
        splitNumber: 4, // concentric circles
        // labels
        name: {
          formatter: (name) =>
            name.length > 8 ? name.replace(" ", "\n") : name,
          color: "#FFFFFF",
          backgroundColor: "#3b4652",
          fontSize: isScreenLarge ? 13 : 10,
          fontFamily: "Lexend",
          borderRadius: 8,
          padding: [5, 7],
        },
        axisLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.8)", // angle lines
          },
        },
        splitLine: {
          lineStyle: {
            color: "rgba(255, 255, 255, 0.5)", // concentric circle lines
          },
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: [
              // same color option commented out
              new echarts.graphic.RadialGradient(0.1, 0.9, 1, [
                {
                  offset: 0,
                  color: "rgba(73, 88, 94, 0.8)", // Center
                },
                {
                  offset: 1,
                  color: "rgba(73, 88, 94, 1)", // Outer edge
                },
              ]),
              // new echarts.graphic.RadialGradient(0.5, 0.5, 0.1, [
              //   {
              //     offset: 0,
              //     color: "rgba(73, 88, 94, 0.8)", // Center
              //   },
              //   {
              //     offset: 1,
              //     color: "rgba(201, 238, 255, 1)", // Outer edge
              //   },
              // ]),
              new echarts.graphic.RadialGradient(0.5, 0.5, 0.38, [
                {
                  offset: 0,
                  color: "rgba(73, 88, 94, 0.8)", // Center
                },
                {
                  offset: 1,
                  color: "rgba(99, 119, 128, 1)", // Outer edge
                },
              ]),
              // new echarts.graphic.RadialGradient(0.5, 0.5, 0.4, [
              //   {
              //     offset: 0,
              //     color: "rgba(73, 88, 94, 0.8)", // Center
              //   },
              //   {
              //     offset: 1,
              //     color: "rgba(201, 238, 255, 1)", // Outer edge
              //   },
              // ]),
              new echarts.graphic.RadialGradient(0.5, 0.5, 0.45, [
                {
                  offset: 0,
                  color: "rgba(99, 119, 128, 0.8)", // Center
                },
                {
                  offset: 1,
                  color: "rgba(149, 178, 191, 1)", // Outer edge
                },
              ]),
              // new echarts.graphic.RadialGradient(0.5, 0.5, 0.45, [
              //   {
              //     offset: 0,
              //     color: "rgba(73, 88, 94, 0.8)", // Center
              //   },
              //   {
              //     offset: 1,
              //     color: "rgba(201, 238, 255, 1)", // Outer edge
              //   },
              // ]),
              new echarts.graphic.RadialGradient(0.5, 0.5, 0.45, [
                {
                  offset: 0,
                  color: "rgba(76, 197, 207, 0.8)", // Center
                },
                {
                  offset: 1,
                  color: muted
                    ? "rgba(191,208,216, 1)"
                    : "rgba(201, 238, 255, 1)", // Outer edge
                },
              ]),
            ], // shaded areas innermost to outermost
          },
        },
      },
      series: [
        {
          name: "Stats",
          type: "radar",
          //   cant smooth radar, would have to be polar coordinates
          smooth: false,
          data: [
            {
              value: categoryValues,
              name: "Time Amounts", // tooltip label
              itemStyle: {
                // Style for the data point itself (and line connecting them)
                color: "rgba(255, 197, 71, 1)", // Point color
              },
              lineStyle: {
                color: "rgba(255, 197, 71, 1)", // Line color
                width: 2,
              },
              areaStyle: {
                color: new echarts.graphic.RadialGradient(0.2, 0.2, 0.5, [
                  {
                    offset: 0,
                    color: "rgba(250, 252, 174, 1)", // inner color
                  },
                  {
                    offset: 1,
                    color: "rgba(255, 197, 71, 1)", // outer color
                  },
                ]),
              },
              symbol: "pin", // Shape of the data points
              symbolSize: 12, // Size of the data points
            },
          ],
          // Hover effects
          emphasis: {
            // point
            itemStyle: {
              color: "#fceee8",
              borderColor: "rgb(230, 116, 55)",
              borderWidth: 1,
            },
          },
        },
      ],
      grid: {
        containLabel: true, // Ensures labels are not cut off
      },
    };
  };

  return (
    <ReactECharts
      option={getOption()}
      className="w-full h-96 sm:w-3/4 sm:h-96 md:w-2/3 md:h-96 lg:w-1/2 lg:h-96"
      style={{ height: "350px", width: "100%" }}
    />
  );
};

export default RadarChart;
