import { Link } from "react-router-dom";

export function Logo({ className = "h-8", link = true }: { className?: string; link?: boolean }) {
  const img = (
    <img
      src="/assets/aistudio/logo-2_5e250e49.png"
      alt="Llégate App — Tu carrera con panas"
      className={`${className} w-auto`}
      width={1860}
      height={450}
    />
  );
  if (!link) return img;
  return (
    <Link to="/" aria-label="Llégate App, ir al inicio" className="inline-flex min-h-11 shrink-0 items-center">
      {img}
    </Link>
  );
}
