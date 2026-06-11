import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { nextEventDate, daysUntil } from "@/lib/events";
import { EventList, CreateEventForm } from "./events-client";

export default async function EventsPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.userId, user.id))
    .orderBy(asc(events.date));

  const decorated = rows
    .map((e) => {
      const next = nextEventDate(e.date, e.yearlyRecurring);
      return { ...e, nextDate: next, days: daysUntil(next) };
    })
    .sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        <p className="text-sm text-muted-foreground">
          Countdowns to the days that matter
        </p>
      </header>
      <CreateEventForm />
      <EventList events={decorated} />
    </div>
  );
}
