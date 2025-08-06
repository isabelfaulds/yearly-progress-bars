import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const fetchItemsForCategory = async (category) => {
  const response = await fetch(
    `${import.meta.env.VITE_CLOUDFRONT_SAVED_ITEMS}?category=${category}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!response.ok) throw new Error(`Failed to fetch events for ${category}`);
  const responseData = await response.json();
  return (
    responseData.items.map((item) => ({
      ...item,
      url: item.saved_item_uid.split(":").slice(1).join(":"),
    })) || []
  );
};

export const useItems = (category) => {
  return useQuery({
    queryKey: ["savedItems", category], // Unique cache key per category
    queryFn: () => fetchItemsForCategory(category),
    staleTime: 1000 * 60 * 60 * 24, // 1 day cache
    retry: 2, // Auto-retry failed fetches
  });
};

export const createItem = async (newItemData) => {
  const response = await fetch(
    `${import.meta.env.VITE_CLOUDFRONT_SAVED_ITEMS}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(newItemData),
    }
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create item");
  }
  const responseData = response.json();
  return {
    ...newItemData,
    category_uid: `${responseData.user_id}:${newItemData.category}`,
    saved_item_uid: `${responseData.user_id}:${newItemData.url}`,
  };
};

// Mutation Hook for creating items
export const useCreateItem = (category) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createItem,
    onSuccess: (newItem) => {
      queryClient.setQueryData(["savedItems", category], (oldItems) => {
        return oldItems ? [...oldItems, newItem] : [newItem];
      });
    },
  });
};
