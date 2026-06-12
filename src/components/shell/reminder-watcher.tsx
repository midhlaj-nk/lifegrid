"use client";

import { useEffect } from "react";

interface DueSoonTask {
  id: string;
  title: string;
  dueDate: string;
  dueTime: string;
}

/**
 * Browser notifications while the tab is open: every minute, notify tasks
 * whose due date+time falls within the last/next minute. De-duped per task
 * via localStorage.
 */
export function ReminderWatcher({ tasks }: { tasks: DueSoonTask[] }) {
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    function check() {
      if (Notification.permission !== "granted") return;
      const notified: string[] = JSON.parse(
        localStorage.getItem("notified-tasks") ?? "[]"
      );
      const now = Date.now();
      for (const t of tasks) {
        if (notified.includes(t.id)) continue;
        const at = new Date(`${t.dueDate}T${t.dueTime}:00`).getTime();
        if (Number.isNaN(at)) continue;
        // fire within [-5 min, +1 min] window of due time
        if (now >= at - 60_000 && now <= at + 5 * 60_000) {
          new Notification("Life Grid — task due", { body: t.title });
          notified.push(t.id);
        }
      }
      localStorage.setItem(
        "notified-tasks",
        JSON.stringify(notified.slice(-200))
      );
    }

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [tasks]);

  return null;
}
