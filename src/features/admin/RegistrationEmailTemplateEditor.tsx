import { useEffect, useState, useRef } from "react";
import {
  Mail,
  Send,
  RotateCcw,
  Save,
  Eye,
  Code,
  Sparkles,
  Info,
  Smartphone,
  Monitor,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../auth/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

export type TemplateKey = "store_registration" | "admin_approval_request";

interface Template {
  subject: string;
  htmlBody: string;
}

interface TemplateSettings extends Template {
  key?: string;
  defaultSubject: string;
  defaultHtmlBody: string;
  isCustomized?: boolean;
  placeholders: string[];
}

interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  badge: string;
  recipientDescription: string;
  description: string;
  sampleRecipient: string;
  defaultToEmail: string;
}

const TEMPLATES: TemplateDefinition[] = [
  {
    key: "store_registration",
    name: "Store Welcome Email",
    badge: "Store Owner",
    recipientDescription: "Sent to the store owner upon store registration",
    description:
      "This email is automatically dispatched to the store owner as soon as they submit their registration form on /register-tenant.",
    sampleRecipient: "storeowner@example.com (Pravin Patidar)",
    defaultToEmail: "storeowner@example.com",
  },
  {
    key: "admin_approval_request",
    name: "Admin Approval Request Email",
    badge: "Platform Admin",
    recipientDescription: "Sent to platform administrator when a new store submits registration",
    description:
      "This email is automatically dispatched to the platform administrator to notify them that a new store is registered and pending review.",
    sampleRecipient: "admin@siddhi-mobile.local (Platform Admin)",
    defaultToEmail: "admin@siddhi-mobile.local",
  },
];

