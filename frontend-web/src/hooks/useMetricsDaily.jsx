import { useQuery } from "@tanstack/react-query";

export const fetchDailyMetrics = async () => {
  let fetchUrl = import.meta.env.VITE_CLOUDFRONT_AGGREGATES_DAILY;
  const response = await fetch(fetchUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Failed to fetch daily aggregates`);
  try {
    const responseData = await response.json();
    return responseData.day_totals || [];
  } catch (err) {
    console.error("Failed to parse JSON from daily aggregates", err);
    throw err;
  }
};

export const useMetricsDaily = () => {
  return useQuery({
    queryKey: ["daily_totals"],
    queryFn: () => fetchDailyMetrics(),
    staleTime: 1000 * 60 * 60 * 24, // 1 day cache
    retry: 2, // Auto-retry failed fetches
  });
};
