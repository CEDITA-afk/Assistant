import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';

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
  onCommand: (transcript: string) => void;
  lastFeedback?: string | null;
}

const EXAMPLE_COMMANDS = [
  'Schedule design sync tomorrow at 2pm',
  'Remind me to stretch at 4pm',
  'Add urgent task review Q4 budget',
  'Log $18.50 expense for coffee',
  'Log 500ml water',
];

export const VoiceAssistantBar: React.FC<VoiceAssistantBarProps> = ({
  onCommand,
  lastFeedback,
}) => {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
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
      setVoiceError('Browser voice recognition unavailable here — type a command below.');
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
      rec.lang = 'en-US';
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
            ? 'Microphone permission denied. Type a command instead.'
            : `Voice input stopped (${ev.error}).`
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
      setVoiceError('Unable to start microphone. Type a command instead.');
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

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={listening}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            listening
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {listening ? (
            <>
              <MicOff className="h-4 w-4 animate-pulse" />
              Listening...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              Voice Command
            </>
          )}
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Speak or type: 'Schedule dentist tomorrow at 3pm' or 'Log 500ml water'"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B0F17] px-3.5 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Run command"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Try:</span>
          {EXAMPLE_COMMANDS.map((cmd, idx) => (
            <React.Fragment key={cmd}>
              <button
                type="button"
                onClick={() => onCommand(cmd)}
                className="text-left hover:text-blue-600 dark:hover:text-blue-400 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-2 cursor-pointer"
              >
                {cmd}
              </button>
              {idx < EXAMPLE_COMMANDS.length - 1 && <span aria-hidden="true">·</span>}
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
