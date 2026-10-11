// Web Speech API interface definitions
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventLike) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Programmatically updates a React-controlled input or textarea value
 * by calling the native prototype value setter and dispatching standard input & change events.
 */
export function setNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Inserts or appends transcribed text into the target element at the current cursor position.
 */
export function insertTextIntoElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  textToInsert: string
) {
  const isNumberType = element instanceof HTMLInputElement && (element.type === "number" || element.type === "tel");
  let formattedText = textToInsert.trim();

  // If number/phone input, clean or parse spoken digits
  if (isNumberType) {
    formattedText = cleanSpokenNumber(formattedText);
  }

  if (!formattedText) return;

  const currentVal = element.value || "";
  let start = currentVal.length;
  let end = currentVal.length;

  try {
    if (typeof element.selectionStart === "number") {
      start = element.selectionStart;
      end = element.selectionEnd ?? start;
    }
  } catch {
    // Number and date inputs don't support selectionStart in some browsers
  }

  // Prepend space if appending to existing text without trailing whitespace
  if (start > 0 && !/\s$/.test(currentVal.slice(0, start)) && !isNumberType) {
    formattedText = " " + formattedText;
  }

  const newVal = currentVal.slice(0, start) + formattedText + currentVal.slice(end);
  setNativeInputValue(element, newVal);

  // Attempt to restore cursor after inserted text
  const newCursorPos = start + formattedText.length;
  try {
    element.setSelectionRange(newCursorPos, newCursorPos);
  } catch {
    // Safely ignore if control doesn't support selection ranges
  }
}

/**
 * Converts common spoken numbers to digits (e.g. "two hundred fifty" -> digits or extract existing numbers)
 */
function cleanSpokenNumber(text: string): string {
  // Check if speech already contains digits
  const digits = text.replace(/[^0-9.]/g, "");
  if (digits) return digits;

  const smallNumbers: Record<string, string> = {
    zero: "0",
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirteen: "13",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    seventeen: "17",
    eighteen: "18",
    nineteen: "19",
    twenty: "20",
    thirty: "30",
    forty: "40",
    fifty: "50",
    sixty: "60",
    seventy: "70",
    eighty: "80",
    ninety: "90",
  };

  const words = text.toLowerCase().split(/\s+/);
  const matched = words.map((w) => smallNumbers[w] || "").filter(Boolean);
  return matched.length ? matched.join("") : text;
}

/**
 * Determines a human-readable label for any input control
 */
export function findControlLabel(element: HTMLInputElement | HTMLTextAreaElement): string {
  // 1. Associated label via htmlFor
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent) {
      return label.textContent.replace(/\*/g, "").trim();
    }
  }

  // 2. Parent label element
  const parentLabel = element.closest("label");
  if (parentLabel?.textContent) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    // Remove input text from cloned label text
    clone.querySelectorAll("input, textarea, select").forEach((el) => el.remove());
    const text = clone.textContent?.replace(/\*/g, "").trim();
    if (text) return text;
  }

  // 3. aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.trim();

  // 4. placeholder
  if (element.placeholder) return element.placeholder.trim();

  // 5. name or id formatted
  const nameOrId = element.name || element.id || "";
  if (nameOrId) {
    return nameOrId
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  return element.type === "textarea" ? "Text Area" : "Input Field";
}

