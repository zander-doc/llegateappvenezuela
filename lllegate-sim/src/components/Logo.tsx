import { Link } from "react-router-dom";

const MARCA = {
  horizontal: { src: "/assets/marca/llegateapp-horizontal.png", width: 1250, height: 400 },
  redondo: { src: "/assets/marca/llegateapp-redondo.png", width: 1200, height: 1200 },
  logo2: { src: "/assets/marca/logo-2.png", width: 1200, height: 1200 },
} as const;

export function Logo({
  className = "h-8",
  link = true,
  forma = "horizontal",
}: {
  className?: string;
  link?: boolean;
  forma?: keyof typeof MARCA;
}) {
  const marca = MARCA[forma];
  const img = (
    <img
      src={marca.src}
      alt="Llégate App — Tu carrera con panas"
      className={`${className} w-auto`}
      width={marca.width}
      height={marca.height}
    />
  );
  if (!link) return img;
  return (
    <Link to="/" aria-label="Llégate App, ir al inicio" className="inline-flex min-h-11 shrink-0 items-center">
      {img}
    </Link>
  );
}
