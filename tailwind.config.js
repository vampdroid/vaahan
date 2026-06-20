/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core theme colors
        "primary": "#000000",
        "on-primary": "#ffffff",
        "primary-container": "#131939",
        "on-primary-container": "#7c82a8",
        "inverse-primary": "#bfc4ed",
        
        "secondary": "#4546d8",
        "on-secondary": "#ffffff",
        "secondary-container": "#5f62f2",
        "on-secondary-container": "#fffbff",
        
        "tertiary": "#000000",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#321300",
        "on-tertiary-container": "#cd6818",
        
        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        
        "background": "#fbf8ff",
        "on-background": "#1b1b24",
        
        "surface": "#fbf8ff",
        "on-surface": "#1b1b24",
        "surface-variant": "#e3e1ed",
        "on-surface-variant": "#46464e",
        
        "surface-dim": "#dbd8e5",
        "surface-bright": "#fbf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f5f2ff",
        "surface-container": "#efecf9",
        "surface-container-high": "#e9e7f3",
        "surface-container-highest": "#e3e1ed",
        "inverse-surface": "#303039",
        "inverse-on-surface": "#f2effc",
        
        "outline": "#77767f",
        "outline-variant": "#c7c5cf",
        "surface-tint": "#575c80",

        // Fixed states
        "primary-fixed": "#dee0ff",
        "primary-fixed-dim": "#bfc4ed",
        "on-primary-fixed": "#131939",
        "on-primary-fixed-variant": "#3f4567",
        "secondary-fixed": "#e1e0ff",
        "secondary-fixed-dim": "#c0c1ff",
        "on-secondary-fixed": "#06006c",
        "on-secondary-fixed-variant": "#2d2bc3",
        "tertiary-fixed": "#ffdbc8",
        "tertiary-fixed-dim": "#ffb689",
        "on-tertiary-fixed": "#321300",
        "on-tertiary-fixed-variant": "#743500",

        // Dashboard warning colors
        "warning": "#ED6C02",
        "warning-container": "#FFF3E0",

        // Pastel reminder colors
        "pastel-coral": "#FF8A80",
        "pastel-coral-dark": "#D32F2F",
        "pastel-amber": "#FFD180",
        "pastel-amber-dark": "#E65100",
        "pastel-teal": "#B2DFDB",
        "pastel-teal-dark": "#00695C",
        "pastel-blue": "#E3F2FD"
      },
      borderRadius: {
        "DEFAULT": "0.5rem", // 8px
        "sm": "0.25rem",     // 4px
        "md": "0.75rem",     // 12px
        "lg": "1rem",        // 16px
        "xl": "1.5rem",       // 24px
        "full": "9999px"
      },
      spacing: {
        "container-margin": "1rem",
        "stack-gap-sm": "0.5rem",
        "stack-gap-md": "1rem",
        "stack-gap-lg": "1.5rem",
        "grid-gutter": "12px"
      },
      fontFamily: {
        body: ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"],
        headline: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "headline-lg-mobile": ["22px", { lineHeight: "28px", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "display-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }]
      }
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
}
