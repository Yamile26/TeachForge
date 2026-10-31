// src/components/PresenceRecorder.tsx
// Cámara = espejo en vivo (el video NO se graba ni se envía).
// Solo se graba la pista de AUDIO, se transcribe en /api/transcribe y el texto
// vuelve al simulador para que siga el flujo normal de /api/evaluate.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  computeVoiceMetrics,
  type TimedSegment,
  type TimedWord,
  type VoiceMetrics,
} from "@/lib/voiceMetrics";

type Props = {
  /** Recibe la transcripción para ponerla en la respuesta del simulador. */
  onTranscript: (text: string, metrics: VoiceMetrics) => void;
  maxSeconds?: number;
};

type Status = "idle" | "ready" | "recording" | "processing" | "done" | "error";

const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickAudioType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PresenceRecorder({ onTranscript, maxSeconds = 90 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [hasVideo, setHasVideo] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<VoiceMetrics | null>(null);

  // Liberar cámara y micrófono al salir de la página
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function releaseStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setHasVideo(false);
  }

  async function enable(withCamera: boolean) {
    setMessage(null);
    releaseStream();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Este navegador no permite grabar. Puedes escribir tu respuesta.");
      setStatus("error");
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withCamera ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false,
      });
    } catch {
      if (withCamera) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMessage("No se pudo usar la cámara; seguimos solo con micrófono.");
        } catch {
          /* sin permiso de micrófono */
        }
      }
    }

    if (!stream) {
      setMessage("Sin permiso de micrófono. Puedes escribir tu respuesta.");
      setStatus("error");
      return;
    }

    streamRef.current = stream;
    const video = stream.getVideoTracks().length > 0;
    setHasVideo(video);
    if (video && videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => {});
    }
    setStatus("ready");
  }

  function start() {
    const stream = streamRef.current;
    if (!stream) return;
    setMessage(null);
    setMetrics(null);

    // Solo la pista de audio: el video nunca entra al MediaRecorder
    const audioOnly = new MediaStream(stream.getAudioTracks());
    const mimeType = pickAudioType();
    const rec = new MediaRecorder(audioOnly, mimeType ? { mimeType } : undefined);

    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => void upload(rec.mimeType || mimeType || "audio/webm");
    rec.start(1000);

    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setStatus("recording");

    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(s);
      if (s >= maxSeconds) stop();
    }, 250);
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function upload(mime: string) {
    setStatus("processing");
    const durationSec = (Date.now() - startedAtRef.current) / 1000;
    const blob = new Blob(chunksRef.current, { type: mime });
    if (blob.size === 0) {
      setMessage("No se captó audio. Intenta de nuevo.");
      setStatus("ready");
      return;
    }

    const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
    const form = new FormData();
    form.append("file", blob, `respuesta.${ext}`); // ajusta el nombre del campo al que espera tu /api/transcribe

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error(`transcribe ${res.status}`);
      const data = await res.json();
      const text: string = data.text ?? data.transcript ?? "";
      const words: TimedWord[] | undefined = data.words;
      const segments: TimedSegment[] | undefined = data.segments;

      const m = computeVoiceMetrics({ text, durationSec, words, segments });
      setMetrics(m);
      onTranscript(text, m);
      setStatus("done");
    } catch {
      setMessage("No se pudo transcribir. Intenta de nuevo o escribe tu respuesta.");
      setStatus("ready");
    }
  }

  const showVideo = hasVideo && status !== "idle" && status !== "error";

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, margin: "12px 0" }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{
          display: showVideo ? "block" : "none",
          width: "100%",
          maxWidth: 360,
          borderRadius: 8,
          transform: "scaleX(-1)",
          background: "#000",
          marginBottom: 8,
        }}
      />

      {(status === "idle" || status === "error") && (
        <div>
          <p style={{ margin: "0 0 8px" }}>
            <strong>Responder por voz (opcional).</strong> La cámara funciona solo como espejo: el video no se
            graba ni se envía. Solo se envía el audio para transcribir tu respuesta.
          </p>
          <button type="button" onClick={() => enable(true)}>Activar cámara y micrófono</button>{" "}
          <button type="button" onClick={() => enable(false)}>Solo micrófono</button>
        </div>
      )}

      {(status === "ready" || status === "done") && (
        <div>
          <button type="button" onClick={start}>{status === "done" ? "Grabar de nuevo" : "Grabar respuesta"}</button>{" "}
          <button type="button" onClick={() => { releaseStream(); setStatus("idle"); }}>Apagar</button>
        </div>
      )}

      {status === "recording" && (
        <div>
          <span style={{ color: "#dc2626" }}>● Grabando {fmt(elapsed)} / {fmt(maxSeconds)}</span>{" "}
          <button type="button" onClick={stop}>Detener</button>
        </div>
      )}

      {status === "processing" && <p>Transcribiendo…</p>}

      {message && <p role="status" style={{ color: "#b45309", margin: "8px 0 0" }}>{message}</p>}

      {metrics && status === "done" && (
        <div style={{ marginTop: 8, fontSize: 14 }}>
          <strong>Espejo de tu voz</strong> <em>(orientativo, sin puntaje)</em>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            <li>Duración {fmt(metrics.durationSec)} · ritmo {metrics.wpm} palabras/min</li>
            <li>
              Muletillas: {metrics.fillers.total}
              {metrics.fillers.total > 0 &&
                ` (${Object.entries(metrics.fillers.byFiller).map(([w, n]) => `«${w}» ×${n}`).join(", ")})`}
            </li>
            {metrics.longPauses ? (
              <li>
                Pausas de 2 s o más: {metrics.longPauses.length}
                {metrics.longPauses.length > 0 &&
                  ` (${metrics.longPauses.map((p) => `${fmt(p.from)}–${fmt(p.to)}`).join(", ")})`}
              </li>
            ) : (
              <li>Pausas: no disponible (la transcripción no trae tiempos)</li>
            )}
            {metrics.questionWaits && metrics.questionWaits.length > 0 && (
              <li>
                Espera tras tus preguntas:{" "}
                {metrics.questionWaits.map((q) => `${q.waitSec} s en ${fmt(q.at)}`).join(", ")}
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
