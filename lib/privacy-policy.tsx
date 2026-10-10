// ── DeepCrated Privacy Policy: the one file to edit ───────────────────────
// All policy text lives here. app/privacy/page.tsx only renders it.
//
// Markup inside any string:
//   [CONFIRM: ...]   renders as a highlighted marker so an unconfirmed fact
//                    cannot ship unnoticed. Remove the marker once confirmed.
//   {contactEmail}, {companyName}, {mailingAddress}   filled from POLICY_CONFIG.
//
// Do NOT set policyReviewed = true until the owner has reviewed this policy.

export const POLICY_CONFIG = {
  lastUpdated: '2026-10-09',
  companyName: '[CONFIRM: legal entity or owner name]',
  contactEmail: '[CONFIRM: contact email]',
  mailingAddress: '[CONFIRM: mailing address]',
  policyReviewed: false
}

// TODO(legal): Terms of Service still need to be written. Nothing in this
// policy or the site claims a Terms page exists.

export type Block =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

export interface Section {
  id: string
  title: string
  blocks: Block[]
}

export const SUMMARY: string[] = [
  'The DeepCrated desktop app is local-first. Your music files and library stay on your computer unless you choose to use cloud sync or mobile.',
  'Signing in is optional. You only need an account for cloud sync and the mobile app.',
  'Two settings in the desktop app can send data off your device, and both are your choice: "Identify tracks online" and "Contribute anonymous stats". Both are off by default.',
  'If you subscribe to a cloud plan, we store your library details and, if you use cloud audio storage, copies of your audio files, so you can sync and listen on mobile.',
  'We do not sell your personal information. [CONFIRM: owner approves this statement]'
]

