import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/components/theme-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Database,
  Shield,
  Info,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [revealToken, setRevealToken] = useState(false);

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  const { data: tokenStatus } = useQuery<{ hasToken: boolean }>({
    queryKey: ["/api/settings/tahometer-token"],
  });

  const updateTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("PUT", "/api/settings/tahometer-token", { token });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save token");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/tahometer-token"] });
      setTokenInput("");
      setShowTokenInput(false);
      toast({ title: "Token saved", description: "Tahometer API token has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      toast({ title: "Token is required", variant: "destructive" });
      return;
    }
    updateTokenMutation.mutate(tokenInput.trim());
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the application looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-3 block">Theme</label>
              <div className="grid grid-cols-3 gap-3">
                {themeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? "default" : "outline"}
                    className="flex flex-col gap-2 h-auto py-4"
                    onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                    data-testid={`button-theme-${option.value}`}
                  >
                    <option.icon className="h-5 w-5" />
                    <span className="text-xs">{option.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Integrations
          </CardTitle>
          <CardDescription>
            API keys and third-party service credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium">Tahometer API Token</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Bearer token used to import payroll data from Tahometer. Stored securely and never exposed.
                </p>
                {tokenStatus && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {tokenStatus.hasToken ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400">Token configured</span>
                      </>
                    ) : (
                      <>
                        <Info className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600 dark:text-amber-400">No token set</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowTokenInput(!showTokenInput); setTokenInput(""); }}
                data-testid="button-update-token"
              >
                {tokenStatus?.hasToken ? "Update" : "Set Token"}
              </Button>
            </div>

            {showTokenInput && (
              <div className="space-y-2 pt-1">
                <Separator />
                <div className="pt-2 space-y-2">
                  <label className="text-sm font-medium">New Token</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={revealToken ? "text" : "password"}
                        placeholder="Paste your Bearer token here"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="pr-10"
                        data-testid="input-tahometer-token"
                      />
                      <button
                        type="button"
                        onClick={() => setRevealToken(!revealToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {revealToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      onClick={handleSaveToken}
                      disabled={updateTokenMutation.isPending}
                      data-testid="button-save-token"
                    >
                      {updateTokenMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowTokenInput(false); setTokenInput(""); }}
                      data-testid="button-cancel-token"
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The token is stored in the database and never returned to the frontend.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Management
          </CardTitle>
          <CardDescription>
            Database and storage settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Database Status</p>
                <p className="text-sm text-muted-foreground">PostgreSQL connection</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-600">Connected</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Backup</p>
                <p className="text-sm text-muted-foreground">Export your data</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-export">
                Export Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>
            Authentication and access control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-sm text-muted-foreground">Update your password</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-change-password">
                Change
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Session</p>
                <p className="text-sm text-muted-foreground">Manage active sessions</p>
              </div>
              <Button variant="outline" size="sm" data-testid="button-manage-sessions">
                Manage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Application</span>
              <span className="font-medium">GameHR</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-mono">Production</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
