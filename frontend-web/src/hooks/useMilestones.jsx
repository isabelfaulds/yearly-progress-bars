import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const fetchMilestones = async (category = null) => {
  let fetchUrl = `${import.meta.env.VITE_CLOUDFRONT_MILESTONES}`;
  if (category) {
    fetchUrl = `${fetchUrl}/?category=${String(category).toLowerCase()}`;
  }
  console.log("fetchUrl", fetchUrl);
  const response = await fetch(fetchUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  console.log("response", response);
  if (!response.ok) throw new Error(`Failed to fetch milestones`);
  try {
    const responseData = await response.json();
    console.log("responseData", responseData);
    return (
      responseData.milestones.map((item) => ({
        ...item,
        category: item.category_uid.split(":").slice(1).join(":"),
      })) || []
    );
  } catch (err) {
    console.error("Failed to parse JSON from milestones response", err);
    throw err;
  }
};

export const useMilestones = (category = null) => {
  return useQuery({
    queryKey: ["milestones", category], // Unique cache key per category
    queryFn: () => fetchMilestones(category),
    staleTime: 1000 * 60 * 60 * 24, // 1 day cache
    retry: 2, // Auto-retry failed fetches
  });
};
