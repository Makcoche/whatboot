import { Agent } from "../types";

export const SINERGIA_AGENTS: Agent[] = [
  {
    id: "recepcion",
    name: "Asistente de Recepción",
    role: "Recepcionista General",
    description: "Da la bienvenida, identifica necesidades iniciales, solicita datos de contacto y clasifica al cliente.",
    accent: "text-blue-500 border-blue-500",
    bgAccent: "bg-blue-50 text-blue-800 border-blue-200",
    emoji: "👋"
  },
  {
    id: "ventas",
    name: "Asistente de Ventas",
    role: "Ejecutivo Comercial Digital",
    description: "Explica beneficios generales, despierta interés comercial en Sinergia, capta leads y prepara llamadas de ventas.",
    accent: "text-emerald-500 border-emerald-500",
    bgAccent: "bg-emerald-50 text-emerald-800 border-emerald-200",
    emoji: "🚀"
  },
  {
    id: "paginas-web",
    name: "Asistente de Páginas Web",
    role: "Consultor Técnico de Portales",
    description: "Asesora sobre Landing Pages, tiendas e-commerce de alto impacto, dominios, web hosting, WordPress, Elementor y posicionamiento SEO.",
    accent: "text-indigo-500 border-indigo-500",
    bgAccent: "bg-indigo-50 text-indigo-800 border-indigo-200",
    emoji: "💻"
  },
  {
    id: "automatizacion-ia",
    name: "Asistente de Automatización IA",
    role: "Ingeniero de Flujos & Bots",
    description: "Explica integraciones avanzadas de WhatsApp con IA (Gemini), flujos automatizados con n8n, ManyChat, sincronías CRM y productividad.",
    accent: "text-purple-500 border-purple-500",
    bgAccent: "bg-purple-50 text-purple-800 border-purple-200",
    emoji: "🤖"
  },
  {
    id: "redes-sociales",
    name: "Asistente de Redes Sociales",
    role: "Director de Relaciones Digitales",
    description: "Planifica campañas creativas de branding, contenidos virales para Instagram y TikTok, producción de Reels y Community Management.",
    accent: "text-pink-500 border-pink-500",
    bgAccent: "bg-pink-50 text-pink-800 border-pink-200",
    emoji: "🖌️"
  },
  {
    id: "soporte",
    name: "Asistente de Soporte",
    role: "Especialista de Garantías & Incidencias",
    description: "Resuelve novedades de caída de servidores, fallas de flujos activos, correos corporativos y gestiona con tacto clientes inconformes.",
    accent: "text-amber-500 border-amber-500",
    bgAccent: "bg-amber-50 text-amber-800 border-amber-200",
    emoji: "🛠️"
  },
  {
    id: "administrativo",
    name: "Asistente Administrativo",
    role: "Gestor de Agenda & Trámites",
    description: "Agenda reservas de llamadas, solicita datos corporativos de facturación, procesa cotizaciones escritas en Google Drive y genera tickets de servicio.",
    accent: "text-teal-500 border-teal-500",
    bgAccent: "bg-teal-50 text-teal-800 border-teal-200",
    emoji: "📅"
  }
];

export function getAgentById(id: string): Agent {
  // Try exact match or fallback matching by keyword
  const normalized = id.toLowerCase().replace(/\s+/g, "-");
  
  if (normalized.includes("web")) return SINERGIA_AGENTS[2];
  if (normalized.includes("automatizacion") || normalized.includes("bot") || normalized.includes("ia") || normalized.includes("artificial")) return SINERGIA_AGENTS[3];
  if (normalized.includes("rede") || normalized.includes("social") || normalized.includes("marketing") || normalized.includes("instagram")) return SINERGIA_AGENTS[4];
  if (normalized.includes("soporte") || normalized.includes("tecnico") || normalized.includes("falla")) return SINERGIA_AGENTS[5];
  if (normalized.includes("agenda") || normalized.includes("admin") || normalized.includes("cita")) return SINERGIA_AGENTS[6];
  if (normalized.includes("venta") || normalized.includes("comercial")) return SINERGIA_AGENTS[1];
  
  return SINERGIA_AGENTS.find(a => normalized.includes(a.id)) || SINERGIA_AGENTS[0];
}
