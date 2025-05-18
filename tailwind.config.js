/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './public/index.html',
    './public/js/**/*.js',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          100: '#0F172A',
          200: '#020617',
          300: '#000000',
        },
        lime: {
          400: 'oklch(76.2% 0.184 131.684)',
          500: 'oklch(70.5% 0.192 131.684)',
          600: 'oklch(64.8% 0.2 131.684)',
          600: '#84CC16', // Fallback hex
          700: 'oklch(59.1% 0.208 131.684)',
        },
        accent: {
          100: 'oklch(76.2% 0.184 131.684)', // lime-400
          200: 'oklch(64.8% 0.2 131.684)',   // lime-600
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  safelist: [
    'btn',
    'btn-primary',
    'btn-ghost',
    'btn-xs',
    'input',
    'input-bordered',
    'alert',
    'alert-success',
    'alert-error',
    'alert-info',
    'label',
    'label-text',
    'form-control',
  ],
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ['dark'],
    styled: true,
    base: true,
    utils: true,
    logs: false, // Disable DaisyUI logs to reduce console noise
  },
};