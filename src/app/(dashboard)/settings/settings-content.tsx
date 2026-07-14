"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  Calendar,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function SettingsPageContent() {
  const searchParams = useSearchParams();
  const [mimoConfigured, setMimoConfigured] = useState(false);
  const [mimoValid, setMimoValid] = useState<boolean | undefined>(undefined);
  const [mimoError, setMimoError] = useState("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<"unknown" | "connected" | "error">("unknown");
  const [telegramError, setTelegramError] = useState("");
  const [dbError, setDbError] = useState("");
  
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
    checkGoogleCalendar();
    
    const googleSuccess = searchParams.get("google_success");
    const googleError = searchParams.get("google_error");
    
    if (googleSuccess) {
      toast.success("Google Calendar connected!");
      checkGoogleCalendar();
    }
    if (googleError) {
      toast.error(`Google Calendar error: ${googleError}`);
    }
  }, [searchParams]);

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

  const checkGoogleCalendar = async () => {
    try {
      const response = await fetch("/api/google/auth");
      const data = await response.json();
      
      setGoogleConnected(data.configured);
      if (!data.configured && data.authUrl) {
        setGoogleAuthUrl(data.authUrl);
      }
    } catch (error) {
      console.error("Failed to check Google Calendar:", error);
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

  const syncGoogleCalendar = async () => {
    setGoogleSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch("/api/google/sync", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setSyncResult(data);
        setLastSyncTime(new Date().toISOString());
        toast.success(`Synced ${data.newEventsAdded} new events from Google Calendar`);
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch {
      toast.error("Failed to sync Google Calendar");
    } finally {
      setGoogleSyncing(false);
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
                <><HelpCircle className="w-3 h-3 mr-1" /> Key Set</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Not Configured</>
              )}
            </Badge>
          </div>
          <CardDescription>AI model for event extraction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mimoConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-muted-foreground">
                {mimoConfigured ? 'API Key: Configured' : 'API Key: Not configured'}
              </span>
            </div>
            {mimoConfigured && mimoValid && (
              <p className="text-xs text-green-600 mt-2">✓ Connection verified</p>
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
          <CardDescription>Daily summaries at 8am and 8pm (UTC+8)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Schedule</p>
            <p className="text-xs text-muted-foreground mt-1">8:00 AM and 8:00 PM (Malaysia time)</p>
          </div>

          {telegramError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {telegramError}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={testTelegram} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Test Connection
            </Button>
            <Button variant="outline" onClick={sendDailySummary} disabled={sendingSummary}>
              {sendingSummary ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
              Send Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <CardTitle>Google Calendar</CardTitle>
            </div>
            <Badge variant={googleConnected ? "default" : "secondary"}>
              {googleConnected ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Not Connected</>
              )}
            </Badge>
          </div>
          <CardDescription>Sync events from Google Calendar (one-way, excludes holidays)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleConnected ? (
            <>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Sync Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">Connected to Google Calendar</span>
                </div>
                {lastSyncTime && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(lastSyncTime).toLocaleString()}
                  </p>
                )}
              </div>

              {syncResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  <p className="text-sm font-medium text-green-800">Sync Complete</p>
                  <p className="text-xs text-green-600">• Total events from Google: {syncResult.totalFromGoogle}</p>
                  <p className="text-xs text-green-600">• Holidays filtered: {syncResult.holidaysFiltered}</p>
                  <p className="text-xs text-green-600">• New events added: {syncResult.newEventsAdded}</p>
                </div>
              )}

              <Button onClick={syncGoogleCalendar} disabled={googleSyncing}>
                {googleSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sync Now
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Connect Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Sync your Google Calendar events to Skyler. Holidays are automatically excluded.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-yellow-800">Setup Required</p>
                <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                  <li>Go to Google Cloud Console</li>
                  <li>Create a project and enable Calendar API</li>
                  <li>Create OAuth2 credentials</li>
                  <li>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Vercel env vars</li>
                  <li>Click the button below to connect</li>
                </ol>
              </div>

              {googleAuthUrl && (
                <Button onClick={() => window.open(googleAuthUrl, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>Personal Butler - Skyler</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Version 2.0.0</p>
            <p>Built with Next.js, shadcn/ui, Supabase, MiMo AI, and Google Calendar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
