import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

// Helpers ---------------------------------------------------------------
// timestamp columns stored as unix epoch seconds; drizzle converts Date <-> number
const ts = (name: string) => integer(name, { mode: "timestamp" });
const tsNow = (name: string) =>
  integer(name, { mode: "timestamp" }).default(sql`(unixepoch())`);
const bool = (name: string) => integer(name, { mode: "boolean" });

// ---------- App-wide config (singleton row id="singleton") ----------

export const appConfig = sqliteTable("app_config", {
  id: text("id").primaryKey().default("singleton"),
  // new account registration — off by default; only the super admin re-enables
  allowSignups: bool("allow_signups").notNull().default(false),
  updatedAt: tsNow("updated_at").notNull(),
});

// ---------- Better Auth tables ----------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: bool("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: tsNow("created_at"),
  updatedAt: tsNow("updated_at"),
});

// ---------- Life OS: organization ----------

export const areas = sqliteTable("areas", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("folder"),
  cover: text("cover").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: tsNow("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  areaId: text("area_id").references(() => areas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#8b5cf6"),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: bool("archived").notNull().default(false),
  // JSON [{key,label}] — custom kanban stages; empty = default todo/doing/done
  kanbanColumns: text("kanban_columns").notNull().default(""),
  cover: text("cover").notNull().default(""),
  createdAt: tsNow("created_at").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#10b981"),
  createdAt: tsNow("created_at").notNull(),
});

// ---------- Life OS: tasks ----------

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  areaId: text("area_id").references(() => areas.id, { onDelete: "set null" }),
  parentId: text("parent_id"),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["todo", "doing", "done"] })
    .notNull()
    .default("todo"),
  priority: integer("priority").notNull().default(4), // 1 highest .. 4 none
  dueDate: text("due_date"),
  dueTime: text("due_time"), // HH:mm, optional
  reminderAt: ts("reminder_at"),
  completedAt: ts("completed_at"),
  // recurrence: null | JSON {freq: daily|weekly|monthly, interval, byWeekday?: number[], byMonthDay?: number}
  recurrence: text("recurrence"),
  sortOrder: integer("sort_order").notNull().default(0),
  kanbanColumn: text("kanban_column"),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
});

// ---------- AI settings (keys server-side only, never sent to client) ----------

export const aiSettings = sqliteTable("ai_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  geminiApiKey: text("gemini_api_key").notNull().default(""),
  openrouterApiKey: text("openrouter_api_key").notNull().default(""),
  // model ids per feature tier
  chatModel: text("chat_model").notNull().default("gemini-2.5-flash"),
  fastModel: text("fast_model").notNull().default("gemini-2.5-flash-lite"),
  // "gemini" | "openrouter"
  chatProvider: text("chat_provider").notNull().default("gemini"),
  fastProvider: text("fast_provider").notNull().default("gemini"),
  unsplashAccessKey: text("unsplash_access_key").notNull().default(""),
});

// ---------- Finance (standalone module; amounts in integer paise) ----------

export const finAccounts = sqliteTable("fin_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["bank", "cash", "card", "upi"] })
    .notNull()
    .default("bank"),
  openingBalanceMinor: integer("opening_balance_minor").notNull().default(0),
  color: text("color").notNull().default("#6366f1"),
  archived: bool("archived").notNull().default(false),
  createdAt: tsNow("created_at").notNull(),
});

export const finCategories = sqliteTable("fin_categories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("💸"),
  kind: text("kind", { enum: ["expense", "income"] })
    .notNull()
    .default("expense"),
});

export const finTransactions = sqliteTable("fin_transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => finAccounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => finCategories.id, {
    onDelete: "set null",
  }),
  type: text("type", { enum: ["expense", "income", "transfer"] }).notNull(),
  // INR paise (converted via manual rate when foreign)
  amountMinor: integer("amount_minor").notNull(),
  originalAmount: text("original_amount"), // e.g. "25.00"
  originalCurrency: text("original_currency"), // e.g. "USD"
  date: text("date").notNull(),
  note: text("note").notNull().default(""),
  transferToAccountId: text("transfer_to_account_id"),
  subscriptionId: text("subscription_id"),
  createdAt: tsNow("created_at").notNull(),
});

export const finBudgets = sqliteTable("fin_budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => finCategories.id, { onDelete: "cascade" }),
  monthlyLimitMinor: integer("monthly_limit_minor").notNull(),
});

export const finSubscriptions = sqliteTable("fin_subscriptions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => finAccounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => finCategories.id, {
    onDelete: "set null",
  }),
  cadence: text("cadence", { enum: ["weekly", "monthly", "yearly"] })
    .notNull()
    .default("monthly"),
  nextDueDate: text("next_due_date").notNull(),
  active: bool("active").notNull().default(true),
  autoLog: bool("auto_log").notNull().default(true),
  createdAt: tsNow("created_at").notNull(),
});

