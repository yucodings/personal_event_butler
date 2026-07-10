"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Key,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  HelpCircle,
} from "lucide-react";

export default function SettingsPage() {
  const [mimoConfigured, setMimoConfigured] = useState(false);
  const [mimoValid, setMimoValid] = useState<boolean | undefined>(undefined);
  const [mimoError, setMimoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [telegramError, setTelegramError] = useState("");
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (data.dbError) {
        setDbError(data.dbError);
      }

      setMimoConfigured(data.mimoApiKeyConfigured || false);
      setMimoValid(data.mimoApiValid);
      setMimoError(data.mimoApiError || "");
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
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
    } catch (error) {
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

      {dbError && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Database Error</p>
                <p className="text-sm">{dbError}</p>
                <p className="text-xs mt-1">Make sure you ran the supabase-setup.sql in your Supabase SQL Editor.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              <CardTitle>MiMo API</CardTitle>
            </div>
            <Badge variant={mimoConfigured && mimoValid ? "default" : mimoConfigured ? "secondary" : "destructive"}>
              {mimoConfigured && mimoValid ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
              ) : mimoConfigured ? (
                <><HelpCircle className="w-3 h-3 mr-1" /> Key Set (Testing...)</>
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
            <p className="text-sm font-medium">Environment Variables (set in Vercel)</p>
            <code className="text-xs text-muted-foreground mt-1 block">
              MIMO_API_KEY=tp-xxxxx
            </code>
            <code className="text-xs text-muted-foreground mt-1 block">
              MIMO_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
            </code>
            {mimoConfigured && mimoValid && (
              <p className="text-xs text-green-600 mt-2">API key is configured and working.</p>
            )}
            {mimoConfigured && mimoValid === false && (
              <p className="text-xs text-destructive mt-2">API key is set but not working: {mimoError}</p>
            )}
            {!mimoConfigured && (
              <p className="text-xs text-muted-foreground mt-2">API key is not set. Add MIMO_API_KEY to your Vercel environment variables.</p>
            )}
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
            Telegram is configured via environment variables for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Environment Variables (set in Vercel)</p>
            <code className="text-xs text-muted-foreground mt-1 block">
              TELEGRAM_BOT_TOKEN=8565074197:...
            </code>
            <code className="text-xs text-muted-foreground mt-1 block">
              TELEGRAM_CHAT_ID=824411464
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              These are configured in your Vercel project settings.
            </p>
          </div>

          {telegramError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {telegramError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
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
              <li>Copy the bot token</li>
              <li>Send any message to your new bot</li>
              <li>Visit the getUpdates URL to find your chat ID</li>
              <li>Add both as environment variables in Vercel</li>
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
