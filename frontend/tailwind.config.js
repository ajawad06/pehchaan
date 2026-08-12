/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          deepest: 'var(--green-deepest)',
          dark: 'var(--green-dark)',
          mid: 'var(--green-mid)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          bright: 'var(--gold-bright)',
        },
        cream: 'var(--cream)',
        radio: {
          brown: 'var(--radio-brown)',
          dark: 'var(--radio-brown-dark)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        baloo: ['"Baloo 2"', 'cursive'],
      },
    },
  },
  plugins: [],
}