export const finSavingsGoals = sqliteTable("fin_savings_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetMinor: integer("target_minor").notNull(),
  savedMinor: integer("saved_minor").notNull().default(0),
  deadline: text("deadline"),
  createdAt: tsNow("created_at").notNull(),
});

export const finLent = sqliteTable("fin_lent", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  person: text("person").notNull(),
  direction: text("direction", { enum: ["lent", "borrowed"] }).notNull(),
  amountMinor: integer("amount_minor").notNull(),
  date: text("date").notNull(),
  note: text("note").notNull().default(""),
  settled: bool("settled").notNull().default(false),
  settledAt: ts("settled_at"),
});

export const finRules = sqliteTable("fin_rules", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // case-insensitive substring matched against CSV description / note
  pattern: text("pattern").notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => finCategories.id, { onDelete: "cascade" }),
});

// ---------- Vault (ciphertext only — server never sees plaintext) ----------

export const vaultMeta = sqliteTable("vault_meta", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // base64 PBKDF2 salt
  salt: text("salt").notNull(),
  // AES-GCM({iv, ct}) of a known constant, proves a candidate key is correct
  keyCheck: text("key_check").notNull(),
  iterations: integer("iterations").notNull().default(600000),
  createdAt: tsNow("created_at").notNull(),
});

export const vaultItems = sqliteTable("vault_items", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // item kind is plaintext (low sensitivity) so the UI can tab-filter
  type: text("type", { enum: ["login", "apikey", "note", "pem"] }).notNull(),
  // JSON {iv, ct} — AES-256-GCM encrypted item payload
  data: text("data").notNull(),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
});

// ---------- Habits ----------

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("✅"),
  color: text("color").notNull().default("#10b981"),
  // weekdays the habit applies to, 0=Sun..6=Sat; empty = every day
  weekdays: text("weekdays").notNull().default("[]"),
  createdAt: tsNow("created_at").notNull(),
});

export const habitChecks = sqliteTable(
  "habit_checks",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.date] })]
);

// ---------- Goals ----------

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  targetDate: text("target_date"),
  // manual progress 0-100; if linked tasks exist, progress derives from them
  manualProgress: integer("manual_progress").notNull().default(0),
  status: text("status", { enum: ["active", "achieved", "dropped"] })
    .notNull()
    .default("active"),
  createdAt: tsNow("created_at").notNull(),
});

export const goalTaskLinks = sqliteTable(
  "goal_task_links",
  {
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.goalId, t.taskId] })]
);

// ---------- Dashboard preferences ----------

export const dashboardPrefs = sqliteTable("dashboard_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // JSON array of {key, enabled} in display order
  widgets: text("widgets").notNull().default("[]"),
});

// ---------- Events / countdowns ----------

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: text("date").notNull(),
  yearlyRecurring: bool("yearly_recurring").notNull().default(false),
  color: text("color").notNull().default("#f59e0b"),
  icon: text("icon").notNull().default("🎉"),
  note: text("note").notNull().default(""),
  createdAt: tsNow("created_at").notNull(),
});

// ---------- Spreadsheets ----------

export const sheets = sqliteTable("sheets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Untitled sheet"),
  // Univer IWorkbookData snapshot JSON
  data: text("data").notNull().default(""),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
});

// ---------- Notes ----------

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  title: text("title").notNull().default("Untitled"),
  icon: text("icon").notNull().default("📄"),
  // "gradient:<n>" preset or an uploaded image URL
  cover: text("cover").notNull().default(""),
  // BlockNote document JSON
  content: text("content").notNull().default("[]"),
  // Excalidraw scene JSON for canvas mode
  canvas: text("canvas").notNull().default(""),
  mode: text("mode", { enum: ["page", "canvas"] })
    .notNull()
    .default("page"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: tsNow("created_at").notNull(),
  updatedAt: tsNow("updated_at").notNull(),
});

export const noteTaskLinks = sqliteTable(
  "note_task_links",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.taskId] })]
);

export const githubAuth = sqliteTable("github_auth", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  username: text("username").notNull(),
  name: text("name").notNull().default(""),
  emails: text("emails").notNull().default(""),
  createdAt: tsNow("created_at").notNull(),
});

export const repoMappings = sqliteTable("repo_mappings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  repoFullName: text("repo_full_name").notNull(),
  projectId: integer("project_id").notNull(),
  projectName: text("project_name").notNull(),
  taskId: integer("task_id").notNull(),
  taskName: text("task_name").notNull(),
  count: integer("count").notNull().default(1),
  updatedAt: tsNow("updated_at").notNull(),
});

export const taskTags = sqliteTable(
  "task_tags",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tagId] })]
);
