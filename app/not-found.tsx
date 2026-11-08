import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#FBF9F5]">
      <span className="text-4xl mb-4">🏛️</span>
      <h1 className="text-2xl font-serif font-black uppercase tracking-wider text-[#121212] mb-2">
        Page Not Found
      </h1>
      <p className="text-xs text-neutral-500 max-w-sm mb-6">
        The piece or page you are looking for does not exist or has been relocated.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-[#121212] text-white text-xs font-semibold uppercase tracking-widest hover:bg-black transition-all"
      >
        Return to Atelier Home
      </Link>
    </div>
  );
}

