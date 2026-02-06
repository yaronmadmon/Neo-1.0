/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}", // Explicitly include components
  ],
  safelist: [
    // Safelist semantic shadcn/ui classes
    'text-3xl', 'text-2xl', 'text-xl', 'text-base',
    'font-bold', 'font-semibold', 'font-medium',
    'mb-4', 'mb-3', 'mb-2', 'mb-1',
    'space-y-3', 'space-y-2', 'space-y-4', 'space-y-1',
    'p-4', 'p-6', 'px-4', 'py-2', 'px-6', 'py-3', 'py-4',
    // Surface layer classes for atmosphere
    'bg-surface-app', 'bg-surface-section', 'bg-surface-card',
    'bg-background', 'bg-card', 'bg-muted', 'bg-accent',
    'border', 'border-border', 'border-input',
    'rounded-lg', 'rounded-md', 'rounded',
    'shadow-sm',
    'hover:bg-accent', 'hover:bg-muted', 'hover:bg-accent/50',
    'text-foreground', 'text-muted-foreground', 'text-card-foreground',
    'transition-colors',
    'max-w-full', 'max-w-2xl', 'h-auto', 'h-64',
    'flex', 'flex-col', 'items-center', 'justify-center',
    'w-full', 'whitespace-nowrap',
    'text-xs', 'text-sm', 'text-lg',
    'uppercase', 'tracking-wider',
    'divide-y', 'divide-border',
    'bg-primary', 'bg-primary/90', 'text-primary-foreground',
    'bg-secondary', 'text-secondary-foreground',
    'bg-destructive', 'text-destructive', 'text-destructive-foreground',
    'disabled:opacity-50', 'disabled:cursor-not-allowed',
    'focus-visible:ring-2', 'focus-visible:ring-ring',
    'text-center',
    'border-2', 'border-dashed',
    'fixed', 'inset-0', 'z-50',
    'max-h-[90vh]', 'overflow-y-auto', 'overflow-x-auto',
    'min-w-full',
    'grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'gap-6',
  ],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			// Surface layers for atmosphere/depth
  			'surface-app': 'hsl(var(--surface-app))',
  			'surface-section': 'hsl(var(--surface-section))',
  			'surface-card': 'hsl(var(--surface-card))',
  			// Standard semantic colors
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
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
