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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Calculator,
  Eye,
  FileText,
  TrendingDown,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PayrollRecordWithEmployee, Employee } from "@shared/schema";

const payrollFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  week1Expected: z.string().default("0"),
  week1Actual: z.string().default("0"),
  week2Expected: z.string().default("0"),
  week2Actual: z.string().default("0"),
  week3Expected: z.string().default("0"),
  week3Actual: z.string().default("0"),
  week4Expected: z.string().default("0"),
  week4Actual: z.string().default("0"),
  week5Expected: z.string().default("0"),
  week5Actual: z.string().default("0"),
  leaveEncashmentDays: z.string().default("0"),
  advanceDeduction: z.string().default("0"),
  allowances: z.string().default("0"),
  bonuses: z.string().default("0"),
  remarks: z.string().optional(),
  status: z.string().default("draft"),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

interface PayrollCalculation {
  totalHoursWorked: number;
  requiredMonthlyHours: number;
  hoursDifference: number;
  adjustedHoursDifference: number;
  perHourRate: number;
  perDayRate: number;
  hoursDeduction: number;
  grossSalary: number;
  netSalary: number;
}

function calculatePayroll(
  employee: Employee | undefined,
  formValues: PayrollFormValues
): PayrollCalculation {
  if (!employee) {
    return {
      totalHoursWorked: 0,
      requiredMonthlyHours: 0,
      hoursDifference: 0,
      adjustedHoursDifference: 0,
      perHourRate: 0,
      perDayRate: 0,
      hoursDeduction: 0,
      grossSalary: 0,
      netSalary: 0,
    };
  }

  const grossSalary = parseFloat(employee.grossSalary) || 0;
  const requiredHoursPerDay = parseFloat(employee.requiredHoursPerDay) || 8;
  const workingDaysPerMonth = employee.workingDaysPerMonth || 26;
  const overtimeMultiplier = parseFloat(employee.overtimeMultiplier) || 1.0;

  const totalHoursWorked =
    parseFloat(formValues.week1Actual || "0") +
    parseFloat(formValues.week2Actual || "0") +
    parseFloat(formValues.week3Actual || "0") +
    parseFloat(formValues.week4Actual || "0") +
    parseFloat(formValues.week5Actual || "0");

  const requiredMonthlyHours = workingDaysPerMonth * requiredHoursPerDay;
  const hoursDifference = requiredMonthlyHours - totalHoursWorked;

  const leaveEncashmentDays = parseInt(formValues.leaveEncashmentDays || "0");
  const leaveEncashmentHours = leaveEncashmentDays * requiredHoursPerDay;
  const adjustedHoursDifference = hoursDifference - leaveEncashmentHours;

  const perHourRate = grossSalary / requiredMonthlyHours;
  const perDayRate = grossSalary / workingDaysPerMonth;

  const hoursDeduction = adjustedHoursDifference > 0
    ? adjustedHoursDifference * perHourRate * overtimeMultiplier
    : 0;

  const advanceDeduction = parseFloat(formValues.advanceDeduction || "0");
  const allowances = parseFloat(formValues.allowances || "0");
  const bonuses = parseFloat(formValues.bonuses || "0");

  const netSalary = grossSalary - hoursDeduction - advanceDeduction + allowances + bonuses;

  return {
    totalHoursWorked,
    requiredMonthlyHours,
    hoursDifference,
    adjustedHoursDifference,
    perHourRate,
    perDayRate,
    hoursDeduction,
    grossSalary,
    netSalary,
  };
}

