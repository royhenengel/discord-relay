import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BotConfig } from "@shared/schema";
import { useState } from "react";

export function SettingsPanel() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<Partial<BotConfig>>({});
  
  const { data: botConfig, isLoading } = useQuery<BotConfig>({
    queryKey: ["/api/config"],
    onSuccess: (data) => {
      setConfig(data);
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<BotConfig>) => {
      await apiRequest("PUT", "/api/config", newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Success",
        description: "Configuration saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig({
      rateLimit: "moderate",
      logLevel: "info",
      autoReconnect: true,
    });
    toast({
      title: "Configuration Reset",
      description: "Settings have been reset to defaults",
    });
  };

  if (isLoading) {
    return (
      <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
        <div className="animate-pulse">
          <div className="h-6 bg-discord-light rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-4 bg-discord-light rounded w-1/3 mb-2"></div>
                <div className="h-10 bg-discord-light rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
      <h3 className="text-xl font-bold text-white mb-6">Bot Configuration</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="block text-sm font-medium discord-text mb-2">Bot Token</Label>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={config.botToken || ""}
              onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
              className="discord-bg-light border discord-border-light/50 discord-text focus:border-discord-blurple pr-10"
              placeholder="Enter bot token..."
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 discord-text-muted hover:discord-text"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs discord-text-muted mt-1">Keep your bot token secure and never share it</p>
        </div>
        
        <div>
          <Label className="block text-sm font-medium discord-text mb-2">Rate Limit Buffer</Label>
          <Select
            value={config.rateLimit || "moderate"}
            onValueChange={(value) => setConfig({ ...config, rateLimit: value })}
          >
            <SelectTrigger className="discord-bg-light border discord-border-light/50 discord-text focus:border-discord-blurple">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="discord-bg-light border discord-border-light">
              <SelectItem value="conservative">Conservative (70% of limit)</SelectItem>
              <SelectItem value="moderate">Moderate (80% of limit)</SelectItem>
              <SelectItem value="aggressive">Aggressive (90% of limit)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs discord-text-muted mt-1">Controls how close to API limits the bot operates</p>
        </div>
        
        <div>
          <Label className="block text-sm font-medium discord-text mb-2">Logging Level</Label>
          <Select
            value={config.logLevel || "info"}
            onValueChange={(value) => setConfig({ ...config, logLevel: value })}
          >
            <SelectTrigger className="discord-bg-light border discord-border-light/50 discord-text focus:border-discord-blurple">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="discord-bg-light border discord-border-light">
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block text-sm font-medium discord-text mb-2">Auto Reconnect</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={config.autoReconnect || false}
              onCheckedChange={(checked) => setConfig({ ...config, autoReconnect: checked as boolean })}
              className="border-discord-light/50 data-[state=checked]:discord-bg-blurple"
            />
            <span className="discord-text">Enable automatic reconnection on disconnect</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t discord-border-light/30">
        <Button 
          variant="ghost"
          onClick={handleReset}
          className="discord-text-muted hover:discord-text"
        >
          Reset to Defaults
        </Button>
        <Button 
          onClick={handleSave}
          disabled={updateConfigMutation.isPending}
          className="discord-bg-blurple hover:bg-discord-blurple/80 text-white font-medium"
        >
          {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
