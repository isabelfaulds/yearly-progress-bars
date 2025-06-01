import { useQuery, useMutation } from "@tanstack/react-query";

// Fetch preference from backend
const fetchCateogryIconUserPreference = async () => {
  const response = await fetch(import.meta.env.VITE_CLOUDFRONT_SETTINGS, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const iconPreference = await response.json();
  return iconPreference;
};

// Update preference on backend
const updateCategoryIconPreference = async (newValue) => {
  await fetch(import.meta.env.VITE_CLOUDFRONT_SETTINGS, {
    method: "PATCH",
    body: JSON.stringify({
      updates: [
        { updateAttribute: "categoryIconStyle", updateValue: newValue },
      ],
    }),
    credentials: "include",
  });
};

// Custom hook
export const useCategoryIconPreference = () => {
  const { data, refetch } = useQuery({
    queryKey: ["categoryIconUserPreference"],
    queryFn: fetchCateogryIconUserPreference,
    retry: 0,
  });

  const { mutate } = useMutation({
    mutationFn: updateCategoryIconPreference,
    onSuccess: () => refetch(), // Re-fetch after update
    retry: 0,
  });

  const toggleIcon = () => {
    const newValue = data?.categoryIconStyle === "cat" ? "cube" : "cat";
    mutate(newValue);
  };

  return {
    isCatIcon: data?.categoryIconStyle === "cat",
    toggleIcon,
  };
};
