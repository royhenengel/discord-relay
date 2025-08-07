import { useQuery, useMutation } from "@tanstack/react-query";
import { RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ActivityLog } from "@shared/schema";

export function ActivityLogs() {
  const { toast } = useToast();
  
  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 5000,
  });

  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Success",
        description: "Activity logs cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear activity logs",
        variant: "destructive",
      });
    },
  });

  const refreshLogs = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'RELAY': return 'text-green-400';
      case 'CMD': return 'discord-text-blurple';
      case 'INFO': return 'text-blue-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
      default: return 'discord-text-muted';
    }
  };

  return (
    <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Recent Activity</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={refreshLogs}
            className="discord-text-muted hover:discord-text transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => clearLogsMutation.mutate()}
            disabled={clearLogsMutation.isPending}
            className="discord-text-muted hover:discord-text transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <div className="discord-bg-darker rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-discord-light rounded w-full"></div>
            ))}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 discord-text-muted">
                <span className="text-xs discord-text-muted/60 w-16 flex-shrink-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                </span>
                <span className={`${getTypeColor(log.type)} font-medium min-w-[60px]`}>
                  [{log.type}]
                </span>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="discord-text-muted">No activity logs available</p>
          </div>
        )}
      </div>
    </div>
  );
}
