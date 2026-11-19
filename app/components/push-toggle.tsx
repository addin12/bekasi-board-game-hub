import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type State = "checking" | "unsupported" | "install" | "blocked" | "off" | "on";

const post = (body: object) =>
  fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: (await r.json().catch(() => ({}))) as { ok?: boolean; message?: string } }));

/** The key comes from the server as base64url text. The browser wants bytes. */
const keyBytes = (b64u: string) => {
  const t = b64u.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(t + "=".repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Turns notifications on or off for THIS device. Each phone or browser is switched on by itself. */
export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setState(isIos() ? "install" : "unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setState(sub && Notification.permission === "granted" ? "on" : "off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      // The permission question must come from a tap, so it sits in this click handler.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const res = await post({ intent: "subscribe", subscription: sub.toJSON() });
      if (!res.data.ok) { await sub.unsubscribe(); throw new Error(res.data.message ?? "The site refused this device"); }
      setState("on");
      toast.success("Notifications are on for this device");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "We could not turn notifications on. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) { await post({ intent: "unsubscribe", endpoint: sub.endpoint }); await sub.unsubscribe(); }
      setState("off");
      toast.success("Notifications are off for this device");
    } catch {
      toast.error("We could not turn notifications off. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    const res = await post({ intent: "test" }).catch(() => null);
    setBusy(false);
    if (res?.data.ok) toast.success("Test sent. It should arrive in a few seconds");
    else toast.error(res?.data.message ?? "We could not send the test. Try again.");
  }

  if (state === "checking") return <p className="text-muted-foreground">Checking this device…</p>;
  if (state === "install")
    return <p>On iPhone, first add this site to your Home Screen: tap Share, then Add to Home Screen. Open the site from the Home Screen, then come back to this page.</p>;
  if (state === "unsupported") return <p className="text-muted-foreground">This browser cannot receive notifications.</p>;
  if (state === "blocked") return <p>Notifications are blocked for this site. Allow them in your browser settings, then reload this page.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === "on" ? (
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={turnOff}>Turn off notifications</Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={sendTest}>Send a test</Button>
        </>
      ) : (
        <>
          <Button type="button" disabled={busy} onClick={turnOn}>{busy ? "Turning on…" : "Turn on notifications"}</Button>
          {busy && <p className="basis-full text-sm text-muted-foreground">This can take up to a minute the first time</p>}
        </>
      )}
    </div>
  );
}
