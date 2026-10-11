import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import type { ActiveControlInfo, VoiceTypingContextValue } from "./types";
import {
  findControlLabel,
  getSpeechRecognition,
  insertTextIntoElement,
  isSpeechRecognitionSupported,
} from "./voiceTypingService";
import { useNotifications } from "../../context/NotificationContext";
import { useFeatureFlags } from "../feature-flags/FeatureFlagContext";

const VoiceTypingContext = createContext<VoiceTypingContextValue | null>(null);

export function VoiceTypingProvider({ children }: PropsWithChildren) {
  const notifications = useNotifications();
  const supported = isSpeechRecognitionSupported();
  const featureFlags = useFeatureFlags();

  const isFeatureFlagEnabled = featureFlags.isEnabled("voice_typing", true);
  const [isVoiceFeatureEnabled, setIsVoiceFeatureEnabled] = useState<boolean>(isFeatureFlagEnabled);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [activeControl, setActiveControl] = useState<ActiveControlInfo | null>(null);
  const [language, setLanguage] = useState("en-IN");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const activeControlRef = useRef<ActiveControlInfo | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    activeControlRef.current = activeControl;
  }, [activeControl]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition may already be stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // Sync state whenever the database feature flag changes
  useEffect(() => {
    setIsVoiceFeatureEnabled(isFeatureFlagEnabled);
    if (!isFeatureFlagEnabled) {
      stopListening();
      setActiveControl(null);
      setTranscript("");
    }
  }, [isFeatureFlagEnabled, stopListening]);

  const setVoiceFeatureEnabled = useCallback(
    async (enabled: boolean) => {
      setIsVoiceFeatureEnabled(enabled);

      // Persist to database feature flags table
      await featureFlags.toggleFlag("voice_typing", enabled);

      try {
        localStorage.setItem("admin_voice_typing_enabled", String(enabled));
        window.dispatchEvent(new Event("admin_voice_typing_changed"));
      } catch {
        // ignore
      }

      if (!enabled) {
        stopListening();
        setActiveControl(null);
        setTranscript("");
      }
    },
    [featureFlags, stopListening]
  );

  // Track currently focused control across the application
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (!isVoiceFeatureEnabled) return;

      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const nonTextTypes = ["checkbox", "radio", "file", "submit", "button", "reset", "image", "hidden"];
        if (target instanceof HTMLInputElement && nonTextTypes.includes(target.type)) {
          return;
        }

        const info: ActiveControlInfo = {
          element: target,
          id: target.id || undefined,
          name: target.name || undefined,
          label: findControlLabel(target),
          placeholder: target.placeholder || undefined,
          type: target.type || "text",
        };

        setActiveControl(info);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    return () => document.removeEventListener("focusin", handleFocusIn);
  }, [isVoiceFeatureEnabled]);

  const startListening = useCallback(
    (targetOverride?: HTMLInputElement | HTMLTextAreaElement) => {
      if (!isVoiceFeatureEnabled) {
        notifications.info(
          "Voice Typing Disabled",
          "Voice typing has been disabled by the administrator in system settings."
        );
        return;
      }

      if (!supported) {
        notifications.error(
          "Voice Dictation Unavailable",
          "Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge."
        );
        return;
      }

      // Determine target control
      let targetElement = targetOverride || activeControlRef.current?.element;
      if (!targetElement && document.activeElement instanceof HTMLInputElement) {
        targetElement = document.activeElement;
      } else if (!targetElement && document.activeElement instanceof HTMLTextAreaElement) {
        targetElement = document.activeElement;
      }

      if (!targetElement) {
        notifications.info(
          "Select a Field First",
          "Click or focus on any input field or textarea to start typing by voice."
        );
        return;
      }

      // Ensure focus on target element
      try {
        targetElement.focus();
      } catch {
        // Ignore if unable to focus
      }

      const info: ActiveControlInfo = {
        element: targetElement,
        id: targetElement.id || undefined,
        name: targetElement.name || undefined,
        label: findControlLabel(targetElement),
        placeholder: targetElement.placeholder || undefined,
        type: targetElement.type || "text",
      };
      setActiveControl(info);

      const SpeechRecognitionClass = getSpeechRecognition();
      if (!SpeechRecognitionClass) return;

      // Stop existing instance if running
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      try {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          isListeningRef.current = true;
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          const target = activeControlRef.current?.element || targetElement;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0]?.transcript || "";

            if (res.isFinal) {
              // Automatically type final transcribed words into the active control
              if (target && document.body.contains(target)) {
                insertTextIntoElement(target, text);
              }
            } else {
              currentInterim += text;
            }
          }

          setTranscript(currentInterim);
        };

        recognition.onerror = (event: any) => {
          if (event.error === "no-speech") {
            // User paused speaking; keep listening in continuous mode
            return;
          }
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            notifications.error("Microphone Access Denied", "Please allow microphone access in your browser settings.");
            stopListening();
            return;
          }
          setErrorMessage(`Speech recognition error: ${event.error}`);
        };

        recognition.onend = () => {
          // If listening state is still true (e.g. browser timed out after silence), smoothly resume
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch {
              setIsListening(false);
              isListeningRef.current = false;
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        notifications.error("Speech Recognition Error", err instanceof Error ? err.message : String(err));
        setIsListening(false);
      }
    },
    [isVoiceFeatureEnabled, language, notifications, stopListening, supported]
  );

  const toggleListening = useCallback(() => {
    if (!isVoiceFeatureEnabled) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, isVoiceFeatureEnabled, startListening, stopListening]);

  const clearActiveControl = useCallback(() => {
    setActiveControl(null);
  }, []);

  // Keyboard shortcut: Alt + V to quickly toggle dictation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isVoiceFeatureEnabled) return;
      if (event.altKey && (event.key === "v" || event.key === "V")) {
        event.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVoiceFeatureEnabled, toggleListening]);

  return (
    <VoiceTypingContext.Provider
      value={{
        isSupported: supported,
        isVoiceFeatureEnabled,
        isListening,
        transcript,
        activeControl,
        language,
        errorMessage,
        startListening,
        stopListening,
        toggleListening,
        setLanguage,
        clearActiveControl,
        setVoiceFeatureEnabled,
      }}
    >
      {children}
    </VoiceTypingContext.Provider>
  );
}

export function useVoiceTyping(): VoiceTypingContextValue {
  const ctx = useContext(VoiceTypingContext);
  if (!ctx) {
    throw new Error("useVoiceTyping must be used within a VoiceTypingProvider");
  }
  return ctx;
}

