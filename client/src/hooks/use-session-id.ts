import { useState, useEffect } from "react";

const SESSION_ID_KEY = "nabd_session_id";

function generateSessionId(): string {
  return crypto.randomUUID();
}

export function useSessionId(): string {
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SESSION_ID_KEY);
      if (stored) return stored;
      const newId = generateSessionId();
      localStorage.setItem(SESSION_ID_KEY, newId);
      return newId;
    }
    return generateSessionId();
  });

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_ID_KEY);
    if (!stored) {
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
  }, [sessionId]);

  return sessionId;
}
