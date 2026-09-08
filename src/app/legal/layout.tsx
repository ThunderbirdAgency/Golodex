export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-[#fbfaf8] text-[#14161a]">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <a href="/" className="text-[1.0625rem] font-bold tracking-tight">Golodex</a>
        <span className="flex gap-4 text-[0.875rem] text-[#5a6069]">
          <a className="hover:text-[#14161a]" href="/legal/terms">Terms</a>
          <a className="hover:text-[#14161a]" href="/legal/privacy">Privacy</a>
        </span>
      </nav>
      <article className="mx-auto max-w-3xl px-6 pb-24 [&_h2]:mt-9 [&_h2]:text-[1.125rem] [&_h2]:font-semibold [&_li]:mt-1.5 [&_p]:mt-3.5 [&_p]:leading-relaxed [&_p]:text-[#3a4048] [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[#3a4048]">
        {children}
      </article>
    </main>
  );
}
