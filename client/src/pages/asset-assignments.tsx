import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ClipboardList,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import type { Asset, Employee, AssetAssignmentWithDetails } from "@shared/schema";

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "working":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "malfunctioning":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "damaged":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "";
  }
}

interface AssignmentFormData {
  assetId: string;
  employeeId: string;
  assignmentDate: string;
  assetStatus: string;
  estimatedCost: string;
  notes: string;
  recoveryDate: string;
}

const defaultFormData: AssignmentFormData = {
  assetId: "",
  employeeId: "",
  assignmentDate: format(new Date(), "yyyy-MM-dd"),
  assetStatus: "working",
  estimatedCost: "",
  notes: "",
  recoveryDate: "",
};

export default function AssetAssignments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssetAssignmentWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>(defaultFormData);
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<AssetAssignmentWithDetails[]>({
    queryKey: ["/api/asset-assignments"],
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  useEffect(() => {
    if (editingAssignment) {
      setFormData({
        assetId: editingAssignment.assetId?.toString() ?? "",
        employeeId: editingAssignment.employeeId?.toString() ?? "",
        assignmentDate: editingAssignment.assignmentDate ?? format(new Date(), "yyyy-MM-dd"),
        assetStatus: editingAssignment.assetStatus ?? "working",
        estimatedCost: editingAssignment.estimatedCost ?? "",
        notes: editingAssignment.notes ?? "",
        recoveryDate: editingAssignment.recoveryDate ?? "",
      });
    }
  }, [editingAssignment]);

  const createMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const payload = {
        assetId: parseInt(data.assetId),
        employeeId: parseInt(data.employeeId),
        assignmentDate: data.assignmentDate,
        assetStatus: data.assetStatus,
        estimatedCost: data.estimatedCost || null,
        notes: data.notes || null,
      };
      return apiRequest("POST", "/api/asset-assignments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-assignments"] });
      toast({ title: "Assignment created successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create assignment", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const payload: Record<string, unknown> = {
        assetId: parseInt(data.assetId),
        employeeId: parseInt(data.employeeId),
        assignmentDate: data.assignmentDate,
        assetStatus: data.assetStatus,
        estimatedCost: data.estimatedCost || null,
        notes: data.notes || null,
      };
      if (data.recoveryDate) {
        payload.recoveryDate = data.recoveryDate;
      }
      return apiRequest("PUT", `/api/asset-assignments/${editingAssignment?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-assignments"] });
      toast({ title: "Assignment updated successfully" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update assignment", variant: "destructive" });
    },
  });

  const recoverMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PUT", `/api/asset-assignments/${id}`, {
        recoveryDate: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-assignments"] });
      toast({ title: "Asset recovered successfully" });
    },
    onError: () => {
      toast({ title: "Failed to recover asset", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/asset-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-assignments"] });
      toast({ title: "Assignment deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete assignment", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAssignment(null);
    setFormData(defaultFormData);
  };

  const handleEdit = (assignment: AssetAssignmentWithDetails) => {
    setEditingAssignment(assignment);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.assetId || !formData.employeeId || !formData.assignmentDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (editingAssignment) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const filteredAssignments = assignments?.filter((a) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      a.asset?.name?.toLowerCase().includes(searchLower) ||
      a.asset?.code?.toLowerCase().includes(searchLower) ||
      a.employee?.firstName?.toLowerCase().includes(searchLower) ||
      a.employee?.lastName?.toLowerCase().includes(searchLower);

    if (activeTab === "active") return matchesSearch && !a.recoveryDate;
    if (activeTab === "recovered") return matchesSearch && !!a.recoveryDate;
    return matchesSearch;
  });

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return <span className="text-muted-foreground">—</span>;
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const renderTable = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (!filteredAssignments || filteredAssignments.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-no-assignments">
          No assignments found
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Code</TableHead>
              <TableHead>Asset Name</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Assignment Date</TableHead>
              <TableHead>Recovery Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.map((assignment) => (
              <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                <TableCell>
                  <Badge variant="outline" data-testid={`badge-asset-code-${assignment.id}`}>
                    {assignment.asset?.code ?? "—"}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`text-asset-name-${assignment.id}`}>
                  {assignment.asset?.name ?? "—"}
                </TableCell>
                <TableCell data-testid={`text-employee-name-${assignment.id}`}>
                  {assignment.employee
                    ? `${assignment.employee.firstName} ${assignment.employee.lastName}`
                    : "—"}
                </TableCell>
                <TableCell data-testid={`text-assignment-date-${assignment.id}`}>
                  {formatDate(assignment.assignmentDate)}
                </TableCell>
                <TableCell data-testid={`text-recovery-date-${assignment.id}`}>
                  {formatDate(assignment.recoveryDate)}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`capitalize no-default-hover-elevate no-default-active-elevate ${getStatusBadgeClass(assignment.assetStatus)}`}
                    data-testid={`badge-status-${assignment.id}`}
                  >
                    {assignment.assetStatus}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate" data-testid={`text-notes-${assignment.id}`}>
                  {assignment.notes || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-actions-${assignment.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!assignment.recoveryDate && (
                        <DropdownMenuItem
                          onClick={() => recoverMutation.mutate(assignment.id)}
                          data-testid={`button-recover-${assignment.id}`}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Recover
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleEdit(assignment)}
                        data-testid={`button-edit-${assignment.id}`}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(assignment.id)}
                        className="text-destructive"
                        data-testid={`button-delete-${assignment.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-assignments-title">
            Asset Assignments
          </h1>
          <p className="text-muted-foreground">
            Manage asset assignments to employees
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAssignment(null);
            setFormData(defaultFormData);
            setDialogOpen(true);
          }}
          data-testid="button-assign-asset"
        >
          <Plus className="h-4 w-4 mr-2" />
          Assign Asset
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Assignments ({filteredAssignments?.length ?? 0})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-assignments"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="active" data-testid="tab-active">
                Active
              </TabsTrigger>
              <TabsTrigger value="recovered" data-testid="tab-recovered">
                Recovered
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All
              </TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab}>
              {renderTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? "Edit Assignment" : "Assign Asset"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset *</Label>
              <Select
                value={formData.assetId}
                onValueChange={(val) => setFormData({ ...formData, assetId: val })}
              >
                <SelectTrigger data-testid="select-asset">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.code} - {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
              >
                <SelectTrigger data-testid="select-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignment Date *</Label>
              <Input
                type="date"
                value={formData.assignmentDate}
                onChange={(e) => setFormData({ ...formData, assignmentDate: e.target.value })}
                data-testid="input-assignment-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Asset Status</Label>
              <Select
                value={formData.assetStatus}
                onValueChange={(val) => setFormData({ ...formData, assetStatus: val })}
              >
                <SelectTrigger data-testid="select-asset-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="working">Working</SelectItem>
                  <SelectItem value="malfunctioning">Malfunctioning</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estimated Cost</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                data-testid="input-estimated-cost"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Optional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-notes"
              />
            </div>

            {editingAssignment && (
              <div className="space-y-2">
                <Label>Recovery Date</Label>
                <Input
                  type="date"
                  value={formData.recoveryDate}
                  onChange={(e) => setFormData({ ...formData, recoveryDate: e.target.value })}
                  data-testid="input-recovery-date"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-testid="button-submit-assignment"
            >
              {isPending ? "Saving..." : editingAssignment ? "Update" : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
