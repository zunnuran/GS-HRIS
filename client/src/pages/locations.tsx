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
  MapPin,
  Edit,
  Trash2,
  MoreHorizontal,
  Search,
  Package,
  Building,
} from "lucide-react";
import type { Location } from "@shared/schema";

interface LocationWithCount extends Location {
  assetCount?: number;
}

export default function Locations() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationWithCount | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    building: "",
    floor: "",
    room: "",
  });

  const { data: locations, isLoading } = useQuery<LocationWithCount[]>({
    queryKey: ["/api/locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({ title: "Location created successfully" });
      handleDialogClose(false);
    },
    onError: () => {
      toast({ title: "Failed to create location", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", `/api/locations/${editingLocation?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({ title: "Location updated successfully" });
      handleDialogClose(false);
    },
    onError: () => {
      toast({ title: "Failed to update location", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/locations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({ title: "Location deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: "Failed to delete location", variant: "destructive" });
    },
  });

  const handleEdit = (location: LocationWithCount) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      description: location.description ?? "",
      address: location.address ?? "",
      building: location.building ?? "",
      floor: location.floor ?? "",
      room: location.room ?? "",
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
      setEditingLocation(undefined);
      setFormData({ name: "", description: "", address: "", building: "", floor: "", room: "" });
    }
  };

  const handleOpenCreate = () => {
    setEditingLocation(undefined);
    setFormData({ name: "", description: "", address: "", building: "", floor: "", room: "" });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingLocation) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!editingLocation;

  const filtered = locations?.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.address ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.building ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-locations-title">
            Locations
          </h1>
          <p className="text-muted-foreground">
            Manage asset locations
          </p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-location">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-locations"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            All Locations ({filtered?.length ?? 0})
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
                    <TableHead>Address</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Asset Count</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((location) => (
                    <TableRow key={location.id} data-testid={`row-location-${location.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                            <MapPin className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium" data-testid={`text-location-name-${location.id}`}>
                            {location.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-location-desc-${location.id}`}>
                        {location.description || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-location-address-${location.id}`}>
                        {location.address || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-location-building-${location.id}`}>
                        {location.building ? (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            {location.building}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-location-floor-${location.id}`}>
                        {location.floor || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell data-testid={`text-location-room-${location.id}`}>
                        {location.room || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span data-testid={`text-location-assets-${location.id}`}>
                            {location.assetCount ?? 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-location-${location.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(location)}
                              data-testid={`button-edit-location-${location.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(location.id)}
                              className="text-destructive"
                              data-testid={`button-delete-location-${location.id}`}
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
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No locations yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first location to track where assets are placed
              </p>
              <Button onClick={handleOpenCreate} data-testid="button-add-location-empty">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Location" : "Add New Location"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                placeholder="Location name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="input-location-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-description">Description</Label>
              <Input
                id="loc-description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-location-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loc-address">Address</Label>
              <Input
                id="loc-address"
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-location-address"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="loc-building">Building</Label>
                <Input
                  id="loc-building"
                  placeholder="Building"
                  value={formData.building}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  data-testid="input-location-building"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-floor">Floor</Label>
                <Input
                  id="loc-floor"
                  placeholder="Floor"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  data-testid="input-location-floor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc-room">Room</Label>
                <Input
                  id="loc-room"
                  placeholder="Room"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  data-testid="input-location-room"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
                data-testid="button-cancel-location"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-location">
                {isPending ? "Saving..." : isEditing ? "Update Location" : "Add Location"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this location? Assets associated with this location will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-location">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-location"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
