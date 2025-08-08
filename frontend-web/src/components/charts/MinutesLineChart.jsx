import { useRef, useEffect } from "react";
import { Chart, registerables, Colors } from "chart.js";
import { format } from "date-fns";

Chart.register(...registerables, Colors);
Chart.defaults.font.family = "Inter";

const SessionMinutesLineChart = ({ sessions, showLegend = true }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.event_startdate) - new Date(b.event_startdate)
    );
    const xAxisDates = sortedSessions.map((session) => session.event_startdate); // 2025-04-25 , 2025-08-05
    const yAxisMinutes = sortedSessions.map((session) => session.minutes); // 30 , 30
    const data = {
      labels: xAxisDates,
      datasets: [
        {
          label: "Minutes",
          data: yAxisMinutes,
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
          barPercentage: 0.2, // Narrow bars
          categoryPercentage: 0.8,
        },
      ],
    };
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
          display: showLegend,
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
            stepSize: xAxisDates.length > 7 ? 2 : 1, // Skip labels
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          min: 0,
          ticks: {
            stepSize: 20,
            color: "#b3fcfc",
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
      type: "bar",
      data: data,
      options: options,
    });
    return () => {
      chartInstance.current?.destroy();
    };
  }, [sessions]);

  return <canvas ref={chartRef} className="w-full h-full" />;
};

export default SessionMinutesLineChart;
