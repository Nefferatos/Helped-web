const contactEmail = "targetmaid1234@gmail.com";

const TermsOfService = () => {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
          <p className="text-sm leading-6 text-slate-600">
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="leading-7 text-slate-700">
            By accessing or using MaidService ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Description of Service</h2>
          <p className="leading-7 text-slate-700">
            MaidService is a platform that connects employers with domestic helper agencies in Singapore.
            We provide tools for browsing helper profiles, submitting hiring requests, managing employment
            contracts, and communicating with agencies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. User Accounts</h2>
          <p className="leading-7 text-slate-700">
            To access certain features, you must create an account. You are responsible for maintaining the
            confidentiality of your account credentials and for all activities that occur under your account.
            You agree to provide accurate and complete information during registration.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Authentication</h2>
          <p className="leading-7 text-slate-700">
            We offer sign-in options including email/password and Google OAuth. When you sign in using
            Google, we receive your name and email address from Google to create and manage your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. User Responsibilities</h2>
          <p className="leading-7 text-slate-700">
            You agree not to misuse the Service, including but not limited to: providing false information,
            attempting to access other users' accounts, using the Service for illegal purposes, or
            interfering with the proper functioning of the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Agency Listings</h2>
          <p className="leading-7 text-slate-700">
            Agency profiles and helper listings are provided by licensed employment agencies. MaidService
            does not guarantee the accuracy of listings and is not a party to any employment agreement
            between users and agencies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
          <p className="leading-7 text-slate-700">
            The Service is provided "as is" without warranties of any kind. We shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Changes to Terms</h2>
          <p className="leading-7 text-slate-700">
            We may update these Terms of Service from time to time. We will notify users of significant
            changes by posting the updated terms on this page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Contact</h2>
          <p className="leading-7 text-slate-700">
            If you have any questions about these terms, contact us at{" "}
            <a
              className="font-medium text-sky-700 underline underline-offset-4"
              href={`mailto:${contactEmail}`}
            >
              {contactEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
};

export default TermsOfService;