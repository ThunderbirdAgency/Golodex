import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * Plain-English description of what the product actually collects. Written to
 * be true of this codebase, not copied from a generator — but it is NOT legal
 * advice. See HANDOFF.md before relying on it commercially.
 */
export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[2rem] font-bold tracking-tight">Privacy Policy</h1>
      <p className="text-[0.8125rem] text-[#8a9099]">Last updated 8 September 2026</p>

      <p>
        This describes what Golodex, operated by Thunderbird Agency LLC,
        collects and why. We have written it to match what the software actually
        does.
      </p>

      <h2>If you have a Golodex account</h2>
      <p>We store:</p>
      <ul>
        <li>your email address, name, and the content of your page;</li>
        <li>your plan, and a Stripe customer reference — never card details;</li>
        <li>when you last signed in;</li>
        <li>the last twenty versions of your page, so you can undo mistakes.</li>
      </ul>

      <h2>If you visit someone&rsquo;s page</h2>
      <p>
        We record a page view, and which links are tapped, so the page owner can
        see whether their page is working. This is counted, not tied to you: we
        do not set advertising cookies, we do not build a profile of you, and we
        do not sell anything to anyone.
      </p>
      <p>
        If you submit a contact form, what you type goes to the page owner and
        into their CRM. They decide how they use it — contact them directly to
        have it removed.
      </p>
      <p>
        If you use the assistant on a page, your messages are sent to Anthropic
        to generate a reply, and a count is kept against the page owner&rsquo;s
        monthly limit. We do not keep a transcript.
      </p>

      <h2>Who we share data with</h2>
      <ul>
        <li><strong>Supabase</strong> — database, authentication and file storage.</li>
        <li><strong>Vercel</strong> — hosting.</li>
        <li><strong>Stripe</strong> — payments.</li>
        <li><strong>Anthropic</strong> — powers the page assistant.</li>
        <li><strong>GoHighLevel</strong> — where page owners&rsquo; enquiries are delivered.</li>
      </ul>
      <p>We do not sell personal information.</p>

      <h2>Cookies</h2>
      <p>
        We set a cookie to keep you signed in, and a short-lived one during
        sign-in. That is all. There are no advertising or third-party tracking
        cookies.
      </p>

      <h2>How long we keep things</h2>
      <p>
        Account and page data for as long as your account exists, then 30 days
        after you close it. Analytics events are aggregate and retained for 24
        months. Enquiries are kept until the page owner deletes them.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live you may have the right to see, correct,
        export or delete your personal information. Email{" "}
        <a className="underline underline-offset-2" href="mailto:hello@golodex.com">
          hello@golodex.com
        </a>{" "}
        and we will action it within 30 days.
      </p>

      <h2>Children</h2>
      <p>Golodex is not intended for anyone under 16.</p>

      <h2>Contact</h2>
      <p>Thunderbird Agency LLC, Glendale, Arizona · hello@golodex.com</p>
    </>
  );
}
