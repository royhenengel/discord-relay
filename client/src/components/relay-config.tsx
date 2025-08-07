import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RelayConfig as RelayConfigType } from "@shared/schema";

export function RelayConfig() {
  const { toast } = useToast();
  
  const { data: relays, isLoading } = useQuery<RelayConfigType[]>({
    queryKey: ["/api/relays"],
    refetchInterval: 10000,
  });

  const deleteRelayMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/relays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relays"] });
      toast({
        title: "Success",
        description: "Relay deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete relay",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
        <div className="animate-pulse">
          <div className="h-6 bg-discord-light rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-discord-light/30 rounded-lg p-4 border discord-border-light/30">
                <div className="h-4 bg-discord-light rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-discord-light rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Relay Configuration</h3>
        <Button className="discord-bg-blurple hover:bg-discord-blurple/80 text-white text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Add Relay
        </Button>
      </div>
      
      {relays && relays.length > 0 ? (
        <div className="space-y-4">
          {relays.map((relay) => (
            <div key={relay.id} className="bg-discord-light/30 rounded-lg p-4 border discord-border-light/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    relay.active ? 'discord-bg-blurple' : 'bg-gray-500'
                  }`}>
                    #
                  </div>
                  <div>
                    <p className="font-medium text-white">{relay.name}</p>
                    <p className="text-sm discord-text-muted">
                      {relay.bidirectional ? 'Bidirectional relay' : 'One-way relay'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${relay.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs ${relay.active ? 'text-green-400' : 'text-red-400'}`}>
                    {relay.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between text-sm discord-text-muted mb-3">
                <span>Source: <span className="discord-text">#{relay.sourceChannelName} ({relay.sourceChannelId})</span></span>
                <span>Target: <span className="discord-text">#{relay.targetChannelName} ({relay.targetChannelId})</span></span>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="discord-text-muted hover:discord-text-blurple transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="discord-text-muted hover:text-red-400 transition-colors"
                  onClick={() => deleteRelayMutation.mutate(relay.id)}
                  disabled={deleteRelayMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="discord-text-muted text-sm">No relay configurations found</p>
          <p className="discord-text-muted text-xs mt-2">Configure channel relays to automatically forward messages between Discord channels</p>
        </div>
      )}
    </div>
  );
}
