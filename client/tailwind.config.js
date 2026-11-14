/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#02205F', 800: '#0A2F78', 700: '#123F95', 300: '#8FA9D6', 100: '#DCE6F7' },   // logo navy
        brand: { DEFAULT: '#0A56B5', 700: '#064593', 50: '#E6EFFA' },   // logo blue: primary actions and positive states
        gold: { DEFAULT: '#F7941D', 700: '#B85A00', 50: '#FEF1E0' },   // logo orange (class name kept from the first design): accents, highlights, pending states
        paper: '#F5F6F8',
        line: '#E1E5EB',
        slate2: '#5B6678',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        rise: { from: { opacity: 0, transform: 'translateY(18px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { rise: 'rise .7s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
};
