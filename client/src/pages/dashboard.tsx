import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Calculator,
  TrendingUp,
  Building2,
  Clock,
  DollarSign,
  Package,
  FolderTree,
  ClipboardList,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalDepartments: number;
  pendingPayroll: number;
  selectedMonthPayroll: number;
  prevMonthPayroll: number;
  selectedMonth: number;
  selectedYear: number;
}

interface AssetDashboardStats {
  totalAssets: number;
  totalCategories: number;
  totalAssignees: number;
  activeAssignments: number;
  statusCounts: {
    working: number;
    malfunctioning: number;
    damaged: number;
  };
}

interface RecentActivity {
  id: number;
  type: string;
  description: string;
  timestamp: string;
}

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(173, 58%, 39%)",
  "hsl(197, 37%, 45%)",
  "hsl(43, 74%, 49%)",
  "hsl(27, 87%, 57%)",
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading = false,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  loading?: boolean;
  trend?: { value: number; positive: boolean };
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div
            className={`flex items-center gap-1 mt-1 text-xs ${trend.positive ? "text-green-600" : "text-red-500"}`}
          >
            <TrendingUp
              className={`h-3 w-3 ${!trend.positive && "rotate-180"}`}
            />
            <span>
              {trend.positive ? "+" : ""}
              {trend.value}% vs prior month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getPreviousMonth() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return { month: m === 1 ? 12 : m - 1, year: m === 1 ? y - 1 : y };
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= currentYear - 4; y--) {
    years.push(y);
  }
  return years;
}

export default function Dashboard() {
  const prev = getPreviousMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(prev.month);
  const [selectedYear, setSelectedYear] = useState<number>(prev.year);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/stats?month=${selectedMonth}&year=${selectedYear}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const { data: departmentData } = useQuery<{ name: string; count: number }[]>({
    queryKey: ["/api/dashboard/departments"],
  });

  const { data: payrollHistory } = useQuery<{ month: string; amount: number }[]>({
    queryKey: ["/api/dashboard/payroll-history"],
  });

  const { data: assetStats, isLoading: assetStatsLoading } = useQuery<AssetDashboardStats>({
    queryKey: ["/api/dashboard/asset-stats"],
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const yearOptions = getYearOptions();

  const trendValue =
    stats?.prevMonthPayroll && stats.prevMonthPayroll > 0
      ? Math.round(
          ((stats.selectedMonthPayroll - stats.prevMonthPayroll) /
            stats.prevMonthPayroll) *
            100
        )
      : undefined;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Overview of your HR management system</p>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger
              className="w-[140px]"
              data-testid="select-dashboard-month"
            >
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger
              className="w-[100px]"
              data-testid="select-dashboard-year"
            >
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees ?? 0}
          subtitle={`${stats?.activeEmployees ?? 0} active`}
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="Departments"
          value={stats?.totalDepartments ?? 0}
          subtitle="Active departments"
          icon={Building2}
          loading={statsLoading}
        />
        <StatCard
          title="Pending Payroll"
          value={stats?.pendingPayroll ?? 0}
          subtitle={`For ${MONTH_NAMES[(selectedMonth ?? 1) - 1]} ${selectedYear}`}
          icon={Clock}
          loading={statsLoading}
        />
        <StatCard
          title={`${MONTH_NAMES[(selectedMonth ?? 1) - 1]} ${selectedYear} Payroll`}
          value={formatCurrency(stats?.selectedMonthPayroll ?? 0)}
          subtitle="Total payout"
          icon={DollarSign}
          loading={statsLoading}
          trend={
            trendValue !== undefined
              ? { value: trendValue, positive: trendValue >= 0 }
              : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-1 mt-2">
        <h2 className="text-lg font-semibold" data-testid="text-asset-stats-title">
          Asset Management
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Assets"
          value={assetStats?.totalAssets ?? 0}
          subtitle={`${assetStats?.statusCounts?.working ?? 0} working`}
          icon={Package}
          loading={assetStatsLoading}
        />
        <StatCard
          title="Asset Categories"
          value={assetStats?.totalCategories ?? 0}
          subtitle="Asset types"
          icon={FolderTree}
          loading={assetStatsLoading}
        />
        <StatCard
          title="Active Assignments"
          value={assetStats?.activeAssignments ?? 0}
          subtitle={`${assetStats?.totalAssignees ?? 0} employees`}
          icon={ClipboardList}
          loading={assetStatsLoading}
        />
        <StatCard
          title="Asset Health"
          value={`${assetStats?.statusCounts?.working ?? 0}/${assetStats?.totalAssets ?? 0}`}
          subtitle={`${assetStats?.statusCounts?.malfunctioning ?? 0} malfunctioning, ${assetStats?.statusCounts?.damaged ?? 0} damaged`}
          icon={CheckCircle}
          loading={assetStatsLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Payroll History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {payrollHistory && payrollHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payrollHistory}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(value) =>
                        `${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar
                      dataKey="amount"
                      fill="hsl(217, 91%, 60%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No payroll data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Department Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {departmentData && departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {departmentData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No department data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Calculator className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