export function RegistrationEmailTemplateEditor() {
  const { isProductOwner } = useAuth();
  const notifications = useNotifications();

  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<TemplateKey>("store_registration");
  const [settings, setSettings] = useState<TemplateSettings | null>(null);
  const [template, setTemplate] = useState<Template>({ subject: "", htmlBody: "" });
  const [preview, setPreview] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [testEmailAddress, setTestEmailAddress] = useState("storeowner@example.com");
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastActiveFieldRef = useRef<"subject" | "body">("body");

  const currentTemplateDef =
    TEMPLATES.find((t) => t.key === selectedTemplateKey) || TEMPLATES[0];

  const getApiPath = (key: TemplateKey) => `/admin/email-templates/${key}`;

  const loadTemplate = async (key = selectedTemplateKey) => {
    setLoading(true);
    try {
      const res = await apiClient.get<TemplateSettings>(getApiPath(key));
      setSettings(res);
      setTemplate({ subject: res.subject, htmlBody: res.htmlBody });
      // Generate initial preview
      await fetchPreview(key, { subject: res.subject, htmlBody: res.htmlBody });
    } catch (err) {
      notifications.error(
        "Failed to load email template",
        err instanceof Error ? err.message : "Error loading template settings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isProductOwner) return;
    void loadTemplate(selectedTemplateKey);
  }, [isProductOwner, selectedTemplateKey]);

  const handleSelectTemplate = (key: TemplateKey) => {
    if (key === selectedTemplateKey) return;
    const def = TEMPLATES.find((t) => t.key === key) || TEMPLATES[0];
    setSelectedTemplateKey(key);
    setTestEmailAddress(def.defaultToEmail);
  };

  const fetchPreview = async (
    key = selectedTemplateKey,
    tmplToPreview = template
  ) => {
    setPreviewing(true);
    try {
      const res = await apiClient.post<Template>(
        `${getApiPath(key)}/preview`,
        tmplToPreview
      );
      setPreview(res);
    } catch (err) {
      notifications.error(
        "Preview Failed",
        err instanceof Error ? err.message : "Could not generate email preview"
      );
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    if (!template.subject.trim()) {
      notifications.error("Validation Error", "Email subject cannot be empty.");
      return;
    }
    if (!template.htmlBody.trim()) {
      notifications.error("Validation Error", "Email HTML body cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(getApiPath(selectedTemplateKey), template);
      notifications.success(
        "Template Saved",
        `${currentTemplateDef.name} format updated! All future occurrences will use this template.`
      );
      await loadTemplate(selectedTemplateKey);
    } catch (err) {
      notifications.error(
        "Save Failed",
        err instanceof Error ? err.message : "Failed to update email template"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!settings) return;
    setSaving(true);
    setShowResetConfirm(false);
    try {
      await apiClient.post(`${getApiPath(selectedTemplateKey)}/reset`, {});
      setTemplate({
        subject: settings.defaultSubject,
        htmlBody: settings.defaultHtmlBody,
      });
      notifications.success(
        "Reset to Default",
        `The ${currentTemplateDef.name} format has been restored to the original factory default.`
      );
      await loadTemplate(selectedTemplateKey);
    } catch (err) {
      notifications.error(
        "Reset Failed",
        err instanceof Error ? err.message : "Failed to reset template"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmailAddress.trim()) {
      notifications.error(
        "Validation Error",
        "Please provide a valid test recipient email address."
      );
      return;
    }

    setSendingTest(true);
    try {
      const res = await apiClient.post<{ message: string }>(
        `${getApiPath(selectedTemplateKey)}/test-send`,
        {
          to: testEmailAddress.trim(),
          subject: template.subject,
          htmlBody: template.htmlBody,
          storeName: "Siddhi Mobile Demo Store",
        }
      );
      notifications.success(
        "Test Email Dispatched",
        res.message || `Test email dispatched to ${testEmailAddress}`
      );
    } catch (err) {
      notifications.error(
        "Test Send Failed",
        err instanceof Error ? err.message : "Could not send test email"
      );
    } finally {
      setSendingTest(false);
    }
  };

  const insertPlaceholder = (name: string) => {
    const placeholderText = `{{${name}}}`;

    if (lastActiveFieldRef.current === "subject" && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || template.subject.length;
      const end = input.selectionEnd || template.subject.length;
      const updated =
        template.subject.slice(0, start) +
        placeholderText +
        template.subject.slice(end);
      setTemplate({ ...template, subject: updated });
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(
          start + placeholderText.length,
          start + placeholderText.length
        );
      }, 0);
    } else if (bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart || template.htmlBody.length;
      const end = textarea.selectionEnd || template.htmlBody.length;
      const updated =
        template.htmlBody.slice(0, start) +
        placeholderText +
        template.htmlBody.slice(end);
      setTemplate({ ...template, htmlBody: updated });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + placeholderText.length,
          start + placeholderText.length
        );
      }, 0);
    } else {
      setTemplate({
        ...template,
        htmlBody: template.htmlBody + " " + placeholderText,
      });
    }

    setCopiedPlaceholder(name);
    setTimeout(() => setCopiedPlaceholder(null), 2000);
  };

  if (!isProductOwner) return null;

  const isDirty =
    settings &&
    (template.subject !== settings.subject ||
      template.htmlBody !== settings.htmlBody);
  const isDefault =
    settings &&
    template.subject === settings.defaultSubject &&
    template.htmlBody === settings.defaultHtmlBody;

  return (
    <div className="space-y-6">
      {/* Template Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TEMPLATES.map((tmpl) => {
          const isActive = selectedTemplateKey === tmpl.key;
          return (
            <button
              key={tmpl.key}
              type="button"
              onClick={() => handleSelectTemplate(tmpl.key)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {tmpl.key === "store_registration" ? (
                <Mail className="size-4" />
              ) : (
                <ShieldAlert className="size-4" />
              )}
              <span>{tmpl.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {tmpl.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Header Container */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
              {selectedTemplateKey === "store_registration" ? (
                <Mail className="size-6" />
              ) : (
                <ShieldAlert className="size-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {currentTemplateDef.name} Format
                </h2>
                {settings && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      isDefault
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {isDefault ? "Default Format Active" : "Customized Format Active"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {currentTemplateDef.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadTemplate(selectedTemplateKey)}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Reload template"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
              <span>Reload</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={loading || saving || isDefault}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="Reset template to factory default"
            >
              <RotateCcw className="size-3.5 text-slate-500" />
              <span>Reset to Default</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving || !isDirty}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50 active:scale-95"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Save Email Format</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/30 dark:text-indigo-200">
          <Info className="mt-0.5 size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div className="leading-relaxed">
            <span className="font-semibold">Dynamic Templating:</span> You can insert
            placeholders like{" "}
            <code className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
              {"{{StoreName}}"}
            </code>
            ,{" "}
            <code className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
              {"{{OwnerName}}"}
            </code>
            {selectedTemplateKey === "admin_approval_request" && (
              <>
                , or{" "}
                <code className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {"{{ApprovalsUrl}}"}
                </code>
              </>
            )}{" "}
            anywhere in the Subject or HTML body. They will be replaced with real
            store registration details at dispatch time.
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <RefreshCw className="size-8 animate-spin text-indigo-500" />
          <p className="mt-3 text-sm text-slate-500">
            Loading {currentTemplateDef.name} configuration…
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Form & Placeholders (7 cols) */}
          <div className="space-y-4 lg:col-span-7">
            {/* Available Placeholders Palette */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Sparkles className="size-3.5 text-amber-500" />
                  <span>Click to Insert Placeholder</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Inserts at current cursor
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  settings?.placeholders || [
                    "StoreName",
                    "StoreSlug",
                    "OwnerName",
                    "OwnerEmail",
                    "OwnerMobile",
                    "Address",
                    "StateCode",
                    "Gstin",
                    "ApprovalsUrl",
                  ]
                ).map((placeholder) => {
                  const isCopied = copiedPlaceholder === placeholder;
                  const isSpecial = placeholder === "ApprovalsUrl";
                  return (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => insertPlaceholder(placeholder)}
                      className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition active:scale-95 ${
                        isSpecial
                          ? "border-amber-200 bg-amber-50/80 text-amber-900 hover:border-amber-400 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/40"
                      }`}
                    >
                      <span>{`{{${placeholder}}}`}</span>
                      {isCopied ? (
                        <Check className="size-3 text-emerald-600" />
                      ) : (
                        <Copy className="size-3 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Fields Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {/* Subject Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Email Subject Line
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {template.subject.length} / 500 chars
                  </span>
                </div>
                <input
                  ref={subjectInputRef}
                  type="text"
                  maxLength={500}
                  value={template.subject}
                  onFocus={() => {
                    lastActiveFieldRef.current = "subject";
                  }}
                  onChange={(e) => {
                    setTemplate({ ...template, subject: e.target.value });
                  }}
                  placeholder="Subject line with {{StoreName}}..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* HTML Body Field */}
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Code className="size-3.5 text-slate-500" />
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Email HTML Body Content
                    </label>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {template.htmlBody.length.toLocaleString()} / 50,000 chars
                  </span>
                </div>
                <textarea
                  ref={bodyTextareaRef}
                  rows={15}
                  maxLength={50000}
                  value={template.htmlBody}
                  onFocus={() => {
                    lastActiveFieldRef.current = "body";
                  }}
                  onChange={(e) => {
                    setTemplate({ ...template, htmlBody: e.target.value });
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 p-3.5 font-mono text-xs leading-relaxed text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:focus:bg-slate-900"
                  placeholder="Enter HTML email template..."
                />
              </div>

              {/* Quick Actions & Live Update Button */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchPreview()}
                    disabled={previewing}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <Eye className="size-3.5" />
                    <span>Update Live Preview</span>
                  </button>
                  {isDirty && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ● Unsaved edits
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isDirty}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-40"
                >
                  <Save className="size-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Preview & Test Dispatch (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            {/* Live Preview Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Live Sample Preview
                  </span>
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`rounded p-1 text-xs transition ${
                      previewDevice === "desktop"
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`rounded p-1 text-xs transition ${
                      previewDevice === "mobile"
                        ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="Mobile Preview (375px)"
                  >
                    <Smartphone className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Header Metadata */}
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-900 dark:text-white break-all">
                    {preview?.subject ||
                      template.subject.replace(
                        /\{\{StoreName\}\}/gi,
                        "Siddhi Electronics & Mobile"
                      )}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2 text-[11px] text-slate-400">
                  <span>To:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {currentTemplateDef.sampleRecipient}
                  </span>
                </div>
              </div>

              {/* Rendered HTML Container */}
              <div className="mt-3 flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-950">
                <div
                  className={`transition-all duration-300 ${
                    previewDevice === "mobile"
                      ? "w-[375px] shadow-lg"
                      : "w-full"
                  }`}
                >
                  <iframe
                    title={`${currentTemplateDef.name} Live Preview`}
                    sandbox="allow-same-origin"
                    srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:12px;background:#f8fafc;font-family:Arial,sans-serif;}</style></head><body>${
                      preview?.htmlBody || template.htmlBody
                    }</body></html>`}
                    className="h-[430px] w-full rounded-lg border border-slate-200 bg-white dark:border-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Test Email Dispatch Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Send className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Send Real Test Email
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Verify how the {currentTemplateDef.name} renders in your inbox (via configured SMTP).
              </p>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your-email@example.com"
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={sendingTest || !testEmailAddress.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 active:scale-95"
                >
                  {sendingTest ? (
                    <RefreshCw className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  <span>{sendingTest ? "Sending…" : "Send Test"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset to Factory Default */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2.5 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset {currentTemplateDef.name}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This will discard your custom changes and restore the original template.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Are you sure you want to revert {currentTemplateDef.name} to the factory default? Future emails will immediately use the original system template.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
              >
                <RotateCcw className="size-3.5" />
                <span>Yes, Reset to Default</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
