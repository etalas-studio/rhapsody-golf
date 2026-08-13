import { useState } from "react";
import { useApp } from "@/lib/appContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Sparkles } from "lucide-react";

/**
 * Global sign-up wall. Opens when any protected mutation calls
 * `requireAuth(...)`. On successful (mock) auth, the queued `onSuccess`
 * runs so the user resumes the exact flow they were in.
 */
export function AuthGate() {
  const { authGate, closeAuthGate, signInAsDemo } = useApp();
  const [mode, setMode] = useState<"signup" | "signin">("signup");

  const open = authGate !== null;

  function complete() {
    signInAsDemo("golfer");
    const cb = authGate?.onSuccess;
    closeAuthGate();
    setTimeout(() => cb?.(), 0);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeAuthGate(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {authGate?.title ?? "Sign up to continue"}
          </DialogTitle>
          <DialogDescription>
            {authGate?.description ??
              "You need a Rhapsody GolfHub account to complete this action."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signup">Sign up · 10s</TabsTrigger>
            <TabsTrigger value="signin">Sign in</TabsTrigger>
          </TabsList>

          <TabsContent value="signup" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => complete()}
              >
                <span className="text-base mr-1.5">🇬</span> Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => complete()}
              >
                <span className="text-base mr-1.5"></span> Apple
              </Button>
            </div>
            <Divider />
            <form
              onSubmit={(e) => { e.preventDefault(); complete(); }}
              className="space-y-2.5"
            >
              <div>
                <Label htmlFor="ag-name">Full name</Label>
                <Input id="ag-name" placeholder="Your name" required defaultValue="Michael Tan" />
              </div>
              <div>
                <Label htmlFor="ag-email">Email or phone</Label>
                <Input id="ag-email" placeholder="you@example.com" required defaultValue="michael.tan@example.com" />
              </div>
              <div>
                <Label htmlFor="ag-pass">Password</Label>
                <Input id="ag-pass" type="password" required defaultValue="demo-password" />
              </div>
              <Button type="submit" className="w-full h-11">
                Create account & continue
              </Button>
            </form>
            <div className="grid grid-cols-2 gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Tokenised payments
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> One ID, every club
              </span>
            </div>
          </TabsContent>

          <TabsContent value="signin" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => complete()}
              >
                <span className="text-base mr-1.5">🇬</span> Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => complete()}
              >
                <span className="text-base mr-1.5"></span> Apple
              </Button>
            </div>
            <Divider />
            <form
              onSubmit={(e) => { e.preventDefault(); complete(); }}
              className="space-y-2.5"
            >
              <div>
                <Label htmlFor="ag-email2">Email or phone</Label>
                <Input id="ag-email2" required defaultValue="michael.tan@example.com" />
              </div>
              <div>
                <Label htmlFor="ag-pass2">Password</Label>
                <Input id="ag-pass2" type="password" required defaultValue="demo-password" />
              </div>
              <Button type="submit" className="w-full h-11">
                Sign in & continue
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-[11px] text-muted-foreground text-center">
          By continuing you agree to Rhapsody GolfHub's Terms and Privacy Policy.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
