"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

/**
 * Voice notes: MediaRecorder + Whisper when OpenAI is configured,
 * browser SpeechRecognition as device fallback, typed notes always available.
 */
export function VoiceNoteButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<"idle" | "whisper" | "speech">("idle");
  const recRef = useRef<InstanceType<SpeechCtor> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function speechCtor() {
    const win = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    return win.SpeechRecognition || win.webkitSpeechRecognition;
  }

  async function stopWhisper() {
    const recorder = mediaRef.current;
    if (!recorder || recorder.state === "inactive") return;
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    mediaRef.current = null;
    setListening(false);
    setMode("idle");
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    chunksRef.current = [];
    if (blob.size < 200) {
      toast.error("Recording too short — try again or type a note.");
      return;
    }
    try {
      const form = new FormData();
      form.append("audio", blob, "note.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form, credentials: "same-origin" });
      const body = (await res.json()) as { ok: boolean; data?: { text: string }; error?: string };
      if (!body.ok || !body.data?.text) throw new Error(body.error || "Transcription failed");
      onTranscript(body.data.text);
      toast.success("Voice note transcribed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t transcribe. Type the note instead.");
      document.getElementById("field-note-draft")?.focus();
    }
  }

  async function startWhisper() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return false;
    }
    try {
      const probe = await fetch("/api/config", { credentials: "same-origin" });
      const config = (await probe.json()) as { ok: boolean; data?: { openai?: boolean } };
      if (!config.data?.openai) return false;

      try {
        const { ensureMicrophoneAccess } = await import("@/lib/native/capture");
        const ok = await ensureMicrophoneAccess();
        if (!ok) {
          toast.error("Microphone permission is required for voice notes.");
          return false;
        }
      } catch {
        /* continue — getUserMedia will prompt */
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => stream.getTracks().forEach((t) => t.stop());
      mediaRef.current = recorder;
      recorder.start();
      setListening(true);
      setMode("whisper");
      toast.message("Listening… tap again to stop and transcribe with Whisper");
      return true;
    } catch {
      return false;
    }
  }

  function startBrowserSpeech() {
    const ctor = speechCtor();
    if (!ctor) {
      toast.message("Voice capture isn’t available on this device. Type a field note instead.");
      document.getElementById("field-note-draft")?.focus();
      return;
    }
    const rec = new ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onTranscript(text);
    };
    rec.onerror = () => {
      setListening(false);
      setMode("idle");
      toast.error("Couldn’t capture audio. Type the note instead.");
    };
    rec.onend = () => {
      setListening(false);
      setMode("idle");
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    setMode("speech");
  }

  async function toggle() {
    if (listening) {
      if (mode === "whisper") {
        await stopWhisper();
        return;
      }
      if (recRef.current) {
        recRef.current.stop();
        setListening(false);
        setMode("idle");
      }
      return;
    }
    const whisperStarted = await startWhisper();
    if (!whisperStarted) startBrowserSpeech();
  }

  return (
    <Button type="button" variant={listening ? "destructive" : "outline"} onClick={() => void toggle()} data-testid="voice-note">
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {listening ? (mode === "whisper" ? "Stop & transcribe" : "Stop listening") : "Record voice note"}
    </Button>
  );
}
