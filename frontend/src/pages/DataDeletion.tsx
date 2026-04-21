const contactEmail = "targetmaid1234@gmail.com";

const DataDeletion = () => {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto flex max-w-[800px] flex-col gap-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Data Deletion Instructions</h1>
          <p className="text-sm leading-6 text-slate-600">
            To request deletion of data associated with Facebook Login, please follow the steps below.
          </p>
        </header>

        <section className="space-y-4">
          <ol className="list-decimal space-y-3 pl-6 leading-7 text-slate-700">
            <li>
              Email{" "}
              <a
                className="font-medium text-sky-700 underline underline-offset-4"
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
              .
            </li>
            <li>Use the subject line: "Data Deletion Request".</li>
            <li>Include your Facebook name and email address in the message.</li>
          </ol>
          <p className="leading-7 text-slate-700">
            We will process deletion requests within 7 days.
          </p>
        </section>
      </div>
    </main>
  );
};

export default DataDeletion;
