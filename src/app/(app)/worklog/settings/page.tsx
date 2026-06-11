'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from '@/lib/worklog/use-session'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Plug2, Mail, Loader2, Sparkles, Bot, ExternalLink, Plus, Table2, RotateCcw, X as XIcon } from 'lucide-react'
import { GithubIcon } from '@/components/icons'
import { useGithubConnection } from '@/hooks/use-github-connection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { renderSignature, SIGNATURE_PLACEHOLDERS } from '@/lib/worklog/signature-template'
import {
  DAILY_COLUMN_META, WEEKLY_COLUMN_META,
  DAILY_COLUMNS_DEFAULT, WEEKLY_COLUMNS_DEFAULT,
  parseCustomColumns, serializeCustomColumns, newCustomColumnKey,
  parseColumnWidths, serializeColumnWidths,
  CUSTOM_DEFAULT_WIDTH, COLUMN_WIDTH_MIN, COLUMN_WIDTH_MAX,
  type WeeklyColumnKey, type CustomColumn,
} from '@/lib/worklog/template-columns'

interface Settings {
  displayName: string
  odooUrl: string
  odooDatabase: string
  odooUsername: string
  odooPassword: string
  emailRecipients: string
  emailCc: string
  emailBcc: string
  signatureName: string
  signatureDesignation: string
  signatureDepartment: string
  signatureCompany: string
  signatureEmail: string
  signaturePhone: string
  signatureWhatsapp: string
  descriptionStyle: string
  weeklyFilterTo: string
  wordCountMode: string
  wordCountShort: number
  wordCountConcise: number
  wordCountDetailed: number
  aiProvider: string
  openrouterApiKey: string
  openrouterModel: string
  geminiApiKey: string
  geminiModel: string
  dailyColumns: string
  weeklyColumns: string
  dailyCustomColumns: string
  dailyColumnWidths: string
  weeklyColumnWidths: string
}

const SIGNATURE_FIELD_CONFIG: { key: keyof Settings; label: string; placeholder: string }[] = [
  { key: 'signatureName', label: 'Name', placeholder: SIGNATURE_PLACEHOLDERS.name },
  { key: 'signatureDesignation', label: 'Designation', placeholder: SIGNATURE_PLACEHOLDERS.designation },
  { key: 'signatureDepartment', label: 'Department', placeholder: SIGNATURE_PLACEHOLDERS.department },
  { key: 'signatureCompany', label: 'Company', placeholder: SIGNATURE_PLACEHOLDERS.company },
  { key: 'signatureEmail', label: 'Email', placeholder: SIGNATURE_PLACEHOLDERS.email },
  { key: 'signaturePhone', label: 'Mobile', placeholder: SIGNATURE_PLACEHOLDERS.phone },
  { key: 'signatureWhatsapp', label: 'WhatsApp', placeholder: SIGNATURE_PLACEHOLDERS.whatsapp },
]

