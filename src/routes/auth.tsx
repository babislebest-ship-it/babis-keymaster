import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initializeAccount } from "@/lib/babis.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const OWNER_USERNAME = "Babis";
const OWNER_PASSWORD = "Lmad2010";
const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@babis.local`;

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialize = useServerFn(initializeAccount);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      // Ensure a profile exists for Google users (uses email prefix as username).
      const user = data.session.user;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      let username = String(meta.username ?? "").trim();
      if (!username && user.email) {
        username = user.email.split("@")[0].replace(/[^A-Za-z0-9_]/g, "").slice(0, 32);
        if (username.length < 3) username = `user_${user.id.slice(0, 6)}`;
      }
      try {
        await initialize({ data: { username, displayName: String(meta.full_name ?? username) } });
      } catch {
        /* profile might already exist */
      }
      await queryClient.invalidateQueries();
      navigate({ to: "/" });
    });
  }, [initialize, navigate, queryClient]);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw new Error(String(result.error.message ?? result.error));
      if (result.redirected) return;
      // Popup flow success — session is set.
      await queryClient.invalidateQueries();
      toast.success("Signed in with Google");
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Google sign-in failed", { description: (err as Error).message });
    } finally {
      setGoogleBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const u = username.trim();
    if (!u || !password) return toast.error("Enter your username and password");
    setBusy(true);
    try {
      const email = usernameToEmail(u);
      let { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Bootstrap the owner account on first login only.
        if (u === OWNER_USERNAME && password === OWNER_PASSWORD) {
          const signup = await supabase.auth.signUp({ email, password });
          if (signup.error) throw signup.error;
          if (!signup.data.session) {
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (retry.error) throw retry.error;
          }
        } else {
          throw error;
        }
      }
      await initialize({ data: { username: u } });
      await queryClient.invalidateQueries();
      toast.success("Signed in");
      navigate({ to: "/" });
    } catch (err) {
      toast.error("Sign in failed", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <section className="app-panel w-full max-w-md p-5 sm:p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center bg-primary text-primary-foreground"><Shield /></div>
          <h1 className="text-2xl font-semibold">Babis Premium</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with Google to host your scripts, or with staff credentials.</p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={googleBusy}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 1 1 0-12.4c2 0 3.3.8 4 1.5l2.7-2.6C17 3 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 11.4-4.9 11.4-11.7 0-.8-.1-1.4-.2-2H12z"/></svg>
          {googleBusy ? "Opening Google…" : "Continue with Google"}
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> Staff sign-in <div className="h-px flex-1 bg-border" />
        </div>
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm">Username<Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus /></label>
          <label className="grid gap-1 text-sm">Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
          <Button className="w-full" type="submit" disabled={busy}><LogIn /> {busy ? "Signing in..." : "Sign in"}</Button>
        </form>
        <Button className="mt-3 w-full" variant="ghost" asChild><Link to="/">Back to home</Link></Button>
      </section>
    </main>
  );
}