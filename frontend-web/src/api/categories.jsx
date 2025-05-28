function titleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export const getCategories = async () => {
  const response = await fetch(import.meta.env.VITE_CLOUDFRONT_CATEGORIES, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!response.ok) throw new Error("Failed to fetch categories");
  const data = await response.json();
  return data.categories.map((item) => ({
    ...item,
    category: titleCase(item.category), // Format here
  }));
};
