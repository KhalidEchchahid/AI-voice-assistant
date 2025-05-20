import AssistantToggle from "@/components/assistant-toggle";
import VoiceAssistant from "@/components/voice-assistant";

export default function Home() {
  return (
    <main className="flex h-[100vh] items-center justify-center bg-transparent">
      <div className="w-full h-full">
        <VoiceAssistant />
      </div>
    </main>
  );
}
