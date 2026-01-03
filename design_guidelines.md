# HRM System Design Guidelines

## Design Approach

**System-Based Approach**: Material Design adapted for enterprise data management, optimized for information density and workflow efficiency. The gaming company context allows for modern, slightly more dynamic treatments while maintaining professional utility.

## Core Design Principles

1. **Information Density First**: Maximize data visibility without overwhelming users
2. **Workflow Efficiency**: Minimize clicks for common tasks
3. **Scalable Data Presentation**: Support growing employee lists and complex payroll data
4. **Professional Gaming Aesthetic**: Modern and clean, not corporate-stodgy

## Typography

**Font System**: Roboto (Material Design default)
- Headings: Roboto Medium (500 weight)
  - H1: 2.5rem / 40px (Dashboard titles)
  - H2: 2rem / 32px (Page headers)
  - H3: 1.5rem / 24px (Section headers)
  - H4: 1.25rem / 20px (Card titles, table headers)
- Body: Roboto Regular (400 weight)
  - Large: 1rem / 16px (primary content)
  - Medium: 0.875rem / 14px (table data, form labels)
  - Small: 0.75rem / 12px (captions, metadata)
- Monospace: Roboto Mono for financial data, employee IDs, calculations

## Layout System

**Spacing Primitives**: Use Tailwind units of `2, 4, 8, 12, 16, 24` (p-2, m-4, gap-8, etc.)

**Structure**:
- **Sidebar Navigation**: 280px fixed width with collapsible option (64px when collapsed)
- **Main Content Area**: max-w-7xl container with px-8 horizontal padding
- **Card-Based Layouts**: Elevated cards (shadow-md) for distinct content sections
- **Dashboard Grid**: 12-column responsive grid (4 columns desktop, 2 tablet, 1 mobile)

**Page Layouts**:
1. **Dashboard**: Stats cards in 4-column grid, followed by recent activity table and quick actions
2. **Employee List**: Full-width data table with filters sidebar (280px) and bulk actions toolbar
3. **Employee Detail**: 2-column layout (8-4 split) - main info left, sidebar actions/history right
4. **Payroll System**: Multi-step wizard layout with progress indicator, calculation preview panel

## Component Library

### Navigation
- **Top Bar**: Fixed 64px height with breadcrumbs, global search, user menu, theme toggle
- **Sidebar**: Hierarchical menu with icons, expandable sections for modules (Employee Management, Payroll, Reports, Settings)
- **Breadcrumbs**: Always visible on top bar for deep navigation context

### Data Display
- **Data Tables**: 
  - MUI DataGrid with sortable columns, inline filters, row selection
  - Sticky header, pagination (25/50/100 rows per page)
  - Row height: 52px for optimal scanability
  - Action column (fixed right) with icon buttons for edit/delete/view
- **Stats Cards**: 
  - 4:1 aspect ratio, icon top-left, large number center, label and trend indicator bottom
  - Minimum height: 120px, p-6 padding
- **Info Panels**: Bordered containers with header section and content grid for employee details

### Forms
- **Form Layouts**: 
  - Single column for simple forms (max-w-2xl)
  - 2-column grid for complex forms (gap-8)
  - Grouped sections with dividers and section headers
- **Input Fields**: Material Design outlined variant, 56px height, full-width with appropriate constraints
- **Payroll Calculator**: 
  - Split view: input form left (60%), live calculation preview right (40%)
  - Calculation breakdown accordion showing each step
  - Gross salary, deductions, overtime sections clearly separated
- **Date Pickers**: Material Design calendar with quick presets (This Month, Last Month, This Year)
- **Multi-step Forms**: Horizontal stepper at top, form content below, navigation buttons fixed bottom

### Modals & Overlays
- **Dialogs**: Material Design dialogs, max-w-2xl for forms, centered placement
- **Confirmation Dialogs**: Compact (max-w-md) with clear action buttons
- **Drawers**: 480px wide slide-in from right for detail views without navigation loss

### Feedback Elements
- **Snackbars**: Bottom-center placement, 6-second auto-hide, action button option
- **Loading States**: Skeleton loaders for tables, circular progress for actions
- **Empty States**: Centered with illustration placeholder, call-to-action button

## Dashboard Specifics

**Layout**:
1. Stats grid (4 cards): Total Employees, Active Employees, Pending Payroll, This Month Payroll
2. Quick Actions bar: floating action button group (Add Employee, Run Payroll, Generate Report)
3. Recent Activity table: Last 10 employee updates/assignments
4. Payroll Overview chart: Monthly breakdown for past 6 months

## Payroll System Specifics

**Calculation Breakdown**:
- Sticky preview panel showing: Gross Salary → Deductions → Overtime → Net Salary
- Each calculation row expandable to show formula
- Reference to Google Sheets calculations with clear mapping
- Validation indicators (checkmarks) for completed sections

**Complexity Management**:
- Tabbed interface for different payroll components (Base Pay, Overtime, Deductions, Bonuses)
- Collapsible calculation details with expand-all option
- Export to spreadsheet button prominent

## Employee Management

**List View**:
- Filters: Department dropdown, Position dropdown, Status chips, Search by name/ID
- Bulk actions: Activate/Deactivate, Export CSV, Assign Assets
- Quick view preview on row click (drawer)

**Detail View**:
- Profile header with photo, name, employee ID, department
- Tabs: Overview, Payroll History, Documents, Activity Log
- Editable sections with inline edit toggles

## Responsive Behavior

- **Desktop (lg:)**: Full sidebar, 4-column dashboard grid, 2-column forms
- **Tablet (md:)**: Collapsible sidebar, 2-column dashboard grid, single-column forms
- **Mobile (base)**: Bottom navigation bar, 1-column everything, simplified tables (card view)

## Data Visualization

**Charts**: Recharts library
- Bar charts for monthly payroll comparison
- Line charts for employee count trends
- Pie charts for department distribution
Use responsive container, minimum height 300px

## Accessibility

- Proper label associations for all form fields
- Keyboard navigation for all interactive elements
- ARIA labels for icon-only buttons
- Focus indicators meeting WCAG contrast requirements
- Table headers with proper scope attributes

## Images

**No hero images needed** - This is a data-dense business application. Use:
- Employee profile placeholders (avatar initials)
- Empty state illustrations (simple line art)
- Department/company logo in sidebar header (120x40px)
- Small icons throughout for visual scanning (24x24px)