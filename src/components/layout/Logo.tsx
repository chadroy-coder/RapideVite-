export function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.png"
      alt="RapideVite"
      className={`${className} object-contain`}
    />
  );
}
