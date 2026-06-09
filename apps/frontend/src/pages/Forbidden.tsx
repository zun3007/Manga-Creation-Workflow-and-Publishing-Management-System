import { Link } from "react-router-dom";
import { Panel } from "../components/ui/Panel";

export default function Forbidden() {
  return (
    <div className="grid h-full place-items-center p-8 bg-bg">
      <Panel className="p-8 text-center max-w-md">
        <h1 className="text-3xl text-ink mb-4">403</h1>
        <p className="text-ink mb-6">Không có quyền truy cập</p>
        <Link
          to="/"
          className="inline-block rounded bg-accent px-4 py-2 text-white hover:bg-accent/90 transition"
        >
          Về Trang chủ
        </Link>
      </Panel>
    </div>
  );
}
