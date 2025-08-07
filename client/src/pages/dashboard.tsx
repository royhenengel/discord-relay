import { Sidebar } from "@/components/sidebar";
import { StatusBar } from "@/components/status-bar";
import { RelayConfig } from "@/components/relay-config";
import { CommandManagement } from "@/components/command-management";
import { ActivityLogs } from "@/components/activity-logs";
import { SettingsPanel } from "@/components/settings-panel";

export default function Dashboard() {
  return (
    <div className="flex min-h-screen discord-bg-darker discord-text font-inter">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-6 space-y-6">
        <StatusBar />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RelayConfig />
          <CommandManagement />
        </div>
        
        <ActivityLogs />
        <SettingsPanel />
      </main>
    </div>
  );
}
