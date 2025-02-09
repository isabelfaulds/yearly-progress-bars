import { useState } from "react";
import TimePicker from "../components/TimePicker";
import { XMarkIcon, ArrowRightCircleIcon } from "@heroicons/react/24/solid";

const Settings = () => {
  const [dayEndHourSetting, dayEndHourSettingValue] = useState(
    localStorage.getItem("dayEndHourSetting") || "11:59 PM"
  );
  const handleEndSave = (time) => {
    localStorage.setItem("dayEndHourSetting", time);
    console.log("update end ", localStorage.getItem("dayEndHourSetting"));
  };

  const [dayStartHourSetting, dayStartHourSettingValue] = useState(
    localStorage.getItem("dayStartHourSetting") || "12:00 AM"
  );
  const handleStartSave = (time) => {
    localStorage.setItem("dayStartHourSetting", time);
    console.log("update start ", localStorage.getItem("dayStartHourSetting"));
  };

  return (
    <div className="bg-[#f2f5f4] bg-cover bg-center w-screen min-h-screen m-0 flex flex-col items-start pt-10 pl-1 sm:pt-12 sm:pl-20 px-4 sm:px-20">
      <div className="text-gray-800 pl-8 text-2xl sm:text-4xl font-bold ">
        Settings
      </div>
      <button
        onClick={() => (window.location.href = "/")}
        className="fixed top-7 right-4 p-3 text-white rounded-full rounded-full shadow-lg focus:outline-none hover:border-2"
      >
        <XMarkIcon className="text-gray-700 h-6 w-6" />
      </button>
      {/* Centered Form Container */}
      <div className="pt-3 px-4 w-full">
        <hr className="border-t border-gray-300 my-4" />
      </div>
      <div className="flex flex-col sm:pl-20 mt-15 ">
        <div className="grid grid-cols-2 items-center gap-2 sm:gap-4 pl-1">
          <label className="block text-gray-600 sm:text-lg font-semibold mb-2">
            Start of Day
          </label>
          <TimePicker
            defaultTime={dayStartHourSetting}
            onTimeSelect={(time) => handleStartSave(time)}
          />
          <label className="block text-gray-600 sm:text-lg font-semibold mb-2">
            End of Day
          </label>
          <TimePicker
            defaultTime={dayEndHourSetting}
            onTimeSelect={(time) => handleEndSave(time)}
          />
        </div>
      </div>
      <button
        onClick={() => (window.location.href = "/login")}
        className="ml-5 mt-6 p-3 text-gray rounded-full rounded-full shadow-lg focus:outline-none hover:border-2"
      >
        Login <ArrowRightCircleIcon className="text-gray-700 h-6 w-6" />
      </button>
    </div>
  );
};

export default Settings;
