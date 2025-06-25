import VoiceAssistant from "@/components/voice-assistant";
import { LiveKitRoom } from "@livekit/components-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background p-4">
            <div className="max-w-4xl mx-auto h-[calc(100vh-2rem)]">
        <VoiceAssistant />
      </div>
    </main>
  );
}
