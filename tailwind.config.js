import animate from 'tailwindcss-animate';
/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {
            opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
            borderRadius: {
                sm: '3.6px',
                md: '4.8px',
                lg: '6px',
                xl: '8.4px',
                '2xl': '10.8px',
                '3xl': '13.2px'
            },
            colors: {
                background: 'oklch(var(--background) / <alpha-value>)',
                foreground: 'oklch(var(--foreground) / <alpha-value>)',
                card: {
                    DEFAULT: 'oklch(var(--card) / <alpha-value>)',
                    foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
                },
                popover: {
                    DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
                    foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
                },
                primary: {
                    DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
                    foreground: 'oklch(var(--primary-foreground) / <alpha-value>)'
                },
                secondary: {
                    DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
                    foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)'
                },
                muted: {
                    DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
                    foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
                },
                accent: {
                    DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
                    foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
                },
                destructive: {
                    DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
                    foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
                },
                surface: 'oklch(var(--surface) / <alpha-value>)',
                successBg: 'oklch(var(--success-bg) / <alpha-value>)',
                successFg: 'oklch(var(--success-fg) / <alpha-value>)',
                warnBg: 'oklch(var(--warn-bg) / <alpha-value>)',
                warnFg: 'oklch(var(--warn-fg) / <alpha-value>)',
                dangerBg: 'oklch(var(--danger-bg) / <alpha-value>)',
                dangerFg: 'oklch(var(--danger-fg) / <alpha-value>)',
                infoBg: 'oklch(var(--info-bg) / <alpha-value>)',
                infoFg: 'oklch(var(--info-fg) / <alpha-value>)',
                border: 'oklch(var(--border) / <alpha-value>)',
                input: 'oklch(var(--input) / <alpha-value>)',
                ring: 'oklch(var(--ring) / <alpha-value>)',
                brand: {
                    DEFAULT: '#ffd631',
                    dark: '#d8b216',
                    ink: '#2b2100',
                    neutral: '#eaeaea'
                },
                chart: {
                    '1': 'oklch(var(--chart-1) / <alpha-value>)',
                    '2': 'oklch(var(--chart-2) / <alpha-value>)',
                    '3': 'oklch(var(--chart-3) / <alpha-value>)',
                    '4': 'oklch(var(--chart-4) / <alpha-value>)',
                    '5': 'oklch(var(--chart-5) / <alpha-value>)'
                },
                sidebar: {
                    DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
                    foreground: 'oklch(var(--foreground) / <alpha-value>)',
                    primary: 'oklch(var(--primary) / <alpha-value>)',
                    'primary-foreground': 'oklch(var(--primary-foreground) / <alpha-value>)',
                    accent: 'oklch(var(--secondary) / <alpha-value>)',
                    'accent-foreground': 'oklch(var(--foreground) / <alpha-value>)',
                    surface: 'oklch(var(--surface) / <alpha-value>)',
                successBg: 'oklch(var(--success-bg) / <alpha-value>)',
                successFg: 'oklch(var(--success-fg) / <alpha-value>)',
                warnBg: 'oklch(var(--warn-bg) / <alpha-value>)',
                warnFg: 'oklch(var(--warn-fg) / <alpha-value>)',
                dangerBg: 'oklch(var(--danger-bg) / <alpha-value>)',
                dangerFg: 'oklch(var(--danger-fg) / <alpha-value>)',
                infoBg: 'oklch(var(--info-bg) / <alpha-value>)',
                infoFg: 'oklch(var(--info-fg) / <alpha-value>)',
                border: 'oklch(var(--border) / <alpha-value>)',
                    ring: 'oklch(var(--ring) / <alpha-value>)'
                }
            },
            fontFamily: {
                heading: ['var(--font-heading)'],
                body: ['var(--font-body)'],
                display: ['var(--font-display)'],
                mono: ['var(--font-mono)']
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                'fade-up': {
                    from: { opacity: '0', transform: 'translateY(6px)' },
                    to: { opacity: '1', transform: 'translateY(0)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                'fade-up': 'fade-up 0.28s ease-out both'
            }
        }
    },
    plugins: [animate],
}


