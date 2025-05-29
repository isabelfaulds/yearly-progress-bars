// hooks/useEventsForRange.js
import { useQueries } from "@tanstack/react-query";
import { addDays, format, isBefore, isEqual } from "date-fns";
import { fetchEventsForDay } from "./useEvents";

// array of all days
function getDaysBetweenDates(startDate, endDate) {
  const dates = [];
  let currentDate = new Date(startDate);
  while (isBefore(currentDate, endDate) || isEqual(currentDate, endDate)) {
    dates.push(format(currentDate, "yyyy-MM-dd"));
    currentDate = addDays(currentDate, 1);
  }
  return dates;
}
export const useEventsForRange = (startDate, endDate) => {
  const days = getDaysBetweenDates(startDate, endDate);

  const queries = useQueries({
    queries: days.map((day) => ({
      queryKey: ["events", day],
      queryFn: () => fetchEventsForDay(day),
      staleTime: 5 * 60 * 1000,
      onSuccess: (data) => console.log(`Success for ${day}:`, data),
      onError: (error) => console.error(`Error for ${day}:`, error),
    })),
  });

  const eventsByDate = new Map(
    days.map((day, index) => [day, queries[index].data ?? []])
  );

  return {
    eventsByDate,
    eventsIsLoading: queries.some((q) => q.isLoading),
    eventsIsError: queries.some((q) => q.isError),
  };
};
