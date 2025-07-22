export const deleteAccount = async () => {
  try {
    const response = await fetch(
      import.meta.env.VITE_CLOUDFRONT_SETTINGS_ACCOUNT,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to delete account");
    return { success: true, message: "Account deleted successfully." };
  } catch (error) {
    console.error("Error in deleteAccount API call:", error);
    throw error;
  }
};

export const logoutAccount = async () => {
  try {
    const response = await fetch(import.meta.env.VITE_API_GATEWAY_LOGOUT, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to logout");
    return { success: true, message: "Auth - logout" };
  } catch (error) {
    console.error("Error in logging out:", error);
    throw error;
  }
};
