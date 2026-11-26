export default function RevisaoLoading() {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="h-8 bg-[#1E1E1E]" />
      <div className="h-16 border-b border-neutral-200 bg-white" />

      <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-44 rounded bg-neutral-200" />
          <div className="flex gap-2">
            <div className="h-9 w-40 rounded-lg bg-neutral-200" />
            <div className="h-9 w-32 rounded-lg bg-neutral-200" />
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-6 sm:p-8 lg:col-span-7">
            <div className="space-y-2.5 border-b border-neutral-100 pb-5">
              <div className="h-6 w-48 rounded bg-neutral-200" />
              <div className="h-7 w-72 rounded bg-neutral-200" />
            </div>
            <div className="mt-5 h-16 rounded-lg bg-neutral-100" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-neutral-100" />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-6">
              <div className="mx-auto h-5 w-40 rounded bg-neutral-200" />
              <div className="mx-auto mt-4 h-7 w-56 rounded bg-neutral-200" />
              <div className="mx-auto mt-6 h-48 w-48 rounded-xl bg-neutral-100" />
              <div className="mt-6 h-10 w-full rounded-lg bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
