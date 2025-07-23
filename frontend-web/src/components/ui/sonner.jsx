// import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  // const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme="dark"
      // className="toaster group"
      style={{
        "--normal-bg": "#1c2030", // "var(--popover)",
        "--normal-text": "#FFFFFF", // "var(--popover-foreground)",
        "--normal-border": "#414e73", // "var(--border)",
      }}
      {...props}
    />
  );
};

export { Toaster };
