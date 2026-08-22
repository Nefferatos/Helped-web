const contactEmail = "targetmaid1234@gmail.com";

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm leading-6 text-slate-600">
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Information We Collect</h2>
          <p className="leading-7 text-slate-700">
            When you create an account, we collect your name, email address, and phone number.
            When you sign in with Google, we receive your Google name and email address.
            When you sign in with Facebook, we receive your Facebook name and email address.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How We Use Your Information</h2>
          <p className="leading-7 text-slate-700">
            We use your information to provide and improve our services, including authentication,
            account management, matching you with domestic helper agencies, processing hiring requests,
            and communicating with you about your account and our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data Sharing</h2>
          <p className="leading-7 text-slate-700">
            We share your information with partner agencies only when you submit a hiring request or
            enquiry. We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data Protection</h2>
          <p className="leading-7 text-slate-700">
            We take reasonable measures to protect your information and limit access to authorized use
            only. Your data is stored securely and encrypted in transit.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your Rights</h2>
          <p className="leading-7 text-slate-700">
            You may request access to, correction of, or deletion of your personal data at any time
            by contacting us. You can also delete your account from your profile settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="leading-7 text-slate-700">
            If you have any questions about this policy, contact us at{" "}
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

export default PrivacyPolicy;