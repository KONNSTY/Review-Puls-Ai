export default function HelpPage() {
  return (
    <s-page heading="Help and trust">
      <s-section heading="Launch checklist">
        <s-unordered-list>
          <s-list-item>
            Connect a verified review provider or use the CSV importer.
          </s-list-item>
          <s-list-item>
            Set your brand tone, values, and escalation email.
          </s-list-item>
          <s-list-item>
            Generate drafts, review safety flags, then approve and publish.
          </s-list-item>
        </s-unordered-list>
      </s-section>
      <s-section heading="Safety by default">
        <s-text>
          Critical content is escalated and cannot reach auto-publish. All
          external calls have bounded timeouts and failed jobs are retained for
          a safe retry path.
        </s-text>
      </s-section>
      <s-section heading="Data processing">
        <s-text>
          Review text is scrubbed for common PII patterns before an AI request.
          The app does not inject storefront scripts, track end customers, or
          store browser fingerprints.
        </s-text>
        <s-link href="https://reviewpulse.example.com/privacy" target="_blank">
          Privacy policy template
        </s-link>
      </s-section>
    </s-page>
  );
}
