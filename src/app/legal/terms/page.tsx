import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

/**
 * Stripe requires a live Terms URL before it will run checkout.
 *
 * This is a plain-English starting point written to describe what the product
 * actually does — it is NOT legal advice and has not been reviewed by a lawyer.
 * See HANDOFF.md: get it reviewed before taking money at any volume.
 */
export default function TermsPage() {
  return (
    <>
      <h1 className="text-[2rem] font-bold tracking-tight">Terms of Service</h1>
      <p className="text-[0.8125rem] text-[#8a9099]">Last updated 8 September 2026</p>

      <p>
        Golodex is operated by Thunderbird Agency LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating
        or using a Golodex page you agree to these terms.
      </p>

      <h2>What Golodex is</h2>
      <p>
        Golodex hosts a public page at golodex.com/yourname that presents your
        contact details, links and description of your work, and collects
        enquiries on your behalf.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with a link sent to your email address. Keep access to that
        inbox secure — anyone who can read it can sign in as you. Tell us
        promptly if you believe someone else has access to your account.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of everything you put on your page. You give us
        permission to host and display it for as long as your account is active.
        You are responsible for having the right to use what you publish, and
        for its accuracy.
      </p>
      <p>You agree not to publish content that:</p>
      <ul>
        <li>impersonates another person or organisation;</li>
        <li>misstates professional licensing, credentials or qualifications;</li>
        <li>is unlawful, deceptive, or infringes someone else&rsquo;s rights;</li>
        <li>collects information from visitors under false pretences.</li>
      </ul>
      <p>
        If your page is subject to professional regulation — real estate,
        mortgage lending, insurance and similar — you are responsible for the
        disclosures and licence information it displays.
      </p>

      <h2>Payment</h2>
      <p>
        Paid plans are billed in advance, monthly or yearly, through Stripe. We
        do not see or store your card details. Prices are in US dollars and
        exclude any taxes we are required to collect.
      </p>
      <p>
        Your subscription renews automatically until you cancel. You can cancel
        at any time from your dashboard; you keep paid features until the end of
        the period you have already paid for. We do not pro-rate refunds for
        partial periods, but if something has gone wrong, write to us — we would
        rather sort it out than argue about it.
      </p>
      <p>
        If a payment fails we will retry it. If it keeps failing, your account
        drops to the free plan. <strong>Your page stays online</strong> and your
        content is not deleted; paid features simply switch off.
      </p>

      <h2>Free and gifted pages</h2>
      <p>
        We sometimes provide pages at no cost. These have the same terms except
        that we may retire an inactive free page after giving you notice and a
        chance to export your content.
      </p>

      <h2>The AI assistant</h2>
      <p>
        Paid pages can include an assistant that answers visitors&rsquo; questions
        using the content of your page and any notes you give it. It is
        automated, it can be wrong, and it is labelled to visitors as an
        assistant rather than as you. Do not rely on it to state regulated
        information such as rates, terms or licensing. Usage is subject to a
        monthly limit shown on your dashboard.
      </p>

      <h2>Enquiries and personal data</h2>
      <p>
        When someone submits your contact form you become responsible for how
        you use their information, including any marketing consent required
        where you operate. We act as your processor for that data.
      </p>

      <h2>Ending the agreement</h2>
      <p>
        You can stop using Golodex at any time. We may suspend or end an account
        that breaches these terms, and will tell you why unless legally
        prevented. On termination we will make your content available for export
        for 30 days.
      </p>

      <h2>Liability</h2>
      <p>
        Golodex is provided as-is. We do not guarantee uninterrupted service. To
        the extent the law allows, our total liability is limited to what you
        paid us in the twelve months before the claim. Nothing here limits
        liability that cannot lawfully be limited.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. For material changes we will email account
        holders at least 14 days beforehand.
      </p>

      <h2>Contact</h2>
      <p>
        Thunderbird Agency LLC, Glendale, Arizona.{" "}
        <a className="underline underline-offset-2" href="mailto:hello@golodex.com">
          hello@golodex.com
        </a>
      </p>
    </>
  );
}
