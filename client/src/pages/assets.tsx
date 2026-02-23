import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  Eye,
  Package,
} from "lucide-react";
import type {
  Asset,
  AssetWithRelations,
  AssetCategory,
  AssetSubCategory,
  Manufacturer,
  Location,
  AssetAssignmentWithDetails,
} from "@shared/schema";

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

function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(num);
}

type AssetWithDuplicate = AssetWithRelations & { _duplicate?: boolean };

interface AssetFormData {
  name: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  manufacturerId: string;
  locationId: string;
  status: string;
  estimatedCost: string;
  purchaseDate: string;
  serialNumber: string;
  notes: string;
}

const defaultFormData: AssetFormData = {
  name: "",
  description: "",
  categoryId: "",
  subCategoryId: "",
  manufacturerId: "",
  locationId: "",
  status: "working",
  estimatedCost: "",
  purchaseDate: "",
  serialNumber: "",
  notes: "",
};

function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  categories,
  subCategories,
  manufacturers,
  locations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetWithDuplicate;
  categories: AssetCategory[];
  subCategories: AssetSubCategory[];
  manufacturers: Manufacturer[];
  locations: Location[];
}) {
  const { toast } = useToast();
  const isEditing = !!asset?.id && !asset._duplicate;
  const [formData, setFormData] = useState<AssetFormData>(defaultFormData);

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name ?? "",
        description: asset.description ?? "",
        categoryId: asset.categoryId?.toString() ?? "",
        subCategoryId: asset.subCategoryId?.toString() ?? "",
        manufacturerId: asset.manufacturerId?.toString() ?? "",
        locationId: asset.locationId?.toString() ?? "",
        status: asset.status ?? "working",
        estimatedCost: asset.estimatedCost ?? "",
        purchaseDate: asset.purchaseDate ?? "",
        serialNumber: asset.serialNumber ?? "",
        notes: asset.notes ?? "",
      });
    } else if (open) {
      setFormData(defaultFormData);
    }
  }, [asset, open]);

  const filteredSubCategories = subCategories.filter(
    (sc) => sc.categoryId === parseInt(formData.categoryId)
  );

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        subCategoryId: data.subCategoryId ? parseInt(data.subCategoryId) : null,
        manufacturerId: data.manufacturerId ? parseInt(data.manufacturerId) : null,
        locationId: data.locationId ? parseInt(data.locationId) : null,
        status: data.status,
        estimatedCost: data.estimatedCost || null,
        purchaseDate: data.purchaseDate || null,
        serialNumber: data.serialNumber || null,
        notes: data.notes || null,
      };
      return apiRequest("POST", "/api/assets", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset created successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to create asset", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        subCategoryId: data.subCategoryId ? parseInt(data.subCategoryId) : null,
        manufacturerId: data.manufacturerId ? parseInt(data.manufacturerId) : null,
        locationId: data.locationId ? parseInt(data.locationId) : null,
        status: data.status,
        estimatedCost: data.estimatedCost || null,
        purchaseDate: data.purchaseDate || null,
        serialNumber: data.serialNumber || null,
        notes: data.notes || null,
      };
      return apiRequest("PUT", `/api/assets/${asset?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update asset", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-asset-form-title">
            {isEditing ? "Edit Asset" : "Add New Asset"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Name</Label>
              <Input
                id="asset-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Asset name"
                required
                data-testid="input-asset-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-serial">Serial Number</Label>
              <Input
                id="asset-serial"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                placeholder="Serial number"
                data-testid="input-asset-serial"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-description">Description</Label>
            <Textarea
              id="asset-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Asset description"
              className="resize-none"
              data-testid="input-asset-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) =>
                  setFormData({ ...formData, categoryId: val, subCategoryId: "" })
                }
              >
                <SelectTrigger data-testid="select-asset-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-Category</Label>
              <Select
                value={formData.subCategoryId}
                onValueChange={(val) => setFormData({ ...formData, subCategoryId: val })}
                disabled={!formData.categoryId}
              >
                <SelectTrigger data-testid="select-asset-subcategory">
                  <SelectValue placeholder="Select sub-category" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubCategories.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id.toString()}>
                      {sc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Select
                value={formData.manufacturerId}
                onValueChange={(val) => setFormData({ ...formData, manufacturerId: val })}
              >
                <SelectTrigger data-testid="select-asset-manufacturer">
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={formData.locationId}
                onValueChange={(val) => setFormData({ ...formData, locationId: val })}
              >
                <SelectTrigger data-testid="select-asset-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id.toString()}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
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
              <Label htmlFor="asset-cost">Estimated Cost</Label>
              <Input
                id="asset-cost"
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                placeholder="0.00"
                data-testid="input-asset-cost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-purchase-date">Purchase Date</Label>
              <Input
                id="asset-purchase-date"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                data-testid="input-asset-purchase-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset-notes">Notes</Label>
            <Textarea
              id="asset-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              className="resize-none"
              data-testid="input-asset-notes"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-asset"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-submit-asset">
              {isPending ? "Saving..." : isEditing ? "Update Asset" : "Add Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssetDetailDialog({
  open,
  onOpenChange,
  asset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetWithRelations | null;
}) {
  const { data: assignments = [] } = useQuery<AssetAssignmentWithDetails[]>({
    queryKey: ["/api/asset-assignments/by-asset", asset?.id],
    enabled: !!asset?.id && open,
  });

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-asset-detail-title">
            Asset Details - {asset.code}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium" data-testid="text-detail-name">{asset.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Code</Label>
              <p data-testid="text-detail-code">
                <Badge variant="outline">{asset.code}</Badge>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <p data-testid="text-detail-category">{asset.category?.name ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Sub-Category</Label>
              <p data-testid="text-detail-subcategory">{asset.subCategory?.name ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Manufacturer</Label>
              <p data-testid="text-detail-manufacturer">{asset.manufacturerRef?.name ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Location</Label>
              <p data-testid="text-detail-location">{asset.location?.name ?? "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <p data-testid="text-detail-status">
                <Badge className={getStatusBadgeClass(asset.status)} variant="secondary">
                  {asset.status}
                </Badge>
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Estimated Cost</Label>
              <p data-testid="text-detail-cost">{formatCurrency(asset.estimatedCost)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Purchase Date</Label>
              <p data-testid="text-detail-purchase-date">
                {asset.purchaseDate ? format(new Date(asset.purchaseDate), "MMM dd, yyyy") : "—"}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Serial Number</Label>
              <p data-testid="text-detail-serial">{asset.serialNumber ?? "—"}</p>
            </div>
          </div>

          {asset.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p data-testid="text-detail-description">{asset.description}</p>
            </div>
          )}

          {asset.notes && (
            <div>
              <Label className="text-muted-foreground">Notes</Label>
              <p data-testid="text-detail-notes">{asset.notes}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-3">Assignment History</h4>
            {assignments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Assignment Date</TableHead>
                    <TableHead>Recovery Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id} data-testid={`row-assignment-history-${a.id}`}>
                      <TableCell>
                        {a.employee
                          ? `${a.employee.firstName} ${a.employee.lastName}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(a.assignmentDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {a.recoveryDate
                          ? format(new Date(a.recoveryDate), "MMM dd, yyyy")
                          : "Active"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusBadgeClass(a.assetStatus)}
                          variant="secondary"
                        >
                          {a.assetStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-sm" data-testid="text-no-assignments">
                No assignment history found.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Assets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetWithDuplicate | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<number | null>(null);
  const [detailAsset, setDetailAsset] = useState<AssetWithRelations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const { data: assets, isLoading } = useQuery<AssetWithRelations[]>({
    queryKey: ["/api/assets"],
  });

  const { data: categories = [] } = useQuery<AssetCategory[]>({
    queryKey: ["/api/asset-categories"],
  });

  const { data: subCategories = [] } = useQuery<AssetSubCategory[]>({
    queryKey: ["/api/asset-subcategories"],
  });

  const { data: manufacturers = [] } = useQuery<Manufacturer[]>({
    queryKey: ["/api/manufacturers"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({ title: "Asset deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingAssetId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete asset", variant: "destructive" });
    },
  });

  const filteredAssets = assets?.filter((asset) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      asset.name.toLowerCase().includes(searchLower) ||
      asset.code.toLowerCase().includes(searchLower) ||
      asset.serialNumber?.toLowerCase().includes(searchLower) ||
      asset.description?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "all" || asset.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" ||
      asset.categoryId?.toString() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleEdit = (asset: AssetWithRelations) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleDuplicate = (asset: AssetWithRelations) => {
    setEditingAsset({ ...asset, _duplicate: true } as AssetWithDuplicate);
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingAssetId(id);
    setDeleteDialogOpen(true);
  };

  const handleViewDetail = (asset: AssetWithRelations) => {
    setDetailAsset(asset);
    setDetailOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingAsset(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-assets-title">
            Assets
          </h1>
          <p className="text-muted-foreground">
            Manage your organization's assets and equipment
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-asset">
          <Plus className="h-4 w-4 mr-2" />
          Add Asset
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              All Assets ({filteredAssets?.length ?? 0})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-assets"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="working">Working</SelectItem>
                  <SelectItem value="malfunctioning">Malfunctioning</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                <SelectTrigger className="w-full sm:w-44" data-testid="select-filter-assignment">
                  <SelectValue placeholder="Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
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
          ) : filteredAssets && filteredAssets.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Sub-Category</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset) => (
                    <TableRow key={asset.id} data-testid={`row-asset-${asset.id}`}>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-code-${asset.id}`}>
                          {asset.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-name-${asset.id}`}>
                        {asset.name}
                      </TableCell>
                      <TableCell data-testid={`text-category-${asset.id}`}>
                        {asset.category?.name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-subcategory-${asset.id}`}>
                        {asset.subCategory?.name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-manufacturer-${asset.id}`}>
                        {asset.manufacturerRef?.name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-location-${asset.id}`}>
                        {asset.location?.name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusBadgeClass(asset.status)}
                          variant="secondary"
                          data-testid={`badge-status-${asset.id}`}
                        >
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono" data-testid={`text-cost-${asset.id}`}>
                        {formatCurrency(asset.estimatedCost)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-${asset.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewDetail(asset)}
                              data-testid={`button-view-${asset.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(asset)}
                              data-testid={`button-edit-${asset.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(asset)}
                              data-testid={`button-duplicate-${asset.id}`}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(asset.id)}
                              className="text-destructive"
                              data-testid={`button-delete-${asset.id}`}
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium" data-testid="text-no-assets">No assets found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first asset"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AssetFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        asset={editingAsset}
        categories={categories}
        subCategories={subCategories}
        manufacturers={manufacturers}
        locations={locations}
      />

      <AssetDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        asset={detailAsset}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAssetId && deleteMutation.mutate(deletingAssetId)}
              className="bg-destructive text-destructive-foreground"
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
