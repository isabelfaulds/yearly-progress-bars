import React from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import "./StreakChartOverrides.css";

function GradientDefs() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <radialGradient id="circleGradient4" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#c9eeff" />
        </radialGradient>

        <radialGradient id="circleGradient1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e3f6ff" />
          <stop offset="100%" stopColor="#5e93ab" />
        </radialGradient>

        <radialGradient id="circleGradient2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#99afba" />
          <stop offset="100%" stopColor="#4e7e94" />
        </radialGradient>

        {/* 93a6ba 446677  6A7785*/}
        <radialGradient id="circleGradient3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6A7785" />
          <stop offset="100%" stopColor="#4a5866" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function StreakChart({ data }) {
  if (!data) return null;
  const isMobile = window.innerWidth < 768;
  const today = new Date();

  // Streak day range
  const currentYear = new Date().getFullYear();
  const startDate = new Date(currentYear, 0, 1);
  const endDate = isMobile ? today : new Date(currentYear, 11, 31);

  // Default library fields
  const heatmapData = data.map((item) => ({
    date: item.calendar_date,
    count: item.avg_category_score,
  }));

  return (
    <div className="">
      <GradientDefs />
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={heatmapData}
        classForValue={(value) => {
          if (!value) return "color-empty";
          if (value.count < 0.25) return "color-scale-1";
          if (value.count < 0.5) return "color-scale-2";
          if (value.count < 0.75) return "color-scale-3";
          return "color-scale-4"; // Top tier
        }}
        showWeekdayLabels
      />
    </div>
  );
}

export default StreakChart;
