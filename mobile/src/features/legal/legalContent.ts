/**
 * In-app privacy policy, terms of use and security overview.
 *
 * Every statement here must stay true of the shipped build. When behaviour changes (permissions,
 * storage, network, retention, new data), update this file and bump LEGAL_VERSION / LEGAL_UPDATED.
 */
export const LEGAL_VERSION = '1.1';
export const LEGAL_UPDATED = '22 November 2026';

export type LegalSection = { heading: string; body?: string; bullets?: string[] };
export type LegalDocument = { key: 'privacy' | 'terms' | 'security'; title: string; summary: string; sections: LegalSection[] };

export const privacyPolicy: LegalDocument = {
  key: 'privacy',
  title: 'Privacy policy',
  summary: 'NotifyIQ keeps your notification history only on this phone. It has no internet access, no account, no ads, no analytics and no AI or cloud processing. One-time codes, passwords and card numbers are thrown away, not stored.',
  sections: [
    {
      heading: 'The short version',
      bullets: [
        'Everything stays on this phone. NotifyIQ is installed without Android’s internet permission, so it cannot send your data anywhere.',
        'There is no account, no server, no advertising, no analytics, no crash reporting and no tracking.',
        'No AI model, online or offline, reads your notifications. Categories, money totals and dates come from fixed rules that run on your phone.',
        'Notifications that look like one-time codes (OTPs), passwords or card numbers are discarded completely before anything is saved.',
        'You can stop access, exclude apps, change how long history is kept, or delete everything at any time.',
      ],
    },
    {
      heading: 'What NotifyIQ can read',
      body: 'Only notifications Android shares with NotifyIQ after you turn on Notification access in Android settings. For each notification this is the title, text, any extra line (sub-text), the name of the app that posted it, and when it arrived or was dismissed. NotifyIQ does not read your SMS inbox, contacts, photos, files, location, accounts or other apps’ data, and it does not ask for those permissions.',
    },
    {
      heading: 'What is never saved',
      bullets: [
        'Notifications from apps you exclude. They are skipped before their text is read.',
        'Notifications containing what looks like an OTP or verification code, a password, or a payment card number. The whole notification is discarded, including which app sent it and when.',
        'Notifications that Android itself hides as sensitive (Android 15 and later). These are discarded the same way.',
        'Notifications with no readable text.',
      ],
      body: 'Detection is automatic and cannot be perfect. In rare cases a sensitive message written in an unusual way could be kept, or an ordinary message could be skipped. If you see something that should not be stored, delete it and consider excluding that app.',
    },
    {
      heading: 'What is saved, and where',
      bullets: [
        'The notification details listed above, in a private database inside NotifyIQ’s own storage on this phone. Other apps cannot read it.',
        'Information NotifyIQ works out from them: a category, a priority, repeat groups, money amounts and the place paid, due dates, renewals, appointments and tasks.',
        'Your settings: rules, saved searches, excluded apps, retention period, category corrections, reminders and app lock.',
        'The name and icon of each app that posted a saved notification, so lists can show real app names. These contain no notification content.',
      ],
      body: 'This data is excluded from Android cloud backup and from phone-to-phone transfer, so it does not leave the device that way either.',
    },
    {
      heading: 'Encrypted backups you choose to make',
      body: 'If you use Export backup, NotifyIQ writes one file containing your NotifyIQ data, encrypted with a password you choose (AES-256), to the place you pick in Android’s file picker. Where that file goes afterwards, for example a USB drive or a cloud folder, is up to you and that service. Without the password nobody, including the developer, can read it. Restoring a backup replaces the data on the phone.',
    },
    {
      heading: 'Money and date insights',
      body: 'Amounts, places, subscriptions and due dates are read from the text of your saved notifications on this phone. They are estimates, not a bank statement, and can be incomplete or occasionally wrong. Nothing is checked with your bank or any other service.',
    },
    {
      heading: 'What NotifyIQ never does',
      bullets: [
        'Send, sell, rent or share your data with anyone.',
        'Upload notifications to a server or to any AI service.',
        'Show ads or use advertising IDs.',
        'Dismiss, hide, change or reply to your notifications. Android delivers them exactly as before.',
      ],
    },
    {
      heading: 'How long data is kept',
      body: 'By default, history older than 30 days is deleted automatically. You can choose 7, 30 or 90 days, or keep history until you delete it. Notifications you save are kept until you unsave or delete them. Uninstalling NotifyIQ removes all of its data from the phone. Phone storage cannot guarantee forensic erasure of deleted data.',
    },
    {
      heading: 'Your controls',
      bullets: [
        'Turn Notification access off at any time from the Privacy tab or Android settings. Capture stops immediately.',
        'Exclude any app so its notifications are never read.',
        'Delete single notifications, mark misread payments or dates as not relevant, or delete all history.',
        'Export an encrypted backup to move to a new phone, and restore it there.',
        'Turn on App lock (see Security).',
      ],
    },
    {
      heading: 'Permissions',
      bullets: [
        'Notification access: to read the notifications described above. You grant it in Android settings.',
        'Post notifications: only to show reminders you ask for. Reminder text on the lock screen is generic and never shows notification content.',
        'Run at startup: only to restore reminders you set after the phone restarts.',
        'Use biometrics: only to show Android’s own unlock prompt when App lock is on. Your fingerprint or face data never reaches NotifyIQ; Android only tells it whether unlocking succeeded.',
      ],
    },
    {
      heading: 'Children',
      body: 'NotifyIQ is not designed for children and is not intended for use by anyone under 13.',
    },
    {
      heading: 'Changes to this policy',
      body: 'If what NotifyIQ does with data changes, this policy will be updated in the app before the change takes effect, with a new date at the top.',
    },
    {
      heading: 'Contact',
      body: 'Questions about privacy can be sent to the developer using the contact details on the app’s store listing.',
    },
  ],
};

