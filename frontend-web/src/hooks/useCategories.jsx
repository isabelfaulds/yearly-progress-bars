import { getCategories } from "../api/categories";
import { useQuery } from "@tanstack/react-query";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"], // cache key
    queryFn: getCategories,
    staleTime: 1000 * 60 * 60 * 24,
  });
};
