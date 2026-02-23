import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  FolderTree,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import type { AssetCategory, AssetSubCategory } from "@shared/schema";

interface CategoryWithCount extends AssetCategory {
  assetCount?: number;
}

interface SubCategoryWithDetails extends AssetSubCategory {
  category?: AssetCategory | null;
  assetCount?: number;
}

export default function AssetCategories() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subCategoryDialogOpen, setSubCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | undefined>();
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategoryWithDetails | undefined>();
  const [parentCategoryId, setParentCategoryId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "subcategory"; id: number } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  const [catName, setCatName] = useState("");
  const [catDescription, setCatDescription] = useState("");
  const [subCatName, setSubCatName] = useState("");
  const [subCatDescription, setSubCatDescription] = useState("");

  const { toast } = useToast();

  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/asset-categories"],
  });

  const { data: subCategories } = useQuery<SubCategoryWithDetails[]>({
    queryKey: ["/api/asset-subcategories"],
  });

  const toggleExpanded = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", "/api/asset-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-categories"] });
      toast({ title: "Category created successfully" });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description?: string } }) => {
      return apiRequest("PUT", `/api/asset-categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-categories"] });
      toast({ title: "Category updated successfully" });
      setCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/asset-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-subcategories"] });
      toast({ title: "Category deleted successfully" });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const createSubCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; categoryId: number }) => {
      return apiRequest("POST", "/api/asset-subcategories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-categories"] });
      toast({ title: "Sub-category created successfully" });
      setSubCategoryDialogOpen(false);
      resetSubCategoryForm();
    },
    onError: () => {
      toast({ title: "Failed to create sub-category", variant: "destructive" });
    },
  });

  const updateSubCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; description?: string; categoryId: number } }) => {
      return apiRequest("PUT", `/api/asset-subcategories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-categories"] });
      toast({ title: "Sub-category updated successfully" });
      setSubCategoryDialogOpen(false);
      resetSubCategoryForm();
    },
    onError: () => {
      toast({ title: "Failed to update sub-category", variant: "destructive" });
    },
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/asset-subcategories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asset-subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asset-categories"] });
      toast({ title: "Sub-category deleted successfully" });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete sub-category", variant: "destructive" });
    },
  });

  const resetCategoryForm = () => {
    setCatName("");
    setCatDescription("");
    setEditingCategory(undefined);
  };

  const resetSubCategoryForm = () => {
    setSubCatName("");
    setSubCatDescription("");
    setEditingSubCategory(undefined);
    setParentCategoryId(null);
  };

  const handleOpenCategoryDialog = (category?: CategoryWithCount) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatDescription(category.description ?? "");
    } else {
      resetCategoryForm();
    }
    setCategoryDialogOpen(true);
  };

  const handleOpenSubCategoryDialog = (categoryId: number, subCategory?: SubCategoryWithDetails) => {
    setParentCategoryId(categoryId);
    if (subCategory) {
      setEditingSubCategory(subCategory);
      setSubCatName(subCategory.name);
      setSubCatDescription(subCategory.description ?? "");
    } else {
      resetSubCategoryForm();
      setParentCategoryId(categoryId);
    }
    setSubCategoryDialogOpen(true);
  };

  const handleCategorySubmit = () => {
    if (!catName.trim()) return;
    const data = { name: catName.trim(), description: catDescription.trim() || undefined };
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleSubCategorySubmit = () => {
    if (!subCatName.trim() || !parentCategoryId) return;
    const data = {
      name: subCatName.trim(),
      description: subCatDescription.trim() || undefined,
      categoryId: parentCategoryId,
    };
    if (editingSubCategory) {
      updateSubCategoryMutation.mutate({ id: editingSubCategory.id, data });
    } else {
      createSubCategoryMutation.mutate(data);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "category") {
      deleteCategoryMutation.mutate(deleteTarget.id);
    } else {
      deleteSubCategoryMutation.mutate(deleteTarget.id);
    }
  };

  const filteredCategories = categories?.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubCategoriesForCategory = (categoryId: number) => {
    return subCategories?.filter((sc) => sc.categoryId === categoryId) ?? [];
  };

  const isCategoryPending = createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const isSubCategoryPending = createSubCategoryMutation.isPending || updateSubCategoryMutation.isPending;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold" data-testid="text-asset-categories-title">
            Asset Categories
          </h1>
          <p className="text-muted-foreground">
            Manage asset categories and sub-categories
          </p>
        </div>
        <Button onClick={() => handleOpenCategoryDialog()} data-testid="button-add-category">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-categories"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            All Categories ({filteredCategories?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCategories && filteredCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Assets</TableHead>
                    <TableHead>Sub Categories</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => {
                    const catSubCategories = getSubCategoriesForCategory(category.id);
                    const isExpanded = expandedCategories.has(category.id);

                    return (
                      <Collapsible
                        key={category.id}
                        open={isExpanded}
                        onOpenChange={() => toggleExpanded(category.id)}
                        asChild
                      >
                        <>
                          <TableRow data-testid={`row-category-${category.id}`}>
                            <TableCell>
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  data-testid={`button-expand-category-${category.id}`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium" data-testid={`text-category-name-${category.id}`}>
                                {category.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">
                                {category.description || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" data-testid={`badge-category-asset-count-${category.id}`}>
                                {category.assetCount ?? 0}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-category-subcat-count-${category.id}`}>
                                {catSubCategories.length}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenCategoryDialog(category)}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeleteTarget({ type: "category", id: category.id });
                                    setDeleteDialogOpen(true);
                                  }}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <CollapsibleContent asChild>
                            <>
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={6} className="p-0">
                                  <div className="px-6 py-4 ml-10">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-sm font-medium flex items-center gap-2">
                                        <Layers className="h-3 w-3" />
                                        Sub-Categories
                                      </h4>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenSubCategoryDialog(category.id)}
                                        data-testid={`button-add-subcategory-${category.id}`}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Sub-Category
                                      </Button>
                                    </div>
                                    {catSubCategories.length > 0 ? (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Assets</TableHead>
                                            <TableHead className="w-24">Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {catSubCategories.map((subCat) => (
                                            <TableRow key={subCat.id} data-testid={`row-subcategory-${subCat.id}`}>
                                              <TableCell>
                                                <span className="font-medium" data-testid={`text-subcategory-name-${subCat.id}`}>
                                                  {subCat.name}
                                                </span>
                                              </TableCell>
                                              <TableCell>
                                                <span className="text-muted-foreground">
                                                  {subCat.description || "—"}
                                                </span>
                                              </TableCell>
                                              <TableCell>
                                                <Badge variant="secondary" data-testid={`badge-subcategory-asset-count-${subCat.id}`}>
                                                  {subCat.assetCount ?? 0}
                                                </Badge>
                                              </TableCell>
                                              <TableCell>
                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenSubCategoryDialog(category.id, subCat)}
                                                    data-testid={`button-edit-subcategory-${subCat.id}`}
                                                  >
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                      setDeleteTarget({ type: "subcategory", id: subCat.id });
                                                      setDeleteDialogOpen(true);
                                                    }}
                                                    data-testid={`button-delete-subcategory-${subCat.id}`}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    ) : (
                                      <p className="text-sm text-muted-foreground py-2">
                                        No sub-categories yet. Add one to get started.
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No categories yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first asset category to organize your assets
              </p>
              <Button onClick={() => handleOpenCategoryDialog()} data-testid="button-add-category-empty">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
        setCategoryDialogOpen(open);
        if (!open) resetCategoryForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g., Electronics"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                data-testid="input-category-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                placeholder="Brief description..."
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                data-testid="input-category-description"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryDialogOpen(false);
                resetCategoryForm();
              }}
              data-testid="button-cancel-category"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCategorySubmit}
              disabled={isCategoryPending || !catName.trim()}
              data-testid="button-submit-category"
            >
              {isCategoryPending ? "Saving..." : editingCategory ? "Update Category" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subCategoryDialogOpen} onOpenChange={(open) => {
        setSubCategoryDialogOpen(open);
        if (!open) resetSubCategoryForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSubCategory ? "Edit Sub-Category" : "Add New Sub-Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subcat-name">Name</Label>
              <Input
                id="subcat-name"
                placeholder="e.g., Laptops"
                value={subCatName}
                onChange={(e) => setSubCatName(e.target.value)}
                data-testid="input-subcategory-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcat-description">Description</Label>
              <Input
                id="subcat-description"
                placeholder="Brief description..."
                value={subCatDescription}
                onChange={(e) => setSubCatDescription(e.target.value)}
                data-testid="input-subcategory-description"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSubCategoryDialogOpen(false);
                resetSubCategoryForm();
              }}
              data-testid="button-cancel-subcategory"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubCategorySubmit}
              disabled={isSubCategoryPending || !subCatName.trim()}
              data-testid="button-submit-subcategory"
            >
              {isSubCategoryPending ? "Saving..." : editingSubCategory ? "Update Sub-Category" : "Add Sub-Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === "category" ? "Category" : "Sub-Category"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteTarget?.type === "category" ? "category" : "sub-category"}?
              {deleteTarget?.type === "category" && " All associated sub-categories will also be removed."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
