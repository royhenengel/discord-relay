import { useQuery } from "@tanstack/react-query";
import { Clock, Send, RefreshCw, TrendingUp } from "lucide-react";
import { BotStats } from "@shared/schema";

export function StatusBar() {
  const { data: stats, isLoading } = useQuery<BotStats & { connected: boolean; uptime: string }>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
        <div className="animate-pulse">
          <div className="h-6 bg-discord-light rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-discord-light/50 rounded-lg p-4">
                <div className="h-4 bg-discord-light rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-discord-light rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isOnline = stats?.status === 'online' || stats?.connected;

  return (
    <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">Bot Status</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-discord-light/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="discord-text-muted text-sm">Uptime</p>
              <p className="text-xl font-bold text-white">{stats?.uptime || "0m"}</p>
            </div>
            <Clock className="text-discord-blurple text-xl w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-discord-light/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="discord-text-muted text-sm">Messages Relayed</p>
              <p className="text-xl font-bold text-white">{stats?.messagesRelayed?.toLocaleString() || "0"}</p>
            </div>
            <Send className="text-green-500 text-xl w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-discord-light/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="discord-text-muted text-sm">Active Relays</p>
              <p className="text-xl font-bold text-white">Loading...</p>
            </div>
            <RefreshCw className="discord-text-blurple text-xl w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-discord-light/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="discord-text-muted text-sm">API Calls</p>
              <p className="text-xl font-bold text-white">{stats?.apiCalls?.toLocaleString() || "0"}</p>
            </div>
            <TrendingUp className="text-yellow-500 text-xl w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
