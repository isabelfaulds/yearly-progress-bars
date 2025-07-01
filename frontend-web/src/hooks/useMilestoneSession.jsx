import { useQuery } from "@tanstack/react-query";

export const fetchMilestoneSessions = async (
  milestone_user_datetime_uid = null
) => {
  let fetchUrl = import.meta.env.VITE_CLOUDFRONT_MILESONE_SESSIONS;

  if (milestone_user_datetime_uid) {
    fetchUrl = `${fetchUrl}/?milestone_uid=${String(
      milestone_user_datetime_uid
    )}`;
  }
  const response = await fetch(fetchUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Failed to fetch milestone sessions`);
  try {
    const responseData = await response.json();
    console.log("ResponseData", responseData);
    return responseData.sessions || [];
  } catch (err) {
    console.error("Failed to parse JSON from milestone sessions response", err);
    throw err;
  }
};

export const useMilestoneSessions = (milestone_user_datetime_uid = null) => {
  return useQuery({
    queryKey: ["milestone_sessions", milestone_user_datetime_uid], // Cache by milestone
    queryFn: () => fetchMilestoneSessions(milestone_user_datetime_uid),
    staleTime: 1000 * 60 * 60 * 24, // 1 day cache
    retry: 2, // Auto-retry failed fetches
    enabled: !!milestone_user_datetime_uid, // Only run if with milesotne uid
  });
};
