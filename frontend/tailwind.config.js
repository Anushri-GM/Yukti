/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gov: {
          brand: {
            blue: {
              50: '#F0F5FA',
              100: '#E1ECF5',
              500: '#0F52BA', // Royal Sapphire
              900: '#0B2545', // Deep Navy
            },
            emerald: {
              50: '#ECFDF5',
              500: '#10B981', // National Emerald
              900: '#064E3B', // Deep Pine
            }
          },
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            800: '#1E293B',
            900: '#0F172A',
            950: '#020617',
          }
        }
      },
      boxShadow: {
        'gov-card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'gov-card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
