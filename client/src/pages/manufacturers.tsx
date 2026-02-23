import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Factory,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  Package,
  Globe,
  Mail,
  Phone,
} from "lucide-react";
import type { Manufacturer } from "@shared/schema";

interface ManufacturerWithCount extends Manufacturer {
  assetCount?: number;
}

export default function Manufacturers() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingManufacturer, setEditingManufacturer] = useState<ManufacturerWithCount | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    contactEmail: "",
    contactPhone: "",
  });

  const { data: manufacturers, isLoading } = useQuery<ManufacturerWithCount[]>({
    queryKey: ["/api/manufacturers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/manufacturers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      toast({ title: "Manufacturer created successfully" });
      handleDialogClose(false);
    },
    onError: () => {
      toast({ title: "Failed to create manufacturer", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", `/api/manufacturers/${editingManufacturer?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      toast({ title: "Manufacturer updated successfully" });
      handleDialogClose(false);
    },
    onError: () => {
      toast({ title: "Failed to update manufacturer", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/manufacturers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers"] });
      toast({ title: "Manufacturer deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete manufacturer", variant: "destructive" });
    },
  });

  const handleEdit = (manufacturer: ManufacturerWithCount) => {
    setEditingManufacturer(manufacturer);
    setFormData({
      name: manufacturer.name,
      description: manufacturer.description ?? "",
      website: manufacturer.website ?? "",
      contactEmail: manufacturer.contactEmail ?? "",
      contactPhone: manufacturer.contactPhone ?? "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingManufacturer(undefined);
      setFormData({ name: "", description: "", website: "", contactEmail: "", contactPhone: "" });
    }
  };

  const handleOpenCreate = () => {
    setEditingManufacturer(undefined);
    setFormData({ name: "", description: "", website: "", contactEmail: "", contactPhone: "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingManufacturer) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!editingManufacturer;

  const filtered = manufacturers?.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-manufacturers-title">
            Manufacturers
          </h1>
          <p className="text-muted-foreground">
            Manage asset manufacturers
          </p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-manufacturer">
          <Plus className="h-4 w-4 mr-2" />
          Add Manufacturer
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search manufacturers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-manufacturers"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Factory className="h-4 w-4" />
            All Manufacturers ({filtered?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Contact Email</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead>Asset Count</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((manufacturer) => (
                    <TableRow key={manufacturer.id} data-testid={`row-manufacturer-${manufacturer.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                            <Factory className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium" data-testid={`text-manufacturer-name-${manufacturer.id}`}>
                            {manufacturer.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-manufacturer-desc-${manufacturer.id}`}>
                        {manufacturer.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-manufacturer-website-${manufacturer.id}`}>
                        {manufacturer.website ? (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            {manufacturer.website}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-manufacturer-email-${manufacturer.id}`}>
                        {manufacturer.contactEmail ? (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {manufacturer.contactEmail}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-manufacturer-phone-${manufacturer.id}`}>
                        {manufacturer.contactPhone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {manufacturer.contactPhone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span data-testid={`text-manufacturer-assets-${manufacturer.id}`}>
                            {manufacturer.assetCount ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-manufacturer-${manufacturer.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(manufacturer)}
                              data-testid={`button-edit-manufacturer-${manufacturer.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(manufacturer.id)}
                              className="text-destructive"
                              data-testid={`button-delete-manufacturer-${manufacturer.id}`}
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
              <Factory className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No manufacturers yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first manufacturer to track asset sources
              </p>
              <Button onClick={handleOpenCreate} data-testid="button-add-manufacturer-empty">
                <Plus className="h-4 w-4 mr-2" />
                Add Manufacturer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Manufacturer" : "Add New Manufacturer"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfr-name">Name</Label>
              <Input
                id="mfr-name"
                placeholder="Manufacturer name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-manufacturer-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfr-description">Description</Label>
              <Input
                id="mfr-description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-manufacturer-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfr-website">Website</Label>
              <Input
                id="mfr-website"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                data-testid="input-manufacturer-website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfr-email">Contact Email</Label>
              <Input
                id="mfr-email"
                placeholder="contact@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                data-testid="input-manufacturer-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfr-phone">Contact Phone</Label>
              <Input
                id="mfr-phone"
                placeholder="+1 234 567 8900"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                data-testid="input-manufacturer-phone"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                data-testid="button-cancel-manufacturer"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-manufacturer">
                {isPending ? "Saving..." : isEditing ? "Update Manufacturer" : "Add Manufacturer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Manufacturer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this manufacturer? Assets associated with this manufacturer will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-manufacturer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-manufacturer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
