import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Chrome, KeyRound, LogIn, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initializeAccount } from "@/lib/babis.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initialize = useServerFn(initializeAccount);
  const [mode, setMode] = useState("signin");
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("Babis");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  const profileMutation = useMutation({
    mutationFn: () => initialize({ data: { username } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      toast.success("Profile saved", { description: `Role: ${result.role}` });
      navigate({ to: "/" });
    },
    onError: (error) => toast.error("Profile setup failed", { description: error.message }),
  });

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return toast.error("Sign in failed", { description: error.message });
    toast.success("Signed in");
    setSignedIn(true);
    profileMutation.mutate();
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return toast.error("Account creation failed", { description: error.message });
    toast.success("Account created", { description: "Check your email if confirmation is required, then sign in." });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed", { description: String(result.error.message ?? result.error) });
    if (!result.redirected) profileMutation.mutate();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <section className="app-panel w-full max-w-md rounded-lg p-5 sm:p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground"><Shield /></div>
          <h1 className="text-2xl font-semibold">Babis Premium</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in, then save your username. The first Babis profile becomes owner.</p>
        </div>
        {signedIn ? (
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">Portal username<Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
            <Button className="w-full" onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}><Shield /> Save profile and enter</Button>
          </div>
        ) : (
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Sign up</TabsTrigger></TabsList>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
            <label className="grid gap-1 text-sm">Password<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
            <label className="grid gap-1 text-sm">Portal username<Input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label>
          </div>
          <TabsContent value="signin" className="mt-4"><Button className="w-full" onClick={signIn}><LogIn /> Sign in</Button></TabsContent>
          <TabsContent value="signup" className="mt-4"><Button className="w-full" onClick={signUp}><KeyRound /> Create account</Button></TabsContent>
        </Tabs>
        )}
        {!signedIn && <Button className="mt-3 w-full" variant="outline" onClick={google}><Chrome /> Continue with Google</Button>}
        <Button className="mt-3 w-full" variant="ghost" asChild><Link to="/">Back to home</Link></Button>
      </section>
    </main>
  );
}