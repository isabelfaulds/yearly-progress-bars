import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const fetchMilestones = async (category = null) => {
  let fetchUrl = `${import.meta.env.VITE_CLOUDFRONT_MILESTONES}`;
  if (category) {
    fetchUrl = `${fetchUrl}/?category=${String(category).toLowerCase()}`;
  }
  const response = await fetch(fetchUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Failed to fetch milestones`);
  try {
    const responseData = await response.json();
    return (
      responseData.milestones.map((item) => {
        let targetDate = null;
        const createdDate = new Date(item.created_timestamp);
        if (item.timeframe_weeks) {
          createdDate.setUTCDate(
            createdDate.getUTCDate() + item.timeframe_weeks * 7
          );
          targetDate = createdDate.toISOString().slice(0, 10);
        }

        return {
          ...item,
          category: item.category_uid.split(":").slice(1).join(":"),
          target_date: targetDate,
          created_timestamp: item.created_timestamp.slice(0, 10),
        };
      }) || []
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

export const createMilestone = async (newMilestoneData) => {
  const currentDateTime = new Date().toISOString();
  const updatedMilestoneData = {
    ...newMilestoneData,
    dateTime: currentDateTime,
    interestScore: 5,
  };
  console.log("updatedMilestoneData", updatedMilestoneData);
  const response = await fetch(
    `${import.meta.env.VITE_CLOUDFRONT_MILESTONES}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updatedMilestoneData),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create milestone");
  }
  const responseData = response.json();
  return {
    ...newMilestoneData,
    category_uid: `${responseData.user_id}:${newMilestoneData.category}`,
    milestone_user_datetime_uid: `${responseData.user_id}:${currentDateTime}`,
  };
};

export const useCreateMilestone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMilestone,
    onSuccess: (newMilestone) => {
      queryClient.setQueryData(["milestones"], (oldMilestones) => {
        return oldMilestones
          ? [...oldMilestones, newMilestone]
          : [newMilestone];
      });
    },
  });
};
