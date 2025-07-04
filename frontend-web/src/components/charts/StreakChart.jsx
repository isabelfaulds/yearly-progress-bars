import React from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import "./StreakChartOverrides.css";

function GradientDefs() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <radialGradient id="circleGradient3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93a6ba" />
          <stop offset="100%" stopColor="#446677" />
        </radialGradient>

        <radialGradient id="circleGradient2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8C9EB1" />
          <stop offset="100%" stopColor="#525d69" />
        </radialGradient>

        <radialGradient id="circleGradient1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6A7785" />
          <stop offset="100%" stopColor="#2E3841" />
        </radialGradient>
      </defs>
    </svg>
  );
}

const values = [
  { calendar_date: "2025-01-02", avg_category_score: 0.9 },
  { calendar_date: "2025-01-03", avg_category_score: 0.4 },
  { calendar_date: "2025-01-05", avg_category_score: 0.2 },
];

function StreakChart({ data = values }) {
  // Get first day of current year
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1); // January 1st of current year
  const endDate = new Date(currentYear, 11, 31); // December 31st of current year

  // Default library fields
  const heatmapData = data.map((item) => ({
    date: item.calendar_date,
    count: item.avg_category_score,
  }));

  return (
    <div>
      <GradientDefs />
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={heatmapData}
        classForValue={(value) => {
          if (!value) return "color-empty";
          if (value.count < 0.3) return "color-scale-1";
          if (value.count < 0.6) return "color-scale-2";
          return "color-scale-3"; // Top tier
        }}
        showWeekdayLabels
      />
    </div>
  );
}

export default StreakChart;
