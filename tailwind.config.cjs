/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        opel: {
          chrome: "#d4d4d8",
          neon: "#00FFF0",
          starlight: "#7dd3fc",
          romance: "#fda4af",
          chase: "#fb923c"
        }
      },
      fontFamily: {
        sans: ['"Inter var", ui-sans-serif', 'system-ui', 'sans-serif']
      },
      screens: {
        // Galaxy Tab S7 FE (SM-T733/SMT77x ~ 1600x2560) tuned breakpoints
        tablet: "1024px"
      }
    }
  },
  darkMode: "class",
  plugins: []
};