// src/lib/voiceMetrics.ts
// Métricas de voz calculadas a partir de la transcripción.
// Son heurísticas SIN VALIDAR: se muestran como espejo orientativo, nunca como nota.

export type TimedWord = { word: string; start: number; end: number };
export type TimedSegment = { text: string; start: number; end: number };

export type VoiceMetrics = {
  durationSec: number;
  wordCount: number;
  wpm: number;
  fillers: { total: number; byFiller: Record<string, number> };
  /** null = la transcripción no trae marcas de tiempo */
  longPauses: { from: number; to: number; seconds: number }[] | null;
  /** null = la transcripción no trae segmentos */
  questionWaits: { question: string; at: number; waitSec: number }[] | null;
  hasTimestamps: boolean;
};

// Ojo: "este" también es demostrativo ("este tema"), así que puede sobrecontar.
const FILLERS = ["eh", "ehm", "em", "mmm", "este", "o sea", "osea", "digamos", "tipo", "bueno"];
const LONG_PAUSE_SEC = 2;

const round = (x: number) => Math.round(x * 10) / 10;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function countFillers(tokens: string[]) {
  const byFiller: Record<string, number> = {};
  let total = 0;
  for (const f of FILLERS) {
    const parts = f.split(" ");
    let n = 0;
    for (let i = 0; i + parts.length <= tokens.length; i++) {
      if (parts.every((p, j) => tokens[i + j] === p)) n++;
    }
    if (n > 0) {
      byFiller[f] = n;
      total += n;
    }
  }
  return { total, byFiller };
}

export function computeVoiceMetrics(input: {
  text: string;
  durationSec: number;
  words?: TimedWord[];
  segments?: TimedSegment[];
}): VoiceMetrics {
  const tokens = tokenize(input.text);
  const duration = Math.max(input.durationSec, 1);

  // Pausas largas: huecos entre palabras (o entre segmentos si no hay palabras)
  const timeline: { start: number; end: number }[] | null = input.words?.length
    ? input.words
    : input.segments?.length
      ? input.segments
      : null;

  let longPauses: VoiceMetrics["longPauses"] = null;
  if (timeline) {
    longPauses = [];
    for (let i = 0; i < timeline.length - 1; i++) {
      const gap = timeline[i + 1].start - timeline[i].end;
      if (gap >= LONG_PAUSE_SEC) {
        longPauses.push({ from: round(timeline[i].end), to: round(timeline[i + 1].start), seconds: round(gap) });
      }
    }
  }

  // Tiempo de espera tras una pregunta: segmento que termina en "?" → silencio hasta el siguiente.
  // Aproximado: Whisper corta segmentos por pausas, no exactamente por oraciones.
  let questionWaits: VoiceMetrics["questionWaits"] = null;
  if (input.segments?.length) {
    questionWaits = [];
    const segs = input.segments;
    for (let i = 0; i < segs.length; i++) {
      const t = segs[i].text.trim();
      if (!t.endsWith("?")) continue;
      const next = segs[i + 1];
      const wait = next ? next.start - segs[i].end : input.durationSec - segs[i].end;
      questionWaits.push({ question: t.slice(-80), at: round(segs[i].end), waitSec: round(Math.max(0, wait)) });
    }
  }

  return {
    durationSec: round(input.durationSec),
    wordCount: tokens.length,
    wpm: Math.round((tokens.length / duration) * 60),
    fillers: countFillers(tokens),
    longPauses,
    questionWaits,
    hasTimestamps: timeline !== null,
  };
}
