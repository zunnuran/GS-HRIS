# HRM System for Gaming Company

## Overview
A Human Resource Management system designed for a gaming company with Employee Management and Payroll System implementing complex spreadsheet-based calculations.

## Current State
- **Authentication**: Session-based with bcrypt password hashing, default admin credentials: username "admin", password "admin123"
- **Database**: PostgreSQL with Drizzle ORM
- **Frontend**: React with Vite, Material Design aesthetic, TanStack Query for data fetching

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

### Dashboard
- Real-time statistics (employee count, payroll totals)
- Department distribution chart
- Payroll history chart (last 6 months)
- Recent activity feed

## Project Architecture

### Frontend (`client/src/`)
- `pages/` - Main page components (Dashboard, Employees, Payroll, Departments, Settings, Login)
- `components/ui/` - Shadcn UI components
- `lib/` - Utilities (queryClient, theme context)

### Backend (`server/`)
- `routes.ts` - API endpoints
- `storage.ts` - Database operations via Drizzle
- `auth.ts` - Authentication setup (Passport.js with local strategy)
- `db.ts` - Database connection

### Shared (`shared/`)
- `schema.ts` - Drizzle database schema and Zod validation schemas

## Important Notes

### Payroll Calculation Details
- Weekly hours stored as TEXT in HH:MM format (e.g., "48:00")
- Conversion helpers: timeToDecimal() converts "HH:MM" to decimal hours
- Working days calculated at payroll time based on month/year, excluding Sundays
- Allowance details stored as JSON array: [{label: string, value: number}]

### Database Schema
- `sessions` table managed by connect-pg-simple (not in Drizzle schema)
- Payroll records have `working_days_in_month` field for period-specific working days
- `allowance_details` field stores dynamic allowances as JSON text

## Recent Changes
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
