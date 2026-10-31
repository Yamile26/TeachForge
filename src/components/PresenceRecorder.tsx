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

export type VoiceFeedback = {
  observaciones: { texto: string; momento: string | null }[];
  sugerencia: string;
  source: "live" | "demo";
};

type Props = {
  /** Recibe la transcripción para ponerla en la respuesta del simulador. */
  onTranscript: (text: string, metrics: VoiceMetrics) => void;
  maxSeconds?: number;
  /** Contexto breve del caso, para que el feedback hable de esta clase. */
  contexto?: string;
  /** Recibe el feedback sobre cómo habló el docente en este turno. */
  onFeedback?: (feedback: VoiceFeedback) => void;
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

export default function PresenceRecorder({ onTranscript, maxSeconds = 90, contexto, onFeedback }: Props) {
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
  const [feedback, setFeedback] = useState<VoiceFeedback | null>(null);
  const [pidiendoFeedback, setPidiendoFeedback] = useState(false);

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
      setFeedback(null);
      onTranscript(text, m);
      void pedirFeedback(text, m);
      setStatus("done");
    } catch {
      setMessage("No se pudo transcribir. Intenta de nuevo o escribe tu respuesta.");
      setStatus("ready");
    }
  }

  // Feedback sobre cómo habló: lo redacta el modelo o, si no responde, reglas sobre las métricas.
  async function pedirFeedback(text: string, m: VoiceMetrics) {
    setPidiendoFeedback(true);
    try {
      const res = await fetch("/api/presence-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, metrics: m, contexto }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as VoiceFeedback;
      setFeedback(data);
      onFeedback?.(data);
    } catch {
      /* el espejo de métricas sigue visible aunque no llegue el feedback */
    } finally {
      setPidiendoFeedback(false);
    }
  }

  const showVideo = hasVideo && status !== "idle" && status !== "error";

  return (
    <section className="grid gap-3 rounded-2xl border border-dashed border-ia bg-ia-soft p-4">
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
          <p className="mb-2 text-sm">
            <strong>Responder por voz (opcional).</strong> La cámara funciona solo como espejo: el video no se
            graba ni se envía. Solo se envía el audio para transcribir tu respuesta.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary min-h-9 px-3 py-1.5 text-sm" onClick={() => enable(true)}>Activar cámara y micrófono</button>
            <button type="button" className="btn min-h-9 px-3 py-1.5 text-sm" onClick={() => enable(false)}>Solo micrófono</button>
          </div>
        </div>
      )}

      {(status === "ready" || status === "done") && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary min-h-9 px-3 py-1.5 text-sm" onClick={start}>{status === "done" ? "Grabar de nuevo" : "Grabar respuesta"}</button>{" "}
          <button type="button" className="btn min-h-9 px-3 py-1.5 text-sm" onClick={() => { releaseStream(); setStatus("idle"); }}>Apagar</button>
        </div>
      )}

      {status === "recording" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-ember tabular-nums" aria-live="polite">● Grabando {fmt(elapsed)} / {fmt(maxSeconds)}</span>
          <button type="button" className="btn btn-steel min-h-9 px-3 py-1.5 text-sm" onClick={stop}>Detener</button>
        </div>
      )}

      {status === "processing" && <p>Transcribiendo…</p>}

      {message && <p role="status" className="text-sm font-semibold text-warn">{message}</p>}

      {metrics && status === "done" && (
        <div className="rounded-xl border border-line bg-white p-3 text-sm">
          <strong>Espejo de tu voz</strong> <em>(orientativo, sin puntaje)</em>
          <ul className="mt-1 list-disc pl-5">
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
          {pidiendoFeedback && <p className="mt-2 text-muted">Preparando feedback sobre cómo hablaste…</p>}
          {feedback && (
            <div className="mt-3 grid gap-1.5 border-t border-line pt-3">
              <strong>Cómo hablaste</strong>
              <ul className="list-disc pl-5">
                {feedback.observaciones.map((o, i) => (
                  <li key={i}>
                    {o.momento && <span className="font-mono text-xs text-muted">{o.momento} · </span>}
                    {o.texto}
                  </li>
                ))}
              </ul>
              <p className="rounded-lg bg-ember-soft px-3 py-2">
                <b>Para el siguiente turno:</b> {feedback.sugerencia}
              </p>
              {feedback.source === "demo" && <small className="text-muted">Feedback generado por reglas sobre tus métricas.</small>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
