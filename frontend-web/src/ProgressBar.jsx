
import React, { useEffect } from "react";
import './App.css'; // Import the CSS file

const ProgressBar = () => {
  useEffect(() => {
    function calculateYearProgress() {
        const start = performance.now();
        const options = { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        const nowInPST = new Date(new Date().toLocaleString('en-US', options));
  
        // Year
        const startOfYear = new Date(nowInPST.getFullYear(), 0, 1); // January 1st of current year
        const endOfYear = new Date(nowInPST.getFullYear() + 1, 0, 1); // December 31st of current year
  
        const totalYearDuration = endOfYear - startOfYear;
        const elapsedYearTime = nowInPST - startOfYear;
  
        const progress = ((elapsedYearTime / totalYearDuration) * 100 ) % 100;
  
        // progress bar width
        document.getElementById('yearProgress').style.width = progress + '%';
        // percentage with 8 decimal places
        document.getElementById('yearProgressPercentage').textContent = progress.toFixed(8) + '%';
  
  
        // Month
        const monthdateInPST = new Date(new Date().toLocaleString('en-US', options));
  
        // Start of the Month
        const startOfMonth = new Date(monthdateInPST.getFullYear(), monthdateInPST.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0); // Set time to midnight
  
        // End of the Month
        const endOfMonth = new Date(monthdateInPST.getFullYear(), monthdateInPST.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999); // Set time to the last moment of the day
  
        const totalMonthDuration = endOfMonth - startOfMonth;
        const elapsedMonthTime = monthdateInPST - startOfMonth;
  
        const monthProgress = ((elapsedMonthTime / totalMonthDuration) * 100 ) % 100;
  
        // progress bar width
        document.getElementById('monthProgress').style.width = monthProgress + '%';
        // percentage with 8 decimal places
        document.getElementById('monthProgressPercentage').textContent = monthProgress.toFixed(8) + '%';
  
        // Week
        const weekdayInPST = new Date(new Date().toLocaleString('en-US', options));
        const startOfWeek = new Date(weekdayInPST);
        const dayOfWeek = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0)
        const endOfWeek = new Date(startOfWeek); // Create a new Date object to avoid modifying startOfWeek
        endOfWeek.setDate(endOfWeek.getDate() + 6); // Add 6 days to get to Saturday
        endOfWeek.setHours(23, 59, 59, 999);
        
        const totalWeekDuration = endOfWeek - startOfWeek;
        const elapsedWeekTime = weekdayInPST - startOfWeek;
  
        const weekProgress = ((elapsedWeekTime / totalWeekDuration) * 100 ) % 100;
  
  
        // progress bar width
        document.getElementById('weekProgress').style.width = weekProgress + '%';
        // percentage with 8 decimal places
        document.getElementById('weekProgressPercentage').textContent = weekProgress.toFixed(8) + '%';
  
        // Day
        const dayInPST = new Date(new Date().toLocaleString('en-US', options));
        const startOfToday = new Date(nowInPST.setHours(0, 0, 0, 0));
        const endOfToday = new Date(nowInPST.setHours(23, 59, 59, 999));
  
        const totalDayDuration = endOfToday - startOfToday;
        const elapsedDayTime = dayInPST - startOfToday;
  
        const dayProgress = ((elapsedDayTime / totalDayDuration) * 100 ) % 100;

                // progress bar width
        document.getElementById('dayProgress').style.width = dayProgress + '%';
        // percentage with 8 decimal places
        document.getElementById('dayProgressPercentage').textContent = dayProgress.toFixed(8) + '%';


        // Shake the hourglasses a little
        const secondsPST = new Date(new Date().toLocaleString('en-US', options));
        const seconds = secondsPST.getSeconds();
        const rightHourglassElement = document.getElementById('right-hourglass');
        const leftHourglassElement = document.getElementById('left-hourglass');
        if (seconds % 10 === 0) {
          rightHourglassElement.textContent = '⌛️';
          leftHourglassElement.textContent = '⌛️';
          console.log('🤩 Have a beautiful ', dayInPST)
        
        } else {
          rightHourglassElement.textContent = '⏳';
          leftHourglassElement.textContent = '⏳';
        }
    }
    setInterval(calculateYearProgress, 1);
    
    window.onload = calculateYearProgress;
  }, []);

  return (
    <div className="App">
    <div className="background-container">
      <img 
        src="https://s3.us-west-1.amazonaws.com/year-progress-bar.com/images/blue-gradient-background.svg" 
        alt="Background" 
        className="background-image" 
      />
    </div>

    <div className="content">
      <div className="header-container">
        <span id="left-hourglass" className="hourglass">⌛️</span>
        <h1 className="title">Year Progress Bar</h1>
        <span id="right-hourglass" className="hourglass">⏳</span>
      </div>

      <div className="progress-container">
        <h3>Annual</h3>
        <div className="progress-bar">
          <div className="progress" id="yearProgress"></div>
        </div>
        <div className="subtitle" id="yearProgressPercentage">0.00000000%</div>
      </div>

      <div className="progress-container">
        <h3>Month</h3>
        <div className="progress-bar">
          <div className="progress" id="monthProgress"></div>
        </div>
        <div className="subtitle" id="monthProgressPercentage">0.00000000%</div>
      </div>

      <div className="progress-container">
        <h3>Week</h3>
        <div className="progress-bar">
          <div className="progress" id="weekProgress"></div>
        </div>
        <div className="subtitle" id="weekProgressPercentage">0.00000000%</div>
      </div>

      <div className="progress-container">
        <h3>Day</h3>
        <div className="progress-bar">
          <div className="progress" id="dayProgress"></div>
        </div>
        <div className="subtitle" id="dayProgressPercentage">0.00000000%</div>
      </div>
    </div>
  </div>
  );
};

export default ProgressBar;
