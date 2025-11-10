# Design Guidelines: Aaishree Data Service Center - Daily Report Generator

## Design Approach

**Selected Approach:** Design System - Material Design for Business Applications
**Justification:** This is a utility-focused, information-dense business tool requiring clarity, efficiency, and professional presentation. The application prioritizes data entry accuracy and report readability over visual flair.

## Core Design Elements

### A. Typography

**Primary Font:** Inter (via Google Fonts CDN)

- **Headings:**
  - H1 (Company Name): text-2xl font-bold
  - H2 (Section Headers): text-xl font-semibold
  - H3 (Subsections): text-lg font-medium
  
- **Body Text:**
  - Form Labels: text-sm font-medium
  - Input Fields: text-base
  - Report Data: text-base
  - Totals/Summary: text-lg font-semibold
  
- **Print-Specific:**
  - Company Name: text-3xl font-bold
  - Report Date: text-lg
  - Section Headers: text-xl font-semibold uppercase tracking-wide
  - Data Rows: text-base
  - Grand Totals: text-2xl font-bold

### B. Layout System

**Spacing Units:** Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16

**Container Structure:**
- Screen View: max-w-6xl mx-auto with px-6 py-8
- Print View: A4 dimensions (210mm × 297mm) with 20mm margins on all sides

**Two-Panel Layout (Screen):**
- Left Panel (Input Form): w-full lg:w-1/2 with pr-8 border-r
- Right Panel (Live Preview): w-full lg:w-1/2 with pl-8 (hidden on mobile, shows on lg:)

**Single-Column Layout (Print):**
- Full-width sections with consistent vertical spacing (mb-8)

### C. Component Library

**1. Report Header (Print)**
- Company logo (top-left, h-16)
- Company name and tagline (centered, prominent)
- Report date (top-right)
- Horizontal divider below header

**2. Input Forms (Screen)**
- **Date Selector:** Full-width date input with calendar icon
- **Service Entry Section:**
  - Dynamic rows with "Service Name" and "Amount" inputs side-by-side
  - "+ Add Service" button to add more rows
  - "Remove" icon button for each row
  
- **Cash in Hand:** Single labeled input field, prominent placement

- **Expense Entry Section:**
  - Same dynamic row pattern as services
  - Visually distinct from services section
  
- **Action Buttons:**
  - Primary: "Generate Report" (w-full, rounded-lg, py-3, text-lg, font-semibold)
  - Secondary: "Print Report" (appears after generation)
  - Tertiary: "Clear All" (subtle, right-aligned)

**3. Report Display Sections (Print & Preview)**

- **Services Table:**
  - Two-column table (Service | Amount)
  - Right-aligned amounts
  - Subtotal row with border-top
  
- **Cash in Hand Display:**
  - Large, prominent text display
  - Labeled clearly
  
- **Expenses Table:**
  - Same structure as services table
  - Subtotal row
  
- **Summary/Net Profit Section:**
  - Box/card treatment with border
  - Three-row breakdown:
    - Total Services Revenue
    - Total Expenses
    - Net Profit (emphasized with larger text)

**4. Data Display Patterns**
- Tables with alternating row subtle backgrounds (print-friendly)
- Right-aligned numerical values
- Bold totals with top borders
- Clear spacing between sections (mb-8)

**5. Icons**
**Library:** Heroicons (via CDN)
- Calendar icon for date picker
- Plus icon for add buttons
- Trash icon for remove buttons
- Printer icon for print button
- Currency/Cash icon for cash section

### D. Animations

**Minimal Animations (Screen Only):**
- Fade-in for dynamically added rows (duration-200)
- Smooth scroll to generated report
- No animations for print view

## Print Optimization

**CSS Print Rules:**
- Hide all input forms and buttons (@media print)
- Show only report content
- Force page breaks appropriately
- Set fixed A4 dimensions
- Remove screen-only elements (shadows, backgrounds)
- Ensure all text is readable in black & white
- Page margins: 20mm all sides

**Print Layout Structure:**
1. Header section (company branding)
2. Report metadata (date, report number if applicable)
3. Services table with subtotal
4. Cash in hand display
5. Expenses table with subtotal
6. Summary/Net Profit section (emphasized)
7. Footer with company address/contact (optional)

## Responsive Behavior

- **Mobile (< 768px):** Single column, form-first view, preview hidden until generation
- **Tablet (768px - 1024px):** Stacked sections with preview below form
- **Desktop (> 1024px):** Side-by-side panels (form left, live preview right)

## Accessibility

- All form inputs with visible labels (not placeholder-only)
- Proper focus states on all interactive elements
- High contrast for readability
- Semantic HTML for screen readers
- Keyboard navigation support for dynamic row management

## Professional Polish

- Consistent border styling throughout
- Subtle shadows for screen cards (removed in print)
- Professional table formatting with clear hierarchy
- Generous line-height for readability (leading-relaxed)
- Proper alignment (left for text, right for numbers)
- Clear visual separation between input and output modes