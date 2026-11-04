export interface VenezuelaState {
  id: string;
  name: string;
  cities: string[];
}

export const VENEZUELA_LOCATIONS: VenezuelaState[] = [
  {
    id: 'distrito_capital',
    name: 'Distrito Capital (Caracas)',
    cities: [
      'Caracas Centro',
      'Catia / Sucre',
      'El Valle / Coche',
      'El Recreo / Sabana Grande',
      'San Pedro / Los Chaguaramos',
      'Caricuao',
      'Antímano / La Vega',
      '23 de Enero',
      'Macarao',
      'La Pastora / Altagracia'
    ]
  },
  {
    id: 'miranda',
    name: 'Miranda (Gran Caracas & Valles)',
    cities: [
      'Chacao',
      'Baruta / Las Mercedes',
      'El Hatillo',
      'Petare / Sucre',
      'Los Teques (Altos Mirandinos)',
      'San Antonio de los Altos',
      'Carrizal',
      'Guarenas',
      'Guatire',
      'Charallave (Valles del Tuy)',
      'Cúa',
      'Ocumare del Tuy',
      'Santa Teresa del Tuy',
      'Higuerote (Barlovento)',
      'Río Chico',
      'Caucagua'
    ]
  },
  {
    id: 'la_guaira',
    name: 'La Guaira (Vargas)',
    cities: [
      'Maiquetía (Aeropuerto)',
      'Catia La Mar',
      'La Guaira (Puerto)',
      'Macuto',
      'Caraballeda',
      'Naiguatá',
      'Carayaca',
      'Chuspa / Todasana'
    ]
  },
  {
    id: 'carabobo',
    name: 'Carabobo',
    cities: [
      'Valencia',
      'Naguanagua',
      'San Diego',
      'Guacara',
      'Puerto Cabello',
      'Los Guayos',
      'Mariara (Diego Ibarra)',
      'Morón (Juan José Mora)',
      'Tocuyito (Libertador)',
      'Bejuma',
      'Güigüe (Carlos Arvelo)',
      'Miranda (Carabobo)',
      'Montalbán',
      'San Joaquín'
    ]
  },
  {
    id: 'aragua',
    name: 'Aragua',
    cities: [
      'Maracay',
      'Turmero (Mariño)',
      'Cagua (Sucre)',
      'La Victoria (Ribas)',
      'El Limón (Mario Briceño)',
      'Villa de Cura (Zamora)',
      'Palo Negro (Libertador)',
      'Santa Cruz (Lamas)',
      'San Mateo (Bolívar)',
      'Ocumare de la Costa',
      'Choroní',
      'San Casimiro',
      'Colonia Tovar',
      'San Sebastián de los Reyes',
      'Barbacoas'
    ]
  },
  {
    id: 'lara',
    name: 'Lara',
    cities: [
      'Barquisimeto',
      'Cabudare (Palavecino)',
      'Carora (Torres)',
      'El Tocuyo (Morán)',
      'Quíbor (Jiménez)',
      'Duaca (Crespo)',
      'Sanare (Andrés Eloy Blanco)',
      'Siquisique (Urdaneta)',
      'Sarare (Simón Planas)',
      'Cubiro',
      'Curarigua'
    ]
  },
  {
    id: 'zulia',
    name: 'Zulia',
    cities: [
      'Maracaibo',
      'San Francisco',
      'Cabimas (Costa Oriental)',
      'Ciudad Ojeda (Lagunillas)',
      'Machiques de Perijá',
      'Santa Bárbara del Zulia (Sur del Lago)',
      'Villa del Rosario (Rosario de Perijá)',
      'Los Puertos de Altagracia (Miranda)',
      'Caja Seca (Sucre)',
      'Bachaquero (Valmore Rodríguez)',
      'Mene Grande (Baralt)',
      'Tía Juana (Simón Bolívar)',
      'La Concepción (Jesús Enrique Lossada)',
      'Santa Rita',
      'San Carlos del Zulia'
    ]
  },
  {
    id: 'anzoategui',
    name: 'Anzoátegui',
    cities: [
      'Barcelona',
      'Puerto La Cruz',
      'Lechería (Urbaneja)',
      'Guanta',
      'El Tigre (Simón Rodríguez)',
      'Anaco',
      'San José de Guanipa (El Tigrito)',
      'Cantaura (Freites)',
      'Pariaguán (Miranda)',
      'Clarines (Bruzual)',
      'Píritu',
      'Puerto Píritu',
      'Aragua de Barcelona',
      'Soledad (Independencia)',
      'Valle de Guanape'
    ]
  },
  {
    id: 'bolivar',
    name: 'Bolívar',
    cities: [
      'Ciudad Guayana (Puerto Ordaz)',
      'San Félix (Caroní)',
      'Ciudad Bolívar (Angostura)',
      'Upata (Piar)',
      'Caicara del Orinoco (Cedeño)',
      'Guasipati (Roscio)',
      'El Callao',
      'Tumeremo (Sifontes)',
      'Santa Elena de Uairén (Gran Sabana)',
      'El Dorado',
      'Maripa (Sucre)'
    ]
  },
  {
    id: 'tachira',
    name: 'Táchira',
    cities: [
      'San Cristóbal',
      'Táriba (Cárdenas)',
      'Rubio (Junín)',
      'San Antonio del Táchira (Frontera)',
      'Ureña (Pedro María Ureña)',
      'La Grita (Jáuregui)',
      'Coloncito (Panamericano)',
      'Michelena',
      'Palmira (Guásimos)',
      'La Fría (García de Hevia)',
      'San Juan de Colón (Ayacucho)',
      'Capacho Nuevo / Independencia',
      'Capacho Viejo / Libertad',
      'Santa Ana del Táchira (Córdoba)',
      'Pregonero (Uribante)'
    ]
  },
  {
    id: 'merida',
    name: 'Mérida',
    cities: [
      'Mérida (Libertador)',
      'El Vigía (Alberto Adriani)',
      'Ejido (Campo Elías)',
      'Tovar',
      'Lagunillas (Sucre)',
      'Mucuchíes (Rangel)',
      'Bailadores (Rivas Dávila)',
      'Santa Cruz de Mora (Pinto Salinas)',
      'Timotes (Miranda)',
      'Tabay (Santos Marquina)',
      'Zea',
      'Aricagua',
      'Chiguará',
      'Pueblo Llano'
    ]
  },
  {
    id: 'trujillo',
    name: 'Trujillo',
    cities: [
      'Valera',
      'Trujillo (Capital)',
      'Boconó (Jardín de Venezuela)',
      'Betijoque (Rangel)',
      'Carache',
      'Sabana de Mendoza (Sucre)',
      'Pampán',
      'Pampanito',
      'La Ceiba (Puerto)',
      'Monay (Pampán)',
      'Chejendé (Candelaria)',
      'Escuque',
      'La Puerta'
    ]
  },
  {
    id: 'falcon',
    name: 'Falcón',
    cities: [
      'Coro (Miranda)',
      'Punto Fijo (Carirubana)',
      'Judibana (Los Taques)',
      'Puerto Cumarebo (Zamora)',
      'Dabajuro',
      'Tucacas (Silva)',
      'Chichiriviche (Monseñor Iturriza)',
      'Churuguara (Federación)',
      'Mene de Mauroa',
      'Pueblo Nuevo (Falcón)',
      'La Vela de Coro (Colina)',
      'Mirimire (San Francisco)'
    ]
  },
  {
    id: 'monagas',
    name: 'Monagas',
    cities: [
      'Maturín',
      'Punta de Mata (Ezequiel Zamora)',
      'Caripe (El Guácharo)',
      'Caripito (Bolívar)',
      'Caicara de Maturín (Cedeño)',
      'Temblador (Libertador)',
      'Aragua de Maturín (Piar)',
      'Barrancas del Orinoco (Sotillo)',
      'Quiriquire (Punceres)',
      'San Antonio de Capayacuar (Acosta)'
    ]
  },
  {
    id: 'nueva_esparta',
    name: 'Nueva Esparta (Margarita & Coche)',
    cities: [
      'Porlamar (Mariño)',
      'Pampatar (Maneiro)',
      'La Asunción (Arismendi)',
      'Juan Griego (Marcano)',
      'El Valle del Espíritu Santo (García)',
      'Punta de Piedras (Tubores)',
      'Santa Ana (Gómez)',
      'Boca de Río (Macanao)',
      'San Pedro de Coche (Villalba)',
      'Playa El Agua / Manzanillo'
    ]
  },
  {
    id: 'sucre',
    name: 'Sucre',
    cities: [
      'Cumaná',
      'Carúpano (Bermúdez)',
      'Güiria (Valdez)',
      'Cariaco (Ribero)',
      'Casanay (Andrés Eloy Blanco)',
      'Marigüitar (Bolívar)',
      'Araya (Cruz Salmerón)',
      'El Pilar (Benítez)',
      'Río Caribe (Arismendi)',
      'San Antonio del Golfo (Mejía)'
    ]
  },
  {
    id: 'portuguesa',
    name: 'Portuguesa',
    cities: [
      'Acarigua (Páez)',
      'Araure',
      'Guanare (Capital)',
      'Villa Bruzual (Turén)',
      'Biscucuy (Sucre)',
      'Ospino',
      'Guanarito',
      'Píritu (Esteller)',
      'Papelón',
      'San Rafael de Onoto',
      'Chabasquén (Unda)'
    ]
  },
  {
    id: 'guarico',
    name: 'Guárico',
    cities: [
      'San Juan de los Morros (Roscio)',
      'Calabozo (Miranda)',
      'Valle de la Pascua (Infante)',
      'Zaraza (Pedro Zaraza)',
      'Altagracia de Orituco (Monagas)',
      'Tucupido (Ribas)',
      'El Sombrero (Mellado)',
      'Chaguaramas',
      'Santa María de Ipire',
      'Camaguán'
    ]
  },
  {
    id: 'barinas',
    name: 'Barinas',
    cities: [
      'Barinas (Capital)',
      'Barinitas (Bolívar)',
      'Socopó (Sucre)',
      'Santa Bárbara (Zamora)',
      'Pedraza (Ciudad Bolivia)',
      'Sabaneta (Alberto Arvelo)',
      'Barrancas (Cruz Paredes)',
      'Obispos',
      'Arismendi'
    ]
  },
  {
    id: 'yaracuy',
    name: 'Yaracuy',
    cities: [
      'San Felipe (Capital)',
      'Yaritagua (Peña)',
      'Chivacoa (Bruzual)',
      'Nirgua',
      'Cocorote',
      'Aroa (Bolívar)',
      'Urachiche',
      'Guama (Sucre)',
      'San Pablo (Arístides Bastidas)'
    ]
  },
  {
    id: 'apure',
    name: 'Apure',
    cities: [
      'San Fernando de Apure',
      'Biruaca',
      'Guasdualito (Páez)',
      'Achaguas',
      'Elorza (Rómulo Gallegos)',
      'Mantecal (Muñoz)',
      'San Juan de Payara (Pedro Camejo)',
      'Bruzual'
    ]
  },
  {
    id: 'cojedes',
    name: 'Cojedes',
    cities: [
      'San Carlos (Capital)',
      'Tinaquillo',
      'Tinaco',
      'El Baúl (Girardot)',
      'El Pao (Pao de San Juan Bautista)',
      'Macapo (Lima Blanco)',
      'Cojedes / Las Vegas (Rómulo Gallegos)'
    ]
  },
  {
    id: 'delta_amacuro',
    name: 'Delta Amacuro',
    cities: [
      'Tucupita (Capital)',
      'Pedernales',
      'Curiapo (Antonio Díaz)',
      'Sierra Imataca (Casacoima)'
    ]
  },
  {
    id: 'amazonas',
    name: 'Amazonas',
    cities: [
      'Puerto Ayacucho (Atures)',
      'San Fernando de Atabapo',
      'Maroa',
      'San Carlos de Río Negro',
      'La Esmeralda (Alto Orinoco)',
      'Isla Ratón (Autana)'
    ]
  }
];

export const POPULAR_VENEZUELA_HUBS = [
  { city: 'Caracas', state: 'Distrito Capital' },
  { city: 'Valencia', state: 'Carabobo' },
  { city: 'Maracay', state: 'Aragua' },
  { city: 'Barquisimeto', state: 'Lara' },
  { city: 'Maracaibo', state: 'Zulia' },
  { city: 'San Cristóbal', state: 'Táchira' },
  { city: 'Puerto La Cruz', state: 'Anzoátegui' },
  { city: 'Puerto Ordaz', state: 'Bolívar' },
  { city: 'Mérida', state: 'Mérida' },
  { city: 'Valera', state: 'Trujillo' }
];

export function searchVenezuelaLocations(query: string): Array<{ city: string; state: string; display: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  
  const results: Array<{ city: string; state: string; display: string }> = [];

  for (const stateObj of VENEZUELA_LOCATIONS) {
    const stateMatches = stateObj.name.toLowerCase().includes(q);
    for (const city of stateObj.cities) {
      if (city.toLowerCase().includes(q) || stateMatches) {
        results.push({
          city,
          state: stateObj.name,
          display: `${city}, ${stateObj.name}`
        });
      }
    }
  }

  return results.slice(0, 15);
}
