import React, { useEffect, useState } from "react";
import "../index.css";
import { Bars2Icon } from "@heroicons/react/24/solid";
import { min } from "mathjs";

const ProgressBar = () => {
  const [dayStartHourSetting, setDayStartHourSetting] = useState(
    localStorage.getItem("dayStartHourSetting") || "00:00 AM"
  );

  const [dayEndHourSetting, setDayEndHourSetting] = useState(
    localStorage.getItem("dayEndHourSetting") || "11:59 PM"
  );

  const calculateYearProgress = () => {
    const start = performance.now();
    const options = {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    const nowInPST = new Date(new Date().toLocaleString("en-US", options));

    const parseTime = (timeString) => {
      const [time, period] = timeString.split(" ");
      let [hours, minutes] = time
        .split(":")
        .map((num, idx) =>
          idx === 0
            ? (parseInt(num, 10) % 12) +
              (period === "PM" && num !== "12" ? 12 : 0)
            : parseInt(num, 10)
        );
      return [hours, minutes];
    };
    const [startHr, startMin] = parseTime(dayStartHourSetting);
    const [endHr, endMin] = parseTime(dayEndHourSetting);

    // Year
    const startOfYear = new Date(nowInPST.getFullYear(), 0, 1); // January 1st of current year
    const endOfYear = new Date(nowInPST.getFullYear() + 1, 0, 1); // December 31st of current year

    const totalYearDuration = endOfYear - startOfYear;
    const elapsedYearTime = nowInPST - startOfYear;

    const progress = ((elapsedYearTime / totalYearDuration) * 100) % 100;

    // progress bar width
    document.getElementById("yearProgress").style.width = progress + "%";
    // percentage with 8 decimal places
    document.getElementById("yearProgressPercentage").textContent =
      progress.toFixed(7) + "%";

    // Month
    const monthdateInPST = new Date(
      new Date().toLocaleString("en-US", options)
    );

    // Start of the Month
    const startOfMonth = new Date(
      monthdateInPST.getFullYear(),
      monthdateInPST.getMonth(),
      1
    );
    startOfMonth.setHours(0, 0, 0, 0); // Set time to midnight

    // End of the Month
    const endOfMonth = new Date(
      monthdateInPST.getFullYear(),
      monthdateInPST.getMonth() + 1,
      0
    );
    endOfMonth.setHours(23, 59, 59, 999); // Set time to the last moment of the day

    const totalMonthDuration = endOfMonth - startOfMonth;
    const elapsedMonthTime = monthdateInPST - startOfMonth;

    const monthProgress = ((elapsedMonthTime / totalMonthDuration) * 100) % 100;

    // progress bar width
    document.getElementById("monthProgress").style.width = monthProgress + "%";
    // percentage with 8 decimal places
    document.getElementById("monthProgressPercentage").textContent =
      monthProgress.toFixed(7) + "%";

    // Week
    const weekdayInPST = new Date(new Date().toLocaleString("en-US", options));
    const startOfWeek = new Date(weekdayInPST);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek); // Create a new Date object to avoid modifying startOfWeek
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Add 6 days to get to Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    const totalWeekDuration = endOfWeek - startOfWeek;
    const elapsedWeekTime = weekdayInPST - startOfWeek;

    const weekProgress = ((elapsedWeekTime / totalWeekDuration) * 100) % 100;

    // progress bar width
    document.getElementById("weekProgress").style.width = weekProgress + "%";
    // percentage with 8 decimal places
    document.getElementById("weekProgressPercentage").textContent =
      weekProgress.toFixed(7) + "%";

    // Day
    const dayInPST = new Date(new Date().toLocaleString("en-US", options));
    const startOfToday = new Date(nowInPST.setHours(startHr, startMin, 0, 0));
    const endOfToday = new Date(nowInPST.setHours(endHr, endMin, 59, 999));
    const totalDayDuration = endOfToday - startOfToday;
    const elapsedDayTime = dayInPST - startOfToday;
    const dayProgress = min((elapsedDayTime / totalDayDuration) * 100, 100);

    // progress bar width
    document.getElementById("dayProgress").style.width = dayProgress + "%";
    // percentage with 8 decimal places
    document.getElementById("dayProgressPercentage").textContent =
      dayProgress >= 100 ? "💯%" : dayProgress.toFixed(7) + "%";

    // Shake the hourglasses a little
    const secondsPST = new Date(new Date().toLocaleString("en-US", options));
    const seconds = secondsPST.getSeconds();
    const rightHourglassElement = document.getElementById("right-hourglass");
    const leftHourglassElement = document.getElementById("left-hourglass");
  };
  useEffect(() => {
    const interval = setInterval(calculateYearProgress, 1);
    window.onload = calculateYearProgress;
    return () => clearInterval(interval);
  }, [dayStartHourSetting, dayEndHourSetting]);

  return (
    <div className="App">
      <div className="bg-cover bg-center w-screen h-screen bg-[url('https://s3.us-west-1.amazonaws.com/year-progress-bar.com/images/blue-gradient-background.svg')] ">
        <div class="flex flex-col justify-center h-screen w-fit mx-auto min-w-[10rem] sm:min-w-[20rem] ">
          <div class="mt-4 mb-3 sm:mb-7">
            <div class="mb-1 text-sm sm:text-base">Annual</div>
            <div className="progress-bar">
              <div className="progress" id="yearProgress"></div>
            </div>
            <div class="mt-2 text-xs sm:text-base" id="yearProgressPercentage">
              0.00000000%
            </div>
          </div>

          <div class="mt-4 mb-3 sm:mb-7">
            <div class="mb-1 text-sm sm:text-base">Month</div>
            <div className="progress-bar">
              <div className="progress" id="monthProgress"></div>
            </div>
            <div
              className="mt-2 text-xs sm:text-base"
              id="monthProgressPercentage"
            >
              0.00000000%
            </div>
          </div>

          <div class="mt-4 mb-3 sm:mb-7">
            <div class="mb-1 text-sm sm:text-base">Week</div>
            <div className="progress-bar">
              <div className="progress" id="weekProgress"></div>
            </div>
            <div
              className="mt-2 text-xs sm:text-base"
              id="weekProgressPercentage"
            >
              0.00000000%
            </div>
          </div>

          <div class="mt-4 mb-3 sm:mb-7">
            <div class="mb-1 text-sm sm:text-base">Day</div>
            <div className="progress-bar">
              <div className="progress" id="dayProgress"></div>
            </div>
            <div
              className="mt-2 text-xs sm:text-base"
              id="dayProgressPercentage"
            >
              0.00000000%
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 right-4 p-3 text-white rounded-full ">
          <button
            onClick={() => (window.location.href = "/settings")}
            className="flex items-center justify-center w-12 h-12 rounded-full shadow-lg focus:outline-none hover:border-2"
          >
            <Bars2Icon className="w-6 h-6 drop-shadow-[0_0_1px_white]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
