import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Phone share sheet when the browser has one; otherwise copy the link. Plus a direct WhatsApp link. */
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => new URL(path, window.location.origin).toString();
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, url: url() }); return; } catch { /* closed the sheet */ return; }
    }
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { window.prompt("Copy this link", url()); }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={share}>{copied ? "Link copied" : "Share"}</Button>
      <Button variant="outline" asChild>
        <a href={`https://wa.me/?text=${encodeURIComponent(`${title} `)}`} onClick={(e) => { e.currentTarget.href = `https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`; }} target="_blank" rel="noreferrer">
          Send on WhatsApp
        </a>
      </Button>
    </div>
  );
}
