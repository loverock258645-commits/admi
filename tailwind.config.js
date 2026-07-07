/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          ink: "#17212b",
          muted: "#5c6975",
          line: "#d9e2ea",
          panel: "#f7fafc",
          teal: "#147a7e",
          tealDark: "#0f5f63",
          warn: "#8a5a00"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans TC",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
