// tailwind.config.js
module.exports = {
  content: [
    "./index.html", // Or wherever your HTML/JSX files are located
    "./src/**/*.{html,js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
