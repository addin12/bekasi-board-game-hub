/** Shared layout for the plain-text pages (privacy, terms, safety). */
export function Legal({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto grid max-w-2xl gap-6">
      <header className="grid gap-1">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {updated && <p className="text-sm text-muted-foreground">Last updated {updated}</p>}
      </header>
      <div data-prose className="grid gap-6 leading-relaxed [&_h2]:text-xl [&_h2]:font-extrabold [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5">{children}</div>
    </article>
  );
}
