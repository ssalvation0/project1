import React from 'react';
import { Helmet } from 'react-helmet-async';
import './Legal.css';

function Privacy() {
  return (
    <div className="legal-page">
      <Helmet>
        <title>Privacy Policy — TransmogVault</title>
        <meta name="description" content="How TransmogVault handles your data." />
      </Helmet>

      <article className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated: May 2026</p>

        <p>
          TransmogVault is a fan-made, non-commercial site for browsing World of
          Warcraft transmog appearances. This policy explains what data we collect,
          why, and what you can do about it.
        </p>

        <h2>1. Data we collect</h2>
        <p>If you create an account, we store via our authentication provider (Supabase):</p>
        <ul>
          <li><strong>Email address</strong> — used for sign-in and password resets.</li>
          <li><strong>Hashed password</strong> — never stored or transmitted in plain text.</li>
          <li><strong>Profile</strong> — display name, optional avatar image, and your class / armor preferences.</li>
          <li><strong>Activity</strong> — your favorites, collections, ratings, and comments.</li>
        </ul>
        <p>
          If you don't create an account, we don't store anything that identifies
          you personally. Browsing favorites can be stored locally in your browser
          (<code>localStorage</code>) and never leaves your device.
        </p>

        <h2>2. Why we collect it</h2>
        <p>
          Strictly to provide the features you use: authentication, saving favorites
          across devices, posting comments, and rating sets. We do not sell, rent,
          or share your data with third parties.
        </p>

        <h2>3. Third-party services</h2>
        <p>The site relies on these external services:</p>
        <ul>
          <li><strong>Supabase</strong> — authentication and database hosting.</li>
          <li><strong>Wowhead</strong> — set names, item names, and model preview images (no personal data sent).</li>
          <li><strong>Blizzard Game Data API</strong> — item metadata (no personal data sent).</li>
          <li><strong>Sentry</strong> (if enabled) — anonymized error reports to help us fix bugs; no account data is attached.</li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          We use a single cookie set by Supabase to keep you signed in. There are
          no advertising or tracking cookies. If you sign out, the cookie is removed.
        </p>

        <h2>5. Your rights</h2>
        <p>You can at any time:</p>
        <ul>
          <li>Change your nickname, email, password, or avatar in Settings.</li>
          <li>Delete individual comments, ratings, or collections.</li>
          <li>Request full account deletion by contacting us (see Contact below).
            We will remove your profile, comments, ratings, and collections within
            7 days.</li>
        </ul>

        <h2>6. Data retention</h2>
        <p>
          We keep your account data for as long as you keep your account. Deleted
          accounts are removed from active storage within 7 days; database backups
          may retain the data for up to 30 days before they expire.
        </p>

        <h2>7. Children</h2>
        <p>
          TransmogVault is not directed at children under 13. We do not knowingly
          collect data from anyone under that age. If you believe a child has
          created an account, contact us and we will delete it.
        </p>

        <h2>8. Changes</h2>
        <p>
          We may update this policy as the site evolves. The "Last updated" date at
          the top will change accordingly. Material changes will be announced on
          the home page.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions or deletion requests:{' '}
          <a href="https://t.me/ssalvation" target="_blank" rel="noopener noreferrer">@ssalvation on Telegram</a>.
        </p>
      </article>
    </div>
  );
}

export default Privacy;
