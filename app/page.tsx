import VoiceAssistant from "@/components/voice-assistant"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-[400px] h-[600px] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <VoiceAssistant />
      </div>
    </main>
  )
}
