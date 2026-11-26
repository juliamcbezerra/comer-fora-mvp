export default function DiagnosticoLoading() {
  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      <div className="h-8 bg-[#1E1E1E]" />
      <div className="h-16 border-b border-neutral-200 bg-white" />

      <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-44 rounded bg-neutral-200" />
          <div className="flex gap-2">
            <div className="h-9 w-36 rounded-lg bg-neutral-200" />
            <div className="h-9 w-36 rounded-lg bg-neutral-200" />
          </div>
        </div>

        {/* Cabeçalho + 5 KPIs */}
        <div className="mt-4 rounded-xl border border-neutral-200/80 bg-white p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="space-y-2.5">
              <div className="h-3 w-36 rounded bg-neutral-200" />
              <div className="h-8 w-64 rounded bg-neutral-200" />
              <div className="h-4 w-96 max-w-full rounded bg-neutral-100" />
            </div>
            <div className="h-11 w-48 rounded-lg bg-neutral-200" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-neutral-200/80 bg-neutral-50/60 p-4"
              >
                <div className="h-3 w-24 rounded bg-neutral-200" />
                <div className="mt-2.5 h-6 w-20 rounded bg-neutral-200" />
                <div className="mt-2 h-2.5 w-28 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Faixa Editorial */}
        <div className="my-7 border-l-[3px] border-neutral-300 py-1 pl-5 md:pl-6">
          <div className="h-3.5 w-64 rounded bg-neutral-200" />
          <div className="mt-3 space-y-2">
            <div className="h-5 w-full max-w-4xl rounded bg-neutral-200/80" />
            <div className="h-5 w-5/6 max-w-3xl rounded bg-neutral-200/70" />
          </div>
        </div>

        {/* 2 colunas */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, col) => (
            <div
              key={col}
              className="rounded-xl border border-neutral-200/80 bg-white p-6"
            >
              <div className="h-5 w-48 rounded bg-neutral-200" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((__, row) => (
                  <div
                    key={row}
                    className="h-20 rounded-lg border border-neutral-100 bg-neutral-50"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
