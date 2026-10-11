export interface ActiveControlInfo {
  element: HTMLInputElement | HTMLTextAreaElement;
  id?: string;
  name?: string;
  label: string;
  placeholder?: string;
  type: string;
}

export interface VoiceTypingState {
  isSupported: boolean;
  isVoiceFeatureEnabled: boolean;
  isListening: boolean;
  transcript: string;
  activeControl: ActiveControlInfo | null;
  language: string;
  errorMessage: string | null;
}

export interface VoiceTypingContextValue extends VoiceTypingState {
  startListening: (targetElement?: HTMLInputElement | HTMLTextAreaElement) => void;
  stopListening: () => void;
  toggleListening: () => void;
  setLanguage: (lang: string) => void;
  clearActiveControl: () => void;
  setVoiceFeatureEnabled: (enabled: boolean) => void;
}

