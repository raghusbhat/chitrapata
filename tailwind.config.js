/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        baloo: ['"Baloo 2"', "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#7c3aed",
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed", // Our primary color
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        secondary: {
          DEFAULT: "#6c2bd9", // Slightly darker purple
          50: "#f5f3ff",
          100: "#ede8fe",
          200: "#d8d0fc",
          300: "#c2acf5",
          400: "#a683eb",
          500: "#8a5ae0",
          600: "#6c2bd9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#3e1a80",
          950: "#2e1065",
        },
        zinc: {
          900: "#18181b",
          925: "#1c1c21",
          950: "#09090b",
        },
        // Radix UI Colors
        gray: {
          1: "#fcfcfc",
          2: "#f9f9f9",
          3: "#f0f0f0",
          4: "#e8e8e8",
          5: "#e0e0e0",
          6: "#d9d9d9",
          7: "#cecece",
          8: "#bbbbbb",
          9: "#8d8d8d",
          10: "#838383",
          11: "#646464",
          12: "#202020",
        },
        // Add more Radix colors as needed
      },
      // Add Radix UI data attribute variants
      data: {
        "state-open": "state=open",
        "state-closed": "state=closed",
        "state-checked": "state=checked",
        "state-unchecked": "state=unchecked",
        "state-on": "state=on",
        "state-off": "state=off",
      },
    },
  },
  plugins: [],
};