export const termsOfUse: LegalDocument = {
  key: 'terms',
  title: 'Terms of use',
  summary: 'NotifyIQ helps you organise notifications on your own phone. It is a helper, not a bank, doctor or advisor: always check important details with the original source.',
  sections: [
    {
      heading: 'Using NotifyIQ',
      body: 'By installing or using NotifyIQ you agree to these terms. If you do not agree, please uninstall the app. You may use NotifyIQ on devices you own or are allowed to manage, for your own personal use.',
    },
    {
      heading: 'What NotifyIQ is, and is not',
      bullets: [
        'NotifyIQ keeps and organises a copy of notifications Android shares with it. It does not replace your notification shade and does not control, block or delay notifications.',
        'Android may not share every notification (for example when access is off, when the phone restricts background apps, or when Android hides sensitive content). History can therefore be incomplete.',
      ],
    },
    {
      heading: 'Not financial, medical or legal advice',
      body: 'Money totals, categories, subscriptions, due dates, appointments and other insights are worked out automatically from notification text and may be missing, out of date or wrong. They are for your information only. Before paying a bill, renewing or cancelling a service, going to an appointment or making any financial, medical or legal decision, check the details with your bank, provider or the original message.',
    },
    {
      heading: 'Reminders',
      body: 'Reminders are local alarms scheduled by Android. They are best-effort: Android battery settings, a turned-off phone or removed permissions can delay or prevent them. Do not rely on NotifyIQ as your only reminder for anything important.',
    },
    {
      heading: 'Your responsibilities',
      bullets: [
        'Keep your phone secure with a screen lock. Anyone who can unlock your phone and open NotifyIQ can see its history unless App lock is on.',
        'Notifications can contain other people’s messages and details. Respect their privacy and do not use NotifyIQ to collect information you are not entitled to see.',
        'Only install NotifyIQ from the official store listing or a source you trust. A modified copy may not protect your data.',
      ],
    },
    {
      heading: 'Licence',
      body: 'You receive a personal, non-exclusive, non-transferable licence to use NotifyIQ. You may not resell it, or modify or reverse engineer it to misuse other people’s data. Open-source components included in the app remain under their own licences.',
    },
    {
      heading: 'No warranty',
      body: 'NotifyIQ is provided “as is” and “as available”, without warranties of any kind, to the extent permitted by law. We do not promise that it will capture every notification, be error-free or meet every need.',
    },
    {
      heading: 'Limitation of liability',
      body: 'To the extent permitted by law, the developer is not liable for any indirect or consequential loss, or for loss arising from missed or incorrect notifications, insights or reminders, including late fees, missed appointments or financial decisions. Nothing in these terms limits rights you have under consumer law that cannot be limited.',
    },
    {
      heading: 'Changes and ending use',
      body: 'These terms may be updated with new versions of the app; the date at the top shows the latest version. You can stop using NotifyIQ at any time by turning off Notification access and uninstalling it, which deletes its data from the phone.',
    },
  ],
};

export const securityOverview: LegalDocument = {
  key: 'security',
  title: 'Security',
  summary: 'NotifyIQ is built so your history never leaves your phone, and offers an optional app lock. No app can be perfectly secure, so here is exactly what is protected and what is not.',
  sections: [
    {
      heading: 'How your data is protected',
      bullets: [
        'No network access. NotifyIQ does not have Android’s internet permission, so Android itself blocks it from opening any connection.',
        'Private storage. History is kept in NotifyIQ’s private app storage, which Android isolates from other apps. When your phone is locked, Android’s built-in storage encryption protects it.',
        'Sensitive messages are discarded. OTPs, passwords and card numbers are thrown away before saving, never stored.',
        'No automatic backups or transfers. NotifyIQ data is excluded from cloud backup and phone-to-phone transfer. Backups happen only when you export one, and they are encrypted with your password (AES-256-GCM).',
        'App lock (optional). Requires your fingerprint, face or phone PIN to open NotifyIQ.',
        'Nothing else can start NotifyIQ’s internal parts. Its notification reader, reminders and startup handler are private to the app.',
        'No logs of your content. NotifyIQ’s diagnostic messages contain only error codes, never notification text.',
        'Lock-screen reminders show generic text, never the content of your notifications.',
      ],
    },
    {
      heading: 'What NotifyIQ cannot protect against',
      bullets: [
        'Someone who knows your phone’s PIN or can unlock it. Turn on App lock for an extra step.',
        'Screenshots, screen recording and the recent-apps preview are not blocked, so take care when sharing your screen.',
        'A rooted or compromised phone, or malware with special access to your device.',
        'Modified or fake copies of NotifyIQ from untrusted sources. Install only from the official listing.',
        'The original notifications themselves. They remain in your notification shade and in the apps that sent them.',
        'Rare cases where sensitive text is written in a way the automatic filter does not recognise.',
      ],
    },
    {
      heading: 'Recommended settings',
      bullets: [
        'Use a strong screen lock (PIN, pattern, password or biometrics).',
        'Turn on App lock in the Privacy tab.',
        'Exclude apps whose notifications you never want kept, such as banking or authenticator apps.',
        'Choose a short retention period if you only need recent history.',
      ],
    },
  ],
};

export const legalDocuments = [privacyPolicy, termsOfUse, securityOverview];
