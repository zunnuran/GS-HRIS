import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Minus,
  Calculator,
  Eye,
  FileText,
  TrendingDown,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  ChevronUp,
  ChevronDown,
  Pencil,
  Printer,
  Upload,
  Loader2,
  XCircle,
  Info
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PayrollRecordWithEmployee, Employee, AllowanceItem } from "@shared/schema";
import { DEFAULT_ALLOWANCES } from "@shared/schema";

// Helper functions for HH:MM time format (with backward compatibility for legacy decimal values)
function timeToDecimal(time: string | null | undefined): number {
  if (!time || time === "00:00" || time === "0") return 0;
  
  // Check if it's already a decimal number (legacy format)
  if (!time.includes(":")) {
    const num = parseFloat(time);
    return isNaN(num) ? 0 : num;
  }
  
  // Parse HH:MM format
  const parts = time.split(":");
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  return hours + (minutes / 60);
}

function decimalToTime(decimal: number): string {
  if (isNaN(decimal) || decimal === 0) return "00:00";
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// Normalize time value - converts legacy decimals to HH:MM format
function normalizeTimeValue(value: string | null | undefined): string {
  if (!value || value === "0" || value === "00:00") return "00:00";
  
  // Already in HH:MM format
  if (value.includes(":")) return value;
  
  // Convert legacy decimal to HH:MM
  const decimal = parseFloat(value);
  if (isNaN(decimal)) return "00:00";
  return decimalToTime(decimal);
}

function formatTimeDisplay(time: string | null | undefined): string {
  if (!time || time === "00:00" || time === "0") return "0h 0m";
  
  // Handle legacy decimal format
  if (!time.includes(":")) {
    const decimal = parseFloat(time);
    if (isNaN(decimal)) return "0h 0m";
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours}h ${minutes}m`;
  }
  
  const parts = time.split(":");
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  return `${hours}h ${minutes}m`;
}

// Calculate working days in a month (excluding Sundays)
function calculateWorkingDays(month: number, year: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() !== 0) { // 0 is Sunday
      workingDays++;
    }
  }
  
  return workingDays;
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Lac", "Crore"];

  function convertGroup(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertGroup(n % 100) : "");
  }

  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero";

  const groups: number[] = [];
  let remaining = n;
  groups.push(remaining % 1000);
  remaining = Math.floor(remaining / 1000);
  while (remaining > 0) {
    groups.push(remaining % 100);
    remaining = Math.floor(remaining / 100);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) {
      parts.push(convertGroup(groups[i]) + (scales[i] ? " " + scales[i] : ""));
    }
  }
  return parts.join(" ") + " Rupees Only-";
}

function printSalarySlip(record: PayrollRecordWithEmployee) {
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let allowanceItems: AllowanceItem[] = [];
  try {
    allowanceItems = JSON.parse(record.allowanceDetails || "[]");
  } catch {
    allowanceItems = [];
  }

  const grossSalary = parseFloat(record.grossSalary) || 0;
  const hoursDeduction = parseFloat(record.hoursDeduction || "0");
  const advanceDeduction = parseFloat(record.advanceDeduction || "0");
  const taxDeduction = parseFloat(record.taxDeduction || "0");
  const bonuses = parseFloat(record.bonuses || "0");
  const netSalary = parseFloat(record.netSalary || "0");
  const overtimePay = parseFloat(record.overtimePay || "0");
  const overtimeHours = parseFloat(record.overtimeHours || "0");
  const totalDeductions = hoursDeduction + advanceDeduction + taxDeduction;
  const totalAllowances = parseFloat(record.allowances || "0");

  const formatNum = (v: number) => v.toLocaleString("en-PK");

  const salaryMonth = `${shortMonths[record.month - 1]}-${record.year.toString().slice(-2)}`;
  const hireDate = record.employee.hireDate
    ? new Date(record.employee.hireDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

  const today = new Date();
  const dated = today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const paymentRows = [
    { label: "Basic:", value: grossSalary },
    ...allowanceItems.map(a => ({ label: `${a.label}:`, value: typeof a.value === "string" ? parseFloat(a.value) || 0 : a.value })),
    ...(bonuses > 0 ? [{ label: "Performance Bonus:", value: bonuses }] : [{ label: "Performance Bonus:", value: 0 }]),
    ...(overtimePay > 0 ? [{ label: "Over Time:", value: overtimePay }] : []),
  ];

  const deductionRows = [
    { label: "Tax Deduction", value: taxDeduction },
    { label: "Advance Salary", value: advanceDeduction },
    { label: "Time Deduction", value: hoursDeduction },
  ];

  const maxRows = Math.max(paymentRows.length, deductionRows.length);

  let tableRows = "";
  for (let i = 0; i < maxRows; i++) {
    const pay = paymentRows[i];
    const ded = deductionRows[i];
    tableRows += `<tr>
      <td style="padding:4px 8px;border:1px solid #000;width:40%">${pay ? pay.label : ""}</td>
      <td style="padding:4px 8px;border:1px solid #000;text-align:right;width:15%">${pay ? formatNum(pay.value) : ""}</td>
      <td style="padding:4px 8px;border:1px solid #000;width:30%">${ded ? ded.label : ""}</td>
      <td style="padding:4px 8px;border:1px solid #000;text-align:right;width:15%">${ded ? formatNum(ded.value) : ""}</td>
    </tr>`;
  }

  const netInWords = numberToWords(Math.round(netSalary));

  const bgUrl = window.location.origin + "/slip-background.jpg";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Salary Slip - ${record.employee.firstName} ${record.employee.lastName} - ${months[record.month - 1]} ${record.year}</title>
  <style>
    @media print {
      @page { margin: 0; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 0; }
    .page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      margin: 0 auto;
      background-image: url('${bgUrl}');
      background-size: 210mm 297mm;
      background-repeat: no-repeat;
      background-position: top left;
    }
    .content {
      padding-top: 76mm;
      padding-left: 18mm;
      padding-right: 18mm;
      padding-bottom: 45mm;
    }
    table { border-collapse: collapse; width: 100%; }
    .header-table td { padding: 3px 0; font-size: 11px; }
    .main-table td { font-size: 10px; }
    .main-table th { font-size: 10px; }
    .totals-table td { font-size: 11px; font-weight: bold; padding: 5px 8px; border: 1px solid #000; }
    .note { font-size: 9px; color: #555; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="content">
      <h2 style="text-align:center;margin:0 0 4px 0;font-size:15px;letter-spacing:1px;">SALARY SLIP</h2>
      <p style="text-align:right;margin:0 0 12px 0;font-size:10px;color:#555;">Dated: ${dated}</p>

      <table class="header-table" style="margin-bottom:12px;width:100%;">
        <tr>
          <td style="width:20%"><strong>Employee Name:</strong></td>
          <td style="width:35%">${record.employee.firstName} ${record.employee.lastName}</td>
          <td style="width:20%"><strong>CNIC:</strong></td>
          <td style="width:25%">${record.employee.cnic || "-"}</td>
        </tr>
        <tr>
          <td><strong>Designation:</strong></td>
          <td>${record.employee.position || "-"}</td>
          <td><strong>Employee Code:</strong></td>
          <td>${record.employee.id}</td>
        </tr>
        <tr>
          <td><strong>Joining Date:</strong></td>
          <td>${hireDate}</td>
          <td><strong>Working Days:</strong></td>
          <td>${record.workingDaysInMonth || "-"}</td>
        </tr>
        <tr>
          <td><strong>Salary Month:</strong></td>
          <td>${salaryMonth}</td>
          <td><strong>Over Time Hours:</strong></td>
          <td>${overtimeHours > 0 ? overtimeHours.toFixed(1) : ""}</td>
        </tr>
      </table>

      <table class="main-table" style="margin-bottom:0;">
        <thead>
          <tr>
            <th style="padding:5px 8px;border:1px solid #000;text-align:left;background:#f0f0f0;width:40%">PAYMENTS</th>
            <th style="padding:5px 8px;border:1px solid #000;text-align:right;background:#f0f0f0;width:15%">Amount</th>
            <th style="padding:5px 8px;border:1px solid #000;text-align:left;background:#f0f0f0;width:30%">DEDUCTIONS</th>
            <th style="padding:5px 8px;border:1px solid #000;text-align:right;background:#f0f0f0;width:15%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <table class="totals-table" style="margin-bottom:10px;">
        <tr>
          <td style="width:40%">Total Gross Salary</td>
          <td style="width:15%;text-align:right">${formatNum(grossSalary + totalAllowances + bonuses + overtimePay)}</td>
          <td style="width:30%">Total Deduction</td>
          <td style="width:15%;text-align:right">${formatNum(totalDeductions)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:left;border:none;"><strong>Net Pay</strong></td>
          <td style="text-align:right;font-size:13px;border:none;"><strong>${formatNum(netSalary)}</strong></td>
        </tr>
      </table>

      <table style="width:100%;margin-bottom:12px;">
        <tr>
          <td style="padding:3px 0;font-size:10px;"><strong>In Words:</strong> ${netInWords}</td>
        </tr>
      </table>

      <div class="note">
        <p style="margin:0;"><strong>Note:</strong> No stamp/signature is needed.</p>
        <p style="margin:2px 0 0 0;">Slip is computerized and automatically generated.</p>
      </div>
    </div>
  </div>
  <script>
    var img = new Image();
    img.onload = function() { window.print(); };
    img.onerror = function() { window.print(); };
    img.src = '${bgUrl}';
  <\/script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

const allowanceItemSchema = z.object({
  label: z.string().default(""),
  value: z.string().default("0"),
});

const payrollFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  workingDaysInMonth: z.string().default("26"),
  week1Expected: z.string().default("00:00"),
  week1Actual: z.string().default("00:00"),
  week2Expected: z.string().default("00:00"),
  week2Actual: z.string().default("00:00"),
  week3Expected: z.string().default("00:00"),
  week3Actual: z.string().default("00:00"),
  week4Expected: z.string().default("00:00"),
  week4Actual: z.string().default("00:00"),
  week5Expected: z.string().default("00:00"),
  week5Actual: z.string().default("00:00"),
  paidLeaves: z.string().default("0"),
  capLoggedHours: z.boolean().default(true),
  enableOvertime: z.boolean().default(false),
  leaveEncashmentDays: z.string().default("0"),
  advanceDeduction: z.string().default("0"),
  taxDeduction: z.string().default("0"),
  allowanceItems: z.array(allowanceItemSchema).default([]),
  bonuses: z.string().default("0"),
  remarks: z.string().optional(),
  status: z.string().default("draft"),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

interface PayrollCalculation {
  totalHoursWorked: number;
  paidLeaves: number;
  paidLeaveHours: number;
  effectiveHoursWorked: number;
  requiredMonthlyHours: number;
  hoursDifference: number;
  adjustedHoursDifference: number;
  perHourRate: number;
  perDayRate: number;
  hoursDeduction: number;
  taxDeduction: number;
  overtimeHours: number;
  overtimePay: number;
  grossSalary: number;
  netSalary: number;
  totalAllowances: number;
}

function calculatePayroll(
  employee: Employee | undefined,
  formValues: PayrollFormValues
): PayrollCalculation {
  if (!employee) {
    return {
      totalHoursWorked: 0,
      paidLeaves: 0,
      paidLeaveHours: 0,
      effectiveHoursWorked: 0,
      requiredMonthlyHours: 0,
      hoursDifference: 0,
      adjustedHoursDifference: 0,
      perHourRate: 0,
      perDayRate: 0,
      hoursDeduction: 0,
      taxDeduction: 0,
      overtimeHours: 0,
      overtimePay: 0,
      grossSalary: 0,
      netSalary: 0,
      totalAllowances: 0,
    };
  }

  const grossSalary = parseFloat(employee.grossSalary) || 0;
  const requiredHoursPerDay = parseFloat(employee.requiredHoursPerDay) || 8;
  const workingDaysInMonth = parseInt(formValues.workingDaysInMonth) || 26;
  const overtimeMultiplier = parseFloat(employee.overtimeMultiplier) || 1.0;

  // Convert HH:MM to decimal and sum actual hours (with optional capping)
  const capHours = formValues.capLoggedHours;
  
  const week1Expected = timeToDecimal(formValues.week1Expected || "00:00");
  const week2Expected = timeToDecimal(formValues.week2Expected || "00:00");
  const week3Expected = timeToDecimal(formValues.week3Expected || "00:00");
  const week4Expected = timeToDecimal(formValues.week4Expected || "00:00");
  const week5Expected = timeToDecimal(formValues.week5Expected || "00:00");
  
  const week1Actual = timeToDecimal(formValues.week1Actual || "00:00");
  const week2Actual = timeToDecimal(formValues.week2Actual || "00:00");
  const week3Actual = timeToDecimal(formValues.week3Actual || "00:00");
  const week4Actual = timeToDecimal(formValues.week4Actual || "00:00");
  const week5Actual = timeToDecimal(formValues.week5Actual || "00:00");
  
  // Cap each week's actual hours to expected if capping is enabled
  const cappedWeek1 = capHours ? Math.min(week1Actual, week1Expected) : week1Actual;
  const cappedWeek2 = capHours ? Math.min(week2Actual, week2Expected) : week2Actual;
  const cappedWeek3 = capHours ? Math.min(week3Actual, week3Expected) : week3Actual;
  const cappedWeek4 = capHours ? Math.min(week4Actual, week4Expected) : week4Actual;
  const cappedWeek5 = capHours ? Math.min(week5Actual, week5Expected) : week5Actual;
  
  const totalHoursWorked = cappedWeek1 + cappedWeek2 + cappedWeek3 + cappedWeek4 + cappedWeek5;

  // Paid leaves (count) - converted to hours based on required hours per day
  const paidLeaves = parseFloat(formValues.paidLeaves || "0");
  const paidLeaveHours = paidLeaves * requiredHoursPerDay;
  const effectiveHoursWorked = totalHoursWorked + paidLeaveHours;

  // Calculate required hours from working days × hours per day (not from weekly expected totals)
  // This ensures per-hour rate updates when working days are changed
  const requiredMonthlyHours = week1Expected + week2Expected + week3Expected + week4Expected + week5Expected;

  // For hour difference calculation, use sum of weekly expected hours (what was actually scheduled)
  const scheduledHours = week1Expected + week2Expected + week3Expected + week4Expected + week5Expected;

  const hoursDifference = scheduledHours - effectiveHoursWorked;

  const leaveEncashmentDays = parseInt(formValues.leaveEncashmentDays || "0");
  const leaveEncashmentHours = leaveEncashmentDays * requiredHoursPerDay;
  const adjustedHoursDifference = hoursDifference - leaveEncashmentHours;

  // Per-hour rate based on working days formula: totalSalary / (workingDays × hoursPerDay)
  const perHourRate = requiredMonthlyHours > 0 ? grossSalary / requiredMonthlyHours : 0;
  const perDayRate = workingDaysInMonth > 0 ? grossSalary / workingDaysInMonth : 0;

  // Hours deduction (only if hours short after adjustments)
  const hoursDeduction = adjustedHoursDifference > 0
    ? adjustedHoursDifference * perHourRate * overtimeMultiplier
    : 0;

  // Overtime calculation (when enabled and worked more than scheduled hours)
  let overtimeHours = 0;
  let overtimePay = 0;
  if (formValues.enableOvertime && effectiveHoursWorked > scheduledHours) {
    overtimeHours = effectiveHoursWorked - scheduledHours;
    overtimePay = overtimeHours * perHourRate * overtimeMultiplier;
  }

  const advanceDeduction = parseFloat(formValues.advanceDeduction || "0");
  const taxDeduction = parseFloat(formValues.taxDeduction || "0");
  
  // Sum all allowance values
  const totalAllowances = formValues.allowanceItems?.reduce((sum, item) => {
    return sum + (parseFloat(item.value) || 0);
  }, 0) || 0;
  
  const bonuses = parseFloat(formValues.bonuses || "0");

  const netSalary = grossSalary - hoursDeduction - advanceDeduction - taxDeduction + totalAllowances + bonuses + overtimePay;

  return {
    totalHoursWorked,
    paidLeaves,
    paidLeaveHours,
    effectiveHoursWorked,
    requiredMonthlyHours,
    hoursDifference,
    adjustedHoursDifference,
    perHourRate,
    perDayRate,
    hoursDeduction,
    taxDeduction,
    overtimeHours,
    overtimePay,
    grossSalary,
    netSalary,
    totalAllowances,
  };
}

// Time input component for HH:MM format with stepper buttons
function TimeInput({ 
  value, 
  onChange, 
  ...props 
}: { 
  value: string; 
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [hours, setHours] = useState(() => {
    const [h] = (value || "00:00").split(":");
    return parseInt(h) || 0;
  });
  const [minutes, setMinutes] = useState(() => {
    const parts = (value || "00:00").split(":");
    return parseInt(parts[1]) || 0;
  });

  useEffect(() => {
    const [h, m] = (value || "00:00").split(":");
    setHours(parseInt(h) || 0);
    setMinutes(parseInt(m) || 0);
  }, [value]);

  const updateValue = (h: number, m: number) => {
    const hStr = Math.max(0, h).toString().padStart(2, "0");
    const mStr = Math.min(59, Math.max(0, m)).toString().padStart(2, "0");
    onChange(`${hStr}:${mStr}`);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
    setHours(val);
    updateValue(val, minutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value.replace(/\D/g, "")) || 0;
    if (val > 59) val = 59;
    setMinutes(val);
    updateValue(hours, val);
  };

  const incrementHours = () => updateValue(hours + 1, minutes);
  const decrementHours = () => updateValue(Math.max(0, hours - 1), minutes);
  const incrementMinutes = () => {
    if (minutes >= 45) {
      updateValue(hours + 1, 0);
    } else {
      updateValue(hours, minutes + 15);
    }
  };
  const decrementMinutes = () => {
    if (minutes < 15) {
      if (hours > 0) {
        updateValue(hours - 1, 45);
      } else {
        updateValue(0, 0);
      }
    } else {
      updateValue(hours, minutes - 15);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-14"
          onClick={incrementHours}
          data-testid="button-increment-hours"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Input
          {...props}
          type="text"
          value={hours.toString().padStart(2, "0")}
          onChange={handleHoursChange}
          className="w-14 text-center font-mono text-base h-9"
          data-testid="input-hours"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-14"
          onClick={decrementHours}
          data-testid="button-decrement-hours"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-muted-foreground font-bold text-xl">:</span>
      <div className="flex flex-col items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-14"
          onClick={incrementMinutes}
          data-testid="button-increment-minutes"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Input
          type="text"
          value={minutes.toString().padStart(2, "0")}
          onChange={handleMinutesChange}
          className="w-14 text-center font-mono text-base h-9"
          data-testid="input-minutes"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-14"
          onClick={decrementMinutes}
          data-testid="button-decrement-minutes"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const PREDEFINED_ALLOWANCE_LABELS = DEFAULT_ALLOWANCES.map(a => a.label);

function AllowanceRow({ form, index, onRemove }: { form: any; index: number; onRemove: () => void }) {
  const currentLabel = form.watch(`allowanceItems.${index}.label`);
  const isPredefined = PREDEFINED_ALLOWANCE_LABELS.includes(currentLabel);
  const [isCustomMode, setIsCustomMode] = useState(() => {
    return currentLabel !== "" && !isPredefined;
  });

  const selectDisplayValue = isCustomMode ? "__custom__" : (isPredefined ? currentLabel : "");

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3">
        <FormField
          control={form.control}
          name={`allowanceItems.${index}.label`}
          render={({ field: labelField }) => (
            <FormItem className="flex-1">
              {index === 0 && <FormLabel>Allowance Type</FormLabel>}
              <Select
                value={selectDisplayValue}
                onValueChange={(val) => {
                  if (val === "__custom__") {
                    setIsCustomMode(true);
                    labelField.onChange("");
                  } else {
                    setIsCustomMode(false);
                    labelField.onChange(val);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger data-testid={`select-allowance-type-${index}`}>
                    <SelectValue placeholder="Select allowance type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DEFAULT_ALLOWANCES.map((a) => (
                    <SelectItem key={a.label} value={a.label}>
                      {a.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom (enter manually)</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`allowanceItems.${index}.value`}
          render={({ field }) => (
            <FormItem className="w-32">
              {index === 0 && <FormLabel>Amount (PKR)</FormLabel>}
              <FormControl>
                <Input 
                  type="number"
                  placeholder="0" 
                  {...field} 
                  data-testid={`input-allowance-value-${index}`}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0"
          data-testid={`button-remove-allowance-${index}`}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      {isCustomMode && (
        <FormField
          control={form.control}
          name={`allowanceItems.${index}.label`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  placeholder="Enter custom allowance name"
                  {...field}
                  data-testid={`input-allowance-custom-label-${index}`}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

function AllowancesCard({ form, allowanceFields, appendAllowance, removeAllowance }: {
  form: any;
  allowanceFields: any[];
  appendAllowance: (value: { label: string; value: string }) => void;
  removeAllowance: (index: number) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Allowances</CardTitle>
        <CardDescription>Select from predefined types or add custom</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowanceFields.map((field, index) => (
          <AllowanceRow
            key={field.id}
            form={form}
            index={index}
            onRemove={() => removeAllowance(index)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendAllowance({ label: "", value: "0" })}
          data-testid="button-add-allowance"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Allowance
        </Button>
      </CardContent>
    </Card>
  );
}

function PayrollFormDialog({
  open,
  onOpenChange,
  employees,
  editRecord,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  editRecord?: PayrollRecordWithEmployee | null;
}) {
  const { toast } = useToast();
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  const currentYear = currentDate.getFullYear().toString();
  const isEditMode = !!editRecord;

  // Calculate default working days for current month
  const defaultWorkingDays = calculateWorkingDays(parseInt(currentMonth), parseInt(currentYear));

  // Parse allowance details from editRecord if present
  const parseAllowanceDetails = (record: PayrollRecordWithEmployee | null | undefined) => {
    if (!record?.allowanceDetails) return [];
    try {
      const parsed = JSON.parse(record.allowanceDetails);
      return Array.isArray(parsed) && parsed.length > 0
        ? parsed.map((a: { label: string; value: number }) => ({
            label: a.label,
            value: a.value.toString(),
          }))
        : [];
    } catch {
      return [];
    }
  };

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: editRecord ? {
      employeeId: editRecord.employeeId.toString(),
      month: editRecord.month.toString(),
      year: editRecord.year.toString(),
      workingDaysInMonth: editRecord.workingDaysInMonth?.toString() || "26",
      week1Expected: normalizeTimeValue(editRecord.week1Expected),
      week1Actual: normalizeTimeValue(editRecord.week1Actual),
      week2Expected: normalizeTimeValue(editRecord.week2Expected),
      week2Actual: normalizeTimeValue(editRecord.week2Actual),
      week3Expected: normalizeTimeValue(editRecord.week3Expected),
      week3Actual: normalizeTimeValue(editRecord.week3Actual),
      week4Expected: normalizeTimeValue(editRecord.week4Expected),
      week4Actual: normalizeTimeValue(editRecord.week4Actual),
      week5Expected: normalizeTimeValue(editRecord.week5Expected),
      week5Actual: normalizeTimeValue(editRecord.week5Actual),
      paidLeaves: editRecord.paidLeaves?.toString() || "0",
      capLoggedHours: editRecord.capLoggedHours ?? true,
      enableOvertime: editRecord.enableOvertime || false,
      leaveEncashmentDays: editRecord.leaveEncashmentDays?.toString() || "0",
      advanceDeduction: editRecord.advanceDeduction?.toString() || "0",
      taxDeduction: editRecord.taxDeduction?.toString() || "0",
      allowanceItems: parseAllowanceDetails(editRecord),
      bonuses: editRecord.bonuses?.toString() || "0",
      remarks: editRecord.remarks || "",
      status: editRecord.status || "draft",
    } : {
      employeeId: "",
      month: currentMonth,
      year: currentYear,
      workingDaysInMonth: defaultWorkingDays.toString(),
      week1Expected: "48:00",
      week1Actual: "00:00",
      week2Expected: "48:00",
      week2Actual: "00:00",
      week3Expected: "48:00",
      week3Actual: "00:00",
      week4Expected: "40:00",
      week4Actual: "00:00",
      week5Expected: "24:00",
      week5Actual: "00:00",
      paidLeaves: "0",
      capLoggedHours: true,
      enableOvertime: false,
      leaveEncashmentDays: "0",
      advanceDeduction: "0",
      taxDeduction: "0",
      allowanceItems: [],
      bonuses: "0",
      remarks: "",
      status: "draft",
    },
  });

  // Reset form when editRecord changes (handles both edit mode and create mode)
  useEffect(() => {
    if (editRecord) {
      // Edit mode: populate with existing record
      form.reset({
        employeeId: editRecord.employeeId.toString(),
        month: editRecord.month.toString(),
        year: editRecord.year.toString(),
        workingDaysInMonth: editRecord.workingDaysInMonth?.toString() || "26",
        week1Expected: normalizeTimeValue(editRecord.week1Expected),
        week1Actual: normalizeTimeValue(editRecord.week1Actual),
        week2Expected: normalizeTimeValue(editRecord.week2Expected),
        week2Actual: normalizeTimeValue(editRecord.week2Actual),
        week3Expected: normalizeTimeValue(editRecord.week3Expected),
        week3Actual: normalizeTimeValue(editRecord.week3Actual),
        week4Expected: normalizeTimeValue(editRecord.week4Expected),
        week4Actual: normalizeTimeValue(editRecord.week4Actual),
        week5Expected: normalizeTimeValue(editRecord.week5Expected),
        week5Actual: normalizeTimeValue(editRecord.week5Actual),
        paidLeaves: editRecord.paidLeaves?.toString() || "0",
        capLoggedHours: editRecord.capLoggedHours ?? true,
        enableOvertime: editRecord.enableOvertime || false,
        leaveEncashmentDays: editRecord.leaveEncashmentDays?.toString() || "0",
        advanceDeduction: editRecord.advanceDeduction?.toString() || "0",
        taxDeduction: editRecord.taxDeduction?.toString() || "0",
        allowanceItems: parseAllowanceDetails(editRecord),
        bonuses: editRecord.bonuses?.toString() || "0",
        remarks: editRecord.remarks || "",
        status: editRecord.status || "draft",
      });
    } else if (open) {
      // Create mode: reset to fresh defaults when dialog opens for new record
      const freshWorkingDays = calculateWorkingDays(parseInt(currentMonth), parseInt(currentYear));
      form.reset({
        employeeId: "",
        month: currentMonth,
        year: currentYear,
        workingDaysInMonth: freshWorkingDays.toString(),
        week1Expected: "48:00",
        week1Actual: "00:00",
        week2Expected: "48:00",
        week2Actual: "00:00",
        week3Expected: "48:00",
        week3Actual: "00:00",
        week4Expected: "40:00",
        week4Actual: "00:00",
        week5Expected: "24:00",
        week5Actual: "00:00",
        paidLeaves: "0",
        capLoggedHours: true,
        enableOvertime: false,
        leaveEncashmentDays: "0",
        advanceDeduction: "0",
        taxDeduction: "0",
        allowanceItems: [],
        bonuses: "0",
        remarks: "",
        status: "draft",
      });
    }
  }, [editRecord, open, form, currentMonth, currentYear]);

  const { fields: allowanceFields, append: appendAllowance, remove: removeAllowance } = useFieldArray({
    control: form.control,
    name: "allowanceItems",
  });

  const formValues = form.watch();
  const selectedEmployee = employees.find(
    (e) => e.id.toString() === formValues.employeeId
  );

  const calculation = useMemo(
    () => calculatePayroll(selectedEmployee, formValues),
    [selectedEmployee, formValues]
  );

  // Update working days when month/year changes
  useEffect(() => {
    const month = parseInt(formValues.month);
    const year = parseInt(formValues.year);
    if (month && year) {
      const workingDays = calculateWorkingDays(month, year);
      form.setValue("workingDaysInMonth", workingDays.toString());
    }
  }, [formValues.month, formValues.year, form]);

  // Update expected hours when employee or working days change (only for new records, not when editing)
  useEffect(() => {
    if (selectedEmployee && !editRecord) {
      const hoursPerDay = parseFloat(selectedEmployee.requiredHoursPerDay) || 8;
      
      // Distribute across weeks (6 days each for first 4 weeks, remainder for week 5)
      const weekHours = hoursPerDay * 6;
      form.setValue("week1Expected", decimalToTime(weekHours));
      form.setValue("week2Expected", decimalToTime(weekHours));
      form.setValue("week3Expected", decimalToTime(weekHours));
      form.setValue("week4Expected", decimalToTime(weekHours));
      
      const remainingDays = parseInt(formValues.workingDaysInMonth) - 24;
      form.setValue("week5Expected", decimalToTime(Math.max(0, remainingDays * hoursPerDay)));
    }
  }, [selectedEmployee, formValues.workingDaysInMonth, form, editRecord]);

  const buildPayload = (data: PayrollFormValues) => {
    const calc = calculatePayroll(selectedEmployee, data);
    
    // Convert allowance items to JSON string, filtering out blank rows
    const allowanceDetails = JSON.stringify(
      (data.allowanceItems ?? [])
        .filter(item => item.label.trim() !== "")
        .map(item => ({
          label: item.label,
          value: parseFloat(item.value) || 0,
        }))
    );
    
    return {
      employeeId: parseInt(data.employeeId),
      month: parseInt(data.month),
      year: parseInt(data.year),
      workingDaysInMonth: parseInt(data.workingDaysInMonth),
      week1Expected: data.week1Expected,
      week1Actual: data.week1Actual,
      week2Expected: data.week2Expected,
      week2Actual: data.week2Actual,
      week3Expected: data.week3Expected,
      week3Actual: data.week3Actual,
      week4Expected: data.week4Expected,
      week4Actual: data.week4Actual,
      week5Expected: data.week5Expected,
      week5Actual: data.week5Actual,
      paidLeaves: parseFloat(data.paidLeaves || "0").toFixed(2),
      capLoggedHours: data.capLoggedHours,
      enableOvertime: data.enableOvertime,
      overtimeHours: calc.overtimeHours.toFixed(2),
      overtimePay: calc.overtimePay.toFixed(2),
      totalHoursWorked: calc.totalHoursWorked.toFixed(2),
      requiredMonthlyHours: calc.requiredMonthlyHours.toFixed(2),
      hoursDifference: calc.hoursDifference.toFixed(2),
      leaveEncashmentDays: parseInt(data.leaveEncashmentDays || "0"),
      adjustedHoursDifference: calc.adjustedHoursDifference.toFixed(2),
      perHourRate: calc.perHourRate.toFixed(2),
      perDayRate: calc.perDayRate.toFixed(2),
      hoursDeduction: calc.hoursDeduction.toFixed(2),
      advanceDeduction: data.advanceDeduction || "0",
      taxDeduction: data.taxDeduction || "0",
      allowanceDetails: allowanceDetails,
      allowances: calc.totalAllowances.toFixed(2),
      bonuses: data.bonuses || "0",
      grossSalary: calc.grossSalary.toFixed(2),
      netSalary: calc.netSalary.toFixed(2),
      remarks: data.remarks || null,
      status: data.status,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (data: PayrollFormValues) => {
      if (!selectedEmployee) {
        throw new Error("Employee not selected");
      }
      const payload = buildPayload(data);
      return apiRequest("POST", "/api/payroll", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payroll record created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create payroll record", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PayrollFormValues) => {
      if (!editRecord?.id) {
        throw new Error("No payroll record to update");
      }
      if (!selectedEmployee) {
        throw new Error("Employee not selected");
      }
      const payload = buildPayload(data);
      return apiRequest("PUT", `/api/payroll/${editRecord.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payroll record updated successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update payroll record", variant: "destructive" });
    },
  });

  const onSubmit = (data: PayrollFormValues) => {
    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Payroll Record" : "Create Payroll Record"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Period & Employee</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payroll-employee">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)).map((emp) => (
                                <SelectItem key={emp.id} value={emp.id.toString()}>
                                  {emp.firstName} {emp.lastName} (ID: {emp.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-payroll-month">
                                  <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {months.map((month, index) => (
                                  <SelectItem key={month} value={(index + 1).toString()}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Year</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-payroll-year"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workingDaysInMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Working Days</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-working-days"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Working days are automatically calculated excluding Sundays. Adjust if needed.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Weekly Hours (HH:MM)</CardTitle>
                    <CardDescription>Enter expected and actual hours for each week in hours:minutes format</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="capLoggedHours"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 mb-4 p-3 rounded-md bg-muted/50">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-cap-logged-hours"
                            />
                          </FormControl>
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              Cap logged hours at expected
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              When enabled, actual hours cannot exceed expected hours per week
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((week) => (
                        <div key={week} className="grid grid-cols-5 gap-4 items-center">
                          <div className="text-sm font-medium text-muted-foreground">
                            Week {week}
                          </div>
                          <div className="col-span-2">
                            {week === 1 && <div className="text-xs text-muted-foreground mb-1">Expected</div>}
                            <FormField
                              control={form.control}
                              name={`week${week}Expected` as keyof PayrollFormValues}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <TimeInput
                                      value={field.value as string}
                                      onChange={field.onChange}
                                      data-testid={`input-week${week}-expected`}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="col-span-2">
                            {week === 1 && <div className="text-xs text-muted-foreground mb-1">Actual</div>}
                            <FormField
                              control={form.control}
                              name={`week${week}Actual` as keyof PayrollFormValues}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <TimeInput
                                      value={field.value as string}
                                      onChange={field.onChange}
                                      data-testid={`input-week${week}-actual`}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Paid Leaves & Overtime</CardTitle>
                    <CardDescription>Add paid leaves (days) and configure overtime pay</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="paidLeaves"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paid Leaves (Days)</FormLabel>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const current = parseFloat(field.value) || 0;
                                  if (current >= 0.25) field.onChange((current - 0.25).toFixed(2));
                                }}
                                data-testid="button-decrement-paid-leaves"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  {...field}
                                  className="w-24 text-center font-mono"
                                  data-testid="input-paid-leaves"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const current = parseFloat(field.value) || 0;
                                  field.onChange((current + 0.25).toFixed(2));
                                }}
                                data-testid="button-increment-paid-leaves"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Converted to {calculation.paidLeaveHours.toFixed(1)} hours ({selectedEmployee?.requiredHoursPerDay || 8}h/day)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="enableOvertime"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-enable-overtime"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Pay Overtime</FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Calculate overtime pay for extra hours worked
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    {formValues.enableOvertime && calculation.overtimeHours > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">Overtime Details</span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Overtime Hours:</span>
                            <span className="ml-2 font-medium">{decimalToTime(calculation.overtimeHours)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Overtime Pay:</span>
                            <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                              +PKR {calculation.overtimePay.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <AllowancesCard
                  form={form}
                  allowanceFields={allowanceFields}
                  appendAllowance={appendAllowance}
                  removeAllowance={removeAllowance}
                />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Other Adjustments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="leaveEncashmentDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leave Encashment (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-leave-encashment"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="advanceDeduction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Advance Deduction (PKR)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-advance-deduction"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="taxDeduction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Deduction (PKR)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-tax-deduction"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bonuses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bonuses (PKR)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-bonuses"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any notes..."
                              {...field} 
                              data-testid="input-remarks"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="sticky top-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Calculation Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedEmployee ? (
                      <>
                        <div className="p-3 rounded-md bg-muted/50">
                          <div className="text-sm font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                          <div className="text-xs text-muted-foreground">ID: {selectedEmployee.id}</div>
                        </div>

                        <Accordion type="single" collapsible defaultValue="summary" className="w-full">
                          <AccordionItem value="summary">
                            <AccordionTrigger className="text-sm py-2">Hours Summary</AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Working Days</span>
                                  <span className="font-mono">{formValues.workingDaysInMonth} days</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Required Hours</span>
                                  <span className="font-mono">{calculation.requiredMonthlyHours.toFixed(1)}h</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Hours Logged</span>
                                  <span className="font-mono">{calculation.totalHoursWorked.toFixed(1)}h</span>
                                </div>
                                {calculation.paidLeaves > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>+ Paid Leaves ({calculation.paidLeaves} days)</span>
                                    <span className="font-mono">{calculation.paidLeaveHours.toFixed(1)}h</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-medium">
                                  <span className="text-muted-foreground">Effective Hours</span>
                                  <span className="font-mono">{calculation.effectiveHoursWorked.toFixed(1)}h</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Difference</span>
                                  <span className={`font-mono flex items-center gap-1 ${calculation.hoursDifference > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {calculation.hoursDifference > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                                    {Math.abs(calculation.hoursDifference).toFixed(1)}h
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">After Leave Encashment</span>
                                  <span className="font-mono">{calculation.adjustedHoursDifference.toFixed(1)}h</span>
                                </div>
                                {formValues.enableOvertime && calculation.overtimeHours > 0 && (
                                  <div className="flex justify-between text-green-600 font-medium">
                                    <span>Overtime Hours</span>
                                    <span className="font-mono">{calculation.overtimeHours.toFixed(1)}h</span>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="rates">
                            <AccordionTrigger className="text-sm py-2">Rate Calculation</AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Per Hour Rate</span>
                                  <span className="font-mono">{formatCurrency(calculation.perHourRate)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Per Day Rate</span>
                                  <span className="font-mono">{formatCurrency(calculation.perDayRate)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">OT Multiplier</span>
                                  <span className="font-mono">{selectedEmployee.overtimeMultiplier}x</span>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="allowances">
                            <AccordionTrigger className="text-sm py-2">Allowances Breakdown</AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 text-sm">
                                {formValues.allowanceItems?.filter(a => parseFloat(a.value) > 0).map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-green-600">
                                    <span className="truncate max-w-[150px]">{item.label}</span>
                                    <span className="font-mono">+ {formatCurrency(parseFloat(item.value) || 0)}</span>
                                  </div>
                                ))}
                                {(!formValues.allowanceItems || formValues.allowanceItems.every(a => parseFloat(a.value) <= 0)) && (
                                  <div className="text-muted-foreground text-center py-2">No allowances added</div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                        <Separator />

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gross Salary</span>
                            <span className="font-mono font-medium">{formatCurrency(calculation.grossSalary)}</span>
                          </div>
                          <div className="flex justify-between text-red-500">
                            <span>Hours Deduction</span>
                            <span className="font-mono">- {formatCurrency(calculation.hoursDeduction)}</span>
                          </div>
                          <div className="flex justify-between text-red-500">
                            <span>Advance Deduction</span>
                            <span className="font-mono">- {formatCurrency(parseFloat(formValues.advanceDeduction || "0"))}</span>
                          </div>
                          <div className="flex justify-between text-red-500">
                            <span>Tax Deduction</span>
                            <span className="font-mono">- {formatCurrency(parseFloat(formValues.taxDeduction || "0"))}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Total Allowances</span>
                            <span className="font-mono">+ {formatCurrency(calculation.totalAllowances)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Bonuses</span>
                            <span className="font-mono">+ {formatCurrency(parseFloat(formValues.bonuses || "0"))}</span>
                          </div>
                          {formValues.enableOvertime && calculation.overtimePay > 0 && (
                            <div className="flex justify-between text-green-600 font-medium">
                              <span>Overtime Pay</span>
                              <span className="font-mono">+ {formatCurrency(calculation.overtimePay)}</span>
                            </div>
                          )}
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center pt-2">
                          <span className="font-medium">Net Salary</span>
                          <span className={`text-xl font-bold font-mono ${calculation.netSalary >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatCurrency(calculation.netSalary)}
                          </span>
                        </div>

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-payroll-status">
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="approved">Approved</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Select an employee to see calculations</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-payroll"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending || !selectedEmployee}
                data-testid="button-submit-payroll"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? (isEditMode ? "Saving..." : "Creating...")
                  : (isEditMode ? "Save Changes" : "Create Payroll Record")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PayrollDetailDialog({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PayrollRecordWithEmployee | null;
}) {
  if (!record) return null;

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Parse allowance details
  let allowanceItems: AllowanceItem[] = [];
  try {
    allowanceItems = JSON.parse(record.allowanceDetails || "[]");
  } catch {
    allowanceItems = [];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Payroll Details
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => printSalarySlip(record)}
              className="flex items-center gap-2"
              data-testid="button-print-detail"
            >
              <Printer className="h-4 w-4" />
              Print Slip
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{record.employee.firstName} {record.employee.lastName}</h3>
                  <p className="text-sm text-muted-foreground">ID: {record.employee.id}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{months[record.month - 1]} {record.year}</div>
                  <Badge variant={record.status === "paid" ? "default" : "secondary"} className="mt-1 capitalize">
                    {record.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Working Days</span>
                  <span className="font-mono">{record.workingDaysInMonth} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Required</span>
                  <span className="font-mono">{record.requiredMonthlyHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Worked</span>
                  <span className="font-mono">{record.totalHoursWorked}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difference</span>
                  <span className="font-mono">{record.hoursDifference}h</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Hour</span>
                  <span className="font-mono">{formatCurrency(record.perHourRate || "0")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Per Day</span>
                  <span className="font-mono">{formatCurrency(record.perDayRate || "0")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {allowanceItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Allowances</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {allowanceItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-green-600">+ {formatCurrency(item.value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Salary Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Salary</span>
                <span className="font-mono font-medium">{formatCurrency(record.grossSalary)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Hours Deduction</span>
                <span className="font-mono">- {formatCurrency(record.hoursDeduction || "0")}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Advance Deduction</span>
                <span className="font-mono">- {formatCurrency(record.advanceDeduction || "0")}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Tax Deduction</span>
                <span className="font-mono">- {formatCurrency(record.taxDeduction || "0")}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total Allowances</span>
                <span className="font-mono">+ {formatCurrency(record.allowances || "0")}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Bonuses</span>
                <span className="font-mono">+ {formatCurrency(record.bonuses || "0")}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between pt-2">
                <span className="font-medium">Net Salary</span>
                <span className="text-lg font-bold font-mono text-green-600">
                  {formatCurrency(record.netSalary || "0")}
                </span>
              </div>
            </CardContent>
          </Card>

          {record.remarks && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{record.remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Payroll() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecordWithEmployee | null>(null);
  const [detailRecord, setDetailRecord] = useState<PayrollRecordWithEmployee | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<null | {
    month: number; year: number;
    summary: { created: number; updated: number; skipped: number; not_found: number };
    results: { name: string; status: string; reason?: string }[];
  }>(null);

  const { data: payrollRecords, isLoading } = useQuery<PayrollRecordWithEmployee[]>({
    queryKey: ["/api/payroll"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { toast } = useToast();

  const handleImport = async () => {
    if (!importUrl.trim()) {
      toast({ title: "Missing field", description: "Please enter the Report URL.", variant: "destructive" });
      return;
    }
    setImportLoading(true);
    setImportResults(null);
    try {
      const res = await apiRequest("POST", "/api/payroll/import-tahometer", {
        reportUrl: importUrl.trim(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Import failed", description: data.message || "Unknown error", variant: "destructive" });
      } else {
        setImportResults(data);
        queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
        toast({
          title: "Import complete",
          description: `Created: ${data.summary.created}, Updated: ${data.summary.updated}, Skipped: ${data.summary.skipped}, Not found: ${data.summary.not_found}`,
        });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message || "Network error", variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const filteredRecords = payrollRecords?.filter((record) => {
    if (monthFilter !== "all" && record.month.toString() !== monthFilter) return false;
    if (record.year.toString() !== yearFilter) return false;
    if (statusFilter !== "all" && (record.status || "draft") !== statusFilter) return false;
    return true;
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
      draft: { variant: "secondary", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      pending: { variant: "outline", icon: <Clock className="h-3 w-3 mr-1" /> },
      approved: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      paid: { variant: "default", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    };
    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-payroll-title">
            Payroll
          </h1>
          <p className="text-muted-foreground">
            Manage employee payroll and salary calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportResults(null); setImportOpen(true); }}>
            <Upload className="h-4 w-4 mr-2" />
            Import Payroll
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-create-payroll">
            <Plus className="h-4 w-4 mr-2" />
            Create Payroll
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Payroll Records ({filteredRecords?.length ?? 0})
            </CardTitle>
            <div className="flex gap-3">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-32" data-testid="filter-month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-24" data-testid="filter-year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Hours Worked</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} data-testid={`row-payroll-${record.id}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {record.employee.firstName} {record.employee.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ID: {record.employee.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {months[record.month - 1]} {record.year}
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.workingDaysInMonth} days
                      </TableCell>
                      <TableCell className="font-mono">
                        {record.totalHoursWorked}h / {record.requiredMonthlyHours}h
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(record.grossSalary)}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {formatCurrency(record.netSalary || "0")}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setDetailRecord(record)}
                            data-testid={`button-view-${record.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              setEditRecord(record);
                              setDialogOpen(true);
                            }}
                            disabled={record.status === "paid"}
                            title={record.status === "paid" ? "Paid records cannot be edited" : undefined}
                            data-testid={`button-edit-${record.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => printSalarySlip(record)}
                            data-testid={`button-print-${record.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No payroll records</h3>
              <p className="text-muted-foreground mb-4">
                Create your first payroll record to get started
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Payroll
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <PayrollFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditRecord(null);
        }}
        employees={employees}
        editRecord={editRecord}
      />

      <PayrollDetailDialog
        open={!!detailRecord}
        onOpenChange={(open) => !open && setDetailRecord(null)}
        record={detailRecord}
      />

      {/* Tahometer Import Dialog */}
      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) setImportResults(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Payroll from Tahometer
            </DialogTitle>
          </DialogHeader>

          {!importResults ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Enter the report page URL. Time data will be imported per employee per week and matched by first &amp; last name. The API token is read from Settings.</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Report URL</label>
                <Input
                  placeholder="https://gameverse.tahometer.com/app/reports/5540"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  data-testid="input-import-url"
                />
                <p className="text-xs text-muted-foreground">The full URL of the report page</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={importLoading}>
                  {importLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Import</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Created", value: importResults.summary.created, color: "text-green-500" },
                  { label: "Updated", value: importResults.summary.updated, color: "text-blue-500" },
                  { label: "Skipped", value: importResults.summary.skipped, color: "text-yellow-500" },
                  { label: "Not Found", value: importResults.summary.not_found, color: "text-red-500" },
                ].map((s) => (
                  <div key={s.label} className="rounded-md border p-2">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {importResults.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium">{r.name}</span>
                    <div className="flex items-center gap-2">
                      {r.status === "created" && <Badge variant="default" className="text-xs bg-green-600">Created</Badge>}
                      {r.status === "updated" && <Badge variant="default" className="text-xs bg-blue-600">Updated</Badge>}
                      {r.status === "skipped" && <Badge variant="secondary" className="text-xs">Skipped</Badge>}
                      {r.status === "not_found" && <Badge variant="destructive" className="text-xs">Not Found</Badge>}
                      {r.reason && <span className="text-xs text-muted-foreground">({r.reason})</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setImportResults(null)}>Import Again</Button>
                <Button onClick={() => setImportOpen(false)}>Done</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
