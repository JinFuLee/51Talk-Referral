import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			brand: {
  				'50': '#f0f9ff',
  				'100': '#e0f2fe',
  				'500': '#0ea5e9',
  				'600': '#0284c7',
  				'700': '#0369a1',
  				'900': '#0c4a6e'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				amber: 'hsl(var(--chart-amber))',
  				rose: 'hsl(var(--chart-rose))',
  				sky: 'hsl(var(--chart-sky))',
  				blue: 'hsl(var(--chart-blue))',
  				orange: 'hsl(var(--chart-orange))',
  				lime: 'hsl(var(--chart-lime))',
  				pink: 'hsl(var(--chart-pink))',
  				emerald: 'hsl(var(--chart-emerald))',
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		boxShadow: {
			'flash': '0 20px 40px -10px rgba(0, 0, 0, 0.03), 0 10px 20px -5px rgba(0, 0, 0, 0.02)',
			'flash-lg': '0 30px 60px -15px rgba(0, 0, 0, 0.05), 0 15px 25px -10px rgba(0, 0, 0, 0.03)'
		},
		keyframes: {
			"accordion-down": {
				from: { height: "0" },
				to: { height: "var(--radix-accordion-content-height)" },
			},
			"accordion-up": {
				from: { height: "var(--radix-accordion-content-height)" },
				to: { height: "0" },
			},
			"fade-in": {
				from: { opacity: "0" },
				to: { opacity: "1" },
			},
			"fade-out": {
				from: { opacity: "1" },
				to: { opacity: "0" },
			},
			"slide-up": {
				from: { opacity: "0", transform: "translateY(10px)" },
				to: { opacity: "1", transform: "translateY(0)" },
			},
			"slide-down": {
				from: { opacity: "0", transform: "translateY(-10px)" },
				to: { opacity: "1", transform: "translateY(0)" },
			},
			"pulse-soft": {
				"0%, 100%": { opacity: "1" },
				"50%": { opacity: "0.8" },
			},
			"pulse-alert": {
				"0%": { opacity: "0.1", transform: "scale(0.95)" },
				"50%": { opacity: "0.3", transform: "scale(1.05)" },
				"100%": { opacity: "0.1", transform: "scale(0.95)" },
			}
		},
		animation: {
			"accordion-down": "accordion-down 0.2s ease-out",
			"accordion-up": "accordion-up 0.2s ease-out",
			"fade-in": "fade-in 0.3s ease-out",
			"fade-out": "fade-out 0.3s ease-out",
			"slide-up": "slide-up 0.4s ease-out",
			"slide-down": "slide-down 0.4s ease-out",
			"pulse-soft": "pulse-soft 3s ease-in-out infinite",
			"pulse-alert": "pulse-alert 2.5s ease-in-out infinite",
		}
	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
