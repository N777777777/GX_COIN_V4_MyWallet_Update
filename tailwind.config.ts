import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				danger: {
					DEFAULT: 'hsl(var(--danger))',
					foreground: 'hsl(var(--danger-foreground))'
				},
				energy: {
					DEFAULT: 'hsl(var(--energy))',
					foreground: 'hsl(var(--energy-foreground))'
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
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						boxShadow: '0 0 40px hsl(47 95% 53% / 0.4)'
					},
					'50%': {
						boxShadow: '0 0 80px hsl(47 95% 53% / 0.8)'
					}
				},
				'bounce-gentle': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-2px)'
					}
				},
				'click-bounce': {
					'0%': {
						transform: 'scale(1)'
					},
					'50%': {
						transform: 'scale(0.9)'
					},
					'100%': {
						transform: 'scale(1)'
					}
				},
				'coin-spin': {
					'0%': {
						transform: 'rotateY(0deg)'
					},
					'100%': {
						transform: 'rotateY(360deg)'
					}
				},
				'float-up': {
					'0%': {
						transform: 'translateY(0px) scale(1)',
						opacity: '1'
					},
					'100%': {
						transform: 'translateY(-50px) scale(0.8)',
						opacity: '0'
					}
				},
				'shake': {
					'0%, 100%': {
						transform: 'translateX(0)'
					},
					'25%': {
						transform: 'translateX(-2px)'
					},
					'75%': {
						transform: 'translateX(2px)'
					}
				},
				'energy-pulse': {
					'0%': {
						boxShadow: '0 0 10px hsl(218 98% 54% / 0.3)'
					},
					'100%': {
						boxShadow: '0 0 20px hsl(218 98% 54% / 0.6)'
					}
				},
				'wiggle': {
					'0%, 100%': {
						transform: 'rotate(-3deg)'
					},
					'50%': {
						transform: 'rotate(3deg)'
					}
				},
				"float": {
					"0%, 100%": {
						transform: "translateY(0px)"
					},
					"50%": {
						transform: "translateY(-10px)"
					}
				},
				"glow": {
					"0%, 100%": {
						boxShadow: "0 0 20px hsl(var(--primary) / 0.3)"
					},
					"50%": {
						boxShadow: "0 0 30px hsl(var(--primary) / 0.6)"
					}
				},
				"wheel-spin": {
					"0%": {
						transform: "rotate(0deg)"
					},
					"100%": {
						transform: "rotate(1440deg)"
					}
				},
				"gradient-shift": {
					"0%": {
						backgroundPosition: "0% 50%"
					},
					"50%": {
						backgroundPosition: "100% 50%"
					},
					"100%": {
						backgroundPosition: "0% 50%"
					}
				},
				"shimmer": {
					"0%": {
						transform: "translateX(-100%)"
					},
					"100%": {
						transform: "translateX(100%)"
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'bounce-gentle': 'bounce-gentle 0.6s ease-in-out',
				'click-bounce': 'click-bounce 0.1s ease-in-out',
				'coin-spin': 'coin-spin 1s linear infinite',
				'float-up': 'float-up 1s ease-out forwards',
				'shake': 'shake 0.5s ease-in-out',
				'energy-pulse': 'energy-pulse 1s ease-in-out infinite alternate',
				'wiggle': 'wiggle 1s ease-in-out infinite',
				"float": "float 3s ease-in-out infinite",
				"glow": "glow 2s ease-in-out infinite",
				"wheel-spin": "wheel-spin 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
				"gradient-shift": "gradient-shift 3s ease-in-out infinite",
				"shimmer": "shimmer 2s ease-in-out infinite"
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-warning': 'var(--gradient-warning)',
				'gradient-error': 'var(--gradient-error)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-cosmic': 'var(--gradient-cosmic)',
				'gradient-glass': 'var(--gradient-glass)',
				'gradient-glass-light': 'var(--gradient-glass-light)',
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'accent-glow': 'var(--shadow-accent-glow)',
				'elegant': 'var(--shadow-elegant)',
				'soft': 'var(--shadow-soft)',
				'card': 'var(--shadow-card)',
				'neon': 'var(--shadow-neon)'
			},
			transitionTimingFunction: {
				'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
				'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
