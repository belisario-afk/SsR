/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        tablet: "768px"
      }
    }
  },
  plugins: []
};