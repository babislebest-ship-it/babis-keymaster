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

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@babis.local`;

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialize = useServerFn(initializeAccount);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel" });
    });
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const u = username.trim();
    if (!u || !password) return toast.error("Enter your username and password");
    setBusy(true);
    try {
      const email = usernameToEmail(u);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await initialize({ data: { username: u } });
      await queryClient.invalidateQueries();
      toast.success("Signed in");
      navigate({ to: "/panel" });
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
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your staff username and password.</p>
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