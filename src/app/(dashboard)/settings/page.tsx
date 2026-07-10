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
} from "lucide-react";

export default function SettingsPage() {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [mimoConfigured, setMimoConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);

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
    try {
      const response = await fetch("/api/telegram/notify", { method: "POST" });
      if (response.ok) {
        toast.success("Test message sent! Check your Telegram.");
      } else {
        toast.error("Failed to send test message. Check your settings.");
      }
    } catch {
      toast.error("Failed to send test message");
    } finally {
      setTesting(false);
    }
  };

  const sendDailySummary = async () => {
    setSendingSummary(true);
    try {
      const response = await fetch("/api/telegram/notify", { method: "POST" });
      if (response.ok) {
        toast.success("Daily summary sent!");
      } else {
        toast.error("Failed to send summary. Check Telegram settings.");
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
            The MiMo API key is configured via environment variables (MIMO_API_KEY) for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Environment Variable</p>
            <code className="text-xs text-muted-foreground mt-1 block">
              MIMO_API_KEY=sk-xxxxx
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Add this to your Vercel project settings or .env.local file.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            <CardTitle>Telegram Notifications</CardTitle>
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
              Get this from @BotFather on Telegram.
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
              Send a message to your bot, then check https://api.telegram.org/botYOUR_TOKEN/getUpdates
            </p>
          </div>

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
              Send Test Message
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
