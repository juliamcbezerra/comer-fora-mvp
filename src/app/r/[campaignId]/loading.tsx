export default function MobileRedemptionLoading() {
  return (
    <div className="min-h-screen bg-[#F7F7F7] px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-md animate-pulse overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="h-1.5 w-full bg-[#EA1D2C]/60" />
        <div className="border-b border-neutral-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 rounded bg-neutral-200" />
            <div className="h-5 w-20 rounded bg-neutral-100" />
          </div>
          <div className="mt-4 h-6 w-52 rounded bg-neutral-200" />
          <div className="mt-2 h-3.5 w-44 rounded bg-neutral-100" />
        </div>
        <div className="space-y-4 p-6">
          <div className="h-5 w-3/4 rounded bg-neutral-200" />
          <div className="h-14 rounded-lg bg-neutral-100" />
          <div className="h-10 rounded-lg bg-neutral-100" />
          <div className="h-16 rounded-lg bg-neutral-100" />
          <div className="h-12 rounded-lg bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
