import React from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import "./HeatMapOverrides.css";

const today = new Date();
const values = [
  { date: "2025-01-01", count: 2 },
  { date: "2025-01-02", count: 2 },
  { date: "2025-01-03", count: 4 },
  { date: "2025-02-30", count: 5 },
  { date: "2025-06-30", count: 10 },
  { date: "2025-04-30", count: 10 },
  { date: "2025-05-30", count: 2 },
];

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

function StreakChart() {
  return (
    <div>
      <GradientDefs />
      <CalendarHeatmap
        startDate={new Date("2025-01-01")}
        endDate={today}
        values={values}
        classForValue={(value) => {
          if (!value) return "color-empty";
          if (value.count < 3) return "color-scale-1";
          if (value.count < 7) return "color-scale-2";
          if (value.count > 7) return "color-scale-3";

          return "color-scale-3";
        }}
        showWeekdayLabels
      />
    </div>
  );
}

export default StreakChart;
