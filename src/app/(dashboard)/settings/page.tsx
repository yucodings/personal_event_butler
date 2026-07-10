"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Key,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  HelpCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [mimoConfigured, setMimoConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [telegramError, setTelegramError] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setMimoConfigured(data.mimoApiKeyConfigured);
        setTelegramToken(data.settings?.telegram_bot_token || "");
        setTelegramChatId(data.settings?.telegram_chat_id || "");
      }
    } catch {
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const saveTelegramSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "telegram_bot_token", value: telegramToken }),
        }),
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "telegram_chat_id", value: telegramChatId }),
        }),
      ]);
      toast.success("Telegram settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const testTelegram = async () => {
    setTesting(true);
    setTelegramError("");
    try {
      const response = await fetch("/api/telegram/notify?action=test", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setTelegramStatus("connected");
        toast.success("Telegram connected! Check your Telegram for the test message.");
      } else {
        setTelegramStatus("error");
        setTelegramError(data.error || "Unknown error");
        toast.error(data.error || "Failed to connect Telegram");
      }
    } catch {
      setTelegramStatus("error");
      setTelegramError("Network error");
      toast.error("Failed to test Telegram connection");
    } finally {
      setTesting(false);
    }
  };

  const sendDailySummary = async () => {
    setSendingSummary(true);
    try {
      const response = await fetch("/api/telegram/notify", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        toast.success("Daily summary sent!");
      } else {
        toast.error(data.error || "Failed to send summary");
      }
    } catch {
      toast.error("Failed to send summary");
    } finally {
      setSendingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your personal butler</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <CardTitle>MiMo API</CardTitle>
            </div>
            <Badge variant={mimoConfigured ? "default" : "destructive"}>
              {mimoConfigured ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Configured</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
          <CardDescription>
            The MiMo API key is configured via environment variables for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Environment Variables</p>
            <code className="text-xs text-muted-foreground mt-1 block">
              MIMO_API_KEY=tp-xxxxx
            </code>
            <code className="text-xs text-muted-foreground mt-1 block">
              MIMO_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              These are configured in your Vercel project settings.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle>Telegram Notifications</CardTitle>
            </div>
            <Badge variant={telegramStatus === "connected" ? "default" : telegramStatus === "error" ? "destructive" : "secondary"}>
              {telegramStatus === "connected" ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
              ) : telegramStatus === "error" ? (
                <><XCircle className="w-3 h-3 mr-1" /> Error</>
              ) : (
                <><HelpCircle className="w-3 h-3 mr-1" /> Not Tested</>
              )}
            </Badge>
          </div>
          <CardDescription>
            Configure Telegram to receive daily summaries and event reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Bot Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get this from @BotFather on Telegram. Send /newbot to create a bot.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chatId">Chat ID</Label>
            <Input
              id="chatId"
              placeholder="123456789"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your personal chat ID. Send a message to your bot first, then visit:{" "}
              <code className="bg-muted px-1 rounded">https://api.telegram.org/botYOUR_TOKEN/getUpdates</code>{" "}
              to find your chat ID.
            </p>
          </div>

          {telegramError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {telegramError}
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveTelegramSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
            <Button variant="outline" onClick={testTelegram} disabled={testing}>
              {testing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button variant="outline" onClick={sendDailySummary} disabled={sendingSummary}>
              {sendingSummary ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bot className="w-4 h-4 mr-2" />
              )}
              Send Daily Summary Now
            </Button>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">How to set up Telegram:</p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open Telegram and search for @BotFather</li>
              <li>Send /newbot and follow the instructions</li>
              <li>Copy the bot token and paste it above</li>
              <li>Send any message to your new bot</li>
              <li>Visit the getUpdates URL to find your chat ID</li>
              <li>Save settings and test the connection</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Personal Butler - Skyler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Version 1.0.0</p>
            <p>Built with Next.js, shadcn/ui, Supabase, and MiMo AI</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
