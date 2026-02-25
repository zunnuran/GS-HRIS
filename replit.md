# HRM & Asset Management System for Gaming Company

## Overview
A Human Resource Management and Asset Management system designed for a gaming company. Combines Employee Management, Payroll System with complex spreadsheet-based calculations, and full Asset Management with assignment tracking.

## Current State
- **Authentication**: Session-based with bcrypt password hashing, default admin credentials: username "admin", password "admin123"
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React with Vite, Shadcn UI with Tailwind CSS, TanStack Query for data fetching
- **UI Framework**: Shadcn UI components (NOT MUI), dark mode support

## Key Features

### Employee Management
- CRUD operations with comprehensive salary attributes
- Gross salary, required hours per day, overtime multiplier
- Department assignment
- Status tracking (active/inactive)

### Payroll System
- **Working Days**: Determined at payroll time (auto-calculated excluding Sundays based on selected month/year)
- **Weekly Hours**: Entered in HH:MM format (e.g., "48:00" for 48 hours)
- **Dynamic Allowances**: Default allowances (PDF, Child Education, Inpatient, Gym) plus ability to add custom allowance fields
- **Calculation**: Net Salary = Gross - (Hours Short * Per Hour Rate * OT Multiplier) - Advances + Allowances + Bonuses

### Asset Management
- **Assets**: CRUD with auto-generated codes (AST-0001 format), categories, sub-categories, manufacturers, locations
- **Asset Categories**: Hierarchical with sub-categories, expandable inline view
- **Asset Assignments**: Assign assets to employees, track active/recovered status
- **Manufacturers**: Manage asset manufacturers with contact info
- **Locations**: Manage physical locations (building, floor, room)
- **Status Tracking**: working, malfunctioning, damaged states

### Dashboard
- Real-time statistics (employee count, payroll totals)
- Asset management stats (total assets, categories, active assignments, asset health)
- Department distribution chart
- Payroll history chart (last 6 months)
- Recent activity feed

## Project Architecture

### Frontend (`client/src/`)
- `pages/` - Main page components:
  - HR: Dashboard, Employees, Payroll, Departments, Settings, Login
  - Assets: Assets, AssetCategories, AssetAssignments, Manufacturers, Locations
- `components/ui/` - Shadcn UI components
- `components/app-sidebar.tsx` - Navigation sidebar with Main Menu, Asset Management, System sections
- `lib/` - Utilities (queryClient, theme context)

### Backend (`server/`)
- `routes.ts` - API endpoints (HR + Asset Management)
- `storage.ts` - Database operations via Drizzle
- `auth.ts` - Authentication setup (session-based with connect-pg-simple)
- `db.ts` - Database connection

### Shared (`shared/`)
- `schema.ts` - Drizzle database schema and Zod validation schemas

## Important Notes

### Payroll Calculation Details
- Weekly hours stored as TEXT in HH:MM format (e.g., "48:00")
- Conversion helpers: timeToDecimal() converts "HH:MM" to decimal hours
- Working days calculated at payroll time based on month/year, excluding Sundays
- Allowance details stored as JSON array: [{label: string, value: number}]
- Allowance types: Dropdown with predefined options (PDF, Child Education, Inpatient Allowance, Gym Allowance) + Custom option for manual entry
- Tax deduction: Manual tax deduction field for annual tax tracking
- Per-hour rate formula: grossSalary / (workingDays * requiredHoursPerDay)
- Net salary formula: grossSalary - hoursDeduction - advanceDeduction - taxDeduction + totalAllowances + bonuses + overtimePay

### Asset Management Details
- Assets auto-generate codes via `asset_code_sequence` table (AST-0001, AST-0002, etc.)
- Asset assignments reference employees table (shared between HR and Asset modules)
- Assignment status determined by recovery_date: null = active, set = recovered
- Categories support sub-categories (hierarchical)

### Database Schema
- `sessions` table managed by connect-pg-simple (not in Drizzle schema)
- HR tables: users, departments, employees, payroll_records
- Asset tables: manufacturers, locations, asset_categories, asset_sub_categories, assets, asset_assignments, asset_code_sequence
- Payroll records have `working_days_in_month` field for period-specific working days
- `allowance_details` field stores dynamic allowances as JSON text

### API Endpoints
- HR: /api/departments, /api/employees, /api/payroll, /api/dashboard/*
- Assets: /api/assets, /api/asset-categories, /api/asset-subcategories, /api/asset-assignments
- Supporting: /api/manufacturers, /api/locations
- Stats: /api/dashboard/asset-stats

## Recent Changes
- 2026-02-25: Salary slip: bold "Note:", CNIC above Designation (xxxxx-xxxxxxx-x format), "Lakh" → "Lac", removed Net Pay cell borders
- 2026-02-25: Added CNIC field to employees schema and form
- 2026-02-25: Added status filter (draft/pending/approved/paid) to payroll records list
- 2026-02-23: Added allowance type dropdown (PDF, Child Education, Inpatient, Gym + Custom) and tax deduction field to payroll
- 2026-02-23: Integrated Asset Manager - assets, categories, sub-categories, manufacturers, locations, assignments
- 2026-02-23: Updated sidebar with Asset Management section
- 2026-02-23: Combined dashboard with HR + Asset stats
- 2026-01-03: Improved TimeInput with stepper buttons (+/- for hours and minutes in 15-min increments)
- 2026-01-03: Added paid leave hours field (adds to logged time in calculation)
- 2026-01-03: Added overtime section with toggle checkbox (calculates overtime pay when enabled)
- 2026-01-03: Calculation now uses sum of expected hours (reactive to changes)
- 2026-01-03: Changed employee ID to auto-incrementing integer (primary key `id`)
- 2026-01-03: Added working days input at payroll time (auto-excludes Sundays)
- 2026-01-03: Changed weekly hours to HH:MM time format
- 2026-01-03: Added dynamic allowance fields with 4 defaults plus custom fields

## User Preferences
- Material Design aesthetic for gaming company
- PKR currency format
- Professional, clean UI with dark mode support
