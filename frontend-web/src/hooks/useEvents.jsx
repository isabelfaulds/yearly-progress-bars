// hooks/useEvents.js
import { useQuery } from "@tanstack/react-query";

export const fetchEventsForDay = async (day) => {
  const response = await fetch(
    `${import.meta.env.VITE_CLOUDFRONT_CALENDAR_EVENTS}?event_date=${day}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch events for ${day}`);
  const responseData = await response.json();
  return responseData.events || [];
};

export const useEvents = (day) => {
  return useQuery({
    queryKey: ["events", day], // Unique cache key per day
    queryFn: () => fetchEventsForDay(day),
    staleTime: 1000 * 60 * 60 * 24, // 1 day cache
    retry: 2, // Auto-retry failed fetches
  });
};
