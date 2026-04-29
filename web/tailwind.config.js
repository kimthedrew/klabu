/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:    '#2E5C3E',
        background: '#F9F6F0',
        surface:    '#FFFFFA',
        'app-text': '#2D2823',
        muted:      '#A89F91',
        accent:     '#D96C4E',
      },
      fontFamily: {
        heading: ['Fraunces', 'serif'],
        body:    ['Outfit', 'sans-serif'],
      },
      borderRadius: {
        card:   '24px',
        button: '32px',
        pill:   '99px',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(45, 40, 35, 0.08)',
      },
    },
  },
  plugins: [],
};
