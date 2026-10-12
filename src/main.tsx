import { createRoot } from "react-dom/client";
import App from "./App";
import { TenantProvider } from "./context/TenantContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import { defaultTenant } from "./config/tenant";
import "./styles/index.css";
import { BrowserRouter } from "react-router-dom";
import { ApiLoadingProvider } from "./context/ApiLoadingContext";
import { AuthProvider } from "./features/auth/AuthContext";
import { FeatureFlagProvider } from "./features/feature-flags/FeatureFlagContext";
import { VoiceTypingProvider } from "./features/voice-typing/VoiceTypingContext";
import { VoiceTypingWidget } from "./features/voice-typing/VoiceTypingWidget";

/**
 * Universally enforces autocomplete="off" on all HTML controls across the entire application:
 * forms, inputs, textareas, and selects.
 */
function initGlobalAutocompleteOff() {
  const selector = "form, input, textarea, select";
  const applyOff = (el: Element) => {
    if (
      el instanceof HTMLFormElement ||
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      if (el.getAttribute("autocomplete") !== "off") {
        el.setAttribute("autocomplete", "off");
      }
    }
  };

  // 1. Initial DOM pass
  document.querySelectorAll(selector).forEach(applyOff);

  // 2. MutationObserver for all dynamically mounted / updated controls
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.matches(selector)) applyOff(node);
            node.querySelectorAll(selector).forEach(applyOff);
          }
        });
      } else if (
        mutation.type === "attributes" &&
        mutation.attributeName === "autocomplete" &&
        mutation.target instanceof HTMLElement
      ) {
        if (mutation.target.getAttribute("autocomplete") !== "off") {
          applyOff(mutation.target);
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["autocomplete"],
  });

  // 3. Event capture on focusin ensures controls and their parent forms stay autocomplete="off"
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        if (target.getAttribute("autocomplete") !== "off") {
          target.setAttribute("autocomplete", "off");
        }
        if (target.form && target.form.getAttribute("autocomplete") !== "off") {
          target.form.setAttribute("autocomplete", "off");
        }
      }
    },
    true,
  );
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlobalAutocompleteOff);
  } else {
    initGlobalAutocompleteOff();
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <ThemeProvider>
    <NotificationProvider position="top-right" maxToasts={5}>
        <ApiLoadingProvider>
          <BrowserRouter>
            <AuthProvider>
              <TenantProvider tenant={defaultTenant}>
              <FeatureFlagProvider>
                <VoiceTypingProvider>
                  <App />
                  <VoiceTypingWidget />
                </VoiceTypingProvider>
              </FeatureFlagProvider>
              </TenantProvider>
            </AuthProvider>
          </BrowserRouter>
        </ApiLoadingProvider>
    </NotificationProvider>
  </ThemeProvider>,
);
