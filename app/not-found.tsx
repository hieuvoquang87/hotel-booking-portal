import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-gray-600">The page you&#39;re looking for doesn&#39;t exist or has moved.</p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Browse hotels
      </Link>
    </main>
  );
}
