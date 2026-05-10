export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { 
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        paper: 'var(--paper)',
        line: 'var(--line)',
        accent: 'var(--accent)',
        'accent-deep': 'var(--accent-deep)',
        aqua: 'var(--aqua)',
        sky: 'var(--sky)',
        mint: 'var(--mint)',
        sun: 'var(--sun)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        'plus-jakarta': ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    } 
  },
  plugins: []
};
