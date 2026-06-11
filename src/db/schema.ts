import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";

// ---------- Better Auth tables ----------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------- Life OS: organization ----------

export const areas = pgTable("areas", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon").notNull().default("folder"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  areaId: text("area_id").references(() => areas.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#8b5cf6"),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#10b981"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Life OS: tasks ----------

export const tasks = pgTable("tasks", {
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
  dueDate: date("due_date"),
  dueTime: text("due_time"), // HH:mm, optional
  reminderAt: timestamp("reminder_at"),
  completedAt: timestamp("completed_at"),
  // recurrence: null | JSON {freq: daily|weekly|monthly, interval, byWeekday?: number[], byMonthDay?: number}
  recurrence: text("recurrence"),
  sortOrder: integer("sort_order").notNull().default(0),
  kanbanColumn: text("kanban_column"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- AI settings (keys server-side only, never sent to client) ----------

export const aiSettings = pgTable("ai_settings", {
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
});

// ---------- Finance (standalone module; amounts in integer paise) ----------

export const finAccounts = pgTable("fin_accounts", {
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
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const finCategories = pgTable("fin_categories", {
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

export const finTransactions = pgTable("fin_transactions", {
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
  date: date("date").notNull(),
  note: text("note").notNull().default(""),
  transferToAccountId: text("transfer_to_account_id"),
  subscriptionId: text("subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const finBudgets = pgTable("fin_budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => finCategories.id, { onDelete: "cascade" }),
  monthlyLimitMinor: integer("monthly_limit_minor").notNull(),
});

export const finSubscriptions = pgTable("fin_subscriptions", {
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
  nextDueDate: date("next_due_date").notNull(),
  active: boolean("active").notNull().default(true),
  autoLog: boolean("auto_log").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const finSavingsGoals = pgTable("fin_savings_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetMinor: integer("target_minor").notNull(),
  savedMinor: integer("saved_minor").notNull().default(0),
  deadline: date("deadline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const finLent = pgTable("fin_lent", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  person: text("person").notNull(),
  direction: text("direction", { enum: ["lent", "borrowed"] }).notNull(),
  amountMinor: integer("amount_minor").notNull(),
  date: date("date").notNull(),
  note: text("note").notNull().default(""),
  settled: boolean("settled").notNull().default(false),
  settledAt: timestamp("settled_at"),
});

export const finRules = pgTable("fin_rules", {
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

export const vaultMeta = pgTable("vault_meta", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // base64 PBKDF2 salt
  salt: text("salt").notNull(),
  // AES-GCM({iv, ct}) of a known constant, proves a candidate key is correct
  keyCheck: text("key_check").notNull(),
  iterations: integer("iterations").notNull().default(600000),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vaultItems = pgTable("vault_items", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // item kind is plaintext (low sensitivity) so the UI can tab-filter
  type: text("type", { enum: ["login", "apikey", "note", "pem"] }).notNull(),
  // JSON {iv, ct} — AES-256-GCM encrypted item payload
  data: text("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- Habits ----------

export const habits = pgTable("habits", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("✅"),
  color: text("color").notNull().default("#10b981"),
  // weekdays the habit applies to, 0=Sun..6=Sat; empty = every day
  weekdays: text("weekdays").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitChecks = pgTable(
  "habit_checks",
  {
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.date] })]
);

// ---------- Goals ----------

export const goals = pgTable("goals", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  targetDate: date("target_date"),
  // manual progress 0-100; if linked tasks exist, progress derives from them
  manualProgress: integer("manual_progress").notNull().default(0),
  status: text("status", { enum: ["active", "achieved", "dropped"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const goalTaskLinks = pgTable(
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

export const dashboardPrefs = pgTable("dashboard_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // JSON array of {key, enabled} in display order
  widgets: text("widgets").notNull().default("[]"),
});

// ---------- Events / countdowns ----------

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  date: date("date").notNull(),
  yearlyRecurring: boolean("yearly_recurring").notNull().default(false),
  color: text("color").notNull().default("#f59e0b"),
  icon: text("icon").notNull().default("🎉"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Notes ----------

export const notes = pgTable("notes", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  title: text("title").notNull().default("Untitled"),
  icon: text("icon").notNull().default("📄"),
  // BlockNote document JSON
  content: text("content").notNull().default("[]"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const noteTaskLinks = pgTable(
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

// ---------- Worklog (ported from worklog-daily) ----------

export const worklogSettings = pgTable("worklog_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  odooUrl: text("odoo_url").notNull().default(""),
  odooUsername: text("odoo_username").notNull().default(""),
  odooPassword: text("odoo_password").notNull().default(""),
  odooDatabase: text("odoo_database").notNull().default(""),
  emailRecipients: text("email_recipients").notNull().default(""),
  emailCc: text("email_cc").notNull().default(""),
  emailBcc: text("email_bcc").notNull().default(""),
  signatureName: text("signature_name").notNull().default(""),
  signatureDesignation: text("signature_designation").notNull().default(""),
  signatureDepartment: text("signature_department").notNull().default(""),
  signatureCompany: text("signature_company").notNull().default(""),
  signatureEmail: text("signature_email").notNull().default(""),
  signaturePhone: text("signature_phone").notNull().default(""),
  signatureWhatsapp: text("signature_whatsapp").notNull().default(""),
  descriptionStyle: text("description_style").notNull().default(""),
  weeklyFilterTo: text("weekly_filter_to").notNull().default(""),
  displayName: text("display_name").notNull().default(""),
  wordCountMode: text("word_count_mode").notNull().default("concise"),
  wordCountShort: integer("word_count_short").notNull().default(20),
  wordCountConcise: integer("word_count_concise").notNull().default(70),
  wordCountDetailed: integer("word_count_detailed").notNull().default(110),
  aiProvider: text("ai_provider").notNull().default("openrouter"),
  openrouterApiKey: text("openrouter_api_key").notNull().default(""),
  openrouterModel: text("openrouter_model").notNull().default(""),
  geminiApiKey: text("gemini_api_key").notNull().default(""),
  geminiModel: text("gemini_model").notNull().default(""),
  dailyColumns: text("daily_columns").notNull().default(""),
  weeklyColumns: text("weekly_columns").notNull().default(""),
  dailyCustomColumns: text("daily_custom_columns").notNull().default(""),
  dailyColumnWidths: text("daily_column_widths").notNull().default(""),
  weeklyColumnWidths: text("weekly_column_widths").notNull().default(""),
});

export const googleAuth = pgTable("google_auth", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull().default(""),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull().default(""),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const githubAuth = pgTable("github_auth", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token").notNull(),
  username: text("username").notNull(),
  name: text("name").notNull().default(""),
  emails: text("emails").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const repoMappings = pgTable("repo_mappings", {
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const worklogSubmissions = pgTable("worklog_submissions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  entries: text("entries").notNull(),
  emailSent: boolean("email_sent").notNull().default(false),
  odooSynced: boolean("odoo_synced").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taskTags = pgTable(
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