const defaults: Settings = {
  displayName: '',
  odooUrl: '',
  odooDatabase: '',
  odooUsername: '',
  odooPassword: '',
  emailRecipients: '',
  emailCc: '',
  emailBcc: '',
  signatureName: '',
  signatureDesignation: '',
  signatureDepartment: '',
  signatureCompany: '',
  signatureEmail: '',
  signaturePhone: '',
  signatureWhatsapp: '',
  descriptionStyle: '',
  weeklyFilterTo: '',
  wordCountMode: 'concise',
  wordCountShort: 20,
  wordCountConcise: 70,
  wordCountDetailed: 110,
  aiProvider: 'openrouter',
  openrouterApiKey: '',
  openrouterModel: '',
  geminiApiKey: '',
  geminiModel: '',
  dailyColumns: '',
  weeklyColumns: '',
  dailyCustomColumns: '',
  dailyColumnWidths: '',
  weeklyColumnWidths: '',
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingOdoo, setTestingOdoo] = useState(false)
  const [odooVerified, setOdooVerified] = useState(false)
  const [orModels, setOrModels] = useState<{ value: string; label: string }[]>([])
  const [geminiModels, setGeminiModels] = useState<{ value: string; label: string }[]>([])
  const [loadingOrModels, setLoadingOrModels] = useState(false)
  const [loadingGeminiModels, setLoadingGeminiModels] = useState(false)
  const [testPrompt, setTestPrompt] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testError, setTestError] = useState('')
  const [testingAi, setTestingAi] = useState(false)
  const { connected: githubConnected, username: githubUsername, disconnect: disconnectGithub } = useGithubConnection()
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  useEffect(() => {
    fetch('/api/google/status')
      .then((r) => r.json())
      .then((d) => {
        setGoogleConnected(!!d.connected)
        setGoogleEmail(d.email || null)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!session) return
    fetch('/api/settings')
      .then(async (r) => {
        if (!r.ok) return
        const data = await r.json()
        if (data && !data.error) {
          const merged = { ...defaults, ...data }
          for (const { key, placeholder } of SIGNATURE_FIELD_CONFIG) {
            if (!merged[key]) merged[key] = placeholder
          }
          setSettings(merged)
          setOdooVerified(!!data.odooUrl && !!data.odooUsername)
        }
      })
      .finally(() => setLoading(false))
  }, [session])

  const set = (key: keyof Settings, value: string | number) =>
    setSettings((prev) => ({ ...prev, [key]: value }))

  const signaturePreviewHtml = useMemo(() => renderSignature({
    name: settings.signatureName,
    designation: settings.signatureDesignation,
    department: settings.signatureDepartment,
    company: settings.signatureCompany,
    email: settings.signatureEmail,
    phone: settings.signaturePhone,
    whatsapp: settings.signatureWhatsapp,
  }), [
    settings.signatureName, settings.signatureDesignation, settings.signatureDepartment,
    settings.signatureCompany, settings.signatureEmail, settings.signaturePhone, settings.signatureWhatsapp,
  ])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || `Error ${res.status}`)
      } else {
        toast.success('Settings saved')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (settings.aiProvider !== 'openrouter' || orModels.length) return
    setLoadingOrModels(true)
    fetch('https://openrouter.ai/api/v1/models')
      .then((r) => r.json())
      .then((d) => {
        const items = (d.data || [])
          .filter((m: { id: string; architecture?: { modality?: string } }) =>
            !m.architecture?.modality || m.architecture.modality.includes('text')
          )
          .map((m: { id: string; name?: string }) => ({ value: m.id, label: m.name || m.id }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
        setOrModels(items)
      })
      .catch(() => {})
      .finally(() => setLoadingOrModels(false))
  }, [settings.aiProvider, orModels.length])

  useEffect(() => {
    const key = settings.geminiApiKey.trim()
    if (settings.aiProvider !== 'gemini' || !key) return
    setLoadingGeminiModels(true)
    fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      .then((r) => r.json())
      .then((d) => {
        const items = (d.models || [])
          .filter((m: { supportedGenerationMethods?: string[] }) =>
            m.supportedGenerationMethods?.includes('generateContent')
          )
          .map((m: { name: string; displayName?: string }) => ({
            value: m.name.replace('models/', ''),
            label: m.displayName || m.name.replace('models/', ''),
          }))
          .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
        setGeminiModels(items)
      })
      .catch(() => {})
      .finally(() => setLoadingGeminiModels(false))
  }, [settings.aiProvider, settings.geminiApiKey])

  const testAi = async () => {
    if (!testPrompt.trim()) return
    setTestingAi(true)
    setTestResponse('')
    setTestError('')
    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: testPrompt,
          aiProvider: settings.aiProvider,
          openrouterApiKey: settings.openrouterApiKey,
          openrouterModel: settings.openrouterModel,
          geminiApiKey: settings.geminiApiKey,
          geminiModel: settings.geminiModel,
        }),
      })
      const data = await res.json()
      if (!res.ok) setTestError(data.error || `Error ${res.status}`)
      else setTestResponse(data.response)
    } catch {
      setTestError('Network error')
    } finally {
      setTestingAi(false)
    }
  }

  const testOdoo = async () => {
    setTestingOdoo(true)
    try {
      const res = await fetch('/api/settings/test-odoo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: settings.odooUrl,
          database: settings.odooDatabase,
          username: settings.odooUsername,
          password: settings.odooPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Connected — User ID: ${data.uid}`)
        setOdooVerified(true)
      } else {
        toast.error(data.error || 'Connection failed')
        setOdooVerified(false)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setTestingOdoo(false)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    )
  }

  const saveButton = (label = 'Save') => (
    <Button onClick={save} disabled={saving}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Configuration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connections, recipients, signature, and AI behavior in one place.
        </p>
      </header>

      <Tabs defaultValue="connections" className="mt-8">
        <TabsList className="flex h-12 w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-lg bg-surface/60 p-1.5 text-muted-foreground [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <TabsTrigger value="connections" className="gap-2 shrink-0 px-4 py-2">
            <Plug2 className="h-4 w-4" /> Connections
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 shrink-0 px-4 py-2">
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 shrink-0 px-4 py-2">
            <Bot className="h-4 w-4" /> AI
          </TabsTrigger>
          <TabsTrigger value="style" className="gap-2 shrink-0 px-4 py-2">
            <Sparkles className="h-4 w-4" /> Style
          </TabsTrigger>
          <TabsTrigger value="template" className="gap-2 shrink-0 px-4 py-2">
            <Table2 className="h-4 w-4" /> Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="mt-6 space-y-6">
          <Card>
            <CardHeader
              title="Odoo connection"
              subtitle="Personal Odoo credentials. Used to push timesheet entries."
              status={<ConnStatus ok={odooVerified} okLabel="Verified" offLabel="Not verified" />}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Server URL">
                <Input value={settings.odooUrl} onChange={(e) => set('odooUrl', e.target.value)} placeholder="https://mycompany.odoo.com" />
              </Field>
              <Field label="Database">
                <Input value={settings.odooDatabase} onChange={(e) => set('odooDatabase', e.target.value)} placeholder="mycompany" />
              </Field>
              <Field label="Username (email)">
                <Input value={settings.odooUsername} onChange={(e) => set('odooUsername', e.target.value)} placeholder="you@company.com" />
              </Field>
              <Field label="Password / API key">
                <Input type="password" value={settings.odooPassword} onChange={(e) => set('odooPassword', e.target.value)} placeholder="••••••••" />
              </Field>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Test before saving.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={testOdoo} disabled={testingOdoo || !settings.odooUrl}>
                  {testingOdoo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test connection'}
                </Button>
                {saveButton()}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Gmail send access"
              subtitle="Reports send through your connected Gmail account. No SMTP setup needed."
              status={<ConnStatus ok={googleConnected} okLabel="Connected" offLabel="Not connected" />}
            />
            <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-surface/40 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {googleConnected ? googleEmail || 'Gmail connected' : 'Not connected'}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  scope: gmail.send · gmail.readonly
                </p>
              </div>
              {googleConnected ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={async () => {
                    await fetch('/api/google/status', { method: 'DELETE' })
                    setGoogleConnected(false)
                    setGoogleEmail(null)
                    toast.success('Gmail disconnected')
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href="/api/google/connect" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Connect Google
                  </a>
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Reconnect if Gmail send starts failing.
            </p>
          </Card>

          <Card>
            <CardHeader
              title="GitHub"
              subtitle="Pulls your daily commits to seed report drafts and AI descriptions."
              status={<ConnStatus ok={githubConnected} okLabel="Connected" offLabel="Not connected" />}
            />
            <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-surface/40 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <GithubIcon className="h-5 w-5 shrink-0 text-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {githubConnected ? githubUsername : 'Not linked'}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {githubConnected ? 'scope: repo · read:user' : 'Connect to enable repo suggestions'}
                  </p>
                </div>
              </div>
              {githubConnected ? (
                <Button variant="outline" size="sm" onClick={disconnectGithub} className="shrink-0">
                  Disconnect
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <a href="/api/github/connect" className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Connect
                  </a>
                </Button>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="mt-6 space-y-6">
          <Card>
            <CardHeader
              title="Compose"
              subtitle="Who receives your daily report and how your name appears."
            />
            <div className="mt-6 space-y-4">
              <Field label="Display name" hint="Used in email subject and as signature default. Defaults to your Google account name.">
                <Input value={settings.displayName} onChange={(e) => set('displayName', e.target.value)} placeholder={session?.user?.name || 'Your full name'} />
              </Field>
              <Field label="To">
                <Input value={settings.emailRecipients} onChange={(e) => set('emailRecipients', e.target.value)} placeholder="manager@company.com, team@company.com" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CC">
                  <Input value={settings.emailCc} onChange={(e) => set('emailCc', e.target.value)} placeholder="cc@company.com" />
                </Field>
                <Field label="BCC">
                  <Input value={settings.emailBcc} onChange={(e) => set('emailBcc', e.target.value)} placeholder="bcc@company.com" />
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end">{saveButton()}</div>
          </Card>

          <Card>
            <CardHeader
              title="Signature"
              subtitle="Shown at the bottom of every email. Leave fields empty for placeholder defaults."
            />
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SIGNATURE_FIELD_CONFIG.map(({ key, label, placeholder }) => (
                <Field key={key} label={label}>
                  <Input
                    value={settings[key] as string}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </Field>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-border bg-white px-4 py-2 overflow-x-auto">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Preview</p>
              <div dangerouslySetInnerHTML={{ __html: signaturePreviewHtml }} />
            </div>
            <div className="mt-4 flex justify-end">{saveButton()}</div>
          </Card>

          <Card>
            <CardHeader
              title="Weekly report scope"
              subtitle="Gmail filter address used by the /weekly page to collect past daily reports."
            />
            <div className="mt-5">
              <Field label="Fetch reports sent to" hint="Usually your manager's email — only emails to this address are scanned.">
                <Input
                  value={settings.weeklyFilterTo}
                  onChange={(e) => set('weeklyFilterTo', e.target.value)}
                  placeholder="manager@company.com"
                />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">{saveButton()}</div>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-6 space-y-6">
          <Card>
            <CardHeader
              title="AI provider"
              subtitle="Generates the description for each entry. Leave key/model blank to use server defaults."
            />
            <div className="mt-5 space-y-5">
              <Field label="Provider">
                <Select value={settings.aiProvider} onValueChange={(v) => set('aiProvider', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {settings.aiProvider === 'openrouter' && (
                <>
                  <Field
                    label="API key"
                    action={<ExternalLinkBadge href="https://openrouter.ai/keys" label="Get key" />}
                  >
                    <Input
                      type="password"
                      value={settings.openrouterApiKey}
                      onChange={(e) => set('openrouterApiKey', e.target.value)}
                      placeholder="sk-or-…"
                      autoComplete="off"
                    />
                  </Field>
                  <Field
                    label={`Model${loadingOrModels ? ' (loading…)' : ''}`}
                    hint={settings.openrouterApiKey ? 'Pick one or leave blank for server default.' : 'Leave blank to use server default.'}
                  >
                    <Combobox
                      items={[
                        { value: '', label: '— Server default —' },
                        ...orModels,
                        ...(settings.openrouterModel && !orModels.find((m) => m.value === settings.openrouterModel)
                          ? [{ value: settings.openrouterModel, label: settings.openrouterModel }]
                          : []),
                      ]}
                      value={settings.openrouterModel || ''}
                      onChange={(v) => set('openrouterModel', v)}
                      placeholder={loadingOrModels ? 'Loading models…' : '— Server default —'}
                      searchPlaceholder="Search models…"
                      disabled={loadingOrModels && !settings.openrouterModel}
                    />
                  </Field>
                </>
              )}

              {settings.aiProvider === 'gemini' && (
                <>
                  <Field
                    label="API key"
                    hint="Separate from your Google login."
                    action={<ExternalLinkBadge href="https://aistudio.google.com/apikey" label="Get key" />}
                  >
                    <Input
                      type="password"
                      value={settings.geminiApiKey}
                      onChange={(e) => set('geminiApiKey', e.target.value)}
                      placeholder="AIza…"
                      autoComplete="off"
                    />
                  </Field>
                  <Field
                    label={`Model${loadingGeminiModels ? ' (loading…)' : ''}`}
                    hint={settings.geminiApiKey ? 'Models loaded from your key.' : 'Enter API key above to load model list.'}
                  >
                    <Combobox
                      items={[
                        { value: '', label: '— Server default —' },
                        ...geminiModels,
                        ...(settings.geminiModel && !geminiModels.find((m) => m.value === settings.geminiModel)
                          ? [{ value: settings.geminiModel, label: settings.geminiModel }]
                          : []),
                      ]}
                      value={settings.geminiModel || ''}
                      onChange={(v) => set('geminiModel', v)}
                      placeholder={loadingGeminiModels ? 'Loading models…' : settings.geminiApiKey ? '— Server default —' : 'Enter API key to load models'}
                      searchPlaceholder="Search models…"
                      disabled={loadingGeminiModels}
                    />
                  </Field>
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">{saveButton()}</div>
          </Card>

          <Card>
            <CardHeader title="Test model" subtitle="Send a prompt to verify your provider, key, and model work." />
            <div className="mt-5 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && testAi()}
                  placeholder="Say something…"
                  className="flex-1"
                />
                <Button variant="outline" onClick={testAi} disabled={testingAi || !testPrompt.trim()} className="shrink-0">
                  {testingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run'}
                </Button>
              </div>
              {testResponse && (
                <p className="rounded-lg bg-surface/60 border border-border px-4 py-3 text-sm whitespace-pre-wrap">{testResponse}</p>
              )}
              {testError && (
                <p className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">{testError}</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="style" className="mt-6 space-y-6">
          <Card>
            <CardHeader
              title="Description length"
              subtitle="Default word target for generated descriptions. Customize each target below."
            />
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['short', 'concise', 'detailed', 'none'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => set('wordCountMode', mode)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      settings.wordCountMode === mode
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-surface/40 text-muted-foreground hover:border-accent/50'
                    }`}
                  >
                    <div className="capitalize">{mode}</div>
                    {mode !== 'none' && (
                      <div className="mt-0.5 text-xs opacity-70">
                        ~{mode === 'short' ? settings.wordCountShort : mode === 'concise' ? settings.wordCountConcise : settings.wordCountDetailed} words
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-surface/30 p-3 sm:grid-cols-3">
                <Field label="Short">
                  <Input type="number" min={5} max={100} value={settings.wordCountShort} onChange={(e) => set('wordCountShort', parseInt(e.target.value) || 20)} />
                </Field>
                <Field label="Concise">
                  <Input type="number" min={20} max={200} value={settings.wordCountConcise} onChange={(e) => set('wordCountConcise', parseInt(e.target.value) || 70)} />
                </Field>
                <Field label="Detailed">
                  <Input type="number" min={50} max={400} value={settings.wordCountDetailed} onChange={(e) => set('wordCountDetailed', parseInt(e.target.value) || 110)} />
                </Field>
              </div>
            </div>
            <div className="mt-4 flex justify-end">{saveButton()}</div>
          </Card>

          <Card>
            <CardHeader
              title="Writing style"
              subtitle="Paste an example description in your tone. AI matches rhythm, technical density, and sentence structure."
            />
            <div className="mt-5">
              <Textarea
                value={settings.descriptionStyle}
                onChange={(e) => set('descriptionStyle', e.target.value)}
                rows={12}
                placeholder="Paste a description you wrote that captures your style…"
                className="resize-y"
              />
            </div>
            <div className="mt-4 flex justify-end">{saveButton('Save style')}</div>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="mt-6">
          <TemplateCard settings={settings} set={set} saveButton={saveButton} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function parseColumns<T extends string>(raw: string, all: T[]): T[] {
  if (!raw) return [...all]
  const allowed = new Set<string>(all)
  const seen = new Set<string>()
  const picked: T[] = []
  for (const s of raw.split(',')) {
    const k = s.trim()
    if (allowed.has(k) && !seen.has(k)) {
      seen.add(k)
      picked.push(k as T)
    }
  }
  return picked.length ? picked : [...all]
}

function ColumnEditor<T extends string>({
  meta, all, value, onChange, widths, onWidthChange, onWidthsReset,
}: {
  meta: Record<T, { label: string; width: number }>
  all: T[]
  value: string
  onChange: (v: string) => void
  widths?: Record<string, number>
  onWidthChange?: (key: T, width: number) => void
  onWidthsReset?: () => void
}) {
  const selected = useMemo(() => parseColumns(value, all), [value, all])
  const selectedSet = useMemo(() => new Set(selected), [selected])

  const toggle = (key: T) => {
    const enabled = new Set(selectedSet)
    if (enabled.has(key)) {
      if (enabled.size <= 1) return
      enabled.delete(key)
    } else {
      enabled.add(key)
    }
    const visible = all.filter((k) => enabled.has(k))
    const serialized = visible.join(',')
    onChange(serialized === all.join(',') ? '' : serialized)
  }

  const reset = () => {
    onChange('')
    onWidthsReset?.()
  }

  return (
    <div className="mt-5 space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface/30">
        {all.map((key) => {
          const checked = selectedSet.has(key)
          const lastChecked = checked && selectedSet.size === 1
          return (
            <li key={key} className={`flex min-w-0 flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 ${checked ? '' : 'opacity-50'}`}>
              <label className={`flex min-w-0 flex-1 items-center gap-2.5 select-none ${lastChecked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={lastChecked}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 shrink-0 rounded border-border accent-accent disabled:cursor-not-allowed"
                />
                <span className="truncate text-sm font-medium">{meta[key].label}</span>
                <span className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{key}</span>
              </label>
              {onWidthChange && (
                <WidthInput
                  value={widths?.[key] ?? meta[key].width}
                  onChange={(w) => onWidthChange(key, w)}
                />
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {selected.length === all.length
            ? 'All columns shown (default).'
            : `${selected.length} of ${all.length} columns shown. At least one column must stay enabled.`}
        </p>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Reset to default
        </button>
      </div>

      <div className="rounded-lg border border-border bg-white px-3 py-3 overflow-x-auto">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Header preview</p>
        <table cellPadding={0} cellSpacing={0} className="border-collapse text-[10pt] font-[Arial,sans-serif]">
          <tbody>
            <tr>
              {selected.map((k) => (
                <td
                  key={k}
                  style={{
                    border: '1px solid #000',
                    padding: '2px 6px',
                    background: '#b7b7b7',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    minWidth: 60,
                  }}
                >
                  {meta[k].label}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TemplateCard({
  settings, set, saveButton,
}: {
  settings: Settings
  set: (key: keyof Settings, value: string | number) => void
  saveButton: (label?: string) => React.ReactElement
}) {
  const [tab, setTab] = useState<'daily' | 'weekly'>('daily')

  return (
    <Card>
      <CardHeader
        title="Report template"
        subtitle="Tick the columns you want, set widths in pixels, and add custom columns for the daily email."
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'daily' | 'weekly')} className="mt-5">
        <TabsList className="grid h-10 w-full max-w-xs grid-cols-2 rounded-lg bg-surface/60 p-1 text-muted-foreground">
          <TabsTrigger value="daily" className="rounded-md text-sm">Daily</TabsTrigger>
          <TabsTrigger value="weekly" className="rounded-md text-sm">Weekly</TabsTrigger>
        </TabsList>
        <TabsContent value="daily" className="mt-5">
          <DailyTemplateBody settings={settings} set={set} />
        </TabsContent>
        <TabsContent value="weekly" className="mt-5">
          <WeeklyTemplateBody settings={settings} set={set} />
          <p className="mt-3 text-[11px] text-muted-foreground">
            Weekly reports are reconstructed from sent daily emails, so custom columns aren&apos;t supported here.
          </p>
        </TabsContent>
      </Tabs>
      <div className="mt-6 flex justify-end">{saveButton()}</div>
    </Card>
  )
}

function DailyTemplateBody({
  settings, set,
}: {
  settings: Settings
  set: (key: keyof Settings, value: string | number) => void
}) {
  const customColumns = useMemo(
    () => parseCustomColumns(settings.dailyCustomColumns),
    [settings.dailyCustomColumns],
  )

  const widthOverrides = useMemo(
    () => parseColumnWidths(settings.dailyColumnWidths),
    [settings.dailyColumnWidths],
  )

  const mergedAll = useMemo<string[]>(
    () => [...DAILY_COLUMNS_DEFAULT, ...customColumns.map((c) => c.key)],
    [customColumns],
  )

  const mergedMeta = useMemo<Record<string, { label: string; width: number }>>(() => {
    const m: Record<string, { label: string; width: number }> = { ...DAILY_COLUMN_META }
    for (const c of customColumns) m[c.key] = { label: c.label, width: c.width ?? CUSTOM_DEFAULT_WIDTH }
    return m
  }, [customColumns])

  const handleCustomChange = (next: CustomColumn[]) => {
    set('dailyCustomColumns', serializeCustomColumns(next))
    if (settings.dailyColumns) {
      const allowed = new Set([...DAILY_COLUMNS_DEFAULT, ...next.map((c) => c.key)])
      const filtered = settings.dailyColumns
        .split(',')
        .map((s) => s.trim())
        .filter((k) => allowed.has(k))
      const serialized = filtered.join(',')
      const newAll = [...DAILY_COLUMNS_DEFAULT, ...next.map((c) => c.key)].join(',')
      set('dailyColumns', serialized === newAll ? '' : serialized)
    }
    // Drop width overrides for removed keys
    const allowedSet = new Set([...DAILY_COLUMNS_DEFAULT as readonly string[], ...next.map((c) => c.key)])
    const pruned: Record<string, number> = {}
    for (const [k, v] of Object.entries(widthOverrides)) {
      if (allowedSet.has(k)) pruned[k] = v
    }
    set('dailyColumnWidths', serializeColumnWidths(pruned))
  }

  const handleWidthChange = (key: string, width: number) => {
    const baseDefault = mergedMeta[key]?.width ?? CUSTOM_DEFAULT_WIDTH
    const next = { ...widthOverrides }
    if (width === baseDefault) delete next[key]
    else next[key] = width
    set('dailyColumnWidths', serializeColumnWidths(next))
  }

  return (
    <div className="space-y-6">
      <ColumnEditor<string>
        meta={mergedMeta}
        all={mergedAll}
        value={settings.dailyColumns}
        onChange={(v) => set('dailyColumns', v)}
        widths={widthOverrides}
        onWidthChange={handleWidthChange}
        onWidthsReset={() => set('dailyColumnWidths', '')}
      />

      <div className="border-t border-border pt-6">
        <CustomColumnsEditor value={customColumns} onChange={handleCustomChange} />
      </div>
    </div>
  )
}

function WeeklyTemplateBody({
  settings, set,
}: {
  settings: Settings
  set: (key: keyof Settings, value: string | number) => void
}) {
  const widthOverrides = useMemo(
    () => parseColumnWidths(settings.weeklyColumnWidths),
    [settings.weeklyColumnWidths],
  )

  const handleWidthChange = (key: WeeklyColumnKey, width: number) => {
    const baseDefault = WEEKLY_COLUMN_META[key].width
    const next = { ...widthOverrides }
    if (width === baseDefault) delete next[key]
    else next[key] = width
    set('weeklyColumnWidths', serializeColumnWidths(next))
  }

  return (
    <ColumnEditor<WeeklyColumnKey>
      meta={WEEKLY_COLUMN_META}
      all={WEEKLY_COLUMNS_DEFAULT}
      value={settings.weeklyColumns}
      onChange={(v) => set('weeklyColumns', v)}
      widths={widthOverrides}
      onWidthChange={handleWidthChange}
      onWidthsReset={() => set('weeklyColumnWidths', '')}
    />
  )
}

function CustomColumnsEditor({
  value, onChange,
}: {
  value: CustomColumn[]
  onChange: (next: CustomColumn[]) => void
}) {
  const addColumn = () => {
    const label = `Column ${value.length + 1}`
    onChange([...value, { key: newCustomColumnKey(), label, width: CUSTOM_DEFAULT_WIDTH }])
  }

  const updateColumn = (key: string, patch: Partial<CustomColumn>) => {
    onChange(value.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }

  const removeColumn = (key: string) => {
    onChange(value.filter((c) => c.key !== key))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Custom columns</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add your own columns. Values get filled per entry on the dashboard.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addColumn} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Add column
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/30 px-3 py-4 text-center text-xs text-muted-foreground">
          No custom columns yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {value.map((c) => (
            <li
              key={c.key}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface/30 px-3 py-2"
            >
              <Input
                value={c.label}
                onChange={(e) => updateColumn(c.key, { label: e.target.value })}
                placeholder="Column label"
                className="min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={() => removeColumn(c.key)}
                aria-label="Remove column"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WidthInput({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const [draft, setDraft] = useState<string>(String(value))
  useEffect(() => { setDraft(String(value)) }, [value])

  const commit = () => {
    const parsed = parseInt(draft, 10)
    if (!Number.isFinite(parsed) || parsed < COLUMN_WIDTH_MIN || parsed > COLUMN_WIDTH_MAX) {
      setDraft(String(value))
    } else if (parsed !== value) {
      onChange(parsed)
    }
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      min={COLUMN_WIDTH_MIN}
      max={COLUMN_WIDTH_MAX}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      placeholder="Width"
      aria-label="Column width in pixels"
      className="w-24 sm:w-20 font-mono [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface/40 p-6">{children}</div>
}

function CardHeader({ title, subtitle, status }: { title: string; subtitle?: string; status?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {status}
    </div>
  )
}

function Field({ label, hint, action, children }: { label: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        {action}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function ExternalLinkBadge({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-accent hover:underline">
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function ConnStatus({ ok, okLabel, offLabel }: { ok: boolean; okLabel: string; offLabel: string }) {
  return ok ? (
    <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent shrink-0">
      <CheckCircle2 className="h-3.5 w-3.5" /> {okLabel}
    </span>
  ) : (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground shrink-0">
      <XCircle className="h-3.5 w-3.5" /> {offLabel}
    </span>
  )
}
