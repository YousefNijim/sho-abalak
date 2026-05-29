---
name: Heritage Pulse
colors:
  surface: '#fbf8ff'
  surface-dim: '#dbd9e2'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fc'
  surface-container: '#efecf6'
  surface-container-high: '#eae7f1'
  surface-container-highest: '#e4e1eb'
  on-surface: '#1b1b22'
  on-surface-variant: '#564337'
  inverse-surface: '#303037'
  inverse-on-surface: '#f2eff9'
  outline: '#8a7265'
  outline-variant: '#ddc1b1'
  surface-tint: '#974800'
  primary: '#974800'
  on-primary: '#ffffff'
  primary-container: '#e6781e'
  on-primary-container: '#4e2200'
  inverse-primary: '#ffb688'
  secondary: '#296a43'
  on-secondary: '#ffffff'
  secondary-container: '#abefbd'
  on-secondary-container: '#2e6f47'
  tertiary: '#006495'
  on-tertiary: '#ffffff'
  tertiary-container: '#009ee8'
  on-tertiary-container: '#00314c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc7'
  primary-fixed-dim: '#ffb688'
  on-primary-fixed: '#311300'
  on-primary-fixed-variant: '#733600'
  secondary-fixed: '#aef2bf'
  secondary-fixed-dim: '#92d5a5'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#09522d'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#8fcdff'
  on-tertiary-fixed: '#001e30'
  on-tertiary-fixed-variant: '#004b71'
  background: '#fbf8ff'
  on-background: '#1b1b22'
  surface-variant: '#e4e1eb'
  background-cream: '#FCF3DC'
  surface-white: '#FFFFFF'
  muted-gray: '#6B7280'
  border-beige: '#E5E0D5'
  success-green: '#22C55E'
  error-red: '#EF4444'
  warning-amber: '#F59E0B'
typography:
  hero-lg:
    fontFamily: Cairo
    fontSize: 38px
    fontWeight: '800'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Cairo
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Cairo
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-md:
    fontFamily: Cairo
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Cairo
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Montserrat
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-base:
    fontFamily: Montserrat
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Montserrat
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Montserrat
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
  button-text:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gap-xs: 4px
  gap-sm: 8px
  gap-md: 12px
  margin-standard: 16px
  gap-lg: 20px
  section-md: 24px
  section-lg: 32px
  nav-height: 64px
---

## Brand & Style

The brand identity is built on the concept of "Warm Heritage," bridging the gap between traditional Palestinian hospitality and modern on-demand convenience. It targets a local audience in the West Bank, evoking feelings of reliability, cultural pride, and appetizing warmth.

The design style is a blend of **Corporate Modern** and **Tactile Minimalism**. It utilizes a "Warm Cream" base rather than clinical white to soften the user experience and create a welcoming, communal atmosphere. The UI is characterized by approachable roundedness, clear information hierarchy, and high-contrast action states that ensure ease of use for customers, merchants, and drivers alike.

## Colors

The palette is rooted in the "Saffron" Primary and "Palestinian Green" Secondary, providing a strong cultural resonance. 

- **Primary Action**: Use `#E6781E` for all high-intent actions, primary buttons, and active navigational states.
- **Brand Support**: Use `#165A34` for secondary brand presence, success states in the admin context, and supporting brand elements.
- **Surface Strategy**: The UI uses a layered approach. The global background is the warm `#FCF3DC`, while interactive containers and content cards use `#FFFFFF` to provide crisp legibility and a sense of cleanliness.
- **Functional Colors**: Standardized status colors (Success, Error, Warning) are used for order tracking and system feedback.

## Typography

The system employs a dual-language typographic strategy. **Cairo** is the primary choice for Arabic script and all major headlines, offering a modern geometric feel that remains highly legible. **Montserrat** handles Latin script and secondary body text, providing a clean, professional counterpoint.

All typography must be optimized for **RTL (Right-to-Left)** layouts as the primary orientation. Headings use heavier weights (700-800) to establish clear hierarchy against the vibrant background tones.

## Layout & Spacing

This design system utilizes a **4px base grid** for tight, consistent alignment. 

- **Mobile First**: Applications use a fluid layout with standard **16px side margins**. 
- **Grid System**: A 12-column fluid grid is used for the Admin Web Dashboard, while mobile views rely on vertical stacking with **12px or 16px gutters** between cards.
- **Sectioning**: Distinct functional sections should be separated by **24px to 32px** of vertical space to maintain breathing room on the warm cream background.
- **RTL Optimization**: Layouts must flip horizontally for Arabic users, ensuring that icons and text alignment follow the natural flow of the language.

## Elevation & Depth

Depth is used sparingly to signify interactivity without cluttering the "heritage" aesthetic. 

- **Tonal Elevation**: The primary method of depth is the contrast between the background cream (`#FCF3DC`) and white surface cards (`#FFFFFF`).
- **Shadow Profile**: 
    - **Level 1 (Soft)**: Used for app bars and persistent headers to separate them from the scrollable content.
    - **Level 2 (Standard)**: Used for merchant and product cards to make them feel "plucked" from the background.
    - **Level 3 (Modal)**: High-diffusion shadows for Bottom Sheets and overlays to focus user attention.
- **Interaction**: On press, cards should slightly reduce elevation or provide a subtle scale-down effect to reinforce tactile feedback.

## Shapes

The shape language is friendly and approachable, avoiding sharp industrial corners. 

- **Standard Radius**: A **12px (md)** radius is the default for most interactive elements, including buttons and input fields.
- **Container Radius**: Larger cards and modals use a **16px (lg)** radius.
- **Speciality Shapes**: Pill shapes (full radius) are reserved for status badges, tags, and the handle indicator on Bottom Sheets. 
- **Bottom Sheets**: These feature a specific **24px top-only radius** to create a distinct "drawer" feel.

## Components

### Buttons
- **Primary**: 52px height, Saffron background, white bold text. Use for "Add to Cart" or "Confirm Order."
- **Secondary**: Ghost style with a 1.5px Saffron border and Saffron text. Use for "View Details" or "Cancel."

### Input Fields
- **Text Inputs**: 52px height, white background with a 1.5px beige border. On focus, the border transitions to Saffron.
- **OTP Fields**: Discrete 1.5px border boxes with centered typography.

### Cards
- **Business Cards**: White background, 12px radius, level 2 shadow. Includes a thumbnail image, title, and "Available/Closed" status badge.
- **Product Cards**: Horizontal or vertical layouts with clear pricing in Saffron.

### Status Badges (Pills)
- Use high-contrast, low-saturation backgrounds with dark text for status states:
    - *Pending*: Amber background/text.
    - *Success*: Light green background with dark green text.
    - *Error*: Light red background with dark red text.

### Navigation
- **Bottom Nav**: 64px height, white surface with a soft top shadow. Icons transition from Muted Gray to Saffron when active.