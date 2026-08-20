import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  Check,
  Clipboard,
  Code2,
  Copy,
  Edit3,
  History,
  KeyRound,
  LogOut,
  Link2,
  Menu,
  Plus,
  Save,
  Shield,
  Trash2,
  UserCog,
  Users,
  MessageSquare,
  ExternalLink,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { dashboardAction, getAccountState, getDashboardData, refreshPresence } from "@/lib/babis.functions";
import { supabase } from "@/integrations/supabase/client";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      setSessionReady(true);
      if (!data.session) navigate({ to: "/auth" });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setSessionReady(true);
      if (!session) navigate({ to: "/auth" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  if (!sessionReady) return <LoadingShell />;
  if (!signedIn) return <LoadingShell />;
  return <Dashboard />;
}

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="app-panel w-full max-w-sm rounded-lg p-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Shield className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading Babis Premium…</p>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            <Shield className="size-4 text-primary" />
            Babis Premium
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Script access control for Roblox experiences.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Store Luau scripts, issue timed license keys, manage staff permissions, block abuse, and monitor live launches from a responsive dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth" search={{ mode: "signup" } as never}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
        <div className="app-panel rounded-lg p-4 sm:p-6">
          <div className="grid gap-3">
            {[
              ["Scripts", "Save, edit, and rotate loader URLs."],
              ["Licenses", "Generate permanent or timed keys."],
              ["Players", "View live sessions, kicks, bans, and history."],
              ["Staff", "Owner-managed permissions for team accounts."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-md border border-border bg-muted p-4">
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type ScriptRow = Record<string, any>;
type LicenseRow = Record<string, any>;
type SessionRow = Record<string, any>;

const emptyScript = {
  id: null as string | null,
  name: "",
  description: "",
  sourceCode: "",
  requireLicense: true,
  isActive: true,
};

function Dashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const getAccount = useServerFn(getAccountState);
  const getDashboard = useServerFn(getDashboardData);
  const runDashboardAction = useServerFn(dashboardAction);
  const refreshPresenceFn = useServerFn(refreshPresence);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScriptId, setActiveScriptId] = useState<string>("");
  const [scriptForm, setScriptForm] = useState(emptyScript);
  const [licenseMinutes, setLicenseMinutes] = useState("0");
  const [licenseLabel, setLicenseLabel] = useState("");
  const [licenseSeats, setLicenseSeats] = useState("1");
  const [banReason, setBanReason] = useState("Access revoked by Babis staff.");
  const [banForm, setBanForm] = useState({
    playerName: "",
    scope: "global" as "global" | "script",
    scriptId: "",
    duration: "0",
    includeIp: false,
    reason: "Access revoked by Babis staff.",
  });
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [playerSearch, setPlayerSearch] = useState("");
  const [presenceFilter, setPresenceFilter] = useState<"all" | "ingame" | "online" | "offline" | "watchlist">("all");
  const [discordLink, setDiscordLink] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffPermissions, setStaffPermissions] = useState({
    canManageScripts: true,
    canManageLicenses: true,
    canManageBans: false,
    canManageUsers: false,
    canViewLogs: true,
  });

  const account = useQuery({ queryKey: ["account"], queryFn: () => getAccount() });
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    retry: false,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // Poll Roblox presence every 20s so known players show up as live
  // even when they haven't re-executed the script.
  useEffect(() => {
    let cancelled = false;
    const tick = () => refreshPresenceFn().catch(() => {}).finally(() => {
      if (!cancelled) queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    });
    tick();
    const id = setInterval(tick, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshPresenceFn, queryClient]);
  const data = dashboard.data as any;
  const scripts: ScriptRow[] = data?.scripts ?? [];
  const licenses: LicenseRow[] = data?.licenses ?? [];
  const sessions: SessionRow[] = data?.sessions ?? [];
  const history: any[] = data?.history ?? [];
  const selectedScript = scripts.find((script) => script.id === activeScriptId) ?? scripts[0];
  const selectedScriptId = selectedScript?.id ?? "";
  const loader = selectedScript ? `loadstring(game:HttpGet("${window.location.origin}/api/public/loader/${selectedScript.public_id}", true))()` : "";
  const scriptLicenses = licenses.filter((license) => license.script_id === selectedScriptId);
  // Live = active AND heartbeat within 45s
  const now = Date.now();
  const isLive = (session: SessionRow) =>
    session.status === "active" && now - new Date(session.last_seen_at).getTime() < 45_000;
  const scriptSessions = sessions.filter((session) => session.script_id === selectedScriptId);
  const liveSessions = sessions.filter(isLive);
  const scriptNameById = (id: string) => scripts.find((s) => s.id === id)?.name ?? "—";

  useEffect(() => {
    if (!activeScriptId && scripts[0]) setActiveScriptId(scripts[0].id);
  }, [activeScriptId, scripts]);

  const action = useMutation({
    mutationFn: (payload: { type: string; payload?: Record<string, unknown> }) =>
      runDashboardAction({ data: { type: payload.type, payload: payload.payload ?? {} } }),
    onSuccess: (_result, variables) => {
      toast.success("Action completed", { description: variables.type });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error("Action failed", { description: error.message }),
  });

  useEffect(() => {
    if (data?.discordInviteUrl) setDiscordLink((current) => current || String(data.discordInviteUrl));
  }, [data?.discordInviteUrl]);

  const can = useMemo(() => {
    const roles = data?.roles ?? [];
    const permission = data?.permissions ?? {};
    const owner = roles.includes("owner");
    return {
      scripts: owner || permission.can_manage_scripts,
      licenses: owner || permission.can_manage_licenses,
      bans: owner || permission.can_manage_bans,
      users: owner || permission.can_manage_users,
      owner,
      logs: owner || permission.can_view_logs,
    };
  }, [data]);

  async function copyText(label: string, value: string) {
    if (!value) return toast.error("Nothing to copy");
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      toast.success(`${label} copied`);
    }
  }

  function editScript(script: ScriptRow) {
    setScriptForm({
      id: script.id,
      name: script.name ?? "",
      description: script.description ?? "",
      sourceCode: script.source_code ?? "",
      requireLicense: Boolean(script.require_license),
      isActive: Boolean(script.is_active),
    });
    setActiveScriptId(script.id);
    setMenuOpen(false);
  }

  async function signOut() {
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (account.isLoading || dashboard.isLoading) return <LoadingShell />;
  if (dashboard.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="app-panel max-w-md rounded-lg p-6 text-center">
          <Shield className="mx-auto mb-4 size-10 text-primary" />
          <h1 className="text-xl font-semibold">Dashboard access is not ready</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ask the owner to grant your account staff permissions.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="dashboard-grid min-h-screen">
        <aside className={`${menuOpen ? "fixed" : "hidden"} inset-0 z-40 bg-sidebar p-4 md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto md:border-r md:border-sidebar-border`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-sidebar-foreground">Babis</div>
              <div className="text-xs text-muted-foreground">Premium control panel</div>
            </div>
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(false)}><X /></Button>
          </div>
          <Button className="mb-4 w-full" onClick={() => { setScriptForm(emptyScript); setMenuOpen(false); }}>
            <Plus /> New script
          </Button>
          <div className="space-y-2">
            {scripts.map((script) => (
              <div key={script.id} className={`flex items-stretch gap-2 rounded-md border transition ${selectedScriptId === script.id ? "border-primary bg-primary text-primary-foreground" : "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground hover:border-primary"}`}>
                <button onClick={() => editScript(script)} className="flex-1 min-w-0 p-3 text-left">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Code2 className="size-4" />{script.name}</div>
                  <div className="mt-1 text-xs opacity-80">{script.require_license ? "License required" : "Open loader"}</div>
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!can.scripts) return toast.error("Missing script permission");
                    if (!confirm(`Delete script "${script.name}"? This cannot be undone.`)) return;
                    action.mutate({ type: "deleteScript", payload: { id: script.id } });
                  }}
                  className="px-3 opacity-70 hover:opacity-100"
                  title="Delete script"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="icon" className="md:hidden" onClick={() => setMenuOpen(true)}><Menu /></Button>
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">Script Manager</h1>
                <p className="text-sm text-muted-foreground">Signed in as {data?.profile?.username ?? "staff"}</p>
              </div>
            </div>
            <Button variant="outline" onClick={signOut}><LogOut /> Sign out</Button>
          </header>

          <Tabs defaultValue="scripts" className="min-w-0">
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1">
              <TabsTrigger value="scripts"><Plus className="mr-2 size-4" />Add</TabsTrigger>
              <TabsTrigger value="licenses"><KeyRound className="mr-2 size-4" />License</TabsTrigger>
              <TabsTrigger value="players"><Users className="mr-2 size-4" />Live</TabsTrigger>
              <TabsTrigger value="history"><Ban className="mr-2 size-4" />Ban</TabsTrigger>
              <TabsTrigger value="staff"><UserCog className="mr-2 size-4" />Staff</TabsTrigger>
              <TabsTrigger value="settings"><Link2 className="mr-2 size-4" />Discord link</TabsTrigger>
            </TabsList>

            <TabsContent value="scripts" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">Source editor</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => selectedScript && editScript(selectedScript)} disabled={!selectedScript}><Edit3 /> Load selected</Button>
                    <Button onClick={() => action.mutate({ type: "saveScript", payload: scriptForm })} disabled={!can.scripts || action.isPending}>
                      <Save /> Save
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">Script name<Input value={scriptForm.name} onChange={(event) => setScriptForm({ ...scriptForm, name: event.target.value })} /></label>
                  <label className="grid gap-1 text-sm">Description<Input value={scriptForm.description} onChange={(event) => setScriptForm({ ...scriptForm, description: event.target.value })} /></label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-md border border-border bg-muted p-3 text-sm">Require license<Switch checked={scriptForm.requireLicense} onCheckedChange={(value) => setScriptForm({ ...scriptForm, requireLicense: value })} /></label>
                  <label className="flex items-center justify-between rounded-md border border-border bg-muted p-3 text-sm">Active<Switch checked={scriptForm.isActive} onCheckedChange={(value) => setScriptForm({ ...scriptForm, isActive: value })} /></label>
                </div>
                <Textarea className="mt-3 min-h-[430px] resize-y text-sm" spellCheck={false} value={scriptForm.sourceCode} onChange={(event) => setScriptForm({ ...scriptForm, sourceCode: event.target.value })} placeholder="Paste authorized Luau source here" />
              </div>
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Final loader</h2>
                <p className="mt-1 text-sm text-muted-foreground">Copy status appears after every button action.</p>
                <div className="mono-box mt-4 rounded-md border border-border bg-muted p-3 font-mono text-xs text-muted-foreground">{loader || "Save a script first."}</div>
                <Button className="mt-3 w-full" onClick={() => copyText("Loader", loader)} disabled={!loader}><Copy /> Copy loadstring</Button>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Metric label="Licenses" value={scriptLicenses.length} />
                  <Metric label="Live" value={scriptSessions.filter((s) => s.status === "active").length} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="licenses" className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Create license</h2>
                <label className="mt-4 grid gap-1 text-sm">Script<Select value={selectedScriptId} onValueChange={setActiveScriptId}><SelectTrigger><SelectValue placeholder="Choose script" /></SelectTrigger><SelectContent>{scripts.map((script) => <SelectItem key={script.id} value={script.id}>{script.name}</SelectItem>)}</SelectContent></Select></label>
                <label className="mt-3 grid gap-1 text-sm">Label<Input value={licenseLabel} onChange={(event) => setLicenseLabel(event.target.value)} placeholder="Customer or note" /></label>
                <label className="mt-3 grid gap-1 text-sm">Duration<Select value={licenseMinutes} onValueChange={setLicenseMinutes}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Permanent</SelectItem><SelectItem value="15">15 minutes</SelectItem><SelectItem value="60">1 hour</SelectItem><SelectItem value="1440">1 day</SelectItem><SelectItem value="10080">7 days</SelectItem><SelectItem value="43200">30 days</SelectItem></SelectContent></Select></label>
                <label className="mt-3 grid gap-1 text-sm">Users allowed<Select value={licenseSeats} onValueChange={setLicenseSeats}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 user (personal key)</SelectItem><SelectItem value="2">2 users</SelectItem><SelectItem value="3">3 users</SelectItem><SelectItem value="5">5 users</SelectItem><SelectItem value="10">10 users</SelectItem><SelectItem value="25">25 users</SelectItem><SelectItem value="100">100 users</SelectItem><SelectItem value="0">Unlimited users</SelectItem></SelectContent></Select></label>
                <p className="mt-2 text-xs text-muted-foreground">Each different player counts as one slot. Unlimited keys work like a public premium key.</p>
                <Button className="mt-4 w-full" disabled={!selectedScriptId || !can.licenses} onClick={() => action.mutate({ type: "createLicense", payload: { scriptId: selectedScriptId, label: licenseLabel, durationMinutes: licenseMinutes === "0" ? null : Number(licenseMinutes), maxUsers: Number(licenseSeats) } })}><KeyRound /> Generate key</Button>
              </div>
              <div className="app-panel overflow-hidden rounded-lg">
                <ResponsiveRows rows={scriptLicenses} empty="No licenses yet." render={(license) => (
                  <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_7rem_13rem] lg:items-center">
                    <div className="min-w-0"><div className="mono-box font-mono text-sm">{license.license_key}</div><div className="mt-1 text-xs text-muted-foreground">{license.label || "Untitled"} · {license.bound_player_name || "unused"}</div></div>
                    <div className="text-sm text-muted-foreground"><div className="capitalize">{license.status}</div><div className="text-xs">{license.seat_count ?? 0}/{license.max_users ? license.max_users : "∞"} users</div></div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-muted-foreground">{formatTimeLeft(license.expires_at)}</div>
                      <div className="flex flex-wrap gap-2 lg:justify-end"><Button size="sm" variant="outline" onClick={() => copyText("License key", license.license_key)}><Copy />Copy</Button><Button size="sm" variant="outline" disabled={!can.licenses} onClick={() => { const value = prompt("Maximum users for this key (0 = unlimited)", String(license.max_users ?? 0)); if (value === null) return; const parsedValue = Number(value); if (!Number.isFinite(parsedValue) || parsedValue < 0) return; action.mutate({ type: "setLicenseLimit", payload: { id: license.id, maxUsers: Math.floor(parsedValue) } }); }}>Limit</Button><Button size="sm" variant="outline" disabled={!can.licenses} onClick={() => { if (!confirm("Free every user slot on this key?")) return; action.mutate({ type: "resetLicenseSeats", payload: { id: license.id } }); }}>Reset users</Button><Button size="sm" variant="outline" onClick={() => action.mutate({ type: "setLicenseStatus", payload: { id: license.id, status: license.status === "active" ? "revoked" : "active", reason: "Changed from dashboard" } })}>{license.status === "active" ? "Revoke" : "Restore"}</Button><Button size="sm" variant="destructive" onClick={() => { if (!confirm("Delete this license key?")) return; action.mutate({ type: "deleteLicense", payload: { id: license.id } }); }}><Trash2 />Delete</Button></div>
                    </div>
                  </div>
                )} />
              </div>
            </TabsContent>

            <TabsContent value="players" className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="app-panel overflow-hidden rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                  <h2 className="text-lg font-semibold">Live players ({liveSessions.length})</h2>
                  <div className="text-xs text-muted-foreground">Auto-refresh every 10s · stale after 45s</div>
                </div>
                <ResponsiveRows rows={liveSessions} empty="No live players right now." render={(session) => {
                  const draft = messageDrafts[session.id] ?? "";
                  const joinUrl = session.place_id && session.job_id
                    ? `roblox://experiences/start?placeId=${session.place_id}&gameInstanceId=${session.job_id}`
                    : "";
                  return (
                    <div className="grid gap-3 p-4">
                      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                        <div>
                          <div className="font-semibold">{session.player_name || "Unknown"} <span className="ml-2 text-xs font-normal text-muted-foreground">[{scriptNameById(session.script_id)}]</span></div>
                          <div className="text-xs text-muted-foreground">
                            UserId {session.player_user_id || "n/a"} · {session.executor_name || "runtime"} · {Math.round((session.total_seconds ?? 0) / 60)} min
                          </div>
                          <div className="text-xs text-muted-foreground">Place {session.place_id || "?"} · Job {session.job_id || "?"}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {joinUrl && (
                            <Button size="sm" variant="outline" asChild><a href={joinUrl}><ExternalLink className="size-4" />Join server</a></Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => action.mutate({ type: "kickSession", payload: { id: session.id, reason: banReason } })}>Kick</Button>
                          <Button size="sm" variant="destructive" onClick={() => action.mutate({ type: "addBan", payload: { scope: "script", scriptId: session.script_id, playerUserId: session.player_user_id, playerName: session.player_name || "unknown", licenseId: session.license_id, includeIp: false, reason: banReason } })}><Ban className="size-4" />Ban</Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Message to player…" value={draft} onChange={(e) => setMessageDrafts({ ...messageDrafts, [session.id]: e.target.value })} />
                        <Button size="sm" variant="outline" disabled={!draft.trim()} onClick={() => { action.mutate({ type: "sendMessage", payload: { id: session.id, message: draft.trim() } }); setMessageDrafts({ ...messageDrafts, [session.id]: "" }); }}><MessageSquare className="size-4" />Send</Button>
                      </div>
                      {session.pending_message && <div className="text-xs text-muted-foreground">Pending: {session.pending_message}</div>}
                    </div>
                  );
                }} />
              </div>
              <div className="app-panel overflow-hidden rounded-lg xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
                  <h2 className="text-lg font-semibold">All known players ({history.length})</h2>
                  <div className="text-xs text-muted-foreground">Control any player who ran the script once · presence refreshed every 20s</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
                  <Input className="max-w-xs" placeholder="Search name, UserId, executor…" value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} />
                  <Select value={presenceFilter} onValueChange={(v) => setPresenceFilter(v as typeof presenceFilter)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All players</SelectItem>
                      <SelectItem value="ingame">In game</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="watchlist">Watchlist</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ResponsiveRows
                  rows={history.filter((h: any) => {
                    const q = playerSearch.trim().toLowerCase();
                    if (q && !`${h.player_name ?? ""} ${h.player_user_id ?? ""} ${h.executor_name ?? ""}`.toLowerCase().includes(q)) return false;
                    if (presenceFilter === "ingame") return h.presence_type === 2;
                    if (presenceFilter === "online") return h.presence_type === 1;
                    if (presenceFilter === "offline") return !h.presence_type || h.presence_type === 0;
                    if (presenceFilter === "watchlist") return Boolean(h.is_watchlisted);
                    return true;
                  })}
                  empty="No players match your filter."
                  render={(row: any) => {
                    const draft = messageDrafts[`hist:${row.id}`] ?? "";
                    const noteDraft = noteDrafts[`hist:${row.id}`] ?? row.notes ?? "";
                    const joinUrl = row.place_id && row.job_id
                      ? `roblox://experiences/start?placeId=${row.place_id}&gameInstanceId=${row.job_id}`
                      : "";
                    const presenceLabel = row.presence_type === 2 ? "In game" : row.presence_type === 1 ? "Online" : row.presence_type === 3 ? "In Studio" : "Offline";
                    const presenceTone = row.presence_type === 2 ? "bg-primary text-primary-foreground" : row.presence_type === 1 ? "bg-muted text-foreground" : "bg-muted text-muted-foreground";
                    return (
                      <div className={`grid gap-3 p-4 ${row.is_watchlisted ? "border-l-4 border-destructive" : ""}`}>
                        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{row.player_name || "Unknown"}</span>
                              <span className={`rounded px-2 py-0.5 text-xs ${presenceTone}`}>{presenceLabel}</span>
                              {row.is_watchlisted && <span className="rounded bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">Watchlist</span>}
                              <span className="text-xs text-muted-foreground">UserId {row.player_user_id || "n/a"}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{row.presence_last_location || "—"} · executor {row.executor_name || "unknown"} · {row.connection_count} launches</div>
                            <div className="text-xs text-muted-foreground">Place {row.place_id || "?"} · Job {row.job_id || "?"} · last seen {new Date(row.last_seen_at).toLocaleString()}</div>
                            {(row.pending_message || row.pending_kick_reason) && (
                              <div className="mt-1 flex items-center gap-2 text-xs text-primary">
                                Queued: {row.pending_kick_reason ? `kick (${row.pending_kick_reason})` : `message (${row.pending_message})`}
                                <button className="underline" onClick={() => action.mutate({ type: "clearQueuedActions", payload: { id: row.id } })}>clear</button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {joinUrl && (
                              <Button size="sm" variant="outline" asChild><a href={joinUrl}><ExternalLink className="size-4" />Join</a></Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => action.mutate({ type: "updateHistory", payload: { id: row.id, isWatchlisted: !row.is_watchlisted } })}>{row.is_watchlisted ? "Unflag" : "Watchlist"}</Button>
                            <Button size="sm" variant="outline" onClick={() => action.mutate({ type: "queueHistoryAction", payload: { historyId: row.id, kickReason: banReason } })}>Kick</Button>
                            <Button size="sm" variant="destructive" onClick={() => action.mutate({ type: "addBan", payload: { scope: "global", playerUserId: row.player_user_id, playerName: row.player_name || "unknown", includeIp: false, reason: banReason } })}><Ban className="size-4" />Ban</Button>
                            <Button size="sm" variant="destructive" onClick={() => action.mutate({ type: "addBan", payload: { scope: "global", playerUserId: row.player_user_id, playerName: row.player_name || "unknown", includeIp: true, ipHash: row.ip_hash, reason: banReason } })}><Ban className="size-4" />Ban + IP</Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Input className="flex-1 min-w-[12rem]" placeholder={row.presence_type === 2 ? "Message (delivers now if in a session, else on next launch)" : "Queue message for next launch…"} value={draft} onChange={(e) => setMessageDrafts({ ...messageDrafts, [`hist:${row.id}`]: e.target.value })} />
                          <Button size="sm" variant="outline" disabled={!draft.trim()} onClick={() => { action.mutate({ type: "queueHistoryAction", payload: { historyId: row.id, message: draft.trim() } }); setMessageDrafts({ ...messageDrafts, [`hist:${row.id}`]: "" }); }}><MessageSquare className="size-4" />Send</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Input className="flex-1 min-w-[12rem]" placeholder="Moderation notes (only staff sees this)…" value={noteDraft} onChange={(e) => setNoteDrafts({ ...noteDrafts, [`hist:${row.id}`]: e.target.value })} />
                          <Button size="sm" variant="outline" disabled={noteDraft === (row.notes ?? "")} onClick={() => action.mutate({ type: "updateHistory", payload: { id: row.id, notes: noteDraft } })}>Save note</Button>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Default kick reason</h2>
                <Textarea className="mt-3 min-h-24" value={banReason} onChange={(event) => setBanReason(event.target.value)} />
                <p className="mt-2 text-xs text-muted-foreground">Used when kicking or quick-banning live players.</p>
              </div>
            </TabsContent>

            <TabsContent value="history" className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Ban a player</h2>
                <p className="mt-1 text-xs text-muted-foreground">Ban directly by Roblox username.</p>
                <label className="mt-4 grid gap-1 text-sm">Roblox username<Input value={banForm.playerName} onChange={(e) => setBanForm({ ...banForm, playerName: e.target.value })} placeholder="e.g. Builderman" /></label>
                <label className="mt-3 grid gap-1 text-sm">Scope
                  <Select value={banForm.scope} onValueChange={(v) => setBanForm({ ...banForm, scope: v as "global" | "script" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">All scripts</SelectItem>
                      <SelectItem value="script">Specific script</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {banForm.scope === "script" && (
                  <label className="mt-3 grid gap-1 text-sm">Script
                    <Select value={banForm.scriptId} onValueChange={(v) => setBanForm({ ...banForm, scriptId: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent>{scripts.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </label>
                )}
                <label className="mt-3 grid gap-1 text-sm">Duration
                  <Select value={banForm.duration} onValueChange={(v) => setBanForm({ ...banForm, duration: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Permanent</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="1440">1 day</SelectItem>
                      <SelectItem value="10080">7 days</SelectItem>
                      <SelectItem value="43200">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="mt-3 flex items-center justify-between rounded-md border border-border bg-muted p-3 text-sm">Include IP ban<Switch checked={banForm.includeIp} onCheckedChange={(v) => setBanForm({ ...banForm, includeIp: v })} /></label>
                <label className="mt-3 grid gap-1 text-sm">Reason<Textarea value={banForm.reason} onChange={(e) => setBanForm({ ...banForm, reason: e.target.value })} className="min-h-20" /></label>
                <Button
                  className="mt-4 w-full"
                  disabled={!can.bans || !banForm.playerName.trim() || (banForm.scope === "script" && !banForm.scriptId)}
                  onClick={() => {
                    // find matching history row for ip_hash if includeIp
                    const hist = history.find((h: any) => h.player_name?.toLowerCase() === banForm.playerName.trim().toLowerCase());
                    action.mutate({
                      type: "addBan",
                      payload: {
                        scope: banForm.scope,
                        scriptId: banForm.scope === "script" ? banForm.scriptId : null,
                        playerName: banForm.playerName.trim(),
                        playerUserId: hist?.player_user_id || "",
                        includeIp: banForm.includeIp,
                        ipHash: hist?.ip_hash || null,
                        durationMinutes: banForm.duration === "0" ? null : Number(banForm.duration),
                        reason: banForm.reason,
                      },
                    });
                  }}
                ><Ban className="size-4" />Ban player</Button>
              </div>
              <div className="grid gap-4">
                <div className="app-panel overflow-hidden rounded-lg">
                  <div className="border-b border-border p-4"><h2 className="text-lg font-semibold">Active bans ({(data?.bans ?? []).filter((b: any) => b.is_active).length})</h2></div>
                  <ResponsiveRows rows={data?.bans ?? []} empty="No bans." render={(ban: any) => (
                    <div className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <div className="font-medium">{ban.player_name || ban.player_user_id || "License/IP ban"} <span className="ml-2 text-xs text-muted-foreground">{ban.scope === "global" ? "all scripts" : scriptNameById(ban.script_id)}</span></div>
                        <div className="text-xs text-muted-foreground">{ban.reason} {ban.ip_hash ? "· IP" : ""} {ban.expires_at ? `· until ${new Date(ban.expires_at).toLocaleString()}` : "· permanent"}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => action.mutate({ type: "setBanActive", payload: { id: ban.id, isActive: !ban.is_active } })}>{ban.is_active ? "Disable" : "Enable"}</Button>
                    </div>
                  )} />
                </div>
                <div className="app-panel overflow-hidden rounded-lg">
                  <div className="border-b border-border p-4"><h2 className="text-lg font-semibold">Historical players ({history.length})</h2></div>
                  <ResponsiveRows rows={history} empty="No player history yet." render={(row: any) => (
                    <div className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <div className="font-medium">{row.player_name || "Unknown"} <span className="ml-2 text-xs text-muted-foreground">UserId {row.player_user_id || "n/a"}</span></div>
                        <div className="text-xs text-muted-foreground">{row.executor_name || "runtime"} · {row.connection_count} launches · last {new Date(row.last_seen_at).toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">IP {row.ip_hash ? row.ip_hash.slice(0, 12) + "…" : "n/a"}</div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setBanForm({ ...banForm, playerName: row.player_name || "", scope: "global" })}><Ban className="size-4" />Prep ban</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (!confirm("Remove this history entry?")) return; action.mutate({ type: "deleteHistory", payload: { id: row.id } }); }}><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  )} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="staff" className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Create staff account</h2>
                <p className="mt-1 text-xs text-muted-foreground">Owner creates the account directly — no signup needed.</p>
                <label className="mt-4 grid gap-1 text-sm">Username<Input value={staffUsername} onChange={(event) => setStaffUsername(event.target.value)} placeholder="e.g. staff_alex" /></label>
                <label className="mt-3 grid gap-1 text-sm">Password<Input type="password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} placeholder="Min. 6 characters" /></label>
                <div className="mt-4 grid gap-2">{Object.entries(staffPermissions).map(([key, value]) => <label key={key} className="flex items-center justify-between rounded-md border border-border bg-muted p-3 text-sm"><span>{key.replace(/([A-Z])/g, " $1")}</span><Switch checked={value} onCheckedChange={(checked) => setStaffPermissions({ ...staffPermissions, [key]: checked })} /></label>)}</div>
                <Button
                  className="mt-4 w-full"
                  disabled={!can.users || staffUsername.length < 3 || staffPassword.length < 6}
                  onClick={() => {
                    action.mutate(
                      { type: "createStaffAccount", payload: { username: staffUsername, password: staffPassword, ...staffPermissions } },
                      { onSuccess: () => { setStaffUsername(""); setStaffPassword(""); } },
                    );
                  }}
                ><UserCog /> Create account</Button>
                <Button
                  className="mt-2 w-full"
                  variant="outline"
                  disabled={!can.users || staffUsername.length < 3}
                  onClick={() => action.mutate({ type: "upsertStaff", payload: { username: staffUsername, ...staffPermissions } })}
                >Update existing user's permissions</Button>
                <p className="mt-2 text-xs text-muted-foreground">Login email will be <code>username@babis.local</code>.</p>
              </div>
              <div className="app-panel overflow-hidden rounded-lg"><ResponsiveRows rows={data?.users ?? []} empty="No accounts yet." render={(user: any) => <div className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="font-semibold">{user.username}</div><div className="text-xs text-muted-foreground">{user.account_status}</div></div><Button variant="outline" size="sm" onClick={() => action.mutate({ type: "removeStaff", payload: { userId: user.id } })} disabled={!can.users}>Remove staff</Button></div>} /></div>
            </TabsContent>

            <TabsContent value="settings" className="grid gap-4">
              <div className="app-panel rounded-lg p-4 sm:p-5">
                <h2 className="text-lg font-semibold">Discord invite link</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used in the loader GUI and in every kick / appeal message. Changing it updates all existing bans too.
                </p>
                <label className="mt-4 grid gap-1 text-sm">
                  Invite URL
                  <Input value={discordLink} onChange={(event) => setDiscordLink(event.target.value)} placeholder="https://discord.gg/..." />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={!can.owner || action.isPending || !/^https?:\/\//.test(discordLink.trim())}
                    onClick={() => action.mutate({ type: "updateDiscordLink", payload: { url: discordLink.trim() } })}
                  ><Save /> Save link</Button>
                  <Button variant="outline" onClick={() => copyText("Discord link", discordLink.trim())}><Copy /> Copy</Button>
                  {discordLink.trim() ? (
                    <a href={discordLink.trim()} target="_blank" rel="noreferrer" className="inline-flex">
                      <Button variant="outline"><ExternalLink /> Open</Button>
                    </a>
                  ) : null}
                </div>
                {!can.owner ? <p className="mt-3 text-xs text-muted-foreground">Only the owner can change this link.</p> : null}
                <p className="mt-3 text-xs text-muted-foreground">Current live link: <code>{data?.discordInviteUrl ?? "—"}</code></p>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-md border border-border bg-muted p-3"><div className="text-2xl font-semibold text-primary">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}

function ResponsiveRows({ rows, empty, render }: { rows: any[]; empty: string; render: (row: any) => ReactNode }) {
  if (!rows.length) return <div className="p-6 text-sm text-muted-foreground">{empty}</div>;
  return <div className="divide-y divide-border">{rows.map((row) => <div key={row.id}>{render(row)}</div>)}</div>;
}

function formatTimeLeft(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "Permanent";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m left`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${hrs % 24}h left`;
}
