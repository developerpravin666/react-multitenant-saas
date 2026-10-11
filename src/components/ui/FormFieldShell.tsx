import type { PropsWithChildren } from "react";
import { Mic, Radio } from "lucide-react";
import { useVoiceTyping } from "../../features/voice-typing/VoiceTypingContext";

interface FormFieldShellProps extends PropsWithChildren {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
}

function useSafeVoiceTyping() {
  try {
    return useVoiceTyping();
  } catch {
    return null;
  }
}

export function FormFieldShell({
  id,
  label,
  description,
  error,
  required,
  children,
}: FormFieldShellProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const voiceTyping = useSafeVoiceTyping();
  const isTargetField = voiceTyping?.activeControl?.id === id;
  const isListeningToField = Boolean(voiceTyping?.isListening && isTargetField);

  const handleVoiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!voiceTyping) return;

    if (isListeningToField) {
      voiceTyping.stopListening();
    } else {
      const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        voiceTyping.startListening(el);
      } else {
        voiceTyping.startListening();
      }
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-800 dark:text-slate-200"
        >
          {label}
          {required ? (
            <span className="ml-1 text-red-600" aria-hidden>
              *
            </span>
          ) : null}
        </label>

        {voiceTyping?.isSupported && voiceTyping?.isVoiceFeatureEnabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={handleVoiceClick}
            title={isListeningToField ? "Listening... click to stop" : `Voice type into ${label}`}
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition cursor-pointer ${
              isListeningToField
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 animate-pulse font-bold"
                : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {isListeningToField ? (
              <>
                <Radio className="size-3 animate-spin" />
                <span>Listening…</span>
              </>
            ) : (
              <>
                <Mic className="size-3" />
                <span className="hidden sm:inline">Voice</span>
              </>
            )}
          </button>
        )}
      </div>

      {children}

      {description ? (
        <p
          id={descriptionId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {description}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-sm font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
