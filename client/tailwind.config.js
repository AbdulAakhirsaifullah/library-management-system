/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bookbinding palette: cloth-bound spines on a linen board.
        // faint is #55646D rather than a lighter grey so small text clears WCAG AA (4.9:1) on board
        ink: { DEFAULT: '#16222B', soft: '#3D4C55', faint: '#55646D' },
        board: { DEFAULT: '#E9EBE7', deep: '#DDE0DA' },
        cloth: { DEFAULT: '#2C5F4F', dark: '#1F4639', light: '#DCE8E2' },
        brass: { DEFAULT: '#A9752B', light: '#F4E9D6' },
        rust: { DEFAULT: '#94322E', light: '#F6E2E0' },
      },
      fontFamily: {
        // Serif is reserved for book titles, the way the books themselves are set.
        title: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sheet: '0 1px 2px rgba(22, 34, 43, 0.06), 0 8px 24px -16px rgba(22, 34, 43, 0.28)',
        cover: '0 1px 1px rgba(22, 34, 43, 0.18), 0 10px 20px -12px rgba(22, 34, 43, 0.45)',
        coverLift: '0 2px 4px rgba(22, 34, 43, 0.16), 0 22px 34px -16px rgba(22, 34, 43, 0.5)',
        card: '0 1px 2px rgba(22, 34, 43, 0.05), 0 14px 32px -22px rgba(22, 34, 43, 0.35)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { rise: 'rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both' },
      borderRadius: { sheet: '4px' },
    },
  },
  plugins: [],
};
