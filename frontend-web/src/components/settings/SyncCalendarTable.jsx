import React, { useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useCategories } from "@/hooks/useCategories.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CalendarSyncSettings = () => {
  const { data: categories } = useCategories();
  const [calendars, setCalendars] = useState([]);

  const fetchAndMergeCalendars = async () => {
    try {
      // active
      const dbRes = await fetch(import.meta.env.VITE_CLOUDFRONT_SYNC_GCAL, {
        method: "GET",
        credentials: "include",
      });
      const dbData = await dbRes.json();
      const dbCalendars = dbData.calendars || [];

      // available
      const oauthRes = await fetch(import.meta.env.VITE_CLOUDFRONT_GCAL_LIST, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const oauthData = await oauthRes.json();
      const oauthCalendars = oauthData.calendars || [];

      const merged = oauthCalendars.map((oauthCal) => {
        const match = dbCalendars.find(
          (dbCal) => dbCal.calendar_uid === oauthCal.calendarID
        );

        if (match) {
          return {
            ...oauthCal,
            ...match,
            active: true,
          };
        } else {
          return {
            ...oauthCal,
            calendar_name: oauthCal.summary,
            active: false,
            sync: false,
            default_category: "",
            default_category_uid: "",
          };
        }
      });
      setCalendars(merged);
    } catch (error) {
      console.error("Error fetching calendars:", error);
    }
  };

  const updateCalendar = async (payload) => {
    const updateResponse = await fetch(
      import.meta.env.VITE_CLOUDFRONT_GCAL_LIST,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      }
    );

    if (updateResponse.ok) {
      console.log("Calendar Sync - Updates");
    }
  };

  const updateCalendarCategory = (newcal, newValue) => {
    setCalendars((prev) =>
      prev.map((cal) =>
        cal.calendarID === newcal.calendarID
          ? {
              ...cal,
              default_category: newValue == "" ? "" : newValue.split(":", 2)[1],
              default_category_uid: newValue,
            }
          : cal
      )
    );
    const payload = {
      calendarID: newcal.calendarID,
      sync: newcal.sync,
      summary: newcal.calendar_name,
      defaultCategory: newValue.split(":", 2)[1],
    };
    updateCalendar(payload);
  };

  const updateCalendarSync = (newcal, newValue) => {
    setCalendars((prev) =>
      prev.map((cal) =>
        cal.calendarID === newcal.calendarID ? { ...cal, sync: newValue } : cal
      )
    );

    const payload = {
      calendarID: newcal.calendarID,
      sync: newValue,
      summary: newcal.calendar_name,
      defaultCategory: newcal.default_category,
    };
    updateCalendar(payload);
  };

  useEffect(() => {
    fetchAndMergeCalendars();
  }, []);

  return (
    <div>
      <div className="space-y-4 p-4 space-y-4 p-4  md:pr-20">
        <div className="text-left pl-6">Calendars</div>
        {calendars.map((cal) => (
          <div
            key={cal.calendarID}
            className="flex items-center gap-4 sm:gap-20 rounded-md bg-gray-800 px-4 py-2 text-sm"
          >
            {/* Calendar name */}
            <div className="text-white w-[200px] sm:w-[360px] md:w-[450px]  break-words line-clamp-5">
              {cal.calendar_name}
            </div>

            {/* Category dropdown */}
            <Select
              value={cal.default_category_uid || ""}
              onValueChange={(val) =>
                updateCalendarCategory(cal, val === "__none__" ? "" : val)
              }
            >
              <SelectTrigger className="w-[190px] sm:ml-16 sm:w-[220px] md:w-[250px] bg-slate-800 text-white border border-slate-600">
                <SelectValue placeholder="Category" />
              </SelectTrigger>

              <SelectContent className="bg-slate-900 text-white border border-slate-700">
                <SelectItem value="__none__">No Default</SelectItem>
                {categories.map((category) => (
                  <SelectItem
                    key={category.category_uid}
                    value={category.category_uid}
                  >
                    {category.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sync switch */}
            <div className="ml-auto">
              <Switch
                checked={cal.sync}
                onCheckedChange={(val) => updateCalendarSync(cal, val)}
                className="border border-slate-500  data-[state=unchecked]:bg-slate-600 data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default CalendarSyncSettings;