function PayrollFormDialog({
  open,
  onOpenChange,
  employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
}) {
  const { toast } = useToast();
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  const currentYear = currentDate.getFullYear().toString();

  const form = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: {
      employeeId: "",
      month: currentMonth,
      year: currentYear,
      week1Expected: "42",
      week1Actual: "0",
      week2Expected: "42",
      week2Actual: "0",
      week3Expected: "42",
      week3Actual: "0",
      week4Expected: "35",
      week4Actual: "0",
      week5Expected: "21",
      week5Actual: "0",
      leaveEncashmentDays: "0",
      advanceDeduction: "0",
      allowances: "0",
      bonuses: "0",
      remarks: "",
      status: "draft",
    },
  });

  const formValues = form.watch();
  const selectedEmployee = employees.find(
    (e) => e.id.toString() === formValues.employeeId
  );

  const calculation = useMemo(
    () => calculatePayroll(selectedEmployee, formValues),
    [selectedEmployee, formValues]
  );

  useEffect(() => {
    if (selectedEmployee) {
      const hoursPerDay = parseFloat(selectedEmployee.requiredHoursPerDay) || 8;
      form.setValue("week1Expected", (hoursPerDay * 6).toString());
      form.setValue("week2Expected", (hoursPerDay * 6).toString());
      form.setValue("week3Expected", (hoursPerDay * 6).toString());
      form.setValue("week4Expected", (hoursPerDay * 5).toString());
      form.setValue("week5Expected", (hoursPerDay * 3).toString());
    }
  }, [selectedEmployee, form]);

  const createMutation = useMutation({
    mutationFn: async (data: PayrollFormValues) => {
      const calc = calculatePayroll(selectedEmployee, data);
      const payload = {
        employeeId: parseInt(data.employeeId),
        month: parseInt(data.month),
        year: parseInt(data.year),
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
        totalHoursWorked: calc.totalHoursWorked.toString(),
        requiredMonthlyHours: calc.requiredMonthlyHours.toString(),
        hoursDifference: calc.hoursDifference.toString(),
        leaveEncashmentDays: parseInt(data.leaveEncashmentDays || "0"),
        adjustedHoursDifference: calc.adjustedHoursDifference.toString(),
        perHourRate: calc.perHourRate.toString(),
        perDayRate: calc.perDayRate.toString(),
        hoursDeduction: calc.hoursDeduction.toString(),
        advanceDeduction: data.advanceDeduction || "0",
        allowances: data.allowances || "0",
        bonuses: data.bonuses || "0",
        grossSalary: calc.grossSalary.toString(),
        netSalary: calc.netSalary.toString(),
        remarks: data.remarks || null,
        status: data.status,
      };
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

  const onSubmit = (data: PayrollFormValues) => {
    createMutation.mutate(data);
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
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payroll Record</DialogTitle>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payroll-employee">
                                <SelectValue placeholder="Select employee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id.toString()}>
                                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Weekly Hours</CardTitle>
                    <CardDescription>Enter expected and actual hours for each week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((week) => (
                        <div key={week} className="grid grid-cols-3 gap-4 items-end">
                          <div className="text-sm font-medium text-muted-foreground pt-6">
                            Week {week}
                          </div>
                          <FormField
                            control={form.control}
                            name={`week${week}Expected` as keyof PayrollFormValues}
                            render={({ field }) => (
                              <FormItem>
                                {week === 1 && <FormLabel className="text-xs">Expected</FormLabel>}
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.5"
                                    {...field} 
                                    className="font-mono text-sm"
                                    data-testid={`input-week${week}-expected`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`week${week}Actual` as keyof PayrollFormValues}
                            render={({ field }) => (
                              <FormItem>
                                {week === 1 && <FormLabel className="text-xs">Actual</FormLabel>}
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.5"
                                    {...field}
                                    className="font-mono text-sm"
                                    data-testid={`input-week${week}-actual`}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
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
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="allowances"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Allowances (PKR)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                data-testid="input-allowances"
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
                          <div className="text-xs text-muted-foreground">{selectedEmployee.employeeId}</div>
                        </div>

                        <Accordion type="single" collapsible defaultValue="summary" className="w-full">
                          <AccordionItem value="summary">
                            <AccordionTrigger className="text-sm py-2">Hours Summary</AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Required Hours</span>
                                  <span className="font-mono">{calculation.requiredMonthlyHours.toFixed(1)}h</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Hours Worked</span>
                                  <span className="font-mono">{calculation.totalHoursWorked.toFixed(1)}h</span>
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
                          <div className="flex justify-between text-green-600">
                            <span>Allowances</span>
                            <span className="font-mono">+ {formatCurrency(parseFloat(formValues.allowances || "0"))}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>Bonuses</span>
                            <span className="font-mono">+ {formatCurrency(parseFloat(formValues.bonuses || "0"))}</span>
                          </div>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                disabled={createMutation.isPending || !selectedEmployee}
                data-testid="button-submit-payroll"
              >
                {createMutation.isPending ? "Creating..." : "Create Payroll Record"}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payroll Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{record.employee.firstName} {record.employee.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{record.employee.employeeId}</p>
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
              <div className="flex justify-between text-green-600">
                <span>Allowances</span>
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
  const [detailRecord, setDetailRecord] = useState<PayrollRecordWithEmployee | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());

  const { data: payrollRecords, isLoading } = useQuery<PayrollRecordWithEmployee[]>({
    queryKey: ["/api/payroll"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const filteredRecords = payrollRecords?.filter((record) => {
    if (monthFilter !== "all" && record.month.toString() !== monthFilter) return false;
    if (record.year.toString() !== yearFilter) return false;
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
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-payroll">
          <Plus className="h-4 w-4 mr-2" />
          Create Payroll
        </Button>
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
                            {record.employee.employeeId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {months[record.month - 1]} {record.year}
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDetailRecord(record)}
                          data-testid={`button-view-${record.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
        onOpenChange={setDialogOpen}
        employees={employees}
      />

      <PayrollDetailDialog
        open={!!detailRecord}
        onOpenChange={(open) => !open && setDetailRecord(null)}
        record={detailRecord}
      />
    </div>
  );
}
