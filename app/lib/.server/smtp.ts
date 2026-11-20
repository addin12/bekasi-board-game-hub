import { connect } from "cloudflare:sockets";
import { buildMessage, isPlainAddress, toBase64 } from "@/lib/smtp-message";

/**
 * Sends one plain-text mail through Gmail's SMTP server over TLS (port 465), with an app password.
 * Workers may open outgoing TCP connections on port 465. Port 25 is blocked. Gmail allows about 500 mails a day, which is plenty for sign-in codes.
 */
export async function sendViaGmail(opts: { user: string; appPassword: string; fromName: string; to: string; subject: string; text: string }): Promise<void> {
  if (!isPlainAddress(opts.to) || !isPlainAddress(opts.user)) throw new Error("Bad email address");
  const socket = connect({ hostname: "smtp.gmail.com", port: 465 }, { secureTransport: "on", allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();
  let buffer = "";

  /** Reads until the server's final line of a reply ("250 ...", not "250-..."). Returns the code. */
  const reply = async (): Promise<number> => {
    for (;;) {
      const lines = buffer.split("\r\n");
      const done = lines.findIndex((l, i) => i < lines.length - 1 && /^\d{3} /.test(l));
      if (done >= 0) {
        const code = Number(lines[done].slice(0, 3));
        buffer = lines.slice(done + 1).join("\r\n");
        return code;
      }
      const { value, done: closed } = await reader.read();
      if (closed) throw new Error("Mail server closed the connection");
      buffer += dec.decode(value, { stream: true });
    }
  };
  const expect = async (want: number, step: string) => {
    const code = await reply();
    if (code !== want) throw new Error(`Mail server answered ${code} at ${step}`);
  };
  const send = (line: string) => writer.write(enc.encode(`${line}\r\n`));

  const run = async () => {
    await expect(220, "greeting");
    await send("EHLO bekasi-board-game-hub");
    await expect(250, "EHLO");
    await send("AUTH LOGIN");
    await expect(334, "AUTH");
    await send(toBase64(opts.user));
    await expect(334, "user");
    await send(toBase64(opts.appPassword));
    await expect(235, "password");
    await send(`MAIL FROM:<${opts.user}>`);
    await expect(250, "MAIL FROM");
    await send(`RCPT TO:<${opts.to}>`);
    await expect(250, "RCPT TO");
    await send("DATA");
    await expect(354, "DATA");
    const body = buildMessage({ fromName: opts.fromName, fromAddress: opts.user, to: opts.to, subject: opts.subject, text: opts.text, date: new Date(), id: crypto.randomUUID() });
    await writer.write(enc.encode(`${body}\r\n.\r\n`));
    await expect(250, "message");
    await send("QUIT");
  };

  try {
    await Promise.race([run(), new Promise<never>((_, no) => setTimeout(() => no(new Error("Mail server did not answer in time")), 15000))]);
  } finally {
    try { await socket.close(); } catch { /* already closed */ }
  }
}
