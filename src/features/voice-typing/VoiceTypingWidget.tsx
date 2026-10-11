import { useState } from "react";
import { Mic, MicOff, Volume2, Sparkles, X, ChevronDown, Radio } from "lucide-react";
import { useVoiceTyping } from "./VoiceTypingContext";

export function VoiceTypingWidget() {
  const {
    isSupported,
    isVoiceFeatureEnabled,
    isListening,
    transcript,
    activeControl,
    language,
    toggleListening,
    setLanguage,
  } = useVoiceTyping();

  const [minimized, setMinimized] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);

  if (!isSupported || !isVoiceFeatureEnabled) {
    return null;
  }

  const languages = [
    { code: "en-IN", label: "English (India)" },
    { code: "en-US", label: "English (US)" },
    { code: "hi-IN", label: "Hindi (हिंदी)" },
    { code: "mr-IN", label: "Marathi (मराठी)" },
  ];

  if (minimized) {
    return (
      <aside aria-label="Voice typing" className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className={`flex size-12 items-center justify-center rounded-full shadow-2xl transition-all cursor-pointer ${
            isListening
              ? "bg-rose-600 text-white ring-4 ring-rose-400/40 animate-pulse"
              : "bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105"
          }`}
          title="Open Voice Typing Assistant"
        >
          <Mic className="size-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Voice typing" className="fixed bottom-5 right-5 z-50 select-none">
      <div
        className={`flex flex-col rounded-2xl border transition-all duration-300 shadow-2xl backdrop-blur-xl ${
          isListening
            ? "border-rose-500/50 bg-slate-900/95 text-white ring-4 ring-rose-500/20 w-80 sm:w-96"
            : "border-slate-200 bg-white/95 text-slate-800 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-100 w-72 sm:w-84"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <span
              className={`flex size-7 items-center justify-center rounded-lg ${
                isListening ? "bg-rose-600 text-white animate-pulse" : "bg-indigo-600 text-white"
              }`}
            >
              <Mic className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight">Voice Typing</span>
                {isListening ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.2 text-[10px] font-semibold text-rose-400 animate-pulse">
                    <Radio className="size-2.5 animate-spin" /> Listening
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">Alt + V</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Language dropdown button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLanguages((v) => !v)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
                title="Change Speech Language"
              >
                <span>{language.slice(0, 2).toUpperCase()}</span>
                <ChevronDown className="size-3" />
              </button>

              {showLanguages && (
                <div className="absolute right-0 bottom-full mb-1 w-36 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-950 z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLanguages(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                        language === l.code
                          ? "bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{l.label}</span>
                      {language === l.code ? "✓" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMinimized(true)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Minimize"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-3 space-y-2.5">
          {/* Active Target Field Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Target Field:</span>
            {activeControl ? (
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate max-w-[180px] sm:max-w-[220px]" title={activeControl.label}>
                {activeControl.label}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">
                Click any input to select
              </span>
            )}
          </div>

          {/* Live Transcript / Speech Preview */}
          {isListening && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5 text-xs font-medium text-rose-300 min-h-11 flex items-center">
              {transcript ? (
                <p className="line-clamp-2 italic">“{transcript}”</p>
              ) : (
                <p className="text-rose-400/80 flex items-center gap-1.5 animate-pulse">
                  <Volume2 className="size-3.5 shrink-0" />
                  <span>Speak now, words will be typed automatically…</span>
                </p>
              )}
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 font-bold text-xs shadow-md transition-all cursor-pointer ${
              isListening
                ? "bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-400/30"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="size-4" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="size-4" />
                <span>
                  {activeControl ? `Speak to Type into ${activeControl.label}` : "Start Voice Typing"}
                </span>
              </>
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center">
            Click into any input box and speak to type automatically.
          </p>
        </div>
      </div>
    </aside>
  );
}

