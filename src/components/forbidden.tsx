// src/components/forbidden.tsx
export function Forbidden({
  backHref,
  backLabel = "Orqaga qaytish",
}: {
  backHref: string;
  backLabel?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-500"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{"Ruxsat yo'q!"}</h1>

        <p className="mt-3 text-gray-600">
          {"Sizda ushbu sahifani ko'rish uchun ruxsat mavjud emas."}
        </p>

        <p className="mt-2 text-sm text-gray-500">
          Ruxsat olish uchun administrator bilan bog&apos;laning.
        </p>

        <a
          href={backHref}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          {backLabel}
        </a>
      </div>
    </main>
  );
}
