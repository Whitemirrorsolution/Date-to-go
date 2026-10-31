/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7000A4',
        primaryDark: '#2A0A5C',
        accent: '#FF2FB0',
        bg: '#F6F7FD',
        surface: '#FFFFFF',
        textMain: '#1A1A1A',
        muted: '#6B7280',
        borderLight: '#E5E7EB',
        success: {
          bg: '#E6F6EA',
          text: '#2E7D32'
        },
        pending: {
          bg: '#FFF3E0',
          text: '#E65100'
        },
        failed: {
          bg: '#FDECEC',
          text: '#C62828'
        },
        expired: {
          bg: '#F1F1F1',
          text: '#616161'
        }
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '20': '20px',
        '24': '24px',
        '28': '28px',
        'pill': '999px',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'float': '0 10px 30px rgba(112, 0, 164, 0.1)',
      }
    },
  },
  plugins: [],
}
