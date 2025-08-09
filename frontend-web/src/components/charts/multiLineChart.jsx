import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { format } from "date-fns";

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
            const roundedPercentage = Math.round(percentage);
            return Math.min(roundedPercentage, 100);
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

  return finalCategoryPercentages;
}

const LineChartECharts = ({
  events,
  categories,
  daysArray,
  showLegend = true,
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const results = calculateDatasets(events, categories, daysArray);

    if (results && Object.keys(results).length > 0) {
      // Convert Chart.js dataset format to ECharts series
      console.log("results", results);

      const sortedKeys = Object.keys(results).sort();
      // Create gradient color map aligned with sorted keys

      const baseColors = [
        [74, 122, 255], // periwinkle
        [240, 109, 101], // coral
        [75, 192, 192], // teal
        [255, 206, 86], // warm yellow
        [153, 102, 255], // purple
        [230, 34, 96], // cherry
        [143, 225, 255], // pale sky
        [17, 179, 14], // forest green
        [255, 159, 64], // orange
        [243, 128, 255], // pink!!!
        [40, 250, 184], // mint
        [147, 46, 201], // plum
        [10, 105, 145], // navy
        [225, 250, 0], // chartreuse
      ];

      // reuse colors after first pass of baseColors , > 14 categories
      const colorMap = sortedKeys.reduce((acc, key, i) => {
        const [r, g, b] = baseColors[i % baseColors.length];
        acc[key] = {
          gradient: new echarts.graphic.LinearGradient(0, 0, 0.0, 1, [
            { offset: 0, color: `rgba(${r},${g},${b},0.1)` },
            { offset: 1, color: `rgba(${r},${g},${b},0.7)` },
          ]),
          rgb: `rgb(${r},${g},${b})`,
        };
        return acc;
      }, {});
      console.log("colorMap", colorMap);

      const series = Object.entries(results).map(([label, data]) => ({
        name: label,
        type: "line",
        smooth: true,
        data: data,
        symbol: "pin",
        symbolSize: 6,
        lineStyle: {
          width: 2,
        },
        itemStyle: {
          color: colorMap[label].rgb,
        },
        areaStyle: {
          color: colorMap[label].gradient,
        },
      }));

      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
      }

      const option = {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line" },
          backgroundColor: "#49585e",
          borderColor: "rgb(137, 180, 201)",
          borderWidth: 2,
          textStyle: {
            color: "#fff",
            fontSize: 12,
            fontFamily: "Inter",
          },
          padding: 10,
          extraCssText:
            "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); border-radius: 5px;",
          formatter: function (params) {
            // params - array of series data for the X value date
            let dateLabel = params[0].axisValue;
            let html = `<div style="margin-bottom: 5px;">${dateLabel}</div>`;

            // Add extra line before listing series
            html += `<div style="margin-bottom: 5px; font-weight: light;">Fulfillment Score</div>`;

            // Loop through each series and render its line
            params.forEach((item) => {
              html += `
        <div style="display: flex; justify-content: space-between; line-height: 20px;">
          <div style="flex: 1; text-align: left; display: flex; align-items: center;">
            <span style="display:inline-block;margin-right:8px;border-radius:50%;width:8px;height:8px;background-color:${item.color};"></span>
            ${item.seriesName}
          </div>
          <div>&nbsp;&nbsp;${item.data}</div>
        </div>
      `;
            });

            return html;
          },
        },

        legend: {
          show: showLegend,
          bottom: 0,
          left: "left",
          textStyle: {
            color: "#FFFFFF",
            fontSize: 13,
            fontFamily: "Inter",
            lineHeight: 15, // Increase vertical spacing between lines (multi-line)
            padding: [0, 4, 0, 2], // Extra space around the text itself
          },
          icon: "circle", // also accepts svg path , img path
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 20, // spacing between legend items
          data: sortedKeys,
        },
        grid: {
          left: "3%",
          right: "3%",
          bottom: "15%",
          containLabel: true,
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: daysArray,
          axisLabel: {
            color: "#FFFFFF",
            formatter: (value) => {
              const date = new Date(value + "T00:00:00");
              return `${format(date, "EEE")}\n${format(date, "MMM d")}`;
            },
          },
          axisLine: {
            lineStyle: { color: "rgba(255,255,255,0.1)" },
          },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          min: 0,
          max: 100,
          interval: 20,
          axisLabel: {
            color: "#FFFFFF",
          },
          splitLine: {
            lineStyle: { color: "rgba(255,255,255,0.1)" },
          },
        },
        series,
      };

      chartInstance.current.setOption(option);
    }

    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [events, categories, daysArray, showLegend]);

  return <div ref={chartRef} className="w-full h-full" />;
};

export default LineChartECharts;
