export interface FaqGroup {
  id: string;
  title: string;
  items: { q: string; a: string }[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "viajes",
    title: "Viajes",
    items: [
      {
        q: "¿Qué servicios están disponibles al lanzamiento?",
        a: "Arrancamos con mototaxi, taxi y delivery. Cuando estos servicios piloto estén ajustados, sumamos minivan, autobús y carga por fases. Puedes dejar tu contacto para avisarte cuando se abran.",
      },
      {
        q: "¿Cómo pido un viaje?",
        a: "Abre la app, elige el servicio, confirma el punto de recogida y el destino. Antes de pedir verás el precio estimado, el tiempo de llegada y el tipo de unidad.",
      },
      {
        q: "¿El precio puede cambiar después de confirmar?",
        a: "No para el trayecto confirmado. Solo cambia si añades paradas o cambias el destino, y en ese caso la app te muestra el nuevo monto antes de aceptar.",
      },
      {
        q: "¿Puedo cancelar?",
        a: "Sí, antes de que el conductor llegue no tiene costo. Si cancela después de que el conductor esté en el punto de recogida, puede aplicar un cargo por tiempo de espera.",
      },
      {
        q: "¿Cómo comparto mi ruta?",
        a: "En el viaje activo toca \"Compartir ruta\" y envía el enlace por WhatsApp. La persona verá la unidad y el avance en tiempo real, sin necesidad de tener la app.",
      },
    ],
  },
  {
    id: "pagos",
    title: "Pagos y tarifas",
    items: [
      {
        q: "¿Puedo pagar en bolívares?",
        a: "Sí. El precio se muestra en dólares y su equivalente en bolívares a la tasa BCV del día. Puedes pagar en efectivo en cualquiera de las dos monedas o con saldo Llégate.",
      },
      {
        q: "¿De dónde sale la tasa BCV?",
        a: "De una única fuente oficial que se actualiza a diario. La misma tasa se usa en la app, la web y el recibo del viaje para evitar diferencias.",
      },
      {
        q: "¿Cómo recibo el comprobante?",
        a: "Al terminar el viaje verás el detalle en la app: recorrido, tiempo, monto y tasa aplicada. Puedes descargarlo o enviarlo por correo.",
      },
      {
        q: "¿Cuál es la tarifa mínima?",
        a: "Mototaxi y delivery arrancan en $1 por carrera; taxi pana en $3. A ese mínimo se suma el costo por kilómetro. Cada ciudad puede ajustar el mínimo según sus costos y la app muestra el de tu zona antes de confirmar.",
      },
      {
        q: "¿Cómo se cobra una ida y vuelta?",
        a: "Se suman los kilómetros de ida y de regreso a la misma tarifa por km, y la tarifa mínima se cobra una sola vez. En la calculadora puedes activar «Ida y vuelta» para ver el total.",
      },
      {
        q: "¿Los precios incluyen recargos?",
        a: "El estimado incluye la tarifa mínima de tu ciudad y la distancia. Si hay recargo nocturno o por paradas, aparece desglosado antes de confirmar.",
      },
    ],
  },
  {
    id: "conductores",
    title: "Conductores",
    items: [
      {
        q: "¿Qué necesito para manejar con Llégate?",
        a: "Ser mayor de edad, tener licencia vigente, cédula, vehículo en regla y aprobar la verificación de documentos y antecedentes. El registro se hace en tres pasos desde la web o la app.",
      },
      {
        q: "¿Cuánto cuesta trabajar con Llégate?",
        a: "Arrancas con $2 de saldo de bienvenida. Cada viaje completado descuenta una comisión del 10% de la tarifa (mínimo $0,10) desde tu saldo prepago. No hay mensualidad ni cuota de inscripción.",
      },
      {
        q: "¿Cómo recargo mi saldo?",
        a: "Con Pago Móvil o Binance desde la app. Las recargas empiezan en $5 y se aprueban manualmente; el piloto se compromete a revisarlas en 15 minutos o menos. El saldo no vence.",
      },
      {
        q: "¿Qué pasa si me quedo sin saldo?",
        a: "Con menos de $1 disponible no puedes aceptar viajes nuevos. Si ya tienes un viaje activo, puedes terminarlo: la comisión se descuenta al finalizar y queda el recibo. Después recargas para volver a conectarte.",
      },
      {
        q: "¿Cuándo recibo mis ganancias?",
        a: "Los viajes en efectivo los cobras directamente. El saldo de viajes con pago digital se puede transferir a tu cuenta al finalizar cada semana.",
      },
      {
        q: "¿Puedo manejar en varias ciudades?",
        a: "Sí, según tu verificación y la cobertura disponible. El prepago no limita las ciudades: no hay un plan mensual que tenga que pagar para operar en otra zona.",
      },
      {
        q: "¿Puedo pedir un reembolso de mi saldo?",
        a: "Antes de cobrar dinero real definiremos y publicaremos la política de reembolsos, la vigencia del saldo y el tratamiento del IGTF con asesoría legal. En esta simulación no se mueve dinero.",
      },
      {
        q: "¿Conductoras Rosa tiene un costo aparte?",
        a: "No. La verificación Rosa es gratuita y no cambia la comisión del 10% por viaje. Es una preferencia de asignación, no un plan mensual.",
      },
    ],
  },
  {
    id: "seguridad",
    title: "Seguridad",
    items: [
      {
        q: "¿Cómo verifican a los conductores?",
        a: "Revisamos identidad, licencia, documentos del vehículo y antecedentes antes de activar la cuenta. La verificación se renueva cada año y el perfil muestra el estado actualizado.",
      },
      {
        q: "¿Qué hago en una emergencia durante un viaje?",
        a: "Usa el botón de emergencia de la app para compartir tu ubicación con tus contactos y llamar a los servicios de emergencia. Nuestro equipo recibe la alerta y contacta al conductor.",
      },
      {
        q: "¿Puedo viajar con el modo Conductoras Rosa?",
        a: "Sí. Las pasajeras pueden elegir conductoras verificadas en el modo Rosa. Es una preferencia de asignación, sujeta a disponibilidad en tu zona.",
      },
      {
        q: "¿Los viajes están asegurados?",
        a: "Cada viaje incluye cobertura de responsabilidad civil según las condiciones del servicio. El detalle está en los términos y condiciones de la app.",
      },
    ],
  },
  {
    id: "app",
    title: "La app",
    items: [
      {
        q: "¿Cuándo estará disponible la app?",
        a: "Estamos en la etapa de lanzamiento. Puedes dejar tu contacto para recibir el enlace de descarga el día que se publique en tu plataforma. Mientras tanto, prueba la demo interactiva en esta web.",
      },
      {
        q: "¿En qué teléfonos funciona?",
        a: "Está pensada para Android 8 o superior e iOS 15 o superior, con al menos 2 GB de memoria disponible. La demo web funciona en cualquier navegador actual.",
      },
      {
        q: "¿Qué datos piden al registrarme?",
        a: "Nombre, teléfono y correo. Para viajar, el número de cédula se usa solo para verificar identidad y no se muestra a otros usuarios.",
      },
      {
        q: "¿Puedo pedir un viaje desde la web?",
        a: "La web es informativa y de demostración. Los viajes reales se piden desde la app, para que puedas compartir tu ubicación y usar el botón de emergencia.",
      },
    ],
  },
  {
    id: "mercado",
    title: "Mercado Motor",
    items: [
      {
        q: "¿Qué es el Mercado Motor?",
        a: "Un directorio de repuestos, talleres, cauchos, grúas y accesorios verificados. Puedes buscar por categoría y ciudad, y contactar al negocio desde la misma página.",
      },
      {
        q: "¿Cómo publico mi negocio?",
        a: "Envía el formulario con los datos del negocio y el servicio que ofreces. Revisamos la información y te contactamos para verificar la ficha antes de publicarla.",
      },
      {
        q: "¿Qué significa el sello Verificado?",
        a: "Que revisamos los datos del negocio, su dirección y un canal de contacto. No es una garantía de resultados: siempre confirma condiciones y precios antes de pagar.",
      },
      {
        q: "¿Llégate cobra por publicar?",
        a: "La ficha básica es gratuita durante el lanzamiento. Los planes de visibilidad destacada son opcionales y se muestran con la etiqueta Patrocinado.",
      },
    ],
  },
];

export const HOME_FAQ_IDS = ["viajes", "pagos", "app"];

export const homeFaqs = FAQ_GROUPS.filter((g) => HOME_FAQ_IDS.includes(g.id));
