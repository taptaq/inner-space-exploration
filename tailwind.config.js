/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: {
            900: '#164e63',
            700: '#0e7490',
            500: '#06b6d4'
          },
          emerald: {
            400: '#34d399'
          },
          rose: {
            500: '#f43f5e'
          },
          slate: {
            950: '#020617',
            800: '#1e293b',
            400: '#94a3b8'
          }
        }
      }
    },
  },
  plugins: [],
}
