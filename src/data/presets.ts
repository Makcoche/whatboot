import { ChatSession } from "../types";

export const PRESET_CLIENTS: ChatSession[] = [
  {
    id: "juan-restaurante",
    clientName: "Juan Carlos",
    clientCompany: "Restaurante Sabor Criollo",
    phone: "+57 312 456 7890",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    lastMessage: "Hola, me gustaría saber si hacen cartas digitales con código QR y pedidos para whatsapp.",
    timestamp: "20:45",
    unreadCount: 1,
    lead: {
      customerName: "Juan Carlos",
      companyName: "Restaurante Sabor Criollo",
      consultedServices: ["Desarrollo Web"],
      leadStatus: "nuevo",
      needsSummary: "Interesado en pedir cotización para una carta digital QR."
    },
    messages: [
      {
        id: "m1",
        sender: "user",
        text: "Hola, me gustaría saber si hacen cartas digitales con código QR y pedidos para whatsapp.",
        timestamp: "20:45"
      }
    ],
    activeAgentId: "recepcion"
  },
  {
    id: "sofia-boutique",
    clientName: "Sofía Reyes",
    clientCompany: "Aura Boutique Glam",
    phone: "+57 320 890 1234",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    lastMessage: "Hola! ¿Qué costo tiene que me manejen el Instagram y me hagan videos Reels estéticos para mi ropa?",
    timestamp: "20:40",
    unreadCount: 0,
    lead: {
      customerName: "Sofía Reyes",
      companyName: "Aura Boutique Glam",
      consultedServices: ["Diseño Gráfico", "Manejo de Redes Sociales"],
      leadStatus: "interesado",
      needsSummary: "Busca manejo creativo de Instagram, branding editorial y Reels."
    },
    messages: [
      {
        id: "ms1",
        sender: "user",
        text: "Hola! ¿Qué costo tiene que me manejen el Instagram y me hagan videos Reels estéticos para mi ropa?",
        timestamp: "20:40"
      }
    ],
    activeAgentId: "redes-sociales"
  },
  {
    id: "pedro-hosting",
    clientName: "Pedro Torres",
    clientCompany: "Inmobiliaria Express S.A.S",
    phone: "+57 301 345 6789",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    lastMessage: "Urgente, la página web no está cargando y sale error 502. Tengo clientes quejándose.",
    timestamp: "20:30",
    unreadCount: 0,
    lead: {
      customerName: "Pedro Torres",
      companyName: "Inmobiliaria Express S.A.S",
      consultedServices: ["Desarrollo Web"],
      leadStatus: "soporte",
      needsSummary: "Página inmobiliaria presenta error 502, requiere verificación urgente de hosting."
    },
    messages: [
      {
        id: "mp1",
        sender: "user",
        text: "Hola, soy de Inmobiliaria Express.",
        timestamp: "20:28"
      },
      {
        id: "mp2",
        sender: "bot",
        text: "Hola Pedro 👋 Qué gusto saludarte de parte de Sinergia Agencia Creativa. ¿En qué podemos ayudarte el día de hoy con los portales de Inmobiliaria Express?",
        timestamp: "20:29",
        agentId: "recepcion"
      },
      {
        id: "mp3",
        sender: "user",
        text: "Urgente, la página web no está cargando y sale error 502. Tengo clientes quejándose.",
        timestamp: "20:30"
      }
    ],
    activeAgentId: "soporte"
  },
  {
    id: "marta-dental",
    clientName: "Dra. Marta Gómez",
    clientCompany: "Ortodoncia Marta Gómez",
    phone: "+57 315 234 5678",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200",
    lastMessage: "Hola, quiero agendar una reunión para contratar un bot que agende citas de mis pacientes automáticamente en WhatsApp.",
    timestamp: "20:15",
    unreadCount: 0,
    lead: {
      customerName: "Marta Gómez",
      companyName: "Ortodoncia Marta Gómez",
      consultedServices: ["Bots e Inteligencia Artificial"],
      leadStatus: "interesado",
      needsSummary: "Quiere automatizar citas de odontología con agenda activa."
    },
    messages: [
      {
        id: "md1",
        sender: "user",
        text: "Hola, quiero agendar una reunión para contratar un bot que agende citas de mis pacientes automáticamente en WhatsApp.",
        timestamp: "20:15"
      }
    ],
    activeAgentId: "automatizacion-ia"
  },
  {
    id: "nuevo-contacto",
    clientName: "Nuevo Prospecto",
    clientCompany: "Sin Empresa Registrada",
    phone: "+57 300 123 4567",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
    lastMessage: "Hola buenas tardes",
    timestamp: "20:00",
    unreadCount: 0,
    lead: {
      customerName: "",
      companyName: "",
      consultedServices: [],
      leadStatus: "nuevo",
      needsSummary: "Prospecto por calificar."
    },
    messages: [
      {
        id: "mn1",
        sender: "user",
        text: "Hola buenas tardes",
        timestamp: "20:00"
      }
    ],
    activeAgentId: "recepcion"
  }
];
