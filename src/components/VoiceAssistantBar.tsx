import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Mic, MicOff, Send } from 'lucide-react';
import type { VoiceLanguage } from '../types/workspace';

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface VoiceAssistantBarProps {
  voiceLang: VoiceLanguage;
  onChangeVoiceLang: (lang: VoiceLanguage) => void;
  onCommand: (transcript: string) => void;
  lastFeedback?: string | null;
}

const EXAMPLE_COMMANDS_IT = [
  'Segna dentista domani alle 15',
  'Ricordami di bere alle 16',
  'Aggiungi task urgente revisione budget',
  'Spesa 18,50 euro caffè',
  'Bevi 500ml acqua',
];

const EXAMPLE_COMMANDS_EN = [
  'Schedule design sync tomorrow at 2pm',
  'Remind me to stretch at 4pm',
  'Add urgent task review Q4 budget',
  'Log 18.50 expense for coffee',
  'Log 500ml water',
];

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  voiceLang,
  onChangeVoiceLang,
  onCommand,
  lastFeedback,
}) => {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showMobileTips, setShowMobileTips] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const SpeechCtor =
    typeof window !== 'undefined'
      ? (window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }).SpeechRecognition ||
        (window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }).webkitSpeechRecognition
      : undefined;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const toggleVoice = () => {
    setVoiceError(null);
    if (!SpeechCtor) {
      setVoiceError('Riconoscimento vocale non supportato qui: scrivi il comando.');
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    try {
      const rec = new SpeechCtor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = voiceLang;
      let latestTranscript = '';

      rec.onresult = (event) => {
        let full = '';
        let final = false;
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript;
          if (event.results[i].isFinal) final = true;
        }
        latestTranscript = full.trim();
        setInput(latestTranscript);
        if (final && latestTranscript) {
          onCommand(latestTranscript);
          setInput('');
          setListening(false);
        }
      };

      rec.onerror = (ev) => {
        setVoiceError(
          ev.error === 'not-allowed'
            ? 'Permesso microfono negato. Usa il campo di testo.'
            : `Input vocale interrotto (${ev.error}).`
        );
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setVoiceError('Impossibile avviare il microfono. Usa il testo.');
      setListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onCommand(trimmed);
    setInput('');
    setVoiceError(null);
  };

  const examples = voiceLang === 'it-IT' ? EXAMPLE_COMMANDS_IT : EXAMPLE_COMMANDS_EN;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 sm:p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={listening}
          aria-label={listening ? 'Ferma microfono' : 'Avvia comando vocale'}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 sm:px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            listening
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {listening ? (
            <>
              <MicOff className="h-4 w-4 animate-pulse" />
              <span className="hidden sm:inline">In ascolto...</span>
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Comando Vocale</span>
            </>
          )}
        </button>

        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Parla o scrivi: 'Segna dentista domani alle 15' o 'Bevi 500ml acqua'"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3 py-2.5 pr-9 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Esegui comando"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            onChangeVoiceLang(voiceLang === 'it-IT' ? 'en-US' : 'it-IT')
          }
          title="Cambia lingua riconoscimento vocale (IT / EN)"
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B0F17] px-2.5 py-2.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
        >
          {voiceLang === 'it-IT' ? 'IT' : 'EN'}
        </button>

        <button
          type="button"
          onClick={() => setShowMobileTips((v) => !v)}
          aria-label="Mostra esempi comandi"
          className="sm:hidden rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-slate-500 dark:text-slate-300 cursor-pointer"
        >
          {showMobileTips ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </form>

      <div
        className={`mt-2.5 flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 ${
          showMobileTips || voiceError || lastFeedback ? 'flex' : 'hidden sm:flex'
        }`}
      >
        <div
          className={`flex-wrap items-center gap-x-2 gap-y-1 ${
            showMobileTips ? 'flex' : 'hidden sm:flex'
          }`}
        >
          <span>Esempi:</span>
          {examples.map((cmd, idx) => (
            <React.Fragment key={cmd}>
              <button
                type="button"
                onClick={() => onCommand(cmd)}
                className="text-left hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 cursor-pointer"
              >
                {cmd}
              </button>
              {idx < examples.length - 1 && <span aria-hidden="true">·</span>}
            </React.Fragment>
          ))}
        </div>
        {(voiceError || lastFeedback) && (
          <span
            className={`font-medium ${
              voiceError
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {voiceError || lastFeedback}
          </span>
        )}
      </div>
    </div>
  );
};
