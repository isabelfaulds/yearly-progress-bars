// hooks/useCategoryMetrics.js
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const fetchCategoryAggregatesForDays = async (
  start_date,
  end_date = null
) => {
  if (!end_date) {
    end_date = start_date;
  }
  const response = await fetch(
    `${
      import.meta.env.VITE_CLOUDFRONT_CATEGORY_AGGREGATES_DAILY
    }?start-date=${start_date}&end-date=${end_date}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!response.ok)
    throw new Error(
      `Failed to fetch events for start ${start_date} end ${end_date}`
    );
  const responseData = await response.json();
  return responseData.day_category_totals || [];
};

export const useCategoryAggregates = (day) => {
  return useQuery({
    queryKey: ["category_aggregate", day], // Unique cache key per day
    queryFn: () => fetchCategoryAggregatesForDay((start_date = day)),
    staleTime: 1000 * 60 * 60 * 24 * 2, // 2 day cache
    retry: 2, // Auto-retry failed fetches
  });
};

export const useCategoryAggregatesByRange = (start, end) => {
  const queryClient = useQueryClient();

  const missingDates =
    start && end ? findMissingDates(queryClient, start, end) : [];

  const missingStart = missingDates[0];
  const missingEnd = missingDates[missingDates.length - 1];

  return useQuery({
    queryKey: ["category_aggregate", "bulk", missingStart, missingEnd],
    enabled: !!missingStart, // only run if there's something missing
    queryFn: async () => {
      const data = await fetchCategoryAggregatesForDays(
        missingStart,
        missingEnd
      );

      const grouped = {};

      for (const entry of data) {
        const [date, value] = Object.entries(entry)[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(value);
      }

      Object.entries(grouped).forEach(([date, values]) => {
        queryClient.setQueryData(["category_aggregate", date], values);
      });

      return grouped;
    },
  });
};

const formatDate = (date) => date.toISOString().split("T")[0];

const getDateRangeArray = (start, end) => {
  const result = [];
  let current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    result.push(formatDate(new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return result;
};

const findMissingDates = (queryClient, start, end) => {
  const allDates = getDateRangeArray(start, end);

  return allDates.filter((date) => {
    return !queryClient.getQueryData(["category_aggregate", date]);
  });
};
