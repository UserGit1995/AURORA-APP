import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logoAsset from "@/assets/aurora-logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [{ title: "Area riservata - Aurora" }, { name: "description", content: "Accesso amministratore Aurora" }],
  }),
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin` },
      });
      if (signUpError) setError(signUpError.message);
      else setMessage("Account creato. Se la conferma email è attiva, controlla la tua casella.");
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else router.navigate({ to: "/admin" });
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <img src={logoAsset} alt="Aurora" className="h-auto w-full max-w-[240px]" width={240} height={72} />
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Area riservata</CardTitle>
            <CardDescription>Accedi per gestire catalogo e richieste.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Attendi..." : mode === "login" ? "Accedi" : "Registrati"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              {mode === "login" ? (
                <span>Non hai un account?{" "}
                  <button type="button" onClick={() => setMode("signup")} className="text-primary underline">Registrati</button>
                </span>
              ) : (
                <span>Hai già un account?{" "}
                  <button type="button" onClick={() => setMode("login")} className="text-primary underline">Accedi</button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
