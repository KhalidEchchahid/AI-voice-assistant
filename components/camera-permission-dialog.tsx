"use client"
import { Camera, ShieldAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CameraPermissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestPermission: () => void
}

export default function CameraPermissionDialog({
  open,
  onOpenChange,
  onRequestPermission,
}: CameraPermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-500" />
            <span>Camera Access Required</span>
          </DialogTitle>
          <DialogDescription>
            The AI assistant needs access to your camera to use vision capabilities. Your privacy is important - camera
            access is only used when vision mode is active.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
            <ShieldAlert className="h-5 w-5 text-indigo-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Privacy Information</p>
              <ul className="list-disc pl-5 mt-1 text-gray-500 dark:text-gray-400 text-xs space-y-1">
                <li>Camera feed is processed locally and on-device</li>
                <li>No video is stored or saved</li>
                <li>You can disable the camera at any time</li>
                <li>A visual indicator will always show when the camera is active</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onRequestPermission}>Allow Camera Access</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
