export default function PlanejarLoading() {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="h-8 bg-[#1E1E1E]" />
      <div className="h-16 border-b border-neutral-200 bg-white" />

      <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6">
        <div className="h-4 w-44 rounded bg-neutral-200" />

        <div className="mt-4 grid gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-6 sm:p-8 lg:col-span-8">
            <div className="space-y-2.5 border-b border-neutral-100 pb-5">
              <div className="h-3.5 w-40 rounded bg-neutral-200" />
              <div className="h-7 w-72 rounded bg-neutral-200" />
              <div className="h-4 w-96 max-w-full rounded bg-neutral-100" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg border border-neutral-100 bg-neutral-50"
                />
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-11 rounded-lg bg-neutral-100" />
                <div className="h-11 rounded-lg bg-neutral-100" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="h-11 rounded-lg bg-neutral-100" />
                <div className="h-11 rounded-lg bg-neutral-100" />
                <div className="h-11 rounded-lg bg-neutral-100" />
              </div>
              <div className="h-24 rounded-lg bg-neutral-100" />
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-6">
              <div className="h-5 w-40 rounded bg-neutral-200" />
              <div className="mt-4 space-y-3">
                <div className="h-24 rounded-lg bg-neutral-100" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-lg bg-neutral-100" />
                  <div className="h-20 rounded-lg bg-neutral-100" />
                </div>
                <div className="h-16 rounded-lg bg-neutral-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
