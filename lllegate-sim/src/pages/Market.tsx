import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Clock,
  Filter,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Store,
  Wrench,
  X,
} from "lucide-react";
import {
  Accordion,
  Badge,
  Button,
  Eyebrow,
  PageHero,
  SectionHead,
} from "../components/ui";
import { VendorCard } from "../components/VendorCard";
import { useUI } from "../lib/ui";
import { VENDORS, VENDOR_CATEGORIES, getVendor } from "../data/vendors";
import { FAQ_GROUPS } from "../data/faqs";

export function MercadoPage() {
  const { openModal } = useUI();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("Todas");
  const [city, setCity] = useState("Todas");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const cities = useMemo(() => ["Todas", ...Array.from(new Set(VENDORS.map((v) => v.city)))], []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VENDORS.filter((v) => {
      const matchQuery =
        !q ||
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        v.zone.toLowerCase().includes(q);
      const matchCategory = category === "Todas" || v.category === category;
      const matchCity = city === "Todas" || v.city === city;
      return matchQuery && matchCategory && matchCity && (!verifiedOnly || v.verified);
    });
  }, [query, category, city, verifiedOnly]);

  const hasFilters = query || category !== "Todas" || city !== "Todas" || verifiedOnly;

  return (
    <>
      <PageHero
        kicker="Mercado Motor"
        title={
          <>
            Lo que tu carro
            <br />
            necesita, cerca.
          </>
        }
        description="Repuestos, talleres, cauchos, grúas, lubricantes y accesorios. Fichas con datos verificables y contacto directo, sin intermediarios."
        crumbs={[{ label: "Mercado", to: "/mercado" }]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "publish" })}>
              <Store className="h-4 w-4" /> Publicar mi negocio
            </Button>
            <Button size="lg" variant="secondary" onClick={() => openModal({ type: "lead", intent: "contacto" })}>
              Hablar con el equipo
            </Button>
          </>
        }
        aside={
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mono text-[24px] font-semibold text-white">{VENDORS.length}</p>
              <p className="text-[10.5px] text-ink-400">negocios de ejemplo</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mono text-[24px] font-semibold text-white">{VENDOR_CATEGORIES.length}</p>
              <p className="text-[10.5px] text-ink-400">categorías</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mono text-[24px] font-semibold text-white">{cities.length - 1}</p>
              <p className="text-[10.5px] text-ink-400">ciudades</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="mono text-[24px] font-semibold text-emerald-400">
                {VENDORS.filter((v) => v.verified).length}
              </p>
              <p className="text-[10.5px] text-ink-400">fichas verificadas</p>
            </div>
            <p className="col-span-2 text-[10.5px] leading-relaxed text-ink-500">
              Directorio de demostración. Los negocios y ofertas son ficticios.
            </p>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca por negocio, zona o servicio..."
                className="field pl-10"
                aria-label="Buscar negocios"
              />
            </div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="field appearance-none lg:w-[180px]"
              aria-label="Filtrar por ciudad"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c === "Todas" ? "Todas las ciudades" : c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              aria-pressed={verifiedOnly}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 text-[12.5px] font-semibold transition ${
                verifiedOnly
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/12 bg-white/[0.03] text-ink-300 hover:border-white/25"
              }`}
            >
              <BadgeCheck className="h-4 w-4" /> Solo verificados
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {["Todas", ...VENDOR_CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`min-h-[40px] rounded-full border px-3.5 text-[12px] font-semibold transition ${
                  category === c
                    ? "border-brand-500 bg-brand-500/15 text-white"
                    : "border-white/12 bg-white/[0.025] text-ink-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-3">
            <p className="flex items-center gap-1.5 text-[11.5px] text-ink-400">
              <Filter className="h-3.5 w-3.5" /> {filtered.length} de {VENDORS.length} negocios
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("Todas");
                  setCity("Todas");
                  setVerifiedOnly(false);
                }}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-400 hover:text-brand-300"
              >
                <X className="h-3.5 w-3.5" /> Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((vendor) => (
              <VendorCard key={vendor.slug} vendor={vendor} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <Wrench className="mx-auto h-8 w-8 text-ink-500" />
            <p className="heading mt-3 text-[18px] font-bold text-white">No encontramos negocios con esos filtros</p>
            <p className="mt-1 text-[13px] text-ink-400">Prueba con otra categoría o ciudad.</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setQuery("");
                setCategory("Todas");
                setCity("Todas");
                setVerifiedOnly(false);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Cómo funciona"
            title="Busca, verifica y contacta."
            text="No intermediamos el pago ni la conversación: conectamos al negocio con el conductor o pasajero."
            align="center"
          />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { title: "1. Filtra", text: "Por categoría, ciudad y sello de verificación." },
              { title: "2. Revisa", text: "Lee la ficha, la oferta y el horario del negocio." },
              { title: "3. Contacta", text: "Envía tu consulta y confirma precios directamente." },
            ].map((item) => (
              <div key={item.title} className="card p-5">
                <span className="stripe-mark" aria-hidden="true" />
                <h3 className="heading mt-3 text-[17px] font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-300">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[11.5px] leading-relaxed text-ink-500">
            El sello Verificado indica que revisamos datos de contacto y dirección, no una garantía de resultados.
            Siempre confirma condiciones, precios y garantías con el negocio antes de pagar.
          </p>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-brand-500/25 bg-brand-500/[0.06] p-6 sm:flex-row sm:items-center">
          <div>
            <p className="heading text-[20px] font-bold text-white">¿Tienes un taller o repuestera?</p>
            <p className="mt-1 text-[13px] text-ink-300">
              Publica tu ficha gratis durante el lanzamiento y aparece en las búsquedas.
            </p>
          </div>
          <Button onClick={() => openModal({ type: "publish" })}>
            <Store className="h-4 w-4" /> Publicar negocio
          </Button>
        </div>
      </section>
    </>
  );
}

export function VendorDetailPage() {
  const { slug } = useParams();
  const vendor = getVendor(slug);
  const { openModal } = useUI();

  if (!vendor) {
    return (
      <section className="wrap py-24 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">Mercado Motor</p>
        <h1 className="heading mt-3 text-[34px] font-bold text-white">No encontramos ese negocio</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-ink-300">
          Puede que la ficha haya cambiado de enlace. Explora el directorio completo.
        </p>
        <Button to="/mercado" className="mt-6">
          Ver el mercado <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    );
  }

  const related = VENDORS.filter((v) => v.slug !== vendor.slug).slice(0, 3);

  return (
    <>
      <PageHero
        kicker={`${vendor.category} · ${vendor.city}`}
        title={vendor.name}
        description={vendor.description}
        crumbs={[
          { label: "Mercado", to: "/mercado" },
          { label: vendor.name, to: `/mercado/negocio/${vendor.slug}` },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "vendor", vendorSlug: vendor.slug })}>
              <MessageCircle className="h-4 w-4" /> Contactar al negocio
            </Button>
            <Button size="lg" variant="secondary" to="/mercado">
              Ver más negocios
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{vendor.category}</Badge>
              {vendor.verified && (
                <Badge tone="success">
                  <BadgeCheck className="h-3 w-3" /> Verificado
                </Badge>
              )}
              {vendor.sponsored && <Badge tone="yellow">Patrocinado</Badge>}
            </div>
            <div className="mt-4 grid gap-2 text-[12.5px] text-ink-300">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-400" /> {vendor.zone}, {vendor.city}
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-400" /> {vendor.hours}
              </p>
              <p className="flex items-center gap-2">
                <Store className="h-4 w-4 text-brand-400" /> {vendor.priceLabel}
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] p-3 text-[12px] leading-relaxed text-ink-200">
              <span className="font-semibold text-white">Oferta: </span>
              {vendor.offer}
            </div>
            <Button className="mt-4 w-full" onClick={() => openModal({ type: "vendor", vendorSlug: vendor.slug })}>
              Enviar mensaje
            </Button>
            <p className="mt-2 text-center text-[10px] text-ink-500">Simulación: el mensaje no se envía.</p>
          </div>
        }
      />

      <section className="wrap grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <Eyebrow>La ficha</Eyebrow>
          <h2 className="heading mt-3 text-[26px] font-bold text-white">Qué ofrece</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-ink-300">{vendor.description}</p>

          <div className="mt-6">
            <h3 className="heading text-[18px] font-bold text-white">Por qué aparece en Llégate</h3>
            <ul className="mt-3 grid gap-2.5">
              {vendor.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-[13.5px] text-ink-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" strokeWidth={3} /> {perk}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-2xl border border-racing-500/20 bg-racing-500/[0.04] p-4">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-racing-500" />
              La ficha es informativa. Llégate no procesa el pago ni garantiza el servicio del negocio. Confirma
              precios, disponibilidad y garantía antes de pagar.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Cómo contactar</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-300">
              Envía una consulta desde esta ficha. En producción, el negocio recibiría tu mensaje y respondería por el
              canal que dejaste.
            </p>
            <Button className="mt-4 w-full" onClick={() => openModal({ type: "vendor", vendorSlug: vendor.slug })}>
              <MessageCircle className="h-4 w-4" /> Escribir al negocio
            </Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => openModal({ type: "publish" })}>
              Tengo un negocio similar
            </Button>
          </div>
          <div className="card mt-3 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Verificación</p>
            <ul className="mt-2 grid gap-1.5 text-[12px] text-ink-300">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> Datos de contacto revisados
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> Dirección declarada
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> Categoría confirmada
              </li>
            </ul>
            <p className="mt-3 border-t border-white/8 pt-2 text-[10.5px] leading-relaxed text-ink-500">
              El sello no implica una relación comercial ni una garantía de resultados.
            </p>
          </div>
        </aside>
      </section>

      <section className="border-t border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead
            kicker="Mercado Motor"
            title="Otros negocios cerca"
            action={
              <Link to="/mercado" className="text-[13px] font-semibold text-brand-400">
                Ver todos
              </Link>
            }
          />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((v) => (
              <VendorCard key={v.slug} vendor={v} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function PublicarPage() {
  const { openModal } = useUI();
  const faqs = FAQ_GROUPS.find((g) => g.id === "mercado")!.items;

  return (
    <>
      <PageHero
        kicker="Mercado Motor"
        title={
          <>
            Tu negocio,
            <br />
            donde se mueve la ciudad.
          </>
        }
        description="Publica tu taller, repuestera, cauchos, grúa o accesorios. La ficha básica es gratuita durante el lanzamiento y revisamos cada negocio antes de publicarlo."
        crumbs={[
          { label: "Mercado", to: "/mercado" },
          { label: "Publicar", to: "/mercado/publicar" },
        ]}
        actions={
          <>
            <Button size="lg" onClick={() => openModal({ type: "publish" })}>
              <Store className="h-4 w-4" /> Publicar mi negocio
            </Button>
            <Button size="lg" variant="secondary" to="/mercado">
              Ver el mercado
            </Button>
          </>
        }
        aside={
          <div className="card p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">Ficha básica</p>
            <p className="mono mt-2 text-[30px] font-semibold text-white">Gratis</p>
            <p className="text-[12px] text-ink-400">durante el lanzamiento</p>
            <ul className="mt-3 grid gap-1.5 border-t border-white/8 pt-3 text-[12px] text-ink-300">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> Aparece en búsquedas
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> Categoría y ciudad
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-brand-400" /> Contacto directo
              </li>
            </ul>
          </div>
        }
      />

      <section className="wrap py-12 sm:py-16">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Visibilidad", text: "Aparece cuando alguien busca tu categoría o ciudad." },
            { title: "Confianza", text: "El sello Verificado distingue las fichas revisadas." },
            { title: "Contacto directo", text: "El cliente te escribe sin intermediarios." },
            { title: "Sin costo inicial", text: "Publicar la ficha básica no cuesta durante el lanzamiento." },
          ].map((item) => (
            <div key={item.title} className="card p-5">
              <span className="stripe-mark" aria-hidden="true" />
              <h3 className="heading mt-3 text-[16px] font-bold text-white">{item.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-300">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/8 bg-ink-900">
        <div className="wrap py-12 sm:py-16">
          <SectionHead kicker="Visibilidad" title="Elige cómo aparecer" text="Dos opciones simples. La destacada es opcional." />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="card p-5">
              <Badge tone="neutral">Básica</Badge>
              <p className="mono mt-3 text-[28px] font-semibold text-white">$0</p>
              <p className="text-[12px] text-ink-400">durante el lanzamiento</p>
              <ul className="mt-3 grid gap-2 text-[12.5px] text-ink-300">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand-400" /> Búsqueda por categoría y ciudad</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand-400" /> Ficha con contacto</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-brand-400" /> Revisión antes de publicar</li>
              </ul>
              <Button className="mt-4 w-full" variant="secondary" onClick={() => openModal({ type: "publish" })}>
                Publicar gratis
              </Button>
            </div>
            <div className="card border-racing-500/30 p-5">
              <div className="flex items-center justify-between">
                <Badge tone="yellow">Destacada</Badge>
                <span className="text-[10px] uppercase tracking-wide text-ink-500">Ejemplo</span>
              </div>
              <p className="mono mt-3 text-[28px] font-semibold text-white">$19 <span className="text-[12px] font-normal text-ink-400">/ mes</span></p>
              <p className="text-[12px] text-ink-400">precio de demostración</p>
              <ul className="mt-3 grid gap-2 text-[12.5px] text-ink-300">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-racing-500" /> Primera posición en su categoría</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-racing-500" /> Sello Patrocinado</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-racing-500" /> Ficha con oferta destacada</li>
              </ul>
              <Button className="mt-4 w-full" onClick={() => openModal({ type: "publish" })}>
                Quiero destacar
              </Button>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] text-ink-500">
            El plan destacado no se cobra en esta simulación. En producción, la contratación se haría desde la app o
            con el equipo comercial.
          </p>
        </div>
      </section>

      <section className="wrap grid gap-8 py-12 sm:py-16 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <Eyebrow>Revisión</Eyebrow>
          <h2 className="heading mt-3 text-[28px] font-bold text-white sm:text-[34px]">Qué revisamos antes de publicar</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-400">
            Queremos que las fichas sean útiles de verdad. Revisamos que la información sea verificable y que la oferta
            coincida con la categoría.
          </p>
          <Button className="mt-4" onClick={() => openModal({ type: "publish" })}>
            Enviar mi ficha <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <Accordion items={faqs} />
      </section>
    </>
  );
}
