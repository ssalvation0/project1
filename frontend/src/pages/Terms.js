import React from 'react';
import { Helmet } from 'react-helmet-async';
import './Legal.css';

function Terms() {
  return (
    <div className="legal-page">
      <Helmet>
        <title>Terms of Use — TransmogVault</title>
        <meta name="description" content="Terms of using TransmogVault." />
      </Helmet>

      <article className="legal-content">
        <h1>Terms of Use</h1>
        <p className="legal-meta">Last updated: May 2026</p>

        <p>
          TransmogVault is a free, fan-made, non-commercial catalog of World of
          Warcraft transmog appearances. By using the site you agree to the terms
          below. If you don't agree, please don't use the site.
        </p>

        <h2>1. No affiliation with Blizzard</h2>
        <p>
          TransmogVault is not affiliated with, endorsed by, or sponsored by
          Blizzard Entertainment. World of Warcraft, Battle.net, and related
          trademarks are property of Blizzard Entertainment, Inc.
        </p>

        <h2>2. Acceptable use</h2>
        <p>You agree to:</p>
        <ul>
          <li>Use the site for personal, non-commercial purposes only.</li>
          <li>Not scrape, mirror, or republish substantial portions of the site
            without permission.</li>
          <li>Not abuse the API — rate limits are enforced. Repeated violations
            may lead to IP-level blocks.</li>
          <li>Not post comments that are illegal, harassing, hateful, defamatory,
            or otherwise abusive. We may remove such content at our discretion
            and may delete accounts that repeatedly violate this rule.</li>
        </ul>

        <h2>3. Content accuracy</h2>
        <p>
          We do our best to keep set information, drop sources, and farming guides
          accurate, but the data comes from third-party sources (Wowhead, Blizzard
          API, AI summaries) and may be incomplete or out of date. Use the official
          Wowhead link on each set page for canonical information.
        </p>

        <h2>4. User-generated content</h2>
        <p>
          When you post a comment, submit a rating, or create a collection, you
          grant TransmogVault a non-exclusive, royalty-free license to display
          that content on the site. You can delete your contributions at any time
          via the UI.
        </p>

        <h2>5. Account termination</h2>
        <p>
          You can delete your account at any time (see the Privacy Policy for the
          procedure). We may suspend or remove accounts that repeatedly violate
          these terms, with notice when reasonable.
        </p>

        <h2>6. No warranty</h2>
        <p>
          The site is provided "as is." We make no guarantees about uptime, data
          accuracy, or fitness for any particular purpose. Use it at your own
          risk. We are not liable for any loss of in-game currency, time, or
          other consequence of relying on information shown here.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update these terms as the site evolves. The "Last updated" date
          will reflect the latest revision. Continuing to use the site after
          changes constitutes acceptance of the new terms.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions or concerns:{' '}
          <a href="https://t.me/ssalvation" target="_blank" rel="noopener noreferrer">@ssalvation on Telegram</a>.
        </p>
      </article>
    </div>
  );
}

export default Terms;
