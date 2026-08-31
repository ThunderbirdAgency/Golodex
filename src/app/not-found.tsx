export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#fbfaf8] px-6 text-center text-[#14161a]">
      <p className="text-sm font-semibold tracking-widest text-[#8a9099]">GOLODEX</p>
      <h1 className="mt-4 text-[2rem] font-bold tracking-tight">This page isn&apos;t taken yet.</h1>
      <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-[#5a6069]">
        Nobody has claimed this name. If it should be yours, it&apos;s still available.
      </p>
      <a
        href="/"
        className="mt-7 rounded-full bg-[#14161a] px-6 py-3 text-[0.9375rem] font-semibold text-white"
      >
        Claim it
      </a>
    </main>
  );
}
