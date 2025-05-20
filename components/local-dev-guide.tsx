"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

export default function LocalDevGuide() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Local Development Help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Local Development Guide</DialogTitle>
          <DialogDescription>How to set up LiveKit for local development</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">1. Install LiveKit CLI</h3>
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
              <code className="text-xs">npm install -g livekit-cli</code>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This installs the LiveKit command-line tool globally on your system.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">2. Start a local LiveKit server</h3>
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
              <code className="text-xs">livekit-server --dev</code>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This starts a LiveKit server in development mode on your local machine, typically on port 7880.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">3. Connect your assistant</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              In the assistant, enable "Local Development Mode" and use the default URL (ws://localhost:7880). No token
              is required in local development mode.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">4. Connect your agent</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your agent to connect to the same local LiveKit server. The exact steps depend on your agent
              implementation.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Troubleshooting</h3>
            <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <li>Make sure your LiveKit server is running before connecting</li>
              <li>Check that no firewall is blocking the connection</li>
              <li>Ensure both the assistant and agent are connecting to the same room</li>
              <li>If using Docker, ensure port 7880 is properly exposed</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
