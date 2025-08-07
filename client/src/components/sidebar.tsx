import { Home, RefreshCw, Terminal, List, Settings } from "lucide-react";

export function Sidebar() {
  return (
    <aside className="w-64 discord-bg-dark border-r discord-border-light fixed h-full overflow-y-auto">
      <div className="p-6 border-b discord-border-light">
        <h1 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="w-8 h-8 discord-bg-blurple rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-white text-sm"></i>
          </div>
          Relay Bot Dashboard
        </h1>
      </div>
      
      <nav className="p-4 space-y-2">
        <a href="#" className="flex items-center gap-3 px-3 py-2 bg-discord-blurple/10 discord-text-blurple rounded-lg">
          <Home className="w-4 h-4" />
          <span className="font-medium">Overview</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 hover:discord-bg-light rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
          <span>Relay Configuration</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 hover:discord-bg-light rounded-lg transition-colors">
          <Terminal className="w-4 h-4" />
          <span>Commands</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 hover:discord-bg-light rounded-lg transition-colors">
          <List className="w-4 h-4" />
          <span>Activity Logs</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 hover:discord-bg-light rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </a>
      </nav>
    </aside>
  );
}
