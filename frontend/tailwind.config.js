/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fk: {
          blue: '#2874f0',
          yellow: '#ff9f00',
          green: '#388e3c',
          red: '#e53935',
          orange: '#fb641b',
          gray: { 50: '#f8f9fa', 100: '#f1f3f6', 200: '#e0e0e0', 500: '#878787', 700: '#424242' },
        },
      },
    },
  },
  plugins: [],
};
