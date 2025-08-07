import { AlertTriangle } from "lucide-react";

const commands = [
  {
    command: "!relay status",
    description: "Shows current bot status and relay information",
    active: true,
  },
  {
    command: "!relay add <source> <target>",
    description: "Creates a new relay between two channels",
    active: true,
  },
  {
    command: "!relay remove <id>",
    description: "Removes an existing relay configuration",
    active: true,
  },
  {
    command: "!relay test",
    description: "Sends a test message through all active relays",
    active: true,
  },
];

export function CommandManagement() {
  return (
    <div className="discord-bg-gray rounded-xl p-6 border discord-border-light">
      <h3 className="text-xl font-bold text-white mb-6">Bot Commands</h3>
      
      <div className="space-y-4">
        {commands.map((cmd, index) => (
          <div key={index} className="bg-discord-light/30 rounded-lg p-4 border discord-border-light/30">
            <div className="flex items-center justify-between mb-2">
              <code className="discord-text-blurple font-medium">{cmd.command}</code>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                {cmd.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm discord-text-muted">{cmd.description}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">Permission Requirements</span>
        </div>
        <p className="text-sm discord-text-muted">
          Bot requires "Manage Messages" and "Send Messages" permissions in all configured channels.
        </p>
      </div>
    </div>
  );
}
