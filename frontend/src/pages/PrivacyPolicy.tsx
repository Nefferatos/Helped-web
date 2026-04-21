const contactEmail = "targetmaid1234@gmail.com";

const PrivacyPolicy = () => {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
          <p className="text-sm leading-6 text-slate-600">
            This page explains what information we collect through Facebook Login and how we use it.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Information Collected</h2>
          <p className="leading-7 text-slate-700">
            When you sign in with Facebook, we may collect your Facebook name and email address.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How We Use Your Information</h2>
          <p className="leading-7 text-slate-700">
            We use this information only for authentication and account access within the app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data Protection</h2>
          <p className="leading-7 text-slate-700">
            We take reasonable measures to protect your information and limit access to authorized use
            only.
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
