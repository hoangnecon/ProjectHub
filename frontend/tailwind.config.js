/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/App.jsx',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#3b82f6', // blue-500
        'secondary': '#6b7280', // gray-500
        'danger': '#ef4444', // red-500
        
        // Light mode
        'light-background': '#f9fafb', // gray-50
        'light-surface': '#ffffff',
        'light-text-primary': '#111827', // gray-900
        'light-text-secondary': '#6b7280', // gray-500
        'light-text-tertiary': '#9ca3af', // gray-400

        // Dark mode
        'dark-background': '#030712', // gray-950
        'dark-surface': '#1f2937', // gray-800
        'dark-text-primary': '#f9fafb', // gray-50
        'dark-text-secondary': '#9ca3af', // gray-400
        'dark-text-tertiary': '#6b7280', // gray-500
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
