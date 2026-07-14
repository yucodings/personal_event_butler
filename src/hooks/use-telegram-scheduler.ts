"use client";

import { useEffect, useRef } from "react";

export function useTelegramScheduler() {
  const lastCheckRef = useRef<string>("");

  useEffect(() => {
    const checkAndNotify = async () => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const malaysiaTime = new Date(utc + 8 * 3600000);
      
      const hours = malaysiaTime.getHours();
      const minutes = malaysiaTime.getMinutes();
      const dateStr = malaysiaTime.toISOString().split('T')[0];
      
      // Check if it's 8:00 AM or 8:00 PM (within 1 minute window)
      const is8AM = hours === 8 && minutes === 0;
      const is8PM = hours === 20 && minutes === 0;
      
      // Create a unique key for this time slot
      const timeKey = `${dateStr}-${hours}`;
      
      // Only send if we haven't sent for this time slot yet
      if ((is8AM || is8PM) && lastCheckRef.current !== timeKey) {
        lastCheckRef.current = timeKey;
        
        try {
          const response = await fetch("/api/telegram/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          
          if (response.ok) {
            console.log(`Telegram notification sent at ${hours}:${minutes.toString().padStart(2, '0')} (UTC+8)`);
          }
        } catch (error) {
          console.error("Failed to send Telegram notification:", error);
        }
      }
    };

    // Check immediately
    checkAndNotify();
    
    // Check every minute
    const interval = setInterval(checkAndNotify, 60000);
    
    return () => clearInterval(interval);
  }, []);
}
