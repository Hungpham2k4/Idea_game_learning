/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            // ── Brand Colors (override per project) ──────────────────────────────
            colors: {
                primary: {
                    50:  '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                    950: '#082f49',
                },
                // Accent palette — override with your brand color
                accent: {
                    DEFAULT: '#f59e0b',
                    light:   '#fcd34d',
                    dark:    '#d97706',
                },

                // ── CodeQuest ───────────────────────────────────────────────
                // Giá trị thật nằm ở biến CSS trong global.css, nhờ vậy đổi
                // theme sáng/tối chỉ cần đổi biến — không phải sửa class ở 20 file.
                cq: {
                    bg:     'rgb(var(--cq-bg) / <alpha-value>)',     // nền trang
                    panel:  'rgb(var(--cq-panel) / <alpha-value>)',  // nền thẻ / panel
                    raised: 'rgb(var(--cq-raised) / <alpha-value>)', // nền nổi (input, hàng bảng)
                    line:   'rgb(var(--cq-line) / <alpha-value>)',   // viền
                    text:   'rgb(var(--cq-text) / <alpha-value>)',   // chữ chính
                    muted:  'rgb(var(--cq-muted) / <alpha-value>)',  // chữ phụ
                    screen: 'rgb(var(--cq-screen) / <alpha-value>)', // nền màn hình code/terminal
                    sunken: 'rgb(var(--cq-sunken) / <alpha-value>)', // bề mặt lõm, ĐỔI theo chủ đề
                    neon:   'rgb(var(--cq-neon) / <alpha-value>)',   // nhấn xanh
                    lime:   'rgb(var(--cq-lime) / <alpha-value>)',   // đúng / hoàn thành
                    rose:   'rgb(var(--cq-rose) / <alpha-value>)',   // lỗi
                    gold:   'rgb(var(--cq-gold) / <alpha-value>)',   // sao / XP
                    strong: 'rgb(var(--cq-strong) / <alpha-value>)',   // chữ nhấn mạnh
                    onaccent: 'rgb(var(--cq-onaccent) / <alpha-value>)', // chữ trên nền nhấn
                },
            },

            // ── Typography ──────────────────────────────────────────────────────
            fontFamily: {
                sans:    ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['"Inter"', 'sans-serif'],
                mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
            },

            // ── Animations ──────────────────────────────────────────────────────
            animation: {
                'glow':     'glow 2s ease-in-out infinite alternate',
                'float':    'float 3s ease-in-out infinite',
                'slide-up': 'slideUp 0.5s ease-out',
                'fade-in':  'fadeIn 0.4s ease-out',
            },
            keyframes: {
                glow: {
                    '0%':   { boxShadow: '0 0 5px rgba(14, 165, 233, 0.5), 0 0 10px rgba(14, 165, 233, 0.3)' },
                    '100%': { boxShadow: '0 0 10px rgba(14, 165, 233, 0.8), 0 0 20px rgba(14, 165, 233, 0.5)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%':      { transform: 'translateY(-10px)' },
                },
                slideUp: {
                    '0%':   { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
        },
    },
    plugins: [],
};
