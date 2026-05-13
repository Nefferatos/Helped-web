import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AgencyChatbotConfig,
  AgencyChatbotResponseRule,
  AgencyChatbotTopicOption,
} from "@/lib/chat";
import {
  clearAgencyAdminAuth,
  getAgencyAdminAuthHeaders,
} from "@/lib/agencyAdminAuth";
import { adminPath } from "@/lib/routes";

const createTopic = (): AgencyChatbotTopicOption => ({
  id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: "",
  icon: "💬",
  description: "",
  suggestedMessage: "",
  enabled: true,
});

const createRule = (): AgencyChatbotResponseRule => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: "",
  keywords: [],
  response: "",
  enabled: true,
});

const EMPTY_CONFIG: AgencyChatbotConfig = {
  agencyId: 1,
  enabled: true,
  botName: "Support Bot",
  welcomeMessage: "",
  fallbackShortResponse: "",
  fallbackLongResponse: "",
  suggestionChips: [],
  topicOptions: [],
  responseRules: [],
  updatedAt: "",
};

const AgencyChatbotConfigPage = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AgencyChatbotConfig>(EMPTY_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/chats/admin/config", {
        headers: { ...getAgencyAdminAuthHeaders() },
      });
      const data = (await response.json().catch(() => ({}))) as {
        config?: AgencyChatbotConfig;
        error?: string;
      };
      if (response.status === 401) {
        clearAgencyAdminAuth();
        navigate(adminPath("/login"), { replace: true });
        return;
      }
      if (!response.ok || !data.config) {
        throw new Error(data.error || "Failed to load chatbot config");
      }
      setConfig(data.config);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load chatbot config");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveConfig = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/chats/admin/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAgencyAdminAuthHeaders(),
        },
        body: JSON.stringify(config),
      });
      const data = (await response.json().catch(() => ({}))) as {
        config?: AgencyChatbotConfig;
        error?: string;
      };
      if (response.status === 401) {
        clearAgencyAdminAuth();
        navigate(adminPath("/login"), { replace: true });
        return;
      }
      if (!response.ok || !data.config) {
        throw new Error(data.error || "Failed to save chatbot config");
      }
      setConfig(data.config);
      toast.success("Chatbot configuration saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save chatbot config");
    } finally {
      setIsSaving(false);
    }
  };

  const updateTopic = (id: string, patch: Partial<AgencyChatbotTopicOption>) => {
    setConfig((prev) => ({
      ...prev,
      topicOptions: prev.topicOptions.map((topic) =>
        topic.id === id ? { ...topic, ...patch } : topic,
      ),
    }));
  };

  const updateRule = (id: string, patch: Partial<AgencyChatbotResponseRule>) => {
    setConfig((prev) => ({
      ...prev,
      responseRules: prev.responseRules.map((rule) =>
        rule.id === id ? { ...rule, ...patch } : rule,
      ),
    }));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agency Chatbot Config</h1>
          <p className="mt-1 text-sm text-slate-600">
            Edit the bot name, quick topics, suggestion chips, and response rules for your agency.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(adminPath("/chat-support"))}>
            Back to Messages
          </Button>
          <Button type="button" onClick={() => void saveConfig()} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading chatbot settings...
        </div>
      ) : (
        <>
          <section className="grid gap-4 rounded-3xl border bg-white p-6 shadow-sm md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="botName">Bot name</Label>
              <Input
                id="botName"
                value={config.botName}
                onChange={(e) => setConfig((prev) => ({ ...prev, botName: e.target.value }))}
                placeholder="Support Bot"
              />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
              Enable auto-replies for this agency
            </label>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="welcomeMessage">Welcome message template</Label>
              <Textarea
                id="welcomeMessage"
                rows={3}
                value={config.welcomeMessage}
                onChange={(e) => setConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                placeholder="Use {{name}} and {{agencyName}} placeholders."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackShort">Fallback for short messages</Label>
              <Textarea
                id="fallbackShort"
                rows={4}
                value={config.fallbackShortResponse}
                onChange={(e) => setConfig((prev) => ({ ...prev, fallbackShortResponse: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackLong">Fallback for detailed messages</Label>
              <Textarea
                id="fallbackLong"
                rows={4}
                value={config.fallbackLongResponse}
                onChange={(e) => setConfig((prev) => ({ ...prev, fallbackLongResponse: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="chips">Suggested chips</Label>
              <Textarea
                id="chips"
                rows={2}
                value={config.suggestionChips.join("\n")}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    suggestionChips: e.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                  }))
                }
                placeholder="One suggestion per line"
              />
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Topic picker</h2>
                <p className="text-sm text-slate-600">These appear above the chat input when the fallback assistant is shown.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setConfig((prev) => ({ ...prev, topicOptions: [...prev.topicOptions, createTopic()] }))}>
                Add Topic
              </Button>
            </div>

            <div className="space-y-4">
              {config.topicOptions.map((topic) => (
                <div key={topic.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <Label>Label</Label>
                    <Input value={topic.label} onChange={(e) => updateTopic(topic.id, { label: e.target.value })} />
                  </div>
                  <div className="md:col-span-1">
                    <Label>Icon</Label>
                    <Input value={topic.icon} onChange={(e) => updateTopic(topic.id, { icon: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Description</Label>
                    <Input value={topic.description} onChange={(e) => updateTopic(topic.id, { description: e.target.value })} />
                  </div>
                  <div className="md:col-span-4">
                    <Label>Suggested message</Label>
                    <Input value={topic.suggestedMessage} onChange={(e) => updateTopic(topic.id, { suggestedMessage: e.target.value })} />
                  </div>
                  <div className="flex items-end gap-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={topic.enabled}
                        onChange={(e) => updateTopic(topic.id, { enabled: e.target.checked })}
                      />
                      Enabled
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          topicOptions: prev.topicOptions.filter((item) => item.id !== topic.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Response rules</h2>
                <p className="text-sm text-slate-600">If a client message contains one of the rule keywords, this response is used.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setConfig((prev) => ({ ...prev, responseRules: [...prev.responseRules, createRule()] }))}>
                Add Rule
              </Button>
            </div>

            <div className="space-y-4">
              {config.responseRules.map((rule) => (
                <div key={rule.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <Label>Rule name</Label>
                    <Input value={rule.label} onChange={(e) => updateRule(rule.id, { label: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Keywords</Label>
                    <Input
                      value={rule.keywords.join(", ")}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          keywords: e.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                        })
                      }
                      placeholder="status, progress, update"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Label>Response</Label>
                    <Textarea
                      rows={4}
                      value={rule.response}
                      onChange={(e) => updateRule(rule.id, { response: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end gap-2 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                      />
                      Enabled
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          responseRules: prev.responseRules.filter((item) => item.id !== rule.id),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AgencyChatbotConfigPage;
