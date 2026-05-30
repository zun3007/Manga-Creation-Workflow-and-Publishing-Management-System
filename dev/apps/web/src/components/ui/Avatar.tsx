function initials(n = "") {
  return n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-lg border border-line object-cover"
      />
    );
  }
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-bg font-mono text-[0.6rem]">
      {initials(name)}
    </span>
  );
}