export const SECTIONS: Section[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    blocks: [
      {
        type: 'p',
        text: 'DeepCrated is operated by {companyName}, based in Texas, USA. Contact: {contactEmail}, {mailingAddress}. In this policy, "we" means DeepCrated.'
      }
    ]
  },
  {
    id: 'information-we-collect',
    title: 'Information we collect',
    blocks: [
      {
        type: 'p',
        text: '2.1 Account information. If you create an account: your email address, a password (stored only as a secure hash by our authentication provider), and, if you sign in with Google, the name, email and profile photo Google shares with us. We also keep your plan and subscription status.'
      },
      {
        type: 'p',
        text: '2.2 Payment information. Payments are handled by Stripe. We do not see or store your full card number. We receive a Stripe customer ID, subscription ID, plan, status and billing period. Stripe\'s hosted checkout and billing portal pages may set their own cookies.'
      },
      {
        type: 'p',
        // TODO(legal): restore a description of app update checks once the
        // desktop updater is configured (its publish URL is still a placeholder).
        text: '2.3 The desktop app. Your music files, library database, tags, crates and settings live on your computer. We do not receive them unless you use cloud sync.'
      },
      {
        type: 'p',
        text: '2.4 Optional: Identify tracks online. If you turn this on (Settings > Privacy), the app sends a short audio fingerprint, the track length and your IP address to AcoustID and, for matched tracks, a recording ID to MusicBrainz, to look up a public recording ID. It never sends file names, file paths or your account, and never changes your files. Matches already found stay on your computer after you turn it off. It is off by default.'
      },
      {
        type: 'p',
        text: '2.5 Optional: Contribute anonymous stats. If you turn this on (Settings > Privacy), the app sends anonymous usage events to our database. Only a fixed list of events can be sent: session start (with a library-size range), crate created, track added to a crate, track tagged, and track played. Each event carries an anonymous install ID, a timestamp rounded to the hour, the app version, and, on track events, an identifier for the track derived from the recording (such as a standard recording code or an audio fingerprint ID). It never includes file names, file paths, folder names, anything you type, or your account. Tracks and crates you mark private are never included. Turning the setting off stops collection, clears what is queued on your device and discards the install ID. It is off by default. Retention: [CONFIRM: how long anonymous stats are kept]'
      },
      {
        type: 'p',
        text: '2.6 Cloud sync and mobile (paid plans). We store your library\'s track details (title, artist, tags, BPM, key, notes and similar metadata), crates, and artwork thumbnails. On any paid plan, if you use cloud audio storage, we also store copies of your audio files and smaller listening versions for the mobile app, in Backblaze B2 storage.'
      },
      {
        type: 'p',
        text: '2.7 Signing in to the apps. When you sign in to the desktop or mobile app from our website, we create a one-time key that lasts about a minute. We store only a hashed copy of it, and it can be used once.'
      },
      {
        type: 'p',
        text: '2.8 Website. When you visit deepcrated.com, our hosting provider and servers may log your IP address, browser type and pages requested for security and operation. We use Vercel Web Analytics and Vercel Speed Insights to measure page visits and site performance. [CONFIRM: what Vercel Web Analytics and Speed Insights collect, and whether they use cookies] If you sign in to the website, we set cookies that keep you signed in. We do not use advertising cookies.'
      },
      {
        type: 'p',
        text: '2.9 Waitlist. If you join the waitlist we collect your email address, and, if you choose to give them, what kind of DJ you are and the DJ software you use. The DJ type and software are stored only in our own database. Your email address, the source ("waitlist") and a user group are also sent to Loops, our email provider, so we can send you waitlist updates and launch news.'
      }
    ]
  },
  {
    id: 'synced-music-identifiers',
    title: 'Music identifiers that sync with your account',
    blocks: [
      // TODO(legal): DRAFT wording for owner review. The cloud sync schema for
      // these identifiers is not built yet, so everything here describes the
      // planned design. Re-check each statement against the real tables and
      // RLS policies before this section is published.
      {
        type: 'p',
        text: 'When cloud sync is on, these identifiers sync with your account for each track:'
      },
      {
        type: 'ul',
        items: [
          'The ISRC (a standard recording code), if the track has one.',
          'The MusicBrainz recording ID.',
          'Where each ID came from: the file\'s own tags, or an online lookup.',
          'A per-account keyed hash of the track\'s audio fingerprint. We sync this hash, not the raw fingerprint.'
        ]
      },
      {
        type: 'p',
        text: 'ISRC and MusicBrainz recording IDs are public identifiers. A large enough set of them could single out a particular library.'
      },
      {
        type: 'p',
        text: 'Nothing is shared between users. Each user can read only their own rows.'
      }
    ]
  },
  {
    id: 'how-we-use-information',
    title: 'How we use information',
    blocks: [
      {
        type: 'p',
        text: 'To provide the app, accounts, sync and mobile; to process payments and manage subscriptions; to keep the service secure and prevent abuse; to send service messages (receipts, payment problems, plan changes, deletion warnings); to send waitlist updates and launch news if you signed up, which you can leave at any time; to fix bugs and improve features; and to meet legal obligations. We do not use your music files for advertising. [CONFIRM: owner decides the policy on AI features and states it here]'
      }
    ]
  },
  {
    id: 'who-we-share-with',
    title: 'Who we share with',
    blocks: [
      {
        type: 'p',
        text: 'We share information only with service providers that help us run DeepCrated, and only as needed:'
      },
      {
        type: 'ul',
        items: [
          'Supabase: accounts, authentication and database. Hosted in the United States (AWS us-east-1).',
          'Stripe: payments and subscriptions.',
          'Backblaze: storage of cloud library files (B2).',
          'Vercel: website hosting, Web Analytics and Speed Insights.',
          'Loops: waitlist email. It receives your email address, the source and a user group.',
          'Google: only if you choose Sign in with Google.',
          'AcoustID and MusicBrainz: only if you turn on "Identify tracks online".'
        ]
      },
      {
        type: 'p',
        text: 'We may also disclose information if required by law or to protect rights and safety. If DeepCrated is ever sold or merged, your information may transfer, and we will tell you first. We do not sell personal information and we do not share it for cross-context advertising. [CONFIRM: owner approves this statement]'
      }
    ]
  },
  {
    id: 'your-choices',
    title: 'Your choices',
    blocks: [
      {
        type: 'ul',
        items: [
          'Use the desktop app without an account.',
          'Turn "Identify tracks online" and "Contribute anonymous stats" on or off at any time in Settings > Privacy.',
          'Sign out at any time, which removes the saved session from your device.',
          'Remove tracks from the cloud. They are permanently deleted from our storage 14 days after you delete them.',
          'Cancel your subscription at any time from your account.',
          'Unsubscribe from emails using the link in any email.'
        ]
      }
    ]
  },
  {
    id: 'how-long-we-keep-information',
    title: 'How long we keep information',
    blocks: [
      // TODO(legal): DRAFT retention periods (14 / 60 / 60 days) for owner
      // review. The cloud retention pipeline described below (read-only
      // period, deletion) is NOT built yet. Keep this text only
      // while it is the plan, and re-check it before launch.
      {
        type: 'ul',
        items: [
          'Account and subscription records: while your account exists, and as needed afterwards for tax, accounting and legal reasons.',
          'Tracks you delete: removed from the cloud after 14 days.',
          'After you cancel: your files stay in the cloud, read-only, for 60 days, then are permanently deleted.',
          'Deleted accounts: removed after 60 days. You can ask us to delete your account and data immediately.',
          'Information you delete in the app or ask us to delete: removed from active systems promptly, and from backups within [CONFIRM: backup retention].',
          'Server logs: [CONFIRM: log retention].',
          'Anonymous stats: [CONFIRM: stats retention].'
        ]
      }
    ]
  },
  {
    id: 'security',
    title: 'Security',
    blocks: [
      {
        type: 'p',
        text: 'We use encryption in transit, access rules that limit each account to its own data, and secure storage for sign-in sessions on your device. No system is perfectly secure, so we cannot guarantee absolute security. Tell us right away if you think your account is compromised.'
      }
    ]
  },
  {
    id: 'where-data-is-stored',
    title: 'Where data is stored',
    blocks: [
      {
        type: 'p',
        text: 'Our database and authentication provider (Supabase) stores data in the United States (AWS us-east-1). [CONFIRM: regions for Vercel, Backblaze B2 and Loops] If you use DeepCrated from outside the US, your information will be transferred to and processed in the US.'
      }
    ]
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    blocks: [
      {
        type: 'p',
        text: 'You can ask us to give you a copy of your personal information, correct it, delete it, or stop using it for a purpose you object to. We offer these choices to everyone, wherever you live. Email {contactEmail}. We will respond within 45 days [CONFIRM: owner approves timeline]. We may need to verify your identity first. If you are unhappy with our answer you can appeal by replying to us, and you may also contact your state attorney general or local data protection authority. [CONFIRM: add jurisdiction-specific sections after legal review]'
      }
    ]
  },
  {
    id: 'children',
    title: 'Children',
    blocks: [
      {
        type: 'p',
        text: 'DeepCrated is not for children under 13, and we do not knowingly collect their personal information. If you believe a child has given us information, contact us and we will delete it. [CONFIRM: owner picks age threshold]'
      }
    ]
  },
  {
    id: 'third-party-links',
    title: 'Third-party links',
    blocks: [
      {
        type: 'p',
        text: 'The app and website may link to music stores and other sites. Their privacy practices are their own.'
      }
    ]
  },
  {
    id: 'changes',
    title: 'Changes',
    blocks: [
      {
        type: 'p',
        text: 'We will post changes here and update the date above. For significant changes we will notify account holders by email or in the app.'
      }
    ]
  },
  {
    id: 'contact',
    title: 'Contact',
    blocks: [{ type: 'p', text: '{contactEmail} · {mailingAddress}' }]
  }
]
