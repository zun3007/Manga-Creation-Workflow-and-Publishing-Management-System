import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <p className="font-mono text-6xl text-ink">404</p>
        <p className="mt-3 text-ink-soft">Không tìm thấy trang.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded bg-accent px-4 py-2 text-white"
        >
          Về trang chủ →
        </Link>
      </div>
    </div>
  );
}
