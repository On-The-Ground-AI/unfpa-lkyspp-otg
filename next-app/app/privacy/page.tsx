import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — OTG Clinical AI',
  description: 'Privacy policy for the OTG Clinical AI Android application.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-slate-500 text-sm mb-10">
        OTG Clinical AI · Last updated: April 2026
      </p>

      <div className="prose prose-slate max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Overview</h2>
          <p className="text-slate-600 leading-relaxed">
            OTG Clinical AI is a clinical reference tool developed by On The Ground Pte Ltd in partnership
            with the Lee Kuan Yew School of Public Policy (LKYSPP), National University of Singapore, and
            UNFPA Asia-Pacific. This policy describes how the Android application handles your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Data We Collect</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-200 pl-4">
              <p className="font-medium text-slate-700">Clinical queries (on-device only)</p>
              <p className="text-slate-500 text-sm mt-1">
                Questions you ask the AI are processed entirely on your device by the Gemma 4 model. They are
                never transmitted to external servers. An anonymised audit log is stored locally on the device
                for clinical governance purposes.
              </p>
            </div>
            <div className="border-l-4 border-blue-200 pl-4">
              <p className="font-medium text-slate-700">Knowledge bundle downloads</p>
              <p className="text-slate-500 text-sm mt-1">
                When the app checks for knowledge base updates over Wi-Fi, it contacts our update server.
                No personal or clinical data is transmitted during this process.
              </p>
            </div>
            <div className="border-l-4 border-blue-200 pl-4">
              <p className="font-medium text-slate-700">Crash reports</p>
              <p className="text-slate-500 text-sm mt-1">
                If the app crashes, anonymised diagnostic information (device type, OS version, error stack trace)
                may be collected to help us fix bugs. No clinical query content is included.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Data We Do Not Collect</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li>Patient names, identifiers, or records of any kind</li>
            <li>Your location</li>
            <li>Contact information</li>
            <li>Browsing history or cross-app activity</li>
            <li>Any data sold to or shared with third parties for advertising</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Offline Operation</h2>
          <p className="text-slate-600 leading-relaxed">
            The core AI functionality (chat, drug lookup, clinical protocols) operates entirely offline.
            All AI inference runs on your device using the Gemma 4 model. No queries, responses, or clinical
            data leave the device when using these features.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Data Storage &amp; Security</h2>
          <p className="text-slate-600 leading-relaxed">
            All data stored on your device (knowledge base, audit logs, settings) is stored in the app&apos;s
            private storage directory, inaccessible to other apps. Knowledge bundles are cryptographically
            signed (Ed25519) and verified before installation to ensure integrity.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Your Rights</h2>
          <p className="text-slate-600 leading-relaxed">
            You can clear all locally stored data at any time from the app&apos;s Settings screen
            (&quot;Clear Knowledge Base&quot;). This removes the knowledge index and audit log from your device.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Children</h2>
          <p className="text-slate-600 leading-relaxed">
            This application is intended for use by healthcare professionals and trained health workers aged 18
            and above. We do not knowingly collect data from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Changes to This Policy</h2>
          <p className="text-slate-600 leading-relaxed">
            We may update this policy as the app evolves. Significant changes will be noted in the app&apos;s
            update release notes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-3">Contact</h2>
          <p className="text-slate-600 leading-relaxed">
            Questions about this policy:{' '}
            <a href="mailto:seehaojun@gmail.com" className="text-blue-600 hover:underline">
              seehaojun@gmail.com
            </a>
            <br />
            On The Ground Pte Ltd, Singapore
          </p>
        </section>
      </div>
    </main>
  );
}
