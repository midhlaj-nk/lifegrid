import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, eq } from "drizzle-orm";

export const auth = betterAuth({
  plugins: [bearer()],
  trustedOrigins: [
    "https://lifegrid-omega.vercel.app",
    "app://lifeos",
    "http://localhost:3000",
    "http://10.0.2.2:3000",
  ],
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        // The first account always bootstraps (super admin). After that,
        // signups are closed unless the admin re-enables them in Settings.
        before: async (newUser) => {
          const [{ value }] = await db
            .select({ value: count() })
            .from(schema.user);
          if (value > 0) {
            const [cfg] = await db
              .select({ allow: schema.appConfig.allowSignups })
              .from(schema.appConfig)
              .where(eq(schema.appConfig.id, "singleton"));
            if (!cfg?.allow) {
              throw new APIError("FORBIDDEN", {
                message: "Registration is closed.",
              });
            }
          }
          return { data: newUser };
        },
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
  },
});

export type Session = typeof auth.$Infer.Session;
