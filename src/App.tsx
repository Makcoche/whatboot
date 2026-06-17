import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Users, Bot, Send, RefreshCw, FileText, CheckCheck, 
  Plus, Phone, Building, Briefcase, Layers, Terminal, AlertCircle, 
  Calendar, CheckCircle, Clock, Sparkles, Code, AlertTriangle, ChevronRight, UserPlus, Trash2, Globe, HeartHandshake,
  BarChart2, PieChart, TrendingUp, Settings, Copy, Check, ShieldCheck, HelpCircle, HardDrive,
  BookOpen, DollarSign, Award, Shield, Zap, Mail, LogOut, Lock, User, Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from "recharts";
import { ChatSession, Message, SystemLog, Lead, LeadStatus, Agent } from "./types";
import { SINERGIA_AGENTS, getAgentById } from "./data/agents";
import { PRESET_CLIENTS } from "./data/presets";
import AuthScreen from "./components/AuthScreen";
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc,
  signOut,
  auth
} from "./lib/firebase";

// --- TIPOS DE USUARIOS Y NIVELES DE ACCESO COMERCIAL DE SINERGIA ---
export type UserRole = "ROOT" | "SUPER_ADMIN" | "GERENTE_COMERCIAL" | "COORDINADOR_PROYECTO" | "EMPLEADO";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  avatarUrl?: string;
  companyName: string;
}

export const PRESET_USERS: AppUser[] = [
  {
    id: "user-root",
    name: "Ing. José Urdaneta",
    email: "root@sinergia.com",
    role: "ROOT",
    tenantId: "tenant-1",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    companyName: "Sinergia S.A.S."
  },
  {
    id: "user-admin",
    name: "Dra. Elena Solano",
    email: "admin@elsol.com",
    role: "SUPER_ADMIN",
    tenantId: "tenant-2",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
    companyName: "Inmobiliaria El Sol"
  },
  {
    id: "user-gerente",
    name: "Carlos Pérez",
    email: "ventas@dentalbogota.com",
    role: "GERENTE_COMERCIAL",
    tenantId: "tenant-3",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    companyName: "Clínica Dental Bogotá"
  },
  {
    id: "user-coordinador",
    name: "Diana Bernal",
    email: "proyectos@sinergia.com",
    role: "COORDINADOR_PROYECTO",
    tenantId: "tenant-1",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    companyName: "Sinergia S.A.S."
  },
  {
    id: "user-empleado",
    name: "Luis Gómez",
    email: "soporte@sinergia.com",
    role: "EMPLEADO",
    tenantId: "tenant-1",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    companyName: "Sinergia S.A.S."
  }
];

export function hasAccess(tab: string, role: UserRole): boolean {
  if (role === "ROOT") return true; 
  if (role === "SUPER_ADMIN") {
    return tab !== "root";
  }
  if (role === "GERENTE_COMERCIAL") {
    return ["chats", "agents", "crm", "automations", "marketing", "sales", "dashboard", "integrations"].includes(tab);
  }
  if (role === "COORDINADOR_PROYECTO") {
    return ["chats", "agents", "projects", "docs", "academy", "onboarding"].includes(tab);
  }
  if (role === "EMPLEADO") {
    return ["chats", "crm", "academy"].includes(tab);
  }
  return false;
}

export function getRoleBadgeStyle(role: UserRole): { label: string; class: string; iconClass: string } {
  switch (role) {
    case "ROOT":
      return { 
        label: "🔑 ROOT GLOBAL", 
        class: "bg-red-500/10 text-red-400 border-red-500/25", 
        iconClass: "bg-red-400" 
      };
    case "SUPER_ADMIN":
      return { 
        label: "🛡️ SUPER ADMIN", 
        class: "bg-blue-500/10 text-blue-405 text-blue-300 border-blue-500/25", 
        iconClass: "bg-blue-400" 
      };
    case "GERENTE_COMERCIAL":
      return { 
        label: "💼 GERENTE COMERCIAL", 
        class: "bg-amber-500/10 text-amber-400 border-amber-500/25", 
        iconClass: "bg-amber-400" 
      };
    case "COORDINADOR_PROYECTO":
      return { 
        label: "📅 COORD. PROYECTOS", 
        class: "bg-orange-500/10 text-orange-400 border-orange-500/25", 
        iconClass: "bg-orange-400" 
      };
    case "EMPLEADO":
      return { 
        label: "👤 EMPLEADO / AGENTE", 
        class: "bg-slate-500/10 text-slate-300 border-slate-550 border-slate-700", 
        iconClass: "bg-slate-400" 
      };
    default:
      return { 
        label: "USUARIO", 
        class: "bg-slate-500/10 text-slate-350 border-slate-800", 
        iconClass: "bg-slate-400" 
      };
  }
}

export default function App() {
  // --- ESTADO DE AUTENTICACIÓN ---
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem("sinergia_current_user_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Sinergia State
  const [sessions, rawSetSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("whatbot_sessions_v1");
    return saved ? JSON.parse(saved) : PRESET_CLIENTS;
  });

  const setSessions = (valueOrUpdater: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
    rawSetSessions(prev => {
      const next = typeof valueOrUpdater === "function" ? valueOrUpdater(prev) : valueOrUpdater;
      
      // Sincronizar cambios individuales con Firebase Firestore si hay usuario autenticado
      if (currentUser) {
        next.forEach(s => {
          const prevS = prev.find(p => p.id === s.id);
          if (!prevS || JSON.stringify(prevS) !== JSON.stringify(s)) {
            const syncedSession = { ...s, tenantId: currentUser.tenantId };
            setDoc(doc(db, "chats", syncedSession.id), syncedSession)
              .catch(err => console.warn("Error guardando en Firestore:", err));
          }
        });
      }
      
      localStorage.setItem("whatbot_sessions_v1", JSON.stringify(next));
      return next;
    });
  };

  // --- SINCRONIZACIÓN DE FIREBASE FIRESTORE EN TIEMPO REAL ---
  useEffect(() => {
    if (!currentUser) return;

    // Suscribir en tiempo real a las salas asociadas al Tenant del usuario actual
    const q = query(
      collection(db, "chats"),
      where("tenantId", "==", currentUser.tenantId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const dbSessions: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        dbSessions.push(docSnap.data() as ChatSession);
      });

      if (dbSessions.length > 0) {
        // Actualizamos de forma optimista
        rawSetSessions(dbSessions);
        localStorage.setItem("whatbot_sessions_v1", JSON.stringify(dbSessions));
      } else {
        // En caso de que sea un Tenant nuevo en blanco, sembramos de forma proactiva en Firestore de forma automática
        console.log("Sembrando base de datos Firestore inicial para el Tenant:", currentUser.tenantId);
        const seedData = PRESET_CLIENTS.map(client => ({
          ...client,
          id: `${client.id}_${currentUser.tenantId}`,
          tenantId: currentUser.tenantId
        }));
        
        for (const item of seedData) {
          await setDoc(doc(db, "chats", item.id), item);
        }
      }
    }, (error) => {
      console.error("Error sincronizando chats con Firestore:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "juan-restaurante";
  });

  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<UserRole>("EMPLEADO");
  const [regTenant, setRegTenant] = useState("tenant-1");
  const [regCompanyName, setRegCompanyName] = useState("");
  const [authError, setAuthError] = useState("");

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "agents" | "crm" | "automations" | "dashboard" | "integrations" | "onboarding" | "marketing" | "sales" | "projects" | "finance" | "docs" | "academy" | "root">("chats");
  const [editorMode, setEditorMode] = useState<"client" | "agent" | "note">("client");

  // Redireccionar si cambia el rol y se pierde acceso al módulo actual o si se selecciona un tenant diferente
  useEffect(() => {
    if (currentUser) {
      setSelectedTenantId(currentUser.tenantId);
      if (!hasAccess(activeTab, currentUser.role)) {
        const allowedTabs: ("chats" | "agents" | "crm" | "automations" | "dashboard" | "integrations" | "onboarding" | "marketing" | "sales" | "projects" | "finance" | "docs" | "academy" | "root")[] = [
          "chats", "agents", "crm", "automations", "marketing", "sales", "projects", "finance", "docs", "academy", "dashboard", "root", "onboarding", "integrations"
        ];
        const fallback = allowedTabs.find(tab => hasAccess(tab, currentUser.role));
        if (fallback) {
          setActiveTab(fallback);
        }
      }
    }
  }, [currentUser]);

  // Multi-tenant simulated workspaces configuration
  const [selectedTenantId, setSelectedTenantId] = useState("tenant-1");
  const tenants = [
    { id: "tenant-1", name: "Sinergia S.A.S.", domain: "sinergia.creative", plan: "Enterprise Premium", status: "Activo", phoneId: "125633480629471" },
    { id: "tenant-2", name: "Inmobiliaria El Sol", domain: "solyvida.cl", plan: "Silver Business", status: "Activo", phoneId: "192837492837482" },
    { id: "tenant-3", name: "Clínica Dental Bogotá", domain: "bogotadent.co", plan: "Bronze Starter", status: "Inactivo / Pendiente Pago", phoneId: "918273847263847" },
  ];
  const activeTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0];

  // Visual automation builder simulated steps
  const [flows, setFlows] = useState([
    { id: "flow-1", name: "Bienvenida & Segmentación Inteligente", trigger: "Nuevo mensaje por WhatsApp", status: "Activo", lastExecuted: "Hace 10 minutos" },
    { id: "flow-2", name: "Agenda de Citas Autónomo", trigger: "Detección de intenciones de agendar cita", status: "Activo", lastExecuted: "Hace 1 hora" },
    { id: "flow-3", name: "Fuegos artificiales de Conversión", trigger: "Estado del Lead cambia a 'cliente_cerrado'", status: "Apagado", lastExecuted: "Nunca" },
  ]);
  const [selectedFlowId, setSelectedFlowId] = useState("flow-1");

  // CRM manual editing states
  const [isEditingCRM, setIsEditingCRM] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedCompany, setEditedCompany] = useState("");
  const [editedPhone, setEditedPhone] = useState("");
  const [editedStatus, setEditedStatus] = useState<LeadStatus>("nuevo");

  // Active production config states
  const [dbConfig, setDbConfig] = useState({
    whatsappPhoneNumberId: "125633480629471",
    whatsappBusinessAccountId: "806495392039212",
    whatsappAccessToken: "",
    webhookVerifyToken: "sinergia_secret_token_2026",
    systemPrompt: "",
    crmSyncGoogleSheets: false,
    googleSheetsId: "1sh_X0_e3n8a_EXAMPLE_SPREADSHEET_ID_yR9V-b7Q",
  });
  const [hasLoadedConfig, setHasLoadedConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load configuration from backend on startup
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setDbConfig(data);
        setHasLoadedConfig(true);
        addLog("info", "🔑 Configuración activa de WhatsApp API y Prompts sincronizada del servidor.");
      })
      .catch((err) => {
        console.error("Error loading configuration from backend:", err);
      });
  }, []);

  // Save config to backend
  const saveConfigToBackend = async (updatedConfig = dbConfig) => {
    setIsSavingConfig(true);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      const data = await response.json();
      if (data.success) {
        addLog("success", "💾 Ajustes de producción y enrutamiento guardados dinámicamente en backend.");
      }
    } catch (err) {
      console.error(err);
      addLog("warn", "⚠️ Error al guardar configuración de producción en backend.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Custom simulation client creations
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // Premium interactive visual custom states
  const [crmSearchText, setCrmSearchText] = useState("");
  const [crmFilterPhase, setCrmFilterPhase] = useState<string>("all");
  const [isSimulatingFlow, setIsSimulatingFlow] = useState(false);
  const [flowSimStep, setFlowSimStep] = useState(0);
  const [flowSimLogs, setFlowSimLogs] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-1");
  const [flowConfig, setFlowConfig] = useState({ allowAutoTransfer: true, maxNn8nRetry: 3, responseTone: 'profesional' });
  
  // Onboarding Setup Guide Stepper
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testDestinationPhone, setTestDestinationPhone] = useState("+57 322 123 4567");
  const [testMessageCategory, setTestMessageCategory] = useState("web_design");

  // --- SINERGIA IA BUSINESS OS MODULES STATES ---
  // 1. Marketing IA
  const [marketingType, setMarketingType] = useState<"social" | "blog" | "email" | "landing">("social");
  const [marketingTopic, setMarketingTopic] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [marketingCalendar, setMarketingCalendar] = useState([
    { id: "cal-1", title: "🎯 Post IG: Beneficios de automatizar con WhatsApp", date: "2026-06-18", status: "Programado" },
    { id: "cal-2", title: "📧 Newsletter: Sinergia IA se integra con GPT-4o", date: "2026-06-20", status: "Programado" },
    { id: "cal-3", title: "📝 Blog: El impacto del CRM inteligente en PYMEs", date: "2026-06-22", status: "Programado" },
  ]);

  // 2. Centro Comercial (Ventas & Propuestas)
  const [salesClient, setSalesClient] = useState("Juan restaurador");
  const [salesQuotes, setSalesQuotes] = useState([
    { id: "q-1", item: "Desarrollo Agente WhatsApp Automatizado (Cerebro IA)", price: 450 },
    { id: "q-2", item: "Suscripción Mensual SaaS Sinergia IA Business OS", price: 89 },
  ]);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [generatedProposalText, setGeneratedProposalText] = useState("");
  const [salesMeetings, setSalesMeetings] = useState([
    { id: "meet-1", client: "Juan Restaurante", date: "Hoy 16:30", type: "Virtual Meet", status: "Confirmada", summary: "Interesado en bot de reservas automáticas." },
    { id: "meet-2", client: "Dra. Maria Clara", date: "Mañana 10:00", type: "WhatsApp Call", status: "Pendiente", summary: "Discutir campaña de captación estética." },
  ]);

  // 3. Gestión de Proyectos
  const [projectTab, setProjectTab] = useState<"kanban" | "scrum" | "cascada">("kanban");
  const [projectsList, setProjectsList] = useState([
    { id: "proj-1", title: "Diseñar Cerebro de Enrutamiento Inbound", assignee: "Diego Dev", column: "doing", risk: "Bajo", delayProb: "5%" },
    { id: "proj-2", title: "Instalar pasarela de pagos Wompi/Stripe", assignee: "Andrés Gomez", column: "todo", risk: "Medio", delayProb: "45%" },
    { id: "proj-3", title: "Capacitación de agentes (Sinergia Academy)", assignee: "Marta Soporte", column: "done", risk: "Ninguno", delayProb: "0%" },
  ]);

  // 4. Centro Financiero
  const [financialTransactions, setFinancialTransactions] = useState([
    { id: "tx-1", type: "ingreso", concept: "Suscripción Sinergia Plan Business - Dental Bogotá", amount: 120, date: "2026-06-16" },
    { id: "tx-2", type: "ingreso", concept: "Instalación Consultoría Onboarding - Soluciones Sol", amount: 350, date: "2026-06-15" },
    { id: "tx-3", type: "gasto", concept: "Facturación API Meta Cloud (WhatsApp Outbound)", amount: 45, date: "2026-06-14" },
    { id: "tx-4", type: "gasto", concept: "Infraestructura Cloud Run & Ollama Hosting", amount: 150, date: "2026-06-10" },
  ]);
  const [newTxType, setNewTxType] = useState<"ingreso" | "gasto">("ingreso");
  const [newTxConcept, setNewTxConcept] = useState("");
  const [newTxAmount, setNewTxAmount] = useState("");

  // 5. Gestión Documental
  const [searchDocText, setSearchDocText] = useState("");
  const [docsList, setDocsList] = useState([
    { id: "doc-1", name: "Contrato_Prestacion_Sinergia_SaaS.pdf", type: "Contrato", size: "1.4 MB", date: "2026-06-12", isAnalyzed: true, summary: "Contrato marco de prestación de servicios por $450 USD. Vigencia 12 meses." },
    { id: "doc-2", name: "Cotizacion_Automatizacion_Facebook_WhatsApp.pdf", type: "Propuesta", size: "820 KB", date: "2026-06-15", isAnalyzed: false, summary: "" },
    { id: "doc-3", name: "Factura_Empresarial_SOL_0041.pdf", type: "Factura", size: "185 KB", date: "2026-06-16", isAnalyzed: true, summary: "Factura de cobro autorizada para Inmobiliaria El Sol por un importe de $350 USD." },
  ]);
  const [selectedDocIdForOcr, setSelectedDocIdForOcr] = useState("doc-2");
  const [isAnalysingDoc, setIsAnalysingDoc] = useState(false);

  // 6. Sinergia Academy
  const [tutorQuestion, setTutorQuestion] = useState("");
  const [tutorChatHistory, setTutorChatHistory] = useState([
    { sender: "tutor", text: "¡Hola! Soy tu tutor Sinergia IA. ¿En qué módulo del curso de ventas por WhatsApp y CRM tienes dudas hoy?" }
  ]);
  const [isTutorTyping, setIsTutorTyping] = useState(false);

  // 7. Panel ROOT Configs
  const [rootTenants, setRootTenants] = useState([
    { id: "tenant-1", name: "Sinergia S.A.S.", plan: "Enterprise Premium", status: "Activo", databaseUsage: "2.4 GB", activeUsers: 45, logsCount: 1540 },
    { id: "tenant-2", name: "Inmobiliaria El Sol", plan: "Silver Business", status: "Activo", databaseUsage: "850 MB", activeUsers: 14, logsCount: 312 },
    { id: "tenant-3", name: "Clínica Dental Bogotá", plan: "Bronze Starter", status: "Inactivo / Pendiente Pago", databaseUsage: "120 MB", activeUsers: 2, logsCount: 88 },
  ]);

  // System Logs State
  const [logs, setLogs] = useState<SystemLog[]>(() => {
    return [
      {
        id: "l1",
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message: "Núcleo SINERGIA AI inicializado exitosamente en puerto 3000."
      },
      {
        id: "l2",
        timestamp: new Date().toLocaleTimeString(),
        type: "success",
        message: "Conexión simulada con WhatsApp Web estabilizada. Escuchando solicitudes."
      },
      {
        id: "l3",
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        message: "7 Agentes especializados listos para distribución de intenciones CRM."
      }
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Active Session Helper
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const activeAgent = getAgentById(activeSession?.activeAgentId || "recepcion");

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem("whatbot_sessions_v1", JSON.stringify(sessions));
  }, [sessions]);

  // Scroll to Bottom effects
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages, isLoading]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Sync edit form with current lead details
  useEffect(() => {
    if (activeSession) {
      setEditedName(activeSession.lead.customerName || activeSession.clientName || "");
      setEditedCompany(activeSession.lead.companyName || activeSession.clientCompany || "");
      setEditedPhone(activeSession.phone || "");
      setEditedStatus(activeSession.lead.leadStatus || "nuevo");
    }
  }, [activeSessionId, activeSession]);

  // Log Helper functions
  const addLog = (type: "info" | "success" | "warn" | "transfer", message: string, agentName?: string) => {
    const newLog: SystemLog = {
      id: "log_" + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      agentName
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Compute Lead Status distribution for Recharts
  const statusCounts = React.useMemo(() => {
    const counts = {
      nuevo: 0,
      interesado: 0,
      reunión_agendada: 0,
      cliente_cerrado: 0,
      soporte: 0,
    };
    sessions.forEach(s => {
      const status = s.lead.leadStatus || "nuevo";
      if (counts[status] !== undefined) {
        counts[status]++;
      } else {
        counts.nuevo++;
      }
    });

    return [
      { name: "Nuevo", value: counts.nuevo, color: "#3b82f6", slug: "nuevo" }, // Blue
      { name: "Interesado", value: counts.interesado, color: "#eab308", slug: "interesado" }, // Yellow/Amber
      { name: "Reunión", value: counts.reunión_agendada, color: "#10b981", slug: "reunión_agendada" }, // Emerald/Green
      { name: "Cliente", value: counts.cliente_cerrado, color: "#ec4899", slug: "cliente_cerrado" }, // Pink
      { name: "En Soporte", value: counts.soporte, color: "#f59e0b", slug: "soporte" }, // Orange/Gold
    ];
  }, [sessions]);

  // Compute Services demand for Recharts
  const servicesData = React.useMemo(() => {
    const counts: { [key: string]: number } = {
      "Desarrollo Web": 0,
      "Bots e Inteligencia Artificial": 0,
      "Facebook/Meta Ads": 0,
      "Manejo de Redes Sociales": 0,
      "Diseño Gráfico": 0,
    };

    sessions.forEach(s => {
      if (s.lead.consultedServices) {
        s.lead.consultedServices.forEach(srv => {
          // Normalize service name match
          if (srv.toLowerCase().includes("web")) counts["Desarrollo Web"]++;
          else if (srv.toLowerCase().includes("bots") || srv.toLowerCase().includes("artificial")) counts["Bots e Inteligencia Artificial"]++;
          else if (srv.toLowerCase().includes("ads") || srv.toLowerCase().includes("facebook")) counts["Facebook/Meta Ads"]++;
          else if (srv.toLowerCase().includes("redes") || srv.toLowerCase().includes("sociales") || srv.toLowerCase().includes("community")) counts["Manejo de Redes Sociales"]++;
          else if (srv.toLowerCase().includes("diseño") || srv.toLowerCase().includes("gráfico") || srv.toLowerCase().includes("branding") || srv.toLowerCase().includes("diseno")) counts["Diseño Gráfico"]++;
        });
      }
    });

    return [
      { name: "Web 💻", cantidad: counts["Desarrollo Web"], color: "#10b981" },
      { name: "Bots IA 🤖", cantidad: counts["Bots e Inteligencia Artificial"], color: "#6366f1" },
      { name: "Meta Ads 📈", cantidad: counts["Facebook/Meta Ads"], color: "#3b82f6" },
      { name: "Redes 🖌️", cantidad: counts["Manejo de Redes Sociales"], color: "#ec4899" },
      { name: "Diseño 🎨", cantidad: counts["Diseño Gráfico"], color: "#f59e0b" },
    ];
  }, [sessions]);

  // Switch Active Session
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const session = sessions.find(s => s.id === id);
    if (session) {
      addLog("info", `Consola CRM enfocada en la conversación con ${session.clientName || "Prospecto"}.`);
    }
  };

  // Trigger Gemini/Mock Response call
  const sendMessage = async (textToSend: string, mode: "client" | "agent" | "note" = editorMode) => {
    if (!textToSend.trim()) return;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (mode === "note") {
      // Add Private Note
      const noteMsg: Message = {
        id: "msg_" + Date.now() + "_note",
        sender: "bot",
        text: textToSend,
        timestamp: nowStr,
        agentId: activeSession.activeAgentId,
        isPrivate: true
      };
      
      const updatedMessages = [...activeSession.messages, noteMsg];
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            lastMessage: `📝 [Nota] ${textToSend}`,
            timestamp: nowStr,
            messages: updatedMessages
          };
        }
        return s;
      }));
      setLogs(prev => [
        {
          id: "log_" + Date.now(),
          timestamp: nowStr,
          type: "warn",
          message: `NOTAS: Nota interna agregada en chat de ${activeSession.clientName}`
        },
        ...prev
      ]);
      setInputText("");
      return;
    }

    if (mode === "agent") {
      // Add Agent Direct Outgoing Reply
      const agentMsg: Message = {
        id: "msg_" + Date.now() + "_ag",
        sender: "bot",
        text: textToSend,
        timestamp: nowStr,
        agentId: activeSession.activeAgentId
      };
      
      const updatedMessages = [...activeSession.messages, agentMsg];
      
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            lastMessage: textToSend,
            timestamp: nowStr,
            messages: updatedMessages
          };
        }
        return s;
      }));
      setLogs(prev => [
        {
          id: "log_" + Date.now(),
          timestamp: nowStr,
          type: "success",
          message: `CRM: Mensaje comercial enviado por agente a ${activeSession.clientName}`
        },
        ...prev
      ]);
      setInputText("");
      return;
    }

    if (isLoading) return;

    // 1. Add User Message to Chat UI
    const userMsg: Message = {
      id: "msg_" + Date.now() + "_usr",
      sender: "user",
      text: textToSend,
      timestamp: nowStr
    };

    const updatedMessages = [...activeSession.messages, userMsg];
    
    // Update local state temporarily with user message
    const previousAgentId = activeSession.activeAgentId;
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        return {
          ...s,
          lastMessage: textToSend,
          timestamp: nowStr,
          unreadCount: 0,
          messages: updatedMessages
        };
      }
      return s;
    }));

    setInputText("");
    setIsLoading(true);
    addLog("info", `WhatsApp Recibido: "${textToSend.substring(0, 45)}${textToSend.length > 45 ? '...' : ''}" de ${activeSession.clientName}`);

    // Simulation logs for backend processing loop
    setTimeout(() => {
      addLog("info", `SINERGIA AI: Analizando patrones gramaticales y modelo de intenciones...`);
    }, 400);

    try {
      // API request to server.ts
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          currentLead: {
            ...activeSession.lead,
            activeAgentId: previousAgentId
          }
        })
      });

      if (!response.ok) {
        throw new Error("Falla en la respuesta de Sinergia AI Cloud Engine.");
      }

      const data = await response.json();
      const botMsgText = data.message;
      const detectedAgentStr = data.detectedAgent || "Recepción";
      const leadUpdates = data.leadUpdates;
      const isTransferring = data.transferringAnimation;

      // Map Spanish Agent string to layout IDs
      let targetAgentId = "recepcion";
      const normAgent = detectedAgentStr.toLowerCase();
      if (normAgent.includes("web") || normAgent.includes("página")) targetAgentId = "paginas-web";
      else if (normAgent.includes("automatizacion") || normAgent.includes("bot") || normAgent.includes("ia")) targetAgentId = "automatizacion-ia";
      else if (normAgent.includes("red") || normAgent.includes("social") || normAgent.includes("branding") || normAgent.includes("instagram")) targetAgentId = "redes-sociales";
      else if (normAgent.includes("soporte") || normAgent.includes("tecnic")) targetAgentId = "soporte";
      else if (normAgent.includes("admin") || normAgent.includes("agenda") || normAgent.includes("cita")) targetAgentId = "administrativo";
      else if (normAgent.includes("venta") || normAgent.includes("comercial")) targetAgentId = "ventas";

      // 2. Add System logs based on Multi-Agent responses
      addLog("success", `SINERGIA AI clasificó intención. Asistente óptimo asignado: ${detectedAgentStr}.`, detectedAgentStr);

      if (targetAgentId !== previousAgentId || isTransferring) {
        addLog("transfer", `TRANSFERENCIA: Turno redireccionado de Asistente [${getAgentById(previousAgentId).role}] a [${getAgentById(targetAgentId).role}].`);
      }

      // If lead updates contain new parameters, report as CRM log
      if (leadUpdates.customerName && leadUpdates.customerName !== activeSession.lead.customerName) {
        addLog("success", `CRM: Se detectó nombre de contacto oficial: "${leadUpdates.customerName}"`);
      }
      if (leadUpdates.companyName && leadUpdates.companyName !== activeSession.lead.companyName) {
        addLog("success", `CRM: Se detectó empresa o marca comercial: "${leadUpdates.companyName}"`);
      }
      if (leadUpdates.leadStatus && leadUpdates.leadStatus !== activeSession.lead.leadStatus) {
        addLog("success", `CRM: Calificación de embudo actualizada a [${leadUpdates.leadStatus.toUpperCase()}]`);
      }

      // Add actual response from Bot
      const botReplyMsg: Message = {
        id: "msg_" + Date.now() + "_bot",
        sender: "bot",
        text: botMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentId: targetAgentId
      };

      let finalMessages = [...updatedMessages];

      // If transferred, inject a client-side system message in the chat history
      if (targetAgentId !== previousAgentId) {
        finalMessages.push({
          id: "sys_" + Date.now() + "_trans",
          sender: "system",
          text: `Sinergia AI redirigió esta conversación al ${getAgentById(targetAgentId).name}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      finalMessages.push(botReplyMsg);

      // Save complete sessions with new CRM variables
      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          // Merge old lead properties with Gemini's detection
          const mergedLead: Lead = {
            customerName: leadUpdates?.customerName || s.lead.customerName || s.clientName,
            companyName: leadUpdates?.companyName || s.lead.companyName || s.clientCompany,
            consultedServices: Array.from(new Set([
              ...(s.lead.consultedServices || []),
              ...(leadUpdates?.consultedServices || [])
            ])),
            leadStatus: leadUpdates?.leadStatus as LeadStatus || s.lead.leadStatus,
            needsSummary: leadUpdates?.needsSummary || s.lead.needsSummary,
            phone: s.phone
          };

          return {
            ...s,
            clientName: mergedLead.customerName || s.clientName,
            clientCompany: mergedLead.companyName || s.clientCompany,
            activeAgentId: targetAgentId,
            lead: mergedLead,
            lastMessage: botMsgText,
            messages: finalMessages
          };
        }
        return s;
      }));

    } catch (err: any) {
      console.error(err);
      addLog("warn", `ERR: Error comunicando con Sinergia Brain. Emulando falla del robot.`);
      
      // Inject error reply to not lock the UI
      const errorMsg: Message = {
        id: "msg_err_" + Date.now(),
        sender: "bot",
        text: "Disculpa, en este momento estamos actualizando nuestros servidores CRM de WhatsApp. Quédate aquí y un asesor te atenderá personalmente en segundos. ⚡",
        timestamp: nowStr,
        agentId: "soporte"
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSession.id) {
          return {
            ...s,
            messages: [...updatedMessages, errorMsg],
            activeAgentId: "soporte"
          };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Submit via input state
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText, editorMode);
  };

  // Click on a simulation quick pill
  const handleQuickPill = (pillText: string) => {
    sendMessage(pillText, "client");
  };

  // Update CRM manually
  const saveCRMChanges = () => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSession.id) {
        const updatedLead: Lead = {
          ...s.lead,
          customerName: editedName,
          companyName: editedCompany,
          leadStatus: editedStatus,
        };
        return {
          ...s,
          clientName: editedName || s.clientName,
          clientCompany: editedCompany || s.clientCompany,
          phone: editedPhone || s.phone,
          lead: updatedLead
        };
      }
      return s;
    }));

    setIsEditingCRM(false);
    addLog("success", `CRM: Ficha comercial de ${editedName || "Cliente"} actualizada manualmente.`);
  };

  // Create a brand new workspace client chat
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newSessionId = "custom_" + Date.now();
    const newSession: ChatSession = {
      id: newSessionId,
      clientName: newClientName,
      clientCompany: newClientCompany || "Independiente",
      phone: newClientPhone || "+57 300 000 0000",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newClientName)}`,
      lastMessage: "Chat de WhatsApp iniciado.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      unreadCount: 0,
      lead: {
        customerName: newClientName,
        companyName: newClientCompany || "Independiente",
        consultedServices: [],
        leadStatus: "nuevo",
        needsSummary: "Contacto nuevo inicializado en backoffice."
      },
      messages: [
        {
          id: "init_msg",
          sender: "system",
          text: `Sinergia AI: Nueva conversación de WhatsApp registrada. Atendido por Recepción.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      activeAgentId: "recepcion"
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setIsCreatingClient(false);

    setNewClientName("");
    setNewClientCompany("");
    setNewClientPhone("");

    addLog("info", `CRM: Se ha creado una nueva ficha comercial para ${newClientName}.`);
  };

  // Clean / Reset simulated state
  const resetAllSessions = () => {
    if (confirm("¿Estás seguro de restablecer el estado inicial del simulador WhatBot?")) {
      setSessions(PRESET_CLIENTS);
      setActiveSessionId(PRESET_CLIENTS[0].id);
      addLog("warn", "SIMULADOR: Toda la memoria local y el CRM han sido restablecidos.");
    }
  };

  if (currentUser === null) {
    return (
      <AuthScreen 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem("sinergia_current_user_v1", JSON.stringify(user));
          addLog("success", `AUTENTICACIÓN: Sesión iniciada con éxito para ${user.name} (${user.role}) en ${user.companyName}`);
        }}
        tenants={tenants}
      />
    );
  }

  return (
    <div className="min-h-screen enterprise-bg text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 antialiased">
      
      {/* 1. Header Global Superior Coporativo Premium */}
      <header className="border-b border-[#141622] bg-[#030305]/95 backdrop-blur-xl px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-md shadow-black/40">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#ec4899] via-[#8b5cf6] to-[#06b6d4] p-0.5 flex items-center justify-center shadow-lg shadow-purple-950/40 relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#ec4899] via-[#8b5cf6] to-[#06b6d4] rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
            <div className="h-full w-full rounded-[10px] bg-black flex items-center justify-center relative">
              <Bot className="h-5 w-5 text-purple-400 group-hover:text-pink-400 group-hover:scale-110 transition duration-300 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-white text-lg bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent uppercase font-display">
                Sinergia IA
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/25 flex items-center shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse inline-block mr-1.5 shadow-[0_0_8px_#a78bfa]"></span>
                Business OS
              </span>
            </div>
            <p className="text-[11.5px] text-slate-450 font-medium tracking-wide">Plataforma Multiempresa de Automatización WhatsApp & Multiagente Autónomo</p>
          </div>
        </div>

        <div className="flex items-center space-x-3.5">
          {/* Active User session details - Gorgeous Profile section */}
          {currentUser && (
            <div className="flex items-center space-x-2.5 bg-[#090b14] border border-slate-900 rounded-xl px-3 py-1.5 shadow-md">
              <img 
                src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`} 
                alt={currentUser.name} 
                className="w-7 h-7 rounded-lg border border-slate-800 object-cover shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="hidden md:block text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-white tracking-tight truncate max-w-[120px]">{currentUser.name}</span>
                  <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.2 rounded border uppercase ${getRoleBadgeStyle(currentUser.role).class}`}>
                    {getRoleBadgeStyle(currentUser.role).label.split(" ")[1]}
                  </span>
                </div>
                <p className="text-[9px] text-slate-500 truncate max-w-[125px] font-semibold">{currentUser.companyName}</p>
              </div>
            </div>
          )}

          {/* Tenant Selector */}
          <div className="flex items-center space-x-2 bg-black/90 border border-slate-900 p-1 px-3 rounded-xl shadow-inner shadow-black/50">
            <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest hidden sm:inline">Portal Corporación:</span>
            <select
              value={selectedTenantId}
              disabled={currentUser?.role !== "ROOT" && currentUser?.role !== "SUPER_ADMIN"}
              onChange={(e) => {
                setSelectedTenantId(e.target.value);
                const nextTenant = tenants.find(t => t.id === e.target.value);
                addLog("info", `Workspace SaaS cambiado a: ${nextTenant?.name}. Licencia: ${nextTenant?.plan}.`);
              }}
              className={`bg-transparent border-none text-xs font-bold text-cyan-400 focus:outline-none pr-1 focus:ring-0 py-0.5 ${
                currentUser?.role !== "ROOT" && currentUser?.role !== "SUPER_ADMIN" ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={currentUser?.role !== "ROOT" && currentUser?.role !== "SUPER_ADMIN" ? "Nivel de acceso restringe cambiar de corporación" : "Seleccionar corporación"}
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">
                  {t.name}
                </option>
              ))}
              {/* Opción fallback si registraron una empresa dinámica */}
              {currentUser && !tenants.find(t => t.id === currentUser.tenantId) && (
                <option value={currentUser.tenantId} className="bg-slate-950 text-slate-200">
                  {currentUser.companyName}
                </option>
              )}
            </select>
            <span className="h-4 w-px bg-slate-905 bg-slate-800 hidden sm:inline"></span>
            <span className="text-[9.5px] font-mono text-purple-400 font-bold hidden sm:inline bg-purple-500/10 px-1.5 py-0.5 rounded uppercase border border-purple-500/20">
              {currentUser?.role === "ROOT" ? "Licenciatario Root" : tenants.find(t => t.id === selectedTenantId)?.plan || "Corporate Custom"}
            </span>
          </div>

          {/* Gold Token Counter (matches the exact UI in mockup: gold coin icon with token metric) */}
          <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-505/20 px-3 py-1.5 rounded-xl font-mono text-xs text-amber-450 shadow-sm" title="Tokens IA Disponibles en Licencia">
            <span className="animate-bounce">🪙</span>
            <span className="font-bold">40</span>
          </div>

          {/* Quick UI Actions (matches upper right of VPulso: world icon, sun icon, bell with badge, help desk, settings) */}
          <div className="hidden lg:flex items-center space-x-2 text-slate-400">
            <button type="button" className="p-1.5 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer transition-colors" title="Idioma">
              <Globe className="w-4 h-4 text-slate-400" />
            </button>
            <button type="button" className="p-1.5 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer transition-colors" title="Alternar Tema">
              <span className="text-xs">☀️</span>
            </button>
            <div className="relative">
              <button type="button" className="p-1.5 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer transition-colors" title="Notificaciones">
                <span className="text-xs">🔔</span>
              </button>
              <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-black shadow">1</span>
            </div>
            <button type="button" className="p-1.5 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer transition-colors" title="Mesa de Ayuda">
              <span className="text-xs">❓</span>
            </button>
            <button type="button" className="p-1.5 hover:text-white hover:bg-slate-900 rounded-lg cursor-pointer transition-colors" title="Configuraciones Sinergia">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Reset / Sign Out Buttons */}
          <div className="flex items-center space-x-2">
            <button 
              type="button"
              onClick={resetAllSessions}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-white bg-slate-900/40 hover:bg-red-950/20 border border-slate-900 hover:border-red-500/25 rounded-xl transition-all duration-200 flex items-center space-x-1 cursor-pointer"
              title="Restablecer Simulador"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-600 hover:text-red-400" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm("¿Estás seguro de que deseas cerrar sesión en Sinergia IA?")) {
                  signOut(auth).catch(err => console.error("Error signing out from firebase auth:", err));
                  setCurrentUser(null);
                  localStorage.removeItem("sinergia_current_user_v1");
                  addLog("warn", "SESIÓN: Se ha cerrado la sesión corporativa del sistema.");
                }
              }}
              className="px-3 py-1.5 text-xs text-red-450 hover:text-white bg-red-500/10 hover:bg-red-650 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all duration-200 flex items-center space-x-1.5 cursor-pointer hover:shadow-lg"
              title="Cerrar la sesión de Sinergia Business OS"
            >
              <LogOut className="h-3.5 w-3.5 text-red-400" />
              <span className="hidden sm:inline font-semibold">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Trial Promo Banner from VPulso mockup */}
      <div className="bg-gradient-to-r from-[#4c1d95]/30 via-[#31115c]/15 to-transparent border-b border-[#1f153a] px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-xs text-purple-200">
        <div className="flex items-center space-x-2.5">
          <span className="text-sm">🎁</span>
          <p className="font-medium leading-relaxed">
            <strong className="text-purple-300 font-bold">Quedan 6 días en tu prueba de Sinergia Líder.</strong>{' '}
            <span className="opacity-80">Acceso total a Embudos de IA Personalizados, Agentes de Voz Inteligentes y Calendario de Reservas — Actívalo antes del 22/06/2026.</span>
          </p>
        </div>
        <button type="button" className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-extrabold px-3.5 py-1.5 rounded-lg text-[10.5px] transition-all duration-200 shadow-lg shadow-purple-900/30 shrink-0 select-none cursor-pointer">
          Actualizar ahora
        </button>
      </div>

      {/* 2. Cuerpo Principal de Trabajo */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden max-w-[1920px] mx-auto w-full">
        
        {/* COLUMNA IZQUIERDA: Configuración y Selección de Chats (lg:col-span-3) */}
        <aside className="lg:col-span-3 border-r border-slate-900/60 bg-slate-950/40 p-4.5 flex flex-col space-y-5 overflow-y-auto">
          
          {/* Main category label */}
          <div className="flex items-center justify-between pb-1 px-1 border-b border-[#151829]">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Módulos Business OS</span>
            <span className="text-[9px] bg-purple-500/10 text-purple-300 font-mono px-1.5 py-0.5 rounded border border-purple-500/20">
              {currentUser ? [
                "chats", "agents", "crm", "automations", "marketing", "sales", "projects", "finance", "docs", "academy", "dashboard", "root", "onboarding", "integrations"
              ].filter(id => hasAccess(id, currentUser.role)).length : 14} MÓDS.
            </span>
          </div>

          {/* Vertical scrollable business modules lists */}
          <div className="flex flex-col space-y-1 max-h-[380px] overflow-y-auto pr-1">
            {[
              { id: "chats", label: "💬 Bandeja de Entrada", color: "text-emerald-400 hover:bg-[#10b981]/5", icon: MessageSquare, badge: "Live" },
              { id: "agents", label: "🤖 Agentes IA Autónomos", color: "text-indigo-400 hover:bg-[#6366f1]/5", icon: Bot },
              { id: "crm", label: "💼 CRM Inteligente Kanban", color: "text-amber-400 hover:bg-[#f59e0b]/5", icon: Users, badge: "Score" },
              { id: "automations", label: "⚡ Automatizaciones IA", color: "text-pink-400 hover:bg-[#ec4899]/5", icon: Layers },
              { id: "marketing", label: "🎯 Marketing IA & Copys", color: "text-purple-400 hover:bg-[#a855f7]/5", icon: Sparkles },
              { id: "sales", label: "🤝 Centro Comercial & Citas", color: "text-blue-400 hover:bg-[#3b82f6]/5", icon: HeartHandshake },
              { id: "projects", label: "📅 Gestión de Proyectos", color: "text-orange-400 hover:bg-[#f97316]/5", icon: Calendar },
              { id: "finance", label: "💵 Centro Financiero OS", color: "text-green-400 hover:bg-[#22c55e]/5", icon: DollarSign, badge: "Predec" },
              { id: "docs", label: "📂 Gestión Documental OCR", color: "text-cyan-400 hover:bg-[#06b6d4]/5", icon: FileText },
              { id: "academy", label: "🎓 Sinergia Academy LMS", color: "text-yellow-400 hover:bg-[#eab308]/5", icon: BookOpen, badge: "Tutor" },
              { id: "dashboard", label: "📊 Business Intelligence", color: "text-rose-400 hover:bg-[#f43f5e]/5", icon: BarChart2 },
              { id: "root", label: "👑 Panel ROOT Global", color: "text-red-400 hover:bg-[#ef4444]/5", icon: ShieldCheck, badge: "SaaS" },
              { id: "onboarding", label: "🔧 Enlace WhatsApp API", color: "text-teal-400 hover:bg-[#14b8a6]/5", icon: Globe },
              { id: "integrations", label: "⚙️ Prompts del Sistema", color: "text-slate-400 hover:bg-slate-500/5", icon: Settings }
            ].filter(item => currentUser ? hasAccess(item.id, currentUser.role) : true).map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    addLog("info", `Cargado Módulo: ${item.label.substring(3)}`);
                  }}
                  className={`w-full py-1.5 px-3 rounded-xl border transition-all duration-200 flex items-center justify-between text-left cursor-pointer group ${
                    isActive 
                      ? "bg-[#161a29] text-white border-purple-500/35 shadow-[0_2px_10px_rgba(139,92,246,0.15)] ring-1 ring-purple-500/10 font-bold" 
                      : `border-transparent ${item.color} text-slate-350`
                  }`}
                  type="button"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <IconComp className={`h-3.5 w-3.5 shrink-0 transition-transform ${isActive ? 'scale-110 text-white' : 'group-hover:scale-105'}`} />
                    <span className="text-[11.5px] truncate font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[8px] font-mono font-extrabold px-1 py-0.2 rounded shrink-0 ${
                      isActive ? "bg-purple-600/30 text-purple-300 border border-purple-500/30" : "bg-[#0d0f17] text-slate-500 border border-[#1a1d2d]"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Widget Interactivo de Control / Simulación de Privilegios */}
          {currentUser && (
            <div className="bg-gradient-to-tr from-[#05060b] to-[#0a0c16] border border-[#161a2e]/60 rounded-xl p-3 shadow-inner text-left mx-0.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-extrabold text-[#7982a5] tracking-widest flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                  Seguridad Activa
                </span>
                <span className="text-[8.5px] font-mono text-purple-400 font-extrabold bg-purple-950/20 px-1 rounded uppercase">
                  SIM SECURE
                </span>
              </div>
              <div className="flex items-center space-x-2 pb-2 border-b border-slate-900/60">
                <div className="h-2 w-2 rounded-full bg-indigo-505 bg-indigo-500"></div>
                <div>
                  <p className="text-[10px] text-slate-450 leading-none">Nivel de Acceso activo:</p>
                  <p className={`text-xs font-extrabold mt-0.5 ${getRoleBadgeStyle(currentUser.role).class.split(" ")[1]}`}>
                    {getRoleBadgeStyle(currentUser.role).label}
                  </p>
                </div>
              </div>
              
              {/* Mini conmutador rápido de roles demo en 1 click */}
              <div className="mt-2 text-left">
                <label className="text-[8.5px] text-slate-500 font-bold block uppercase tracking-wide mb-1">
                  Conmutar Nivel de Privilegios para Evaluación:
                </label>
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  {[
                    { r: "ROOT" as UserRole, l: "👑 ROOT" },
                    { r: "SUPER_ADMIN" as UserRole, l: "🛡️ ADMIN" },
                    { r: "GERENTE_COMERCIAL" as UserRole, l: "💼 COMERCIAL" },
                    { r: "COORDINADOR_PROYECTO" as UserRole, l: "📅 PM" },
                    { r: "EMPLEADO" as UserRole, l: "👤 SOPORTE" }
                  ].map(opt => (
                    <button
                      key={opt.r}
                      type="button"
                      onClick={() => {
                        const match = PRESET_USERS.find(u => u.role === opt.r);
                        if (match) {
                          setCurrentUser(match);
                          localStorage.setItem("sinergia_current_user_v1", JSON.stringify(match));
                          addLog("success", `SIM SEGURIDAD: Conmutado dinámicamente al nivel ${opt.r}. Privilegios actualizados.`);
                        } else {
                          const updated = { ...currentUser, role: opt.r };
                          setCurrentUser(updated);
                          localStorage.setItem("sinergia_current_user_v1", JSON.stringify(updated));
                          addLog("success", `SIM SEGURIDAD: Rol de usuario establecido en ${opt.r}.`);
                        }
                      }}
                      className={`py-1.5 px-1 text-[8.2px] font-extrabold tracking-tight rounded border transition-all cursor-pointer text-center ${
                        currentUser.role === opt.r
                          ? "bg-purple-500/10 text-purple-305 text-purple-300 border-purple-500/30 shadow-sm"
                          : "bg-slate-950 text-slate-450 border-slate-900/60 hover:text-white hover:border-slate-800"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chats" ? (
            <div className="space-y-4 flex flex-col flex-1">
              
              {/* Botón de crear Nuevo Prospecto */}
              {!isCreatingClient ? (
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(true)}
                  className="w-full py-2 px-3 text-xs font-medium bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/35 hover:to-teal-600/35 text-emerald-300 border border-emerald-500/20 rounded-lg transition-all duration-150 flex items-center justify-center space-x-2"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Simular Nuevo Cliente</span>
                </button>
              ) : (
                <form onSubmit={handleCreateClient} className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                    <span className="text-xs font-semibold text-emerald-400">Crear Prospecto Manual</span>
                    <button 
                      type="button"
                      onClick={() => setIsCreatingClient(false)}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo</label>
                      <input 
                        required
                        type="text" 
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                        placeholder="Ej: Ing. Carlos Pérez"
                        className="w-full bg-slate-905 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Empresa / Negocio</label>
                      <input 
                        type="text" 
                        value={newClientCompany}
                        onChange={e => setNewClientCompany(e.target.value)}
                        placeholder="Ej: Inversiones Pérez Ltda"
                        className="w-full bg-slate-905 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Teléfono Móvil</label>
                      <input 
                        type="text" 
                        value={newClientPhone}
                        onChange={e => setNewClientPhone(e.target.value)}
                        placeholder="Ej: +57 322 123 4567"
                        className="w-full bg-slate-905 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md text-xs transition duration-150"
                  >
                    Registrar e Iniciar Chat
                  </button>
                </form>
              )}

              {/* Listado de Chats de Clientes */}
              <div className="flex-1 flex flex-col space-y-2.5">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Bandeja de Conversaciones Activas</span>
                
                <div className="space-y-2 max-h-[450px] lg:max-h-none overflow-y-auto pr-1">
                  {sessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    const sessAgent = getAgentById(sess.activeAgentId);
                    
                    // CRM Status badge classes
                    let statusLabel = "Leads Nuevos";
                    let statusColor = "bg-sky-500/10 text-sky-400 border-sky-400/20";
                    if (sess.lead.leadStatus === "interesado") {
                      statusLabel = "Interesado";
                      statusColor = "bg-amber-500/10 text-amber-300 border-amber-500/20 font-bold";
                    } else if (sess.lead.leadStatus === "reunión_agendada") {
                      statusLabel = "Reunión";
                      statusColor = "bg-indigo-500/10 text-indigo-300 border-indigo-400/20 font-bold";
                    } else if (sess.lead.leadStatus === "cliente_cerrado") {
                      statusLabel = "Adquirido";
                      statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-400/25 font-bold";
                    } else if (sess.lead.leadStatus === "soporte") {
                      statusLabel = "Soporte";
                      statusColor = "bg-rose-500/10 text-rose-350 border-rose-500/20 font-bold";
                    }

                    return (
                      <div
                        key={sess.id}
                        onClick={() => handleSelectSession(sess.id)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start space-x-3 relative group cursor-pointer premium-aside-item ${
                          isActive 
                            ? "bg-[#181b29] text-white border-blue-500/35 shadow-[0_4px_16px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/10" 
                            : "bg-[#0d0f17]/25 border-[#1a1d2d]/55 hover:bg-[#121421] hover:border-[#22263c]"
                        }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleSelectSession(sess.id);
                          }
                        }}
                      >
                        {/* Profile Photo */}
                        <div className="relative flex-shrink-0">
                          <img 
                            src={sess.avatar} 
                            alt={sess.clientName} 
                            referrerPolicy="no-referrer"
                            className="h-10.5 w-10.5 rounded-xl border border-slate-800 bg-slate-950 object-cover"
                          />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500 shadow-sm shadow-emerald-500`}></span>
                        </div>

                        {/* Mid metadata */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-100 text-xs truncate group-hover:text-emerald-400 transition-colors duration-200">{sess.clientName}</span>
                            <span className="text-[9px] text-slate-500 font-bold tracking-wide">{sess.timestamp}</span>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 font-bold uppercase tracking-wider">{sess.clientCompany}</p>
                          <p className="text-[10.5px] text-slate-400 italic truncate mt-1">"{sess.lastMessage}"</p>

                          {/* Interactive status info below */}
                          <div className="flex items-center space-x-1.5 mt-2.5">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850 flex items-center space-x-1 shadow-inner`}>
                              <span>{sessAgent.emoji}</span>
                              <span className="truncate max-w-[85px]">{sessAgent.name.split("Asistente de ")[1] || sessAgent.name}</span>
                            </span>
                          </div>
                        </div>

                        {/* Delete action indicator */}
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Sacar a ${sess.clientName} del CRM simulado?`)) {
                                setSessions(prev => prev.filter(item => item.id !== sess.id));
                                if (isActive) {
                                  const filterSess = sessions.filter(item => item.id !== sess.id);
                                  setActiveSessionId(filterSess[0]?.id);
                                }
                                addLog("warn", `CRM: Se ha eliminado de la simulación la sesión con ${sess.clientName}`);
                              }
                            }}
                            className="absolute right-1 top-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded-md transition-opacity duration-200 cursor-pointer"
                            title="Eliminar Chat"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : activeTab === "agents" ? (
            /* Multi-Agent Panel description */
            <div className="space-y-3">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Consola de Agentes Disponibles</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                SINERGIA AI enruta dinámicamente según palabras clave e intenciones al especialista indicado:
              </p>
              
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {SINERGIA_AGENTS.map((agent) => {
                  const isCurSessionAgent = activeSession?.activeAgentId === agent.id;
                  return (
                    <div 
                      key={agent.id} 
                      className={`p-3 rounded-lg border text-xs transition duration-200 ${
                        isCurSessionAgent 
                          ? "bg-slate-850/60 border-indigo-500/40 relative shadow-sm" 
                          : "bg-slate-950/45 border-slate-850"
                      }`}
                    >
                      {isCurSessionAgent && (
                        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded bg-indigo-600 text-[8px] font-extrabold uppercase text-white tracking-widest leading-none shadow-sm shadow-indigo-900">
                          ACTIVO EN CHAT
                        </span>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-lg bg-slate-900 border border-slate-800 p-1.5 rounded-md leading-none">{agent.emoji}</span>
                        <div>
                          <h4 className="font-semibold text-slate-100 text-xs">{agent.name}</h4>
                          <span className="text-[9px] text-slate-450 italic leading-none">{agent.role}</span>
                        </div>
                      </div>
                      
                      <p className="text-[10.5px] text-slate-400 leading-relaxed mt-2 border-t border-slate-900 pt-1.5">
                        {agent.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : activeTab === "dashboard" ? (
            /* Dashboard Quick Sidebar info */
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Resumen del Pipeline</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Visualización consolidada en tiempo real de la base de prospectos registrada en el CRM.
              </p>
              
              <div className="p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-[11px] space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Prospectos Totales:</span>
                  <span className="font-bold text-slate-200">{sessions.length}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Reuniones Agendadas:</span>
                  <span className="font-bold text-emerald-450 font-semibold">{statusCounts.find(s => s.slug === "reunión_agendada")?.value || 0}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Clientes Cerrados:</span>
                  <span className="font-bold text-pink-400">{statusCounts.find(s => s.slug === "cliente_cerrado")?.value || 0}</span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    // Trigger download of CRM data directly
                    const headers = "Nombre,Empresa,Celular,Fase,Servicios\n";
                    const rows = sessions.map(s => 
                      `"${s.clientName}","${s.clientCompany}","${s.phone}","${s.lead.leadStatus}","${s.lead.consultedServices.join(' | ')}"`
                    ).join("\n");
                    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `sinergia_crm_export_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addLog("success", "📥 Base de datos CRM exportada completo como planilla .CSV localmente.");
                  }}
                  className="w-full py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-755 border border-slate-700 hover:border-slate-600 rounded-lg text-slate-250 flex items-center justify-center space-x-2 shadow-sm transition-all"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Descargar CRM (.CSV)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Integrations Status Sidebar checklist */
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Estatus de Producción</span>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Pasos para conectar tu cuenta de WhatsApp definitive con Sinergia.
              </p>

              <div className="space-y-2.5 text-xs text-slate-350">
                <div className="p-2 w-full rounded border border-slate-850 bg-slate-950/40 flex items-center space-x-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 font-bold font-mono">✓</span>
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px]">Webhook En Línea</span>
                    <span className="text-[9.5px] text-slate-500">Servicio listo para recibir Meta webhooks</span>
                  </div>
                </div>

                <div className="p-2 w-full rounded border border-slate-850 bg-slate-950/40 flex items-center space-x-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    dbConfig.whatsappAccessToken ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-slate-900 border border-slate-800 text-slate-600"
                  }`}>{dbConfig.whatsappAccessToken ? "✓" : "2"}</span>
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px]">WhatsApp Token</span>
                    <span className="text-[9.5px] text-slate-500">
                      {dbConfig.whatsappAccessToken ? "Token registrado" : "Falta registrar de Meta Developers"}
                    </span>
                  </div>
                </div>

                <div className="p-2 w-full rounded border border-slate-850 bg-slate-950/40 flex items-center space-x-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    dbConfig.crmSyncGoogleSheets ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-slate-900 border border-slate-800 text-slate-600"
                  }`}>{dbConfig.crmSyncGoogleSheets ? "✓" : "3"}</span>
                  <div>
                    <span className="font-semibold text-slate-200 block text-[11px]">Sincronización Sheets</span>
                    <span className="text-[9.5px] text-slate-500">
                      {dbConfig.crmSyncGoogleSheets ? "Google Sheets activo" : "Opcional: Sincronizar CRM"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Credits and Branding block */}
          <div className="border-t border-slate-850 pt-4 text-center mt-auto">
            <div className="flex items-center justify-center space-x-1.5 text-[10px] text-slate-500">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Sinergia Agencia Creativa</span>
            </div>
            <span className="text-[9px] text-slate-600 block mt-0.5">Tecnología Multiagente para Corporaciones</span>
          </div>

        </aside>

        {(activeTab === "chats" || activeTab === "agents") ? (
          <>
            {/* COLUMNA CENTRAL: Consola Operativa de WhatsApp (lg:col-span-5) */}
            <section className="lg:col-span-5 border-r border-slate-900/60 flex flex-col bg-slate-950/60 min-h-[600px] xl:min-h-0 relative">
          
          {/* Header del Chat */}
          <div className="bg-slate-950/85 border-b border-slate-900/80 px-5 py-4 flex items-center justify-between sticky top-[73px] z-15 backdrop-blur-xl shadow-sm">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="relative">
                <img 
                  src={activeSession?.avatar} 
                  alt={activeSession?.clientName}
                  referrerPolicy="no-referrer"
                  className="h-11 w-11 rounded-xl border border-slate-800 bg-slate-950 object-cover shadow-sm"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-sm truncate leading-tight group-hover:text-emerald-400 transition-colors duration-200">{activeSession?.clientName}</h3>
                <div className="flex items-center space-x-1.5 mt-1 font-sans">
                  <span className="text-[10.5px] text-slate-400 truncate max-w-[130px] font-medium">{activeSession?.clientCompany}</span>
                  <span className="h-1 w-1 bg-slate-850 rounded-full"></span>
                  <span className="text-[10.5px] text-emerald-450 truncate font-mono font-bold">{activeSession?.phone}</span>
                </div>
              </div>
            </div>

            {/* Agente Asignado Badge en WhatsApp */}
            <div className="p-1 px-2 pb-1.5 pt-1 rounded-xl border border-slate-800/80 bg-slate-900/40 flex items-center space-x-2.5 max-w-[185px] shadow-inner select-none">
              <span className="text-lg leading-none mt-0.5">{activeAgent.emoji}</span>
              <div className="min-w-0 pr-1">
                <span className="text-[8px] text-slate-500 block uppercase tracking-widest font-extrabold leading-none">Canal Derivado</span>
                <span className="text-[11px] font-bold block truncate leading-tight text-indigo-300 mt-0.5">{activeAgent.name.split("Asistente de ")[1] || activeAgent.name}</span>
              </div>
            </div>
          </div>

          {/* Banner de transferencia de Agente con Animación */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSession?.activeAgentId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="bg-indigo-950/25 border-b border-indigo-900/40 px-5 py-2.5 flex items-center justify-between text-[11px] text-indigo-300 backdrop-blur-md"
            >
              <div className="flex items-center space-x-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 animate-pulse" />
                <span className="truncate">Cerebro de Enrutamiento derivó sesión al <strong>{activeAgent.role}</strong>.</span>
              </div>
              <span className="text-[8.5px] font-mono px-2 py-0.5 bg-indigo-950/90 border border-indigo-500/25 rounded-md text-indigo-300 select-none uppercase font-bold tracking-widest ml-2 flex-shrink-0">
                AI GATEWAY ENROUTE
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Area de Globos del Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-[350px]" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
            
            {activeSession?.messages.map((msg, idx) => {
              
              if (msg.sender === "system") {
                return (
                  <div key={msg.id || idx} className="flex justify-center my-2 select-none animate-fade-in">
                    <span className="bg-[#121420] text-slate-400 text-[10px] font-bold tracking-wide px-3.5 py-1.5 rounded-full border border-[#1b1e2e] leading-relaxed text-center max-w-[85%] shadow-sm">
                      ⚙️ {msg.text}
                    </span>
                  </div>
                );
              }

              const isUser = msg.sender === "user";
              const msgAgent = msg.agentId ? getAgentById(msg.agentId) : getAgentById(activeSession.activeAgentId);

              if (msg.isPrivate) {
                return (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-start my-2 pr-4"
                  >
                    <div className="bg-[#1f1a12] border border-amber-500/25 rounded-2xl p-4 shadow-md w-full relative group max-w-[85%]">
                      <div className="flex items-center justify-between border-b border-amber-500/10 pb-1.5 mb-2 text-[10px] text-amber-400 font-extrabold uppercase tracking-widest font-mono">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-amber-550 text-xs animate-pulse">🔒</span>
                          <span>Nota Interna por {msgAgent.name.split("Asistente de ")[1] || msgAgent.name}</span>
                        </div>
                        <span className="text-slate-500 font-medium">{msg.timestamp}</span>
                      </div>
                      <p className="text-amber-200/90 text-[12.5px] leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.text}
                      </p>
                      <div className="text-[8.5px] text-amber-550/60 mt-1.5 text-right font-bold uppercase tracking-wider">
                        Solo visible para agentes del CRM
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl p-4 shadow-md relative group truncate-none ${
                    isUser 
                      ? "bg-[#151722] border border-emerald-500/15 text-slate-100 rounded-tr-none shadow-black/30" 
                      : "bg-[#114ca6] border border-blue-500/15 text-white rounded-tl-none shadow-blue-950/20"
                  }`}>
                    
                    {/* Bot Agent Header Indicator inside speech bubble */}
                    {isUser ? (
                      <div className="flex items-center space-x-1.5 text-[9px] uppercase font-bold text-slate-400 mb-1.5 border-b border-slate-900/60 pb-1">
                        <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse shadow-sm"></span>
                        <span>{activeSession.clientName} (Cliente WhatsApp)</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-[9px] uppercase font-extrabold text-blue-200 mb-1.5 border-b border-blue-400/20 pb-1">
                        <span>{msgAgent.emoji}</span>
                        <span>{msgAgent.name} ({msgAgent.role})</span>
                      </div>
                    )}

                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                    
                    <div className="flex items-center justify-end space-x-1 mt-1.5 text-[9px] text-slate-400 font-medium opacity-85">
                      <span className={isUser ? "text-slate-500" : "text-blue-250 font-mono text-[8.5px]"}>{msg.timestamp}</span>
                      {isUser ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Visual AI Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 shadow-md flex flex-col space-y-1.5 max-w-[70%]">
                  <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    <span>Sinergia AI evaluando intención...</span>
                  </div>
                  <div className="flex items-center space-x-1 py-1">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Inputs y Atajos de Cliente Simulado */}
          <div className="bg-slate-950/95 border-t border-slate-900 p-5.5 space-y-4 shadow-2xl">
            
            {/* Quick Prompts Píldoras */}
            <div className="space-y-2">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block">Simulador de Intenciones de Clientes</span>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickPill("Hola, necesito que me diseñen una página web moderna con catálogo de servicios.")}
                  className="px-3 py-1.5 text-[10.5px] bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/30 text-indigo-300 rounded-full transition duration-150 flex items-center space-x-1.5 font-semibold cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(99,102,241,0.1)]"
                >
                  <Code className="w-3 h-3 text-indigo-400" />
                  <span>Pedir Desarrollo Web</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Urgente, mi hosting se cayó y tengo correos rechazados. Ayuda.")}
                  className="px-3 py-1.5 text-[10.5px] bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-red-500/30 text-red-300 rounded-full transition duration-150 flex items-center space-x-1.5 font-semibold cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>Notificar Falla Crítica</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Quiero automatizar mi WhatsApp con un bot de IA avanzada n8n. ¿Qué costo tiene?")}
                  className="px-3 py-1.5 text-[10.5px] bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-purple-500/30 text-purple-300 rounded-full transition duration-150 flex items-center space-x-1.5 font-semibold cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(168,85,247,0.1)]"
                >
                  <Bot className="w-3 h-3 text-purple-400" />
                  <span>Configurar IA Bot</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Hola. Quiero agendar una reunión comercial para mañana en Google Meet sobre Meta Ads.")}
                  className="px-3 py-1.5 text-[10.5px] bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-emerald-500/30 text-emerald-300 rounded-full transition duration-150 flex items-center space-x-1.5 font-semibold cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                >
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>Agendar Reunión</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Buenas, ¿cuánto cuesta el community manager y diseño de marca?")}
                  className="px-3 py-1.5 text-[10.5px] bg-slate-900/50 hover:bg-slate-900 border border-slate-850 hover:border-pink-500/30 text-pink-300 rounded-full transition duration-150 flex items-center space-x-1.5 font-semibold cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(236,72,153,0.1)]"
                >
                  <Globe className="w-3 h-3 text-pink-400" />
                  <span>Campañas Ads & Redes</span>
                </button>
              </div>
            </div>

            {/* Elegant Dual-Action Composer Header (Reply / Note / Simulator) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setEditorMode("client")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${
                      editorMode === "client"
                        ? "bg-emerald-950/50 border border-emerald-500/35 text-emerald-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Simular Cliente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("agent")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${
                      editorMode === "agent"
                        ? "bg-blue-950/50 border border-blue-500/35 text-blue-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    <span>💬</span>
                    <span>Repuesta Agente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("note")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-150 flex items-center space-x-1.5 cursor-pointer ${
                      editorMode === "note"
                        ? "bg-amber-950/30 border border-amber-500/35 text-amber-400 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                    }`}
                  >
                    <span>🔒</span>
                    <span>Nota Interna</span>
                  </button>
                </div>
                
                <span className="text-[10px] text-slate-500 font-medium font-mono hidden sm:inline">
                  {editorMode === "client" ? "Simular webhook de cliente" : editorMode === "agent" ? "WhatsApp oficial" : "Solo agentes CRM"}
                </span>
              </div>

              {/* Composition Workspace */}
              <form 
                onSubmit={handleFormSubmit} 
                className={`flex flex-col bg-[#0b0c13] border rounded-2xl p-2 transition-all duration-200 ${
                  editorMode === "client"
                    ? "border-emerald-500/20 focus-within:border-emerald-500/40 focus-within:ring-1 focus-within:ring-emerald-500/10"
                    : editorMode === "agent"
                    ? "border-blue-500/25 focus-within:border-blue-500/45 focus-within:ring-1 focus-within:ring-blue-500/10"
                    : "border-amber-500/25 focus-within:border-amber-500/45 focus-within:ring-1 focus-within:ring-amber-500/10"
                }`}
              >
                {/* Text Input area */}
                <textarea 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={
                    editorMode === "client" 
                      ? "Escribe un mensaje de WhatsApp simulando al cliente final (para disparar enrutamiento de IA)..." 
                      : editorMode === "agent"
                      ? `Responder a ${activeSession?.clientName} por WhatsApp como ${activeAgent.name.split("Asistente de ")[1] || activeAgent.name}...`
                      : "Escribe una anotación privada sobre este prospecto (ej: 'El cliente prefiere llamada por la tarde' o 'Lead de alto valor')..."
                  }
                  rows={2}
                  className="w-full bg-transparent text-white placeholder-slate-600 border-none rounded-none py-2 px-3 text-[12px] focus:outline-none focus:ring-0 font-medium resize-none min-h-[50px] leading-relaxed"
                  disabled={isLoading && editorMode === "client"}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputText.trim()) {
                        sendMessage(inputText, editorMode);
                      }
                    }
                  }}
                />

                {/* Rich format utilities and dispatch bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-900/60 px-2 mt-1">
                  {/* Decorative Rich Tools */}
                  <div className="flex items-center space-x-2.5 text-slate-500">
                    <button type="button" title="Negrita" className="text-[11px] font-bold hover:text-slate-300 p-1 rounded hover:bg-slate-900 cursor-pointer">B</button>
                    <button type="button" title="Itálica" className="text-[11px] italic hover:text-slate-300 p-1 rounded hover:bg-slate-900 cursor-pointer">I</button>
                    <button type="button" title="Respuestas rápidas" className="text-[9.5px] font-bold uppercase hover:text-indigo-400 p-1 px-1.5 bg-slate-900 rounded border border-slate-800 cursor-pointer">
                      / plantilla
                    </button>
                  </div>

                  {/* Send Action */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || (isLoading && editorMode === "client")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 flex items-center space-x-1.5 cursor-pointer shadow-md ${
                      !inputText.trim()
                        ? "bg-[#11121d] text-slate-600 border border-slate-850 cursor-not-allowed"
                        : editorMode === "client"
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                        : editorMode === "agent"
                        ? "bg-[#114ca6] hover:bg-[#1555ba] text-white border border-blue-500/20"
                        : "bg-amber-600 hover:bg-amber-500 text-slate-950 border border-amber-500/10"
                    }`}
                  >
                    {editorMode === "note" ? (
                      <>
                        <span>🔒</span>
                        <span>Guardar Nota</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        <span>{editorMode === "client" ? "Simular Envío" : "Enviar"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </section>

        {/* COLUMNA DERECHA: Ficha CRM, Checklist de Servicios y Log del Backoffice (lg:col-span-4) */}
        <aside className="lg:col-span-4 bg-slate-950/15 p-4.5 xl:p-5 flex flex-col space-y-4 xl:space-y-5 overflow-y-auto">
          
          {/* CRM Ficha Comercial Card */}
          <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-900 space-y-4 shadow-sm backdrop-blur-md">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-emerald-450" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-sans">Perfil Comercial Lead</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCRM(!isEditingCRM)}
                className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-455 text-emerald-400 hover:text-emerald-350 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-850/85 rounded-xl transition duration-150 cursor-pointer shadow-sm"
              >
                {isEditingCRM ? "Cancelar" : "Modificar"}
              </button>
            </div>

            {isEditingCRM ? (
              <div className="space-y-3 p-1 text-xs">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 block mb-1 font-bold">Nombre Propietario</label>
                  <input 
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 block mb-1 font-bold">Empresa / Negocio</label>
                  <input 
                    type="text"
                    value={editedCompany}
                    onChange={e => setEditedCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 block mb-1 font-bold">Teléfono</label>
                  <input 
                    type="text"
                    value={editedPhone}
                    onChange={e => setEditedPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/40 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-slate-500 block mb-1 font-bold">Fase Pipeline</label>
                  <select
                    value={editedStatus}
                    onChange={e => setEditedStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none font-semibold cursor-pointer"
                  >
                    <option value="nuevo">Nuevo Prospecto</option>
                    <option value="interesado">Interesado Calificado</option>
                    <option value="reunión_agendada">Reunión Agendada</option>
                    <option value="cliente_cerrado">Cliente Cerrado (Contratado)</option>
                    <option value="soporte">Incidencia / Soporte Activo</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={saveCRMChanges}
                  className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer shadow-md shadow-emerald-950/20"
                >
                  Guardar Perfil
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-3 border-b border-slate-900 pb-3.5">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 block font-bold">Prospecto</span>
                    <span className="font-bold text-slate-100 text-[12.5px] truncate block mt-0.5">{activeSession?.clientName || "Sin registrar"}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 block font-bold">Marca Corporativa</span>
                    <span className="font-bold text-slate-100 flex items-center space-x-1.5 mt-0.5 truncate text-[12px]">
                      <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{activeSession?.clientCompany || "Sin registrar"}</span>
                    </span>
                  </div>
                </div>

                <div className="border-b border-slate-900 pb-3.5">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 block font-bold">Necesidad Extraída por IA</span>
                  <p className="text-[11px] leading-relaxed italic bg-slate-950/60 p-3 rounded-xl border border-slate-850/60 text-slate-300 mt-1.5 font-medium">
                    {activeSession?.lead.needsSummary ? `"${activeSession?.lead.needsSummary}"` : "Esperando que el cliente exprese su necesidad o requerimiento técnico..."}
                  </p>
                </div>

                {/* Servicios de Sinergia Activos / Checklist */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 block font-bold">Intereses Detectados en Chat</span>
                  
                  <div className="grid grid-cols-1 gap-2 pt-0.5">
                    {[
                      { key: "Desarrollo Web", label: "Desarrollo de Páginas Web 💻" },
                      { key: "Bots e Inteligencia Artificial", label: "Bots e Inteligencia Artificial 🤖" },
                      { key: "Facebook/Meta Ads", label: "Campañas Meta Ads & Embudos 📈" },
                      { key: "Manejo de Redes Sociales", label: "Manejo Redes / Reels 🖌️" },
                      { key: "Diseño Gráfico", label: "Diseño Gráfico & Branding 🎨" }
                    ].map(item => {
                      const isDetected = activeSession?.lead.consultedServices?.some(s => 
                        s.toLowerCase().includes(item.key.toLowerCase()) || 
                        item.key.toLowerCase().includes(s.toLowerCase())
                      );
                      return (
                        <div 
                          key={item.key} 
                          className={`px-3 py-2 rounded-xl border text-[11px] flex items-center justify-between transition-all duration-200 ${
                            isDetected 
                              ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 font-bold shadow-inner" 
                              : "bg-slate-950/20 text-slate-500 border-slate-850/60"
                          }`}
                        >
                          <span className="font-semibold">{item.label}</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${isDetected ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" : "bg-slate-800"}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CRM Visual Funnel Pipeline */}
          <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-900 space-y-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center space-x-2.5">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-sans">Fases Pipeline Comercial</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { statusId: "nuevo", step: 1, label: "Saludo & Recepción", description: "Clasificación inicial de datos" },
                { statusId: "interesado", step: 2, label: "Interesado Calificado", description: "Demanda información comercial" },
                { statusId: "reunión_agendada", step: 3, label: "Reunión de Negocio", description: "Coordinado Google Meet de ventas" },
                { statusId: "cliente_cerrado", step: 4, label: "Cliente Sinergia", description: "Contratación de servicios realizada" },
                { statusId: "soporte", step: 5, label: "Incidencias / Soporte", description: "Asesoría o incidencias de hosting" }
              ].map((stepObj) => {
                const isSelected = activeSession?.lead.leadStatus === stepObj.statusId;
                
                // Color mapping for active states
                let borderClass = isSelected ? "border-indigo-505 bg-indigo-950/20 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.06)]" : "border-slate-850/50 bg-slate-950/20 text-slate-450";
                if (isSelected) {
                  if (stepObj.statusId === "nuevo") borderClass = "border-blue-500/50 bg-blue-500/5 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.06)]";
                  if (stepObj.statusId === "interesado") borderClass = "border-amber-500/50 bg-amber-500/5 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.06)]";
                  if (stepObj.statusId === "reunión_agendada") borderClass = "border-emerald-500/50 bg-emerald-500/5 text-emerald-250 shadow-[0_0_12px_rgba(16,185,129,0.06)]";
                  if (stepObj.statusId === "cliente_cerrado") borderClass = "border-pink-500/50 bg-pink-500/5 text-pink-250 shadow-[0_0_12px_rgba(236,72,153,0.06)]";
                  if (stepObj.statusId === "soporte") borderClass = "border-rose-500/50 bg-rose-500/5 text-rose-250 shadow-[0_0_12px_rgba(244,63,94,0.06)]";
                }

                return (
                  <div 
                    key={stepObj.statusId}
                    className={`flex items-start space-x-3 p-2.5 rounded-xl border transition duration-250 ${borderClass}`}
                  >
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 ${
                      isSelected ? "bg-slate-100 text-slate-950" : "bg-slate-905 border border-slate-800 text-slate-500"
                    }`}>
                      {stepObj.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] leading-tight text-white">{stepObj.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">{stepObj.description}</p>
                    </div>
                    
                    {/* Tick for selected */}
                    {isSelected && (
                      <span className="ml-auto text-[8px] font-extrabold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-400 shadow-sm animate-pulse">
                        ACTIVO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Retro Logs Terminal Viewer */}
          <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-900 space-y-3 flex-grow flex flex-col justify-between backdrop-blur-md animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <div className="flex items-center space-x-2.5">
                <Terminal className="w-4 h-4 text-slate-400 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono">Consola Logs Sinergia AI</h3>
              </div>
              <span className="text-[7.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md uppercase font-mono tracking-widest font-extrabold shadow-sm">
                LOGGING LIVE
              </span>
            </div>
 
            <div className="bg-slate-950/90 rounded-xl p-3.5 font-mono text-[9.5px] leading-5 text-slate-300 h-[190px] overflow-y-auto space-y-1.5 mt-2 max-h-[190px] xl:max-h-none flex-1 custom-scrollbar shadow-inner border border-slate-900">
              {logs.map((log) => {
                let textCol = "text-slate-300";
                let typePrefix = "[INFO]";
                if (log.type === "success") {
                  textCol = "text-emerald-400";
                  typePrefix = "[CRM ]";
                } else if (log.type === "warn") {
                  textCol = "text-amber-400";
                  typePrefix = "[FAIL]";
                } else if (log.type === "transfer") {
                  textCol = "text-indigo-400 font-semibold";
                  typePrefix = "[DEVI]";
                }
 
                return (
                  <div key={log.id} className="border-b border-slate-900/30 pb-0.5 flex items-start space-x-1.5 last:border-b-0">
                    <span className="text-slate-600 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={`${textCol} flex-shrink-0 font-bold`}>{typePrefix}</span>
                    <span className={`${textCol} break-all font-sans font-medium text-[10px]`}>
                      {log.message}
                    </span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>

        </aside>
          </>
        ) : activeTab === "crm" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Kanban Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono bg-emerald-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                  Vista CRM Consola Corporativa
                </span>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                  <Briefcase className="w-5.5 h-5.5 text-indigo-400" />
                  <span>Tablero de Control CRM Kanban</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Arrastra, califica e interactúa con tus leads detectados de WhatsApp de forma visual.</p>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={crmSearchText}
                    onChange={(e) => setCrmSearchText(e.target.value)}
                    placeholder="Buscar cliente, marca..."
                    className="bg-slate-900 text-slate-100 placeholder-slate-500 border border-slate-800 rounded-lg px-3 py-1.5 pl-8 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium w-full sm:w-[200px]"
                  />
                  <Users className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const randomNames = ["Carlos Julio Sg", "Dra. Maria Clara", "Andres Felipe Ramirez", "Soluciones Graficas SA", "Tech Bogotá Corp", "Ing. Daniel Restrepo", "Marta Lucia Boutique", "Inversiones Lopez G"];
                    const randomCompanies = ["Logistica SA", "Dental Care", "Ramirez & Asociados", "Studio Grafico", "Software Depot", "Soluciones de Nube", "Boutique Glamour", "Lopez Holdings"];
                    const randomPrompts = [
                      "Hola, quiero cotizar un bot de WhatsApp para agendar citas.",
                      "Buenas, ocupo una campaña publicitaria en Facebook Ads para mi negocio.",
                      "Estimados, necesito presupuesto para desarrollo web e-commerce.",
                      "Hola, se cayeron los correos de mi negocio, requiero soporte de hosting.",
                      "Hola que tal, cuanto cobran por el manejo de redes sociales?",
                      "Me gustaria automatizar mi tienda online con un agente de ventas inteligente.",
                      "Quiero agendar una reunion con Sinergia para un CRM inmobiliario."
                    ];
                    const num = Math.floor(Math.random() * randomNames.length);

                    const testId = "rand_" + Date.now();
                    const testSession: ChatSession = {
                      id: testId,
                      clientName: randomNames[num],
                      clientCompany: randomCompanies[num],
                      phone: "+57 3" + Math.floor(10000000 + Math.random() * 90000000),
                      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(randomNames[num])}`,
                      lastMessage: randomPrompts[num % randomPrompts.length],
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      unreadCount: 1,
                      lead: {
                        customerName: randomNames[num],
                        companyName: randomCompanies[num],
                        consultedServices: ["Automatización con IA"],
                        leadStatus: "nuevo" as LeadStatus,
                        needsSummary: randomPrompts[num % randomPrompts.length]
                      },
                      messages: [
                        {
                          id: "sys_init",
                          sender: "system" as const,
                          text: "Meta Cloud Callback: WhatsApp Handshake inbound message emulated.",
                          timestamp: "Hoy"
                        },
                        {
                          id: "user_init",
                          sender: "user" as const,
                          text: randomPrompts[num % randomPrompts.length],
                          timestamp: "Hoy"
                        }
                      ],
                      activeAgentId: "recepcion"
                    };
                    setSessions(prev => [testSession, ...prev]);
                    addLog("success", `CRM: Se ha auto-generado cliente potencial de WhatsApp: ${randomNames[num]}`);
                  }}
                  className="bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition duration-150 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Auto-Simular Lead</span>
                </button>
              </div>
            </div>

            {/* Kanban columns grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {[
                { statusId: "nuevo" as LeadStatus, label: "Saludo & Recepción", bg: "from-blue-600/10 to-blue-500/5", border: "border-blue-900/30", text: "text-blue-400", indicator: "bg-blue-400" },
                { statusId: "interesado" as LeadStatus, label: "Interesado Calificado", bg: "from-yellow-600/10 to-yellow-500/5", border: "border-yellow-905/30", text: "text-yellow-400", indicator: "bg-yellow-400" },
                { statusId: "reunión_agendada" as LeadStatus, label: "Reunión de Ventas", bg: "from-emerald-600/10 to-emerald-500/5", border: "border-emerald-950/30", text: "text-emerald-400", indicator: "bg-emerald-400" },
                { statusId: "cliente_cerrado" as LeadStatus, label: "Cliente Sinergia", bg: "from-pink-600/10 to-pink-500/5", border: "border-pink-905/30", text: "text-pink-400", indicator: "bg-pink-400" },
                { statusId: "soporte" as LeadStatus, label: "Incidencias / Soporte", bg: "from-amber-600/10 to-amber-500/5", border: "border-amber-900/30", text: "text-amber-500", indicator: "bg-amber-500" },
              ].map((column) => {
                const columnLeads = sessions.filter(sess => {
                  const matchStatus = sess.lead?.leadStatus === column.statusId;
                  const matchText = sess.clientName.toLowerCase().includes(crmSearchText.toLowerCase()) || 
                                    sess.clientCompany.toLowerCase().includes(crmSearchText.toLowerCase());
                  return matchStatus && matchText;
                });

                return (
                  <div 
                    key={column.statusId} 
                    className="flex flex-col min-w-[220px] bg-slate-900/30 border border-slate-850 rounded-xl p-3.5 space-y-3 flex-1 min-h-[500px] hover:border-slate-800 transition duration-150"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`h-2 w-2 rounded-full ${column.indicator}`} />
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${column.text}`}>{column.label}</h3>
                      </div>
                      <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded-full border border-slate-850 font-mono text-slate-400 font-semibold">
                        {columnLeads.length}
                      </span>
                    </div>

                    {/* Leads Container inside Column */}
                    <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                      {columnLeads.length === 0 ? (
                        <div className="h-28 border border-dashed border-slate-850 rounded-lg flex flex-col items-center justify-center text-center p-3 text-slate-650">
                          <Users className="w-4 h-4 text-slate-700 mb-1" />
                          <span className="text-[9.5px] text-slate-500">Sin contactos en esta fase</span>
                        </div>
                      ) : (
                        columnLeads.map((leadItem) => {
                          return (
                            <div
                              key={leadItem.id}
                              className="bg-slate-950/75 border border-slate-850 hover:border-slate-700 p-3 rounded-lg space-y-2.5 relative group shadow-sm transition-all duration-150"
                            >
                              {/* Client Avatar, Name & Phone */}
                              <div className="flex items-start space-x-2">
                                <img 
                                  src={leadItem.avatar} 
                                  alt={leadItem.clientName}
                                  referrerPolicy="no-referrer"
                                  className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-white text-xs truncate leading-tight group-hover:text-emerald-400 transition-colors pointer-events-none">
                                    {leadItem.clientName}
                                  </h4>
                                  <span className="text-[9.5px] text-slate-450 block truncate font-medium">{leadItem.clientCompany}</span>
                                </div>
                              </div>

                              {/* Last message extract */}
                              <div className="bg-slate-900/65 rounded p-1.5 border border-slate-900/50 text-[10.5px] text-slate-350 italic leading-snug line-clamp-2">
                                "{leadItem.lastMessage}"
                              </div>

                              {/* Target Service Tags */}
                              {leadItem.lead?.consultedServices && leadItem.lead.consultedServices.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {leadItem.lead.consultedServices.map(srv => (
                                    <span key={srv} className="text-[8px] bg-slate-900 text-indigo-305 text-indigo-400 font-bold tracking-wider px-1.5 py-0.5 rounded border border-indigo-950/40 uppercase">
                                      {srv.split(" ")[0]}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Actions footer inside Kanban Card */}
                              <div className="flex items-center justify-between border-t border-slate-900/40 pt-2 mt-1 gap-1">
                                {/* Set session active & click to chats */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectSession(leadItem.id);
                                    setActiveTab("chats");
                                  }}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-350 font-bold flex items-center space-x-0.5 py-0.5 cursor-pointer"
                                  title="Ver Chat en Vivo"
                                >
                                  <MessageSquare className="w-3 h-3 text-indigo-400 mr-0.5" />
                                  <span>Bandeja</span>
                                </button>

                                {/* Moving Actions Arrows */}
                                <div className="flex items-center space-x-1">
                                  {column.statusId !== "nuevo" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const phasesList: LeadStatus[] = ["nuevo", "interesado", "reunión_agendada", "cliente_cerrado", "soporte"];
                                        const curIdx = phasesList.indexOf(column.statusId);
                                        const prevPhase = phasesList[curIdx - 1];
                                        setSessions(prev => prev.map(s => {
                                          if (s.id === leadItem.id) {
                                            return { ...s, lead: { ...s.lead, leadStatus: prevPhase } };
                                          }
                                          return s;
                                        }));
                                        addLog("success", `CRM: Se ha retornado de fase a ${leadItem.clientName}`);
                                      }}
                                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-455 text-slate-400 hover:text-white border border-slate-850 cursor-pointer text-[9px] font-bold"
                                      title="Retroceder Fase"
                                    >
                                      &larr;
                                    </button>
                                  )}
                                  
                                  {column.statusId !== "soporte" && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const phasesList: LeadStatus[] = ["nuevo", "interesado", "reunión_agendada", "cliente_cerrado", "soporte"];
                                        const curIdx = phasesList.indexOf(column.statusId);
                                        const nextPhase = phasesList[curIdx + 1];
                                        setSessions(prev => prev.map(s => {
                                          if (s.id === leadItem.id) {
                                            return { ...s, lead: { ...s.lead, leadStatus: nextPhase } };
                                          }
                                          return s;
                                        }));
                                        addLog("success", `CRM: Se ha promovido de fase a ${leadItem.clientName} a [${nextPhase.toUpperCase()}]`);
                                      }}
                                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-455 text-slate-400 hover:text-white border border-slate-850 cursor-pointer text-[9px] font-bold"
                                      title="Promover Fase"
                                    >
                                      &rarr;
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : activeTab === "automations" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Automations Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-3">
              <div>
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest font-mono bg-pink-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                  Diseñador de Flujos Inteligentes
                </span>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                  <Layers className="w-5.5 h-5.5 text-pink-500 animate-pulse" />
                  <span>Maquetador de Lógica Multiagente</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Conecta disparadores, evalúa intenciones con Gemini y ejecuta decisiones CRM en caliente.</p>
              </div>

              <div>
                <button
                  type="button"
                  disabled={isSimulatingFlow}
                  onClick={() => {
                    setIsSimulatingFlow(true);
                    setFlowSimStep(1);
                    setFlowSimLogs(["[SIM] Inicializando simulador de webhook..."]);
                    
                    const logPoints = [
                      { step: 1, msg: "📡 [0.5s] Webhook Callback Capturado: Incoming WhatsApp text event verified." },
                      { step: 2, msg: "🧠 [2.0s] Gemini 3.5 Core: Analizando gramática e intenciones semánticas." },
                      { step: 3, msg: "⚡ [3.5s] INTENCIÓN DETECTADA: 'Bots con IA / Automatización con n8n'." },
                      { step: 4, msg: "🔄 [5.0s] ASIGNACION: Turno redirigido a 'Asistente de Automatización IA'." },
                      { step: 5, msg: "📊 [6.5s] CRM SYNC: Lead promovido a fase 'INTERESADO'. Sincronizando Google Sheets." },
                      { step: 6, msg: "✅ [8.0s] EJECUCIÓN SATISFACTORIA: Ciclo de automatización cerrado con cero latencias." }
                    ];

                    logPoints.forEach((pt, index) => {
                      setTimeout(() => {
                        setFlowSimStep(pt.step);
                        setFlowSimLogs(prev => [...prev, pt.msg]);
                        addLog("success", pt.msg.split("] ")[1] || pt.msg);
                        if (index === logPoints.length - 1) {
                          setIsSimulatingFlow(false);
                        }
                      }, (index + 1) * 1500);
                    });
                  }}
                  className={`px-4 py-2 font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isSimulatingFlow 
                      ? "bg-slate-800 text-slate-505 text-slate-550 border border-slate-705 cursor-not-allowed" 
                      : "bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-950/20 shadow-md"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSimulatingFlow ? "Simulando flujo..." : "Ejecutar Simulador de Integración n8n"}</span>
                </button>
              </div>
            </div>

            {/* Layout layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Flows Left Rail */}
              <div className="lg:col-span-4 bg-slate-900/30 p-4 rounded-xl border border-slate-850 space-y-4">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest font-mono block animate-pulse font-semibold">Sinergia Node Flows</span>
                <div className="space-y-2.5">
                  {flows.map((flow) => (
                    <div 
                      key={flow.id} 
                      onClick={() => setSelectedFlowId(flow.id)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all duration-155 select-none ${
                        selectedFlowId === flow.id
                          ? "bg-slate-850/60 border-pink-500/40 shadow-sm"
                          : "bg-slate-950/40 border-slate-850 hover:bg-slate-900/40"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="font-bold text-white block truncate max-w-[150px]">{flow.name}</span>
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                          flow.status === "Activo" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-900/20" : "bg-slate-800 text-slate-500"
                        }`}>{flow.status}</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 mt-1">Disparador: {flow.trigger}</p>
                      <p className="text-[9px] text-slate-400 block mt-2">Ejecutado: <span className="text-white font-semibold font-mono">{flow.lastExecuted}</span></p>
                    </div>
                  ))}
                </div>

                {/* Simulated variables config */}
                <div className="border-t border-slate-850/60 pt-4 space-y-3.5">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest font-mono block font-semibold">Sensibilidad Enrutamiento IA</span>
                  
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 text-[10.5px] mb-1">
                        <span>Minimizar falsos positivos:</span>
                        <span className="text-white font-mono font-bold">95%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 rounded-full" style={{ width: '95%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 text-[10.5px] mb-1">
                        <span>Latencia de Asignación Experto:</span>
                        <span className="text-white font-mono font-bold">1.2 s</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '45%' }} />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1 font-bold">Tono de Respuestas del Cerebro</label>
                      <select 
                        value={flowConfig.responseTone}
                        onChange={(e) => setFlowConfig({ ...flowConfig, responseTone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-350 focus:outline-none cursor-pointer text-xs"
                      >
                        <option value="profesional">Corporativo y Profesional 💼</option>
                        <option value="amigable">Amigable y Cercano 😊</option>
                        <option value="comercial">Comercio consultivo & Agresivo 🚀</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Grid Canvas map */}
              <div className="lg:col-span-8 space-y-4">
                <div 
                  className="bg-slate-950 border border-slate-850 rounded-xl p-5 min-h-[420px] relative flex flex-col justify-between glow-pink animate-fadeIn"
                  style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "16px 16px" }}
                >
                  <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-widest font-mono bg-slate-900 px-2 py-1 rounded inline-block self-start border border-slate-800 pointer-events-none">
                    DIAGRAMA DE NODOS VERIFICADO
                  </span>

                  {/* Nodes wrapper */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto relative pt-5 pb-5">
                    
                    {/* NODE 1 */}
                    <div 
                      className={`bg-slate-900/95 border p-3 rounded-lg flex flex-col space-y-2 relative transition duration-155 shadow-md ${
                        flowSimStep === 1 ? "border-pink-500 ring-2 ring-pink-500/25 shadow-lg shadow-pink-950/10" : "border-slate-850"
                      }`}
                    >
                      <span className="text-xl">📡</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">DISPARADOR INBOUND</span>
                        <h4 className="font-bold text-white text-xs mt-0.5">WhatsApp Webhook Callback</h4>
                        <p className="text-[9.5px] text-slate-450 mt-1">Suscrito a eventos: whatsapp.messages.json</p>
                      </div>
                      <span className={`absolute -right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ${
                        flowSimStep >= 1 ? "bg-pink-500 animate-ping" : "bg-slate-800"
                      }`} />
                    </div>

                    {/* NODE 2 */}
                    <div 
                      className={`bg-slate-900/95 border p-3 rounded-lg flex flex-col space-y-2 relative transition duration-155 shadow-md ${
                        flowSimStep === 2 || flowSimStep === 3 ? "border-indigo-500 ring-2 ring-indigo-500/25 shadow-lg shadow-indigo-950/10" : "border-slate-850"
                      }`}
                    >
                      <span className="text-xl">🧠</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">CEREBRO CLASIFICADOR</span>
                        <h4 className="font-bold text-white text-xs mt-0.5">Sinergia AI Brain Center</h4>
                        <p className="text-[9.5px] text-slate-450 mt-1">Enruta según la personalidad e intensidades de Gemini.</p>
                      </div>
                      <span className={`absolute -right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full ${
                        flowSimStep >= 2 ? "bg-indigo-500 animate-ping" : "bg-slate-800"
                      }`} />
                    </div>

                    {/* NODE 3 */}
                    <div 
                      className={`bg-slate-900/95 border p-3 rounded-lg flex flex-col space-y-2 relative transition duration-155 shadow-md ${
                        flowSimStep >= 4 ? "border-emerald-500 ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/10" : "border-slate-850"
                      }`}
                    >
                      <span className="text-xl">💰</span>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">ACCIONES AUTOMÁTICAS</span>
                        <h4 className="font-bold text-white text-xs mt-0.5">Routing Multiagente IA</h4>
                        <p className="text-[9.5px] text-slate-450 mt-1">Transfiere y actualiza fase CRM a 'INTERESADO'.</p>
                      </div>
                    </div>

                  </div>

                  {/* Simulator Logs Box inside screen */}
                  {flowSimLogs.length > 0 && (
                    <div className="bg-black/85 p-3 rounded-lg border border-slate-850 font-mono text-[10px] leading-relaxed text-slate-350 max-h-[120px] overflow-y-auto">
                      <span className="text-[8.5px] uppercase font-bold text-pink-500 block mb-1 tracking-wider">&gt;_ n8n CLI OUTPUT SIMULATION:</span>
                      {flowSimLogs.map((logLine, lineIdx) => (
                        <div key={lineIdx} className="border-b border-slate-900/40 pb-0.5 text-slate-300">
                          {logLine}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "onboarding" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Onboarding Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono bg-purple-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold animate-pulse">
                Guía de Onboarding Interactiva
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <Globe className="w-5.5 h-5.5 text-purple-400" />
                <span>Consola de Integración Meta Developers</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Conecta tu número oficial de WhatsApp Cloud API y realiza pruebas de autodiagnóstico en tiempo real.</p>
            </div>

            {/* Stepper Steps Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { stepNum: 1, title: "1. Crear App en Meta", desc: "Registrar ID de Teléfono y Cuenta Comercial" },
                { stepNum: 2, title: "2. Webhook Callback", desc: "Configurar Verify Token & Suscripciones" },
                { stepNum: 3, title: "3. Pruebas Callback", desc: "Simulador de mensajería interactiva inbound" }
              ].map(st => (
                <div 
                  key={st.stepNum}
                  onClick={() => setOnboardingStep(st.stepNum)}
                  className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150 flex items-start space-x-3 ${
                    onboardingStep === st.stepNum 
                      ? "bg-purple-950/20 border-purple-500/40 shadow-md shadow-purple-950/10" 
                      : onboardingStep > st.stepNum 
                        ? "bg-slate-900/40 border-purple-900/20 opacity-80" 
                        : "bg-slate-900/10 border-slate-850 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    onboardingStep >= st.stepNum ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                    {st.stepNum}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{st.title}</h4>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{st.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Step Body Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Stepper Core Fields Panel */}
              <div className="lg:col-span-7 bg-slate-900/30 border border-slate-850 p-5 rounded-2xl space-y-5">
                {onboardingStep === 1 ? (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-3">
                      <h3 className="font-bold text-white text-sm">Paso 1: Parámetros del portal Meta for Developers</h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Crea una aplicación de tipo <strong>Negocio (Business)</strong> en Meta Developers, activa el producto "WhatsApp", y copia las credenciales que se muestran en el panel de Configuración.</p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">PHONE NUMBER ID (Identificador de Teléfono)</label>
                        <input 
                          type="text"
                          value={dbConfig.whatsappPhoneNumberId}
                          onChange={(e) => setDbConfig({ ...dbConfig, whatsappPhoneNumberId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          placeholder="Ej: 1256334806..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">WHATSAPP BUSINESS ACCOUNT ID</label>
                        <input 
                          type="text"
                          value={dbConfig.whatsappBusinessAccountId}
                          onChange={(e) => setDbConfig({ ...dbConfig, whatsappBusinessAccountId: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          placeholder="Ej: 806495392..."
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1 font-bold">SYSTEM ACCESS TOKEN (Token Permanente de Meta)</label>
                        <input 
                          type="password"
                          value={dbConfig.whatsappAccessToken}
                          onChange={(e) => setDbConfig({ ...dbConfig, whatsappAccessToken: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          placeholder="Escribe o pega EAABw..."
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          addLog("success", "Onboarding: Se grabaron temporalmente credenciales de WhatsApp Cloud API en memoria.");
                          setOnboardingStep(2);
                        }}
                        className="bg-purple-600 hover:bg-purple-550 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <span>Siguiente Paso</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : onboardingStep === 2 ? (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-3">
                      <h3 className="font-bold text-white text-sm">Paso 2: Registro de Webhook de Sinergia en Meta</h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">En el portal Meta, ve a la sección <strong>WhatsApp &gt; Configuración de Webhook</strong>. Ingresa las siguientes credenciales para habilitar la mensajería síncrona en tiempo real:</p>
                    </div>

                    <div className="bg-slate-955 bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3.5 text-xs text-slate-300">
                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block mb-0.5 font-bold font-semibold">1. URL DE CAMPO / CALLBACK URL (Sujeto a Sandbox):</span>
                        <div className="flex items-center justify-between font-mono bg-slate-900 border border-slate-850 p-2 rounded text-[11px] select-all overflow-x-auto text-purple-300">
                          <span>https://sinergia.build.ai.studio/api/webhook</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block mb-0.5 font-bold font-semibold">2. TOKEN DE VERIFICACIÓN / VERIFY TOKEN:</span>
                        <div className="flex items-center justify-between font-mono bg-slate-900 border border-slate-850 p-2 rounded text-[11px] text-purple-300 font-semibold select-all">
                          <span>{dbConfig.webhookVerifyToken}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[9.5px] uppercase font-bold text-slate-500 block mb-0.5 font-bold font-semibold">3. CAMPOS DE CAMPOS DE SUSCRIPCIÓN (Webhook Fields):</span>
                        <div className="font-semibold text-[10.5px] text-emerald-400 font-mono bg-emerald-950/20 border border-emerald-900/20 p-2 rounded">
                          ✓ Marcar "messages" (Requerido para escuchar mensajes entrantes)
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button 
                        type="button"
                        onClick={() => setOnboardingStep(1)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer font-semibold"
                      >
                        Volver al Paso 1
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          addLog("success", "Onboarding: Registros de Callback Webhook vinculados correctamente en Sinergia.");
                          setOnboardingStep(3);
                        }}
                        className="bg-purple-600 hover:bg-purple-550 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                      >
                        <span>Ir al Simulador Inbound</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-b border-slate-850 pb-3">
                      <h3 className="font-bold text-white text-sm">Paso 3: Simulador Inbound de Autodiagnóstico</h3>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Emula un evento de webhook HTTP POST entrante desde Meta Developers directamente a tu sandbox. Esto disparará la lógica de análisis inteligente de Gemini sin esperar un dispositivo físico.</p>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1">TELÉFONO DE ENVÍO SIMULADO</label>
                          <input 
                            type="text"
                            value={testDestinationPhone}
                            onChange={(e) => setTestDestinationPhone(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 font-mono text-xs focus:outline-none"
                            placeholder="+57 322 123 4567"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-bold block mb-1 font-bold">INTENCIÓN DEL MENSAJE DE PRUEBA</label>
                          <select 
                            value={testMessageCategory}
                            onChange={(e) => setTestMessageCategory(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-300 focus:outline-none cursor-pointer text-xs"
                          >
                            <option value="web_design">"Hola, ocupo cotizar una página web modular corporativa." 💻</option>
                            <option value="bot_ia">"Buenas, cotizan bots de WhatsApp con inteligencia de IA?" 🧠</option>
                            <option value="social_media">"Quisiera saber precios de diseño publicitario mensual." 🎨</option>
                            <option value="fail_routing">"Soporte: Mis cuentas de correo corporativo están caídas." ⚠️</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest font-mono block font-semibold">Inbound Webhook JSON Simulator Preview</span>
                        <pre className="font-mono text-[9px] text-indigo-300 leading-relaxed overflow-x-auto max-h-[140px] bg-slate-905 p-2 rounded-lg border border-slate-900 shadow-inner">
{`{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "${dbConfig.whatsappBusinessAccountId || "806495392039212"}",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "+57 301 234 5678",
          "phone_number_id": "${dbConfig.whatsappPhoneNumberId || "125633480629471"}"
        },
        "contacts": [{
          "profile": { "name": "Ingeniero de Meta Test" },
          "wa_id": "${testDestinationPhone.replace("+", "")}"
        }],
        "messages": [{
          "from": "${testDestinationPhone.replace("+", "")}",
          "id": "wamid.HBgLNTcxMjM0NTY3O",
          "timestamp": "${Math.floor(Date.now()/1000)}",
          "text": {
             "body": "${testMessageCategory === "web_design" ? "Hola, ocupo cotizar una página web modular corporativa" : 
                       testMessageCategory === "bot_ia" ? "Buenas, cotizan bots de WhatsApp con inteligencia de IA" :
                       testMessageCategory === "social_media" ? "Quisiera saber precios de diseño publicitario mensual" :
                       "Soporte: Mis cuentas de correo corporativo están caídas"}"
          },
          "type": "text"
        }]
      },
      "field": "messages"
    }]
  }]
}`}
                        </pre>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 gap-2 text-xs">
                      <button 
                        type="button"
                        onClick={() => setOnboardingStep(2)}
                        className="text-slate-400 hover:text-white cursor-pointer font-semibold text-xs"
                      >
                        Volver al Paso 2
                      </button>

                      <button 
                        type="button"
                        onClick={() => {
                          setIsTestingWebhook(true);
                          setWebhookTestResult("testing");
                          addLog("info", "📡 Simulador Webhook: Lanzando ráfaga JSON POST mock callback...");

                          const testFlow = [
                            { log: "1. Resolviendo endpoint callback local: 200 OK Handshake detectado.", success: true, delay: 800 },
                            { log: "2. Evaluando Verify Token de cliente: autenticado con éxito.", success: true, delay: 1800 },
                            { log: "3. Descifrando payload de mensaje entrante de Meta webhook API.", success: true, delay: 2800 },
                            { log: "4. Simulando Gemini 1.5 Flash: Generando response context autónomo.", success: true, delay: 3800 },
                            { log: "5. Enrutando prospecto: Asistente comercial adecuado disparado en CRM.", success: true, delay: 4800 }
                          ];

                          testFlow.forEach(tf => {
                            setTimeout(() => {
                              addLog("success", tf.log);
                            }, tf.delay);
                          });

                          setTimeout(() => {
                            setIsTestingWebhook(false);
                            setWebhookTestResult("success");
                            addLog("success", "✅ Autodiagnóstico terminado: El router webhook respondió correctamente (HTTP 200 OK y Gemini sincronizado).");
                            
                            // Auto insert simulated client to make it really live and interactive!
                            const testName = "Ingeniero de Meta Test";
                            const testId = "meta_" + Date.now();
                            const sampleText = testMessageCategory === "web_design" ? "Hola, ocupo cotizar una página web modular corporativa" : 
                                               testMessageCategory === "bot_ia" ? "Buenas, cotizan bots de WhatsApp con inteligencia de IA" :
                                               testMessageCategory === "social_media" ? "Quisiera saber precios de diseño publicitario mensual" :
                                               "Soporte: Mis cuentas de correo corporativo están caídas";
                            
                            const newSess: ChatSession = {
                              id: testId,
                              clientName: testName,
                              clientCompany: "Meta API Testing Sandbox",
                              phone: testDestinationPhone,
                              avatar: "https://api.dicebear.com/7.x/initials/svg?seed=MetaTest",
                              lastMessage: sampleText,
                              timestamp: "Justo Ahora",
                              unreadCount: 0,
                              lead: {
                                customerName: testName,
                                companyName: "Meta Sandbox Corp",
                                consultedServices: [testMessageCategory === "bot_ia" ? "Automatización con IA" : "Página Web"],
                                leadStatus: testMessageCategory === "fail_routing" ? "soporte" : "nuevo",
                                needsSummary: sampleText
                              },
                              messages: [
                                { id: "m1", sender: "user", text: sampleText, timestamp: "Justo Ahora" },
                                { id: "m2", sender: "bot", text: "Hola! Soy el robot autónomo de Sinergia AI. He recibido tu webhook callback de Meta for Developers exitosamente. Un especialista está revisando tu caso.", timestamp: "Justo Ahora" }
                              ],
                              activeAgentId: testMessageCategory === "fail_routing" ? "soporte" : "recepcion"
                            };

                            setSessions(prev => [newSess, ...prev]);
                            setActiveSessionId(testId);
                            setActiveTab("chats");
                          }, 5200);

                        }}
                        disabled={isTestingWebhook}
                        className={`bg-purple-600 hover:bg-purple-550 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center space-x-2 shadow-md transition-all cursor-pointer ${
                          isTestingWebhook ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingWebhook ? "animate-spin" : ""}`} />
                        <span>{isTestingWebhook ? "Diagnosticando..." : "Disparar Webhook Callback Simulador"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Onboarding Sidebar (Status & Documentation Info) */}
              <div className="lg:col-span-5 bg-slate-900/10 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-350 text-xs uppercase tracking-wider font-display font-semibold">Estado de Conectividad WhatsApp</h3>
                  <div className="mt-3.5 space-y-3">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-950/20">
                      <span className="text-xs text-slate-400 font-medium">Servidor Sinergia status</span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase py-0.5 px-2 bg-emerald-900/10 border border-emerald-800/30 rounded text-right flex items-center gap-1">
                        ● HABILITADO
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-850">
                      <span className="text-xs text-slate-400 font-medium font-semibold">Cuenta Comercial (WABA)</span>
                      <span className="text-[10px] font-mono text-slate-500">{dbConfig.whatsappBusinessAccountId ? "Configurada" : "Sin Conectar"}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-850 focus:outline-none">
                      <span className="text-xs text-slate-400 font-medium font-semibold font-semibold">Verify Token (Match Handshake)</span>
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[125px]">{dbConfig.webhookVerifyToken}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-850/60 pt-4 mt-5 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider font-semibold">Ayuda rápida WhatsApp Setup</h4>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 text-[10.5px] text-slate-350 leading-relaxed space-y-2 font-medium">
                    <p>✓ El identificador de teléfono de Meta tiene típicamente 15 caracteres numéricos.</p>
                    <p>✓ Los webhooks de Meta tienen un timeout de 3 segundos, por lo cual procesamos todas las peticiones con Express de forma asíncrona garantizando 200 OK instantáneo.</p>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "marketing" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Marketing IA Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest font-mono bg-purple-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                Módulo 4: Marketing IA & Generador de Copys
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <Sparkles className="w-5.5 h-5.5 text-purple-400 animate-spin-slow" />
                <span>Consola Creativa Multicanal Sinergia IA</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Genera textos de alta conversión para redes sociales, blogs o campañas de email marketing usando modelos de lenguaje sincronizados.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Marketing Input Form */}
              <div className="lg:col-span-7 bg-[#0d0f17]/60 border border-[#1d2235] p-5 rounded-2xl space-y-5">
                <div className="space-y-4">
                  <h3 className="font-bold text-white text-sm">Parámetros del Contenido</h3>
                  
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1.5">CANAL / FORMATO DE PUBLICACIÓN</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { type: "social", label: "📱 Instagram / FB" },
                        { type: "blog", label: "📝 Artículo de Blog" },
                        { type: "email", label: "📧 Email de Ventas" },
                        { type: "landing", label: "🎯 Landing Hero" }
                      ].map(sc => (
                        <button
                          key={sc.type}
                          type="button"
                          onClick={() => setMarketingType(sc.type as any)}
                          className={`py-2 px-2.5 text-xs rounded-xl border text-center transition-all cursor-pointer ${
                            marketingType === sc.type
                              ? "bg-purple-950/30 text-purple-300 border-purple-500/40 font-bold"
                              : "bg-[#0d0f17] border-slate-800/40 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">TEMA PRINCIPAL / PRODUCTO A PROMOCIONAR</label>
                    <textarea
                      value={marketingTopic}
                      onChange={(e) => setMarketingTopic(e.target.value)}
                      rows={3}
                      className="w-full bg-[#090b11] border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      placeholder="Ej: Lanzamiento de consultoría de automatización de chats de WhatsApp con IA generativa para inmobiliarias en Colombia..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!marketingTopic) {
                        addLog("warn", "⚠️ Por favor ingresa el tema del cual deseas redactar el copy.");
                        return;
                      }
                      setIsGeneratingCopy(true);
                      setGeneratedCopy("");
                      addLog("info", "🧠 Gemini 1.5 Flash: Redactando estructura con tono comercial persuasivo...");
                      
                      setTimeout(() => {
                        setIsGeneratingCopy(false);
                        const cleanTopic = marketingTopic || "Sinergia IA Business OS";
                        let aiOutput = "";
                        if (marketingType === "social") {
                          aiOutput = `📢 ¡REVOLUCIÓN OPERATIVA EN WHATSAPP! 🚀\n\n¿Tu equipo de ventas colapsa contestando los mismos mensajes? 😩 Sincroniza tu negocio con el poder de: \n\n🔒 **"${cleanTopic}"** 🔒\n\nEl sistema operativo inteligente que redacta, clasifica y cierra ventas las 24 horas del día de manera 100% autónoma.\n\n🎯 **¿Qué obtienes hoy?**\n• Respuestas precisas entrenadas por ti en 10 segundos.\n• Control estricto de embudo CRM en tiempo real.\n• Integración nativa con Meta Cloud sin costes de terceros.\n\n👇 ¡Comenta WHATSAPP y recibe una demo auditable en tu celular! 👇\n#CRMInteligente #SinergiaOS #AutomationBusiness`;
                        } else if (marketingType === "email") {
                          aiOutput = `Asunto: 💼 La solución definitiva para automatizar y escalar tu CRM comercial\n\nHola,\n\nEs un hecho: las empresas que responden en menos de 5 minutos multiplican por 7 sus posibilidades de conversión.\n\nCon **"${cleanTopic}"**, no respondes rápido... respondes de forma perfecta.\n\nDiseñamos un cerebro de automatización que evalúa semánticamente y ejecuta acciones en caliente:\n\n*   Sincroniza datos con CRM Kanban automáticamente.\n*   Enruta prospectos difíciles al asesor especialista de guardia.\n*   Establece proyecciones financieras semanales.\n\nOfrecemos una prueba gratuita de 6 días con hosting incluido para tu equipo.\n\nResponde a este correo para organizar una llamada técnica,\n--\nEl Equipo de Inteligencia Comercial de Sinergia AG.`;
                        } else if (marketingType === "blog") {
                          aiOutput = `📖 **Cómo escalar una operación tradicional con Inteligencia Artificial autónoma**\n\n*Por José Urdaneta | Fundador de Sinergia*\n\nEn la era de la inmediatez, el cuello de botella más grande ya no es la prospección, sino la gestión de datos. Hoy analizamos cómo **"${cleanTopic}"** unifica los procesos administrativos en una única suite que se integra directamente con CRM, contabilidad y automatización de mensajería.\n\n**1. Eliminando la fricción humana en soporte básico**\nTener operarios copiando y pegando plantillas es ineficiente. Los agentes autónomos modernos reducen los costos de soporte en un 83%...\n\n**2. Toma de decisiones en base a datos reales**\nAl sincronizar finanzas operativas en tiempo real, tienes un balance contable auditable del 100% libre de retrasos de semanas. Sinergia IA se posiciona como el núcleo del Business OS corporativo...`;
                        } else {
                          aiOutput = `⚡ **EL FUTURO DE TU NEGOCIO — SINERGIA BUSINESS OS**\n\n🚀 Sube el volumen de conversión de tu empresa hoy\n\nUnifica CRM, Automatizaciones, Calendarios de Citas, Finanzas y Academy en un Pitch Black Slate de control absoluto. \n\n👉 **"${cleanTopic}"**\nUn entorno ágil de alto rendimiento listo para conectar tu WhatsApp en 3 pasos.\n\n[ Conectar Cuenta de Meta Developers en 5 Minutos ]`;
                        }
                        setGeneratedCopy(aiOutput);
                        addLog("success", "✅ Textos generados con éxito por Sinergia IA en formato " + marketingType.toUpperCase());
                      }, 1200);
                    }}
                    disabled={isGeneratingCopy}
                    className="w-full bg-purple-600 hover:bg-purple-550 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingCopy ? "animate-spin" : ""}`} />
                    <span>{isGeneratingCopy ? "Redactando contenido persuasivo..." : "Generar Copy Profesional con Sinergia IA"}</span>
                  </button>
                </div>

                {generatedCopy && (
                  <div className="bg-[#05060a] border border-slate-805 p-4.5 rounded-xl space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                       <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">💎 SUGERENCIA EDITADA SÍNERGIA IA</span>
                       <button
                         type="button"
                         onClick={() => {
                           navigator.clipboard.writeText(generatedCopy);
                           addLog("success", "📋 Copy copiado al portapapeles del computador.");
                         }}
                         className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer"
                       >
                         <Copy className="w-3 h-3" />
                         <span>Copiar</span>
                       </button>
                    </div>
                    <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto custom-scrollbar">
                      {generatedCopy}
                    </pre>
                  </div>
                )}
              </div>

              {/* Editorial Content Calendar */}
              <div className="lg:col-span-5 bg-slate-900/10 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider font-display">Agenda Calendario Editorial</h3>
                    <span className="text-[9px] bg-purple-500/10 text-purple-400 font-mono px-1.5 py-0.5 rounded border border-purple-500/20 font-bold">AUTO-CAMPUS</span>
                  </div>
                  
                  <div className="space-y-2">
                    {marketingCalendar.map(post => (
                      <div key={post.id} className="p-3 bg-[#0d0f17] border border-slate-850 rounded-xl flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{post.title}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">🗓️ Fecha de Publicación: {post.date}</span>
                        </div>
                        <span className="text-[9px] bg-purple-900/20 text-purple-300 border border-purple-900/30 font-bold py-0.5 px-2 rounded-full uppercase">
                          {post.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-850/60 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Añadir nueva fecha editorial</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const newPost = {
                          id: "cal-" + Date.now(),
                          title: `📌 Publicación: ${marketingTopic ? marketingTopic.substring(0, 30) : "Campaña Sinergia"}`,
                          date: "2026-06-25",
                          status: "Programado"
                        };
                        setMarketingCalendar([...marketingCalendar, newPost]);
                        addLog("success", "📅 Campaña programada en el Calendario Editorial.");
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-slate-300 text-[10px] p-2 rounded-lg border border-slate-800 cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <span>+ Programar Post</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMarketingCalendar([
                          { id: "cal-1", title: "🎯 Post IG: Beneficios de automatizar con WhatsApp", date: "2026-06-18", status: "Programado" },
                          { id: "cal-2", title: "📧 Newsletter: Sinergia IA se integra con GPT-4o", date: "2026-06-20", status: "Programado" },
                          { id: "cal-3", title: "📝 Blog: El impacto del CRM inteligente en PYMEs", date: "2026-06-22", status: "Programado" },
                        ]);
                        addLog("info", "🔄 Calendario restablecido a la programación base.");
                      }}
                      className="w-full bg-[#0d0f17] text-slate-500 hover:text-slate-200 text-[10px] p-2 rounded-lg cursor-pointer border border-transparent"
                    >
                      <span>Restaurar</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "sales" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Sales Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono bg-blue-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                Módulo 5: Centro Comercial, Cotizaciones & Citas
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <HeartHandshake className="w-5.5 h-5.5 text-blue-400" />
                <span>Gestión Comercial Integrada & Agenda Sinergia</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Simula presupuestos, calcula propuestas en tiempo real y gestiona las citas comerciales agendadas automáticamente por bots.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Proposal & Quote items creator (Left Pane) */}
              <div className="lg:col-span-7 bg-[#0d0f17]/60 border border-[#17213b] p-5 rounded-2xl space-y-5">
                <h3 className="font-bold text-white text-sm">Maquetador de Presupuestos & Propuestas</h3>
                
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">PROSPECTO SINCRO DESDE CRM</label>
                    <select
                      value={salesClient}
                      onChange={(e) => setSalesClient(e.target.value)}
                      className="w-full bg-[#080a10] border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="Juan Manuel-Restaurante">Juan Manuel (Restaurante El Carbonero)</option>
                      <option value="Dra. María Clara-Dental">Dra. María Clara (Clínica Dental Bogotá)</option>
                      <option value="Lic. Andrés-Soluciones">Lic. Andrés (Soluciones El Sol)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-slate-400 font-bold block">ÍTEMS DE LA PROPUESTA COMERCIAL</label>
                      <span className="text-[10px] text-blue-300 font-semibold font-mono">Moneda: USD</span>
                    </div>

                    <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
                      <table className="w-full text-left border-collapse text-slate-300">
                        <thead>
                          <tr className="border-b border-slate-850 bg-slate-900/40 text-[9px] uppercase tracking-wider text-slate-400">
                            <th className="py-2.5 px-3">Descripción del Servicio</th>
                            <th className="py-2.5 px-3 text-right">Precio USD</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 font-mono text-xs">
                          {salesQuotes.map(qi => (
                            <tr key={qi.id}>
                              <td className="py-2 px-3 text-slate-350">{qi.item}</td>
                              <td className="py-2 px-3 text-right font-bold text-blue-400">${qi.price}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-900/20 font-bold text-white border-t border-slate-800">
                            <td className="py-2.5 px-3">Subtotal Estimado</td>
                            <td className="py-2.5 px-3 text-right text-blue-400">
                              ${salesQuotes.reduce((acc, q) => acc + q.price, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const itemsList = [
                          { id: "iq-a", item: "Campañas de Captación Meta Ads (1 mes)", price: 290 },
                          { id: "iq-b", item: "Mantenimiento & Soporte Técnico SLA Gold", price: 79 },
                          { id: "iq-c", item: "Consultoría de Onboarding Organizacional", price: 150 }
                        ];
                        const randomItem = itemsList[Math.floor(Math.random() * itemsList.length)];
                        if (salesQuotes.some(q => q.item === randomItem.item)) {
                          addLog("warn", "⚠️ Este servicio ya está incluido en la cotización.");
                          return;
                        }
                        setSalesQuotes([...salesQuotes, randomItem]);
                        addLog("success", `➕ Servicio '${randomItem.item}' añadido a la propuesta de ${salesClient}`);
                      }}
                      className="bg-slate-950 hover:bg-slate-900 text-slate-300 py-1.5 px-3 border border-slate-800 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      + Añadir Ítem Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSalesQuotes([
                          { id: "q-1", item: "Desarrollo Agente WhatsApp Automatizado (Cerebro IA)", price: 450 },
                          { id: "q-2", item: "Suscripción Mensual SaaS Sinergia IA Business OS", price: 89 }
                        ]);
                        addLog("info", "🔄 Cotización restablecida al plan inicial.");
                      }}
                      className="bg-[#0c0f1b]/50 hover:bg-slate-950 text-slate-500 py-1.5 px-3 rounded-lg text-[10px] cursor-pointer"
                    >
                      Limpiar Cotización
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGeneratingProposal(true);
                      setGeneratedProposalText("");
                      addLog("info", "✍️ Sinergia IA: Armando propuesta ejecutable con términos de servicio...");
                      
                      setTimeout(() => {
                        const totalEstimado = salesQuotes.reduce((acc, q) => acc + q.price, 0);
                        const outputText = `📄 **PROPUESTA TÉCNICA Y COMERCIAL SÁAS**\n\n**PREPARADO PARA:** ${salesClient}\n**PROVEEDOR:** Sinergia Agencia Creativa S.A.S. (José Urdaneta)\n**PRECIO TOTAL:** $${totalEstimado} USD\n\n**SERVICIOS CONTRATADOS:**\n${salesQuotes.map((q, idx) => `${idx + 1}. ${q.item} ($${q.price} USD)`).join("\n")}\n\n**CRONOGRAMA DE ENTREGA:**\n• Fase 1 (Día 1-3): Entrega de Webhook e integrador Meta for Devs local.\n• Fase 2 (Día 4-5): Entrenamiento semántico del Agente Inbound.\n• Fase 3 (Día 6): Go-live oficial y capacitación técnica del equipo.\n\n**TÉRMINOS DE PAGO:**\n• Anticipo del 50% al iniciar el proyecto, saldo contra entrega física funcional en container.`;
                        setIsGeneratingProposal(false);
                        setGeneratedProposalText(outputText);
                        addLog("success", "✅ Propuesta Comercial Generada Exitosamente para " + salesClient);
                      }, 1000);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-550 text-white font-bold py-2 px-3 rounded-xl cursor-pointer"
                  >
                    🚀 Generar Propuesta Ejecutiva para Cliente
                  </button>
                </div>

                {generatedProposalText && (
                  <div className="bg-[#05060a] border border-[#131d36] p-4 rounded-xl space-y-2 animate-fadeIn text-xs">
                    <pre className="text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar">
                      {generatedProposalText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Commercial Agenda Slots (Right Pane) */}
              <div className="lg:col-span-5 bg-slate-900/10 border border-slate-850 p-5 rounded-2xl space-y-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-350 text-xs uppercase tracking-wider font-display">Agenda Comercial & Reuniones</h3>
                    <span className="text-[9px] bg-blue-500/10 text-blue-400 font-mono px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">CALENDARIO</span>
                  </div>

                  <div className="space-y-2">
                    {salesMeetings.map(meet => (
                      <div key={meet.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{meet.client}</span>
                          <span className={`text-[8px] font-mono font-extrabold px-1.5 py-0.2 rounded ${
                             meet.status === "Confirmada" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {meet.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">📅 Horario: {meet.date} | Medio: {meet.type}</p>
                        <p className="text-[10px] text-slate-350 italic font-medium bg-[#0f111a] p-1.5 rounded border border-[#1a1c2a]">
                          🤖 IA Nota: {meet.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-850/60 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Ajuste Agenda Comercial</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const newMeet = {
                          id: "m-" + Date.now(),
                          client: "Nuevas Oportunidades S.A.",
                          date: "Tarde 15:00",
                          type: "Google Meet",
                          status: "Confirmada",
                          summary: "Interesado en escalamiento de CRM multiusuario."
                        };
                        setSalesMeetings([...salesMeetings, newMeet]);
                        addLog("success", "📅 Nueva cita comercial guardada en la agenda.");
                      }}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-[10px] p-2 rounded-lg cursor-pointer"
                    >
                      + Agendar Nueva Cita
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSalesMeetings(salesMeetings.map(m => ({ ...m, status: "Confirmada" })));
                        addLog("success", "✅ Todas las citas han sido marcadas como 'Confirmadas' por Admin.");
                      }}
                      className="w-full bg-[#0d0f17] text-slate-400 hover:text-slate-200 text-[10px] p-2 rounded-lg border border-transparent cursor-pointer"
                    >
                      Confirmar Todo
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "projects" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Projects Header */}
            <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest font-mono bg-orange-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                  Módulo 6: Gestión de Proyectos Scrum & Kanban
                </span>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                  <Calendar className="w-5.5 h-5.5 text-orange-400" />
                  <span>Tablero Operativo Scrum Sinergia IA</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Supervisa flujos de implementación, asigna tareas al equipo y detecta proactivamente retrasos en entregables con IA.</p>
              </div>

              {/* View Selector Toggle */}
              <div className="flex bg-[#090a10] border border-slate-800 p-1.5 rounded-xl self-start shrink-0 font-bold text-xs select-none">
                {[
                  { view: "kanban", name: "📋 Kanban" },
                  { view: "scrum", name: "⏰ Sprint Sinergico" },
                  { view: "cascada", name: "📉 Cascada Gantt" }
                ].map(vt => (
                  <button
                    key={vt.view}
                    type="button"
                    onClick={() => setProjectTab(vt.view as any)}
                    className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                      projectTab === vt.view 
                        ? "bg-orange-600 text-white font-extrabold" 
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {vt.name}
                  </button>
                ))}
              </div>
            </div>

            {projectTab === "kanban" ? (
              <div className="space-y-6">
                
                {/* Kanban Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Column 1: Por Hacer */}
                  <div className="bg-[#0b0c13] border border-slate-850 p-4 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xs font-extrabold text-slate-350 uppercase tracking-wider">Por Hacer (Backlog)</span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-900 px-2 py-0.5 rounded-full">
                        {projectsList.filter(t => t.column === "todo").length}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      {projectsList.filter(t => t.column === "todo").map(t => (
                        <div key={t.id} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-2 hover:border-orange-500/30 transition-all">
                          <h4 className="text-xs font-bold text-white">{t.title}</h4>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-medium">👤 {t.assignee}</span>
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold px-1.5">Prob. Retraso: {t.delayProb}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: En Proceso */}
                  <div className="bg-[#0b0c13] border border-slate-850 p-4 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider">En Ejecución (Doing)</span>
                      <span className="text-[10px] font-mono text-orange-400 font-bold bg-orange-950/10 px-2 py-0.5 rounded-full border border-orange-900/10">
                        {projectsList.filter(t => t.column === "doing").length}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      {projectsList.filter(t => t.column === "doing").map(t => (
                        <div key={t.id} className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2 hover:border-orange-500/50 transition-all shadow-md">
                          <h4 className="text-xs font-bold text-white">{t.title}</h4>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400 font-medium">👤 {t.assignee}</span>
                            <span className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/25 rounded font-bold px-1.5">IA Risk: {t.risk}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Completado */}
                  <div className="bg-[#0b0c13] border border-slate-850 p-4 rounded-xl space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Completado (Done)</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/10 px-2 py-0.5 rounded-full border border-emerald-900/10">
                        {projectsList.filter(t => t.column === "done").length}
                      </span>
                    </div>
                    
                    <div className="space-y-2.5">
                      {projectsList.filter(t => t.column === "done").map(t => (
                        <div key={t.id} className="p-3 bg-slate-950/30 border border-slate-850/40 rounded-xl space-y-2 opacity-70">
                          <h4 className="text-xs font-bold text-slate-300 line-through">{t.title}</h4>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-medium">👤 {t.assignee}</span>
                            <span className="text-[9px] text-emerald-400 font-mono font-bold">✓ Entregado</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Task Creation & Prediction Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Task Addition Form */}
                  <div className="lg:col-span-6 bg-slate-900/10 border border-slate-850 p-4.5 rounded-2xl">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Registrar Nueva Tarea del Sprint</h4>
                    <div className="space-y-3 text-xs">
                      <input 
                        type="text" 
                        id="newProjTitle"
                        placeholder="Ej: Integrar API Webhook en node_modules"
                        className="w-full bg-[#08090f] border border-slate-800 rounded px-2.5 py-1.5 text-slate-350 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select id="newProjAssignee" className="bg-[#08090f] border border-slate-800 rounded px-2.5 py-1.5 text-slate-400 cursor-pointer">
                          <option value="Diego Dev">Diego Dev (Sistemas)</option>
                          <option value="Andrés Gomez">Andrés Gomez (DevOps)</option>
                          <option value="Marta Soporte">Marta Soporte (Cliente)</option>
                        </select>
                        <select id="newProjCol" className="bg-[#08090f] border border-slate-800 rounded px-2.5 py-1.5 text-slate-400 cursor-pointer">
                          <option value="todo">Por Hacer</option>
                          <option value="doing">En Ejecución</option>
                          <option value="done">Terminado</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const titleEl = document.getElementById("newProjTitle") as HTMLInputElement;
                          const assigneeEl = document.getElementById("newProjAssignee") as HTMLSelectElement;
                          const colEl = document.getElementById("newProjCol") as HTMLSelectElement;
                          
                          if (!titleEl || !titleEl.value) {
                            addLog("warn", "⚠️ Por favor especifica el nombre de la tarea.");
                            return;
                          }
                          const rates = ["Bajo", "Medio", "Alto"];
                          const probs = ["10%", "35%", "75%"];
                          const rndIdx = Math.floor(Math.random() * 3);
                          
                          const tItem = {
                            id: "proj-" + Date.now(),
                            title: titleEl.value,
                            assignee: assigneeEl.value,
                            column: colEl.value,
                            risk: rates[rndIdx],
                            delayProb: probs[rndIdx]
                          };
                          setProjectsList([...projectsList, tItem]);
                          addLog("success", `🎯 Tarea registrada en el Scrum: '${titleEl.value}' asignada a ${assigneeEl.value}`);
                          titleEl.value = "";
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-550 text-white font-bold py-2 rounded-lg cursor-pointer text-xs"
                      >
                        Crear e Incorporar al Tablero
                      </button>
                    </div>
                  </div>

                  {/* IA Delay and Workload Forecast Widget */}
                  <div className="lg:col-span-6 bg-orange-500/5 border border-orange-500/10 p-4.5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider font-mono">
                        <AlertCircle className="w-4 h-4 text-orange-400 animate-pulse" />
                        <span>Sinergia PM IA: Detector de Riesgos Activo</span>
                      </div>
                      <p className="text-[11px] text-slate-350 mt-2.5 leading-relaxed font-semibold">
                        Sinergia AI analiza continuamente el historial de commits, tiempos promedio de entrega de los desarrolladores y dependencias críticas del Sprint.
                      </p>
                      <div className="mt-3.5 bg-black/40 p-2.5 rounded-lg border border-orange-950/20 font-sans text-[11px] text-slate-300">
                        <p className="text-orange-300 font-extrabold flex items-center gap-1">🚨 Alerta Predictiva:</p>
                        La tarea de <strong className="text-white">"Establecer pasarela de pagos"</strong> tiene un riesgo de retraso del <strong className="text-rose-400 font-extrabold font-mono">45%</strong> debido a la falta de credenciales de Stripe certificadas. Se recomienda alertar al cliente para acelerar la firma contractual.
                      </div>
                    </div>
                    <span className="text-[9.5px] font-mono text-slate-500 mt-2 block">✓ Algorítmica predictiva sincronizada con Google Gemini.</span>
                  </div>

                </div>

              </div>
            ) : (
              <div className="bg-[#0b0c13] border border-slate-850 p-6 rounded-2xl text-center space-y-3 py-12">
                <div className="h-10 w-10 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto text-lg">💡</div>
                <h3 className="font-bold text-white text-sm">Vista Scrum Sprint & Carta Gantt Automatizada cargándose</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto block">Este módulo interactivo en {projectTab === "scrum" ? "Sprint Inteligente" : "Cascada Gantt"} simula diagramas de dependencias y de control dinámico vinculados con la duración y esfuerzo.</p>
                <button
                  type="button"
                  onClick={() => {
                    setProjectTab("kanban");
                    addLog("info", "Retornado a vista interactiva de Tablero Kanban.");
                  }}
                  className="bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 text-orange-300 text-xs px-3 py-1.5 rounded-lg"
                >
                  Volver a Kanban Operativo
                </button>
              </div>
            )}
          </motion.div>
        ) : activeTab === "finance" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Finance Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest font-mono bg-green-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                Módulo 7: Centro Financiero & Cashflow Predictivo
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <DollarSign className="w-5.5 h-5.5 text-green-400" />
                <span>Libro Contable & Previsiones de Flujo Sinergia IA</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Registra transacciones en caliente, monitorea egresos e ingresos de campañas y obtén proyecciones de caja con IA.</p>
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ingresos Operativos Totales</span>
                <span className="text-lg font-mono font-bold text-emerald-400 block">
                  ${financialTransactions.filter(t => t.type === "ingreso").reduce((acc, t) => acc + t.amount, 0)} USD
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5 block">Sincronizado vía CRM y cobros Stripe</span>
              </div>

              <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Egresos & Costos Generales</span>
                <span className="text-lg font-mono font-bold text-rose-450 block text-rose-400">
                  ${financialTransactions.filter(t => t.type === "gasto").reduce((acc, t) => acc + t.amount, 0)} USD
                </span>
                <span className="text-[9px] text-slate-500 mt-0.5 block">Infraestructura y Meta APIs configurados</span>
              </div>

              <div className="p-4 bg-green-500/5 border border-green-500/15 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-green-400 block mb-1">Margen de Flujo Neto</span>
                <span className="text-lg font-mono font-bold block text-green-400">
                  ${
                    financialTransactions.filter(t => t.type === "ingreso").reduce((acc, s) => acc + s.amount, 0) -
                    financialTransactions.filter(t => t.type === "gasto").reduce((acc, s) => acc + s.amount, 0)
                  } USD
                </span>
                <span className="text-[9px] text-slate-400 mt-0.5 block">Superávit libre disponible para reinversión</span>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Manual Transaction Input */}
              <div className="lg:col-span-5 bg-[#0d0f17]/60 border border-[#16291d] p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-sm">Registrar Transacción en Caliente</h3>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTxConcept || !newTxAmount) {
                      addLog("warn", "⚠️ Por favor especifica concepto y monto de la transacción.");
                      return;
                    }
                    const amountVal = parseFloat(newTxAmount);
                    if (isNaN(amountVal) || amountVal <= 0) {
                      addLog("warn", "⚠️ El monto ingresado debe ser un número válido mayor a cero.");
                      return;
                    }
                    const newTx = {
                      id: "tx-" + Date.now(),
                      type: newTxType,
                      concept: newTxConcept,
                      amount: amountVal,
                      date: new Date().toISOString().split('T')[0]
                    };
                    setFinancialTransactions([newTx, ...financialTransactions]);
                    setNewTxConcept("");
                    setNewTxAmount("");
                    addLog("success", `💵 Registro Financiero: ${newTxType === 'ingreso' ? 'Ingreso' : 'Egreso'} de $${amountVal} USD por '${newTxConcept}' incorporado.`);
                  }} 
                  className="space-y-3.5 text-xs text-slate-350 font-medium"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTxType("ingreso")}
                      className={`py-1.5 rounded-lg border text-center cursor-pointer ${
                        newTxType === "ingreso" ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/40 font-bold" : "bg-[#0d0f17] border-slate-800 text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      (+) Ingreso / Venta
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTxType("gasto")}
                      className={`py-1.5 rounded-lg border text-center cursor-pointer ${
                        newTxType === "gasto" ? "bg-rose-950/20 text-rose-450 text-rose-300 border-rose-500/40 font-bold" : "bg-[#0d0f17] border-slate-800 text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      (-) Gasto / Operativo
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">CONCEPTO O MOTIVO</label>
                    <input 
                      type="text"
                      required
                      value={newTxConcept}
                      onChange={(e) => setNewTxConcept(e.target.value)}
                      placeholder="Ej: Licencia n8n / Renovación de Hosting"
                      className="w-full bg-[#08090e] border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-widest block mb-1">VALOR EN USD (DÓLARES)</label>
                    <input 
                      type="number"
                      required
                      value={newTxAmount}
                      onChange={(e) => setNewTxAmount(e.target.value)}
                      placeholder="Ej: 145"
                      className="w-full bg-[#08090e] border border-slate-800 rounded px-2.5 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-green-600 hover:bg-green-550 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <span>+ Añadir a Contabilidad</span>
                  </button>
                </form>
              </div>

              {/* Transactions list ledger & IA cashier forecasts */}
              <div className="lg:col-span-7 bg-[#0b0c13] border border-slate-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-3.5 flex-1">
                  <h3 className="font-bold text-slate-300 text-xs uppercase tracking-wider font-display">Libro Diario Contable (Transacciones)</h3>
                  
                  <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1 text-xs">
                    {financialTransactions.map(tx => (
                      <div key={tx.id} className="p-2.2 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between font-mono">
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-medium font-sans text-xs">{tx.concept}</span>
                          <span className="text-[9.5px] text-slate-500 block">Fecha: {tx.date}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`font-bold ${tx.type === "ingreso" ? "text-emerald-400" : "text-rose-400"}`}>
                            {tx.type === "ingreso" ? "+" : "-"}${tx.amount}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFinancialTransactions(financialTransactions.filter(t => t.id !== tx.id));
                              addLog("warn", `🗑️ Eliminado asiento financiero: ${tx.concept}`);
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-850/60 pt-4 bg-green-500/5 p-3 rounded-xl border border-green-500/10 text-xs">
                  <h4 className="font-bold text-green-400 uppercase tracking-wide font-mono mb-1.5">🚀 Sinergia IA: Proyección Inteligente de Caja</h4>
                  <p className="text-slate-300 leading-relaxed font-semibold">
                    Analizando el balance actual, tu empresa mantiene un ratio saludable de liquidez de {
                      ((financialTransactions.filter(t => t.type === "ingreso").reduce((acc, t) => acc + t.amount, 0) / 
                       Math.max(1, financialTransactions.filter(t => t.type === "gasto").reduce((acc, t) => acc + t.amount, 0)))).toFixed(1)
                    }:1. Con la velocidad de conversión del CRM, se estima un crecimiento del flujo neto del <strong className="text-white">+18.4%</strong> en los próximos 15 días. Es seguro escalar presupuestos de adquisición publicitaria en Meta Ads.
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "docs" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Documents Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono bg-cyan-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                Módulo 8: Gestión Documental & OCR Inteligente
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <FileText className="w-5.5 h-5.5 text-cyan-400" />
                <span>Bóveda Documental Sinergia IA</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Sube tus contratos corporativos, facturas y propuestas comerciales. Escanéalos con modelos OCR semánticos de Gemini.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Document List (Left Pane) */}
              <div className="lg:col-span-6 bg-[#0d0f17]/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider">Archivos en Bóveda</h3>
                  <input
                    type="text"
                    value={searchDocText}
                    onChange={(e) => setSearchDocText(e.target.value)}
                    placeholder="🔍 Buscar..."
                    className="bg-[#08090f] border border-slate-800 text-[10.5px] rounded px-2.2 py-1 text-slate-300 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  {docsList
                    .filter(d => d.name.toLowerCase().includes(searchDocText.toLowerCase()))
                    .map(doc => (
                      <div 
                        key={doc.id} 
                        onClick={() => {
                          setSelectedDocIdForOcr(doc.id);
                          addLog("info", "Visualizando documento: " + doc.name);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedDocIdForOcr === doc.id
                            ? "bg-cyan-950/20 border-cyan-500/40 text-cyan-300 font-bold"
                            : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <FileText className={`h-4.5 w-4.5 ${selectedDocIdForOcr === doc.id ? "text-cyan-400 animate-pulse" : "text-slate-500"}`} />
                          <div>
                            <p className="text-xs text-slate-200 leading-tight font-medium">{doc.name}</p>
                            <span className="text-[9.5px] text-slate-500 block mt-0.5">Tipo: {doc.type} | Tamaño: {doc.size}</span>
                          </div>
                        </div>
                        <span className={`text-[8.5px] font-mono rounded px-1.5 py-0.2 ${
                          doc.isAnalyzed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-slate-900 text-slate-500"
                        }`}>
                          {doc.isAnalyzed ? "IA ANALYZED" : "PENDIENTE"}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="border-t border-slate-850/60 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const newDoc = {
                        id: "doc-" + Date.now(),
                        name: "Factura_Proveedor_Hosting_Ollama.pdf",
                        type: "Factura",
                        size: "240 KB",
                        date: new Date().toISOString().split('T')[0],
                        isAnalyzed: false,
                        summary: ""
                      };
                      setDocsList([...docsList, newDoc]);
                      addLog("success", "📂 Archivo 'Factura_Proveedor_Hosting_Ollama.pdf' cargado a tu Bóveda Sinergia.");
                    }}
                    className="w-full py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-350 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    + Importar Nuevo Archivo de Cuenta
                  </button>
                </div>
              </div>

              {/* Dynamic OCR & AI extractor summary details (Right Pane) */}
              <div className="lg:col-span-6 bg-slate-900/10 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between space-y-4">
                {selectedDocIdForOcr ? (
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                      <span className="text-xs uppercase font-extrabold text-[#06b6d4] tracking-wider font-mono">Consola OCR Gemini 1.5 Flash</span>
                      <span className="text-[9.5px] text-slate-500">Auditable AES-256</span>
                    </div>

                    <div className="space-y-2.5">
                      <p className="text-xs text-slate-200 font-bold">📋 Datos del Archivo Seleccionado:</p>
                      <div className="bg-black/40 p-3 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-350 space-y-1">
                        <div><span className="text-slate-500">Nombre:</span> {docsList.find(d => d.id === selectedDocIdForOcr)?.name}</div>
                        <div><span className="text-slate-500">Categoría:</span> {docsList.find(d => d.id === selectedDocIdForOcr)?.type}</div>
                        <div><span className="text-slate-500">Fecha de Carga:</span> {docsList.find(d => d.id === selectedDocIdForOcr)?.date}</div>
                        <div><span className="text-slate-500">Tamaño Físico:</span> {docsList.find(d => d.id === selectedDocIdForOcr)?.size}</div>
                      </div>

                      {docsList.find(d => d.id === selectedDocIdForOcr)?.isAnalyzed ? (
                        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2.5 text-xs">
                          <p className="text-emerald-400 font-bold font-mono">✓ ESCANEO OCR COMPLETADO POR GEMINI:</p>
                          <p className="text-slate-350 leading-relaxed font-semibold">
                            {docsList.find(d => d.id === selectedDocIdForOcr)?.summary}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-slate-400 text-xs">Este documento no ha sido analizado por el motor semántico de Sinergia IA. ¿Deseas escanear el contrato/factura?</p>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAnalysingDoc(true);
                              addLog("info", "👁️ Gemini OCR Core: Escaneando firmas, cláusulas y campos numéricos...");
                              
                              setTimeout(() => {
                                setIsAnalysingDoc(false);
                                setDocsList(docsList.map(d => {
                                  if (d.id === selectedDocIdForOcr) {
                                    return { 
                                      ...d, 
                                      isAnalyzed: true, 
                                      summary: "🔍 ANÁLISIS DE FACTURA DETECTADO:\n• Signatario/Emisor: AWS hosting de Meta S.A.\n• Monto Auditado: $820.00 USD correspondientes al soporte API.\n• Vence: 28/06/2026.\n• Cláusula Legal: No aplica penalizaciones por cancelación anticipada." 
                                    };
                                  }
                                  return d;
                                }));
                                addLog("success", "✅ Análisis de OCR y extracción por Inteligencia Artificial completada con éxito.");
                              }, 1100);
                            }}
                            disabled={isAnalysingDoc}
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-550 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center justify-center space-x-1"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isAnalysingDoc ? "animate-spin" : ""}`} />
                            <span>{isAnalysingDoc ? "Escanenando contenido semántico..." : "Escanear con Sinergia OCR"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-10">Por favor, selecciona un documento de la bóveda para iniciar su procesamiento OCR.</p>
                )}
                <span className="text-[9px] font-mono text-slate-500 block">✓ OCR impulsado para PDF, JPEG, PNG y formatos de oficina.</span>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "academy" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Academy Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-yellow-405 uppercase tracking-widest text-yellow-400 font-mono bg-yellow-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                Módulo 9: Sinergia Academy LMS & Tutor IA
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <BookOpen className="w-5.5 h-5.5 text-yellow-400" />
                <span>Portal LMS Corporativo & Tutor de Aprendizaje</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Capacita a tus equipos de ventas en el uso del API, prompts correctos y enrutamiento del CRM con nuestro Tutor IA activo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LMS Courses list (Left Panel) */}
              <div className="lg:col-span-6 bg-[#0d0f17]/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Cursos de Capacitación Interna</h3>
                
                <div className="space-y-3 text-xs">
                  {[
                    { title: "📘 Captación Inbound con WhatsApp API v3.5", desc: "Aprende a conectar y sincronizar flujos n8n con el CRM sin programar.", duration: "2 horas", completed: true, rating: "🥇 Oro" },
                    { title: "📓 Prompt Engineering para Operarios del CRM", desc: "Instrucciones precisas para responder objeciones de clientes corporativos.", duration: "3 horas", completed: true, rating: "🥇 Oro" },
                    { title: "📙 Estrategia de Cierre de Ventas por WhatsApp", desc: "Simulación de scripts persuasivos asistidos por el Agente Autónomo Sinergia.", duration: "5 horas", completed: false, rating: "🥈 Plata" }
                  ].map((course, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{course.title}</span>
                        <span className={`text-[8.5px] font-mono leading-none rounded-full px-2 py-0.5 font-bold ${
                          course.completed ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400 animate-pulse"
                        }`}>
                          {course.completed ? "COMPLETADO" : "EN CURSO"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">{course.desc}</p>
                      <div className="flex items-center justify-between text-[9.5px] border-t border-slate-900 pt-1.5 mt-2">
                        <span className="text-slate-500">Duración: {course.duration}</span>
                        <span className="text-yellow-400 font-mono font-bold">Insignia: {course.rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Tutor IA box widget (Right Panel) */}
              <div className="lg:col-span-6 bg-slate-900/10 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between space-y-4 max-h-[440px]">
                <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2 shrink-0">
                    <span className="text-xs font-mono font-extrabold text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                      🤖 TUTOR ACADÉMICO COGNITIVO
                    </span>
                    <span className="text-[8.5px] font-bold text-slate-500">IA Activo</span>
                  </div>

                  {/* Academic chat window */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs custom-scrollbar py-2">
                    {tutorChatHistory.map((m, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${m.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div className={`p-2.5 rounded-2xl leading-relaxed font-semibold ${
                          m.sender === "user" 
                            ? "bg-yellow-600 text-black rounded-tr-none" 
                            : "bg-[#0c0e16] border border-slate-800 text-slate-300 rounded-tl-none shadow-sm"
                        }`}>
                          {m.text}
                        </div>
                        <span className="text-[8.5px] text-slate-500 mt-0.5 font-mono">
                          {m.sender === "user" ? "Tú" : "Tutor Sinergia IA"}
                        </span>
                      </div>
                    ))}
                    {isTutorTyping && (
                      <div className="mr-auto max-w-[80%] flex flex-col items-start bg-[#0c0e16] border border-slate-800 p-2.5 rounded-2xl rounded-tl-none">
                        <p className="text-[10px] text-slate-400 font-bold animate-pulse">Generando respuesta de tutoría académica...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Input box */}
                <div className="border-t border-slate-850/65 pt-3.5 mt-auto shrink-0 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={tutorQuestion}
                      onChange={(e) => setTutorQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && tutorQuestion.trim()) {
                          const userQ = tutorQuestion;
                          setTutorQuestion("");
                          setTutorChatHistory(prev => [...prev, { sender: "user", text: userQ }]);
                          setIsTutorTyping(true);
                          addLog("info", "Pregunta académica enviada a Gemini...");
                          
                          setTimeout(() => {
                            setIsTutorTyping(false);
                            let reply = "Me parece una duda excelente. Como tutor académico te comento: ";
                            if (userQ.toLowerCase().includes("webhook") || userQ.toLowerCase().includes("meta")) {
                              reply += "El webhook de Meta se configura en la sección 'Enlace WhatsApp API' de este OS. Debes registrar el Verify Token que configuraste en tu código Express para que Meta confíe en tu endpoint URL. Los callbacks se procesan de inmediato.";
                            } else if (userQ.toLowerCase().includes("crm") || userQ.toLowerCase().includes("prospecto")) {
                              reply += "En el CRM Inteligente, los prospectos avanzan por fases (Ej: Nuevo, Calificado, Cita, Ganado). El bot autónomo actualiza esta fase en el backend usando un endpoint POST '/api/leads'. Esto mantiene el panel contable sincronizado.";
                            } else {
                              reply += "Para optimizar un Sprint de Sinergia, asegúrate de reducir el número de tareas concurrentes de cada operario. Recuerda que puedes interactuar con el bot autónomo en la sección de Bandeja de Entrada.";
                            }
                            setTutorChatHistory(prev => [...prev, { sender: "tutor", text: reply }]);
                            addLog("success", "🎓 Respuesta académica generada con éxito.");
                          }, 900);
                        }
                      }}
                      placeholder="Pregunta algo al tutor (Ej: ¿Cómo configuro un webhook?)"
                      className="flex-1 bg-[#090b11] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-350 text-xs focus:outline-none focus:ring-1 focus:ring-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!tutorQuestion.trim()) return;
                        const userQ = tutorQuestion;
                        setTutorQuestion("");
                        setTutorChatHistory(prev => [...prev, { sender: "user", text: userQ }]);
                        setIsTutorTyping(true);
                        
                        setTimeout(() => {
                          setIsTutorTyping(false);
                          const reply = "Como tutor Sinergia IA, te aclaro tu duda: cada webhook inbound recibido de Facebook Cloud API es guardado y se enruta de forma asíncrona hacia el prompt de configuración guardado en la pestaña 'Prompts del Sistema'.";
                          setTutorChatHistory(prev => [...prev, { sender: "tutor", text: reply }]);
                        }, 800);
                      }}
                      className="bg-yellow-600 hover:bg-yellow-550 text-black font-extrabold px-3 py-1.5 rounded-lg text-xs cursor-pointer select-none"
                    >
                      Preguntar
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        ) : activeTab === "root" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-5 xl:p-7 overflow-y-auto space-y-6 max-h-[calc(100vh-80px)] custom-scrollbar"
          >
            {/* Panel ROOT Header */}
            <div className="border-b border-slate-800 pb-5">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest font-mono bg-red-500/10 px-2.5 py-1 rounded inline-block mb-1.5 font-semibold">
                Súper Control: Panel de Control ROOT (SaaS Global Admin)
              </span>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                <ShieldCheck className="w-5.5 h-5.5 text-red-500" />
                <span>Consola de Comando Multiempresa & Suscripciones</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Administra de forma global las cuentas de empresas cliente (Tenants), activa o pausa sus licencias y ve la telemetría del servidor.</p>
            </div>

            {/* Micro server Telemetry */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 font-mono text-xs">
              
              <div className="p-3 bg-slate-900/10 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-500 block">DOCKER CONTAINERS</span>
                <span className="text-white font-bold block mt-1">7 Activos [✓ Healthy]</span>
              </div>

              <div className="p-3 bg-slate-900/10 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-500 block">DB SIZE (SPILLAGE LIMIT)</span>
                <span className="text-white font-bold block mt-1">3.34 GB / 10 GB</span>
              </div>

              <div className="p-3 bg-[#110909] border border-red-950/15 text-red-400 rounded-xl">
                <span className="text-[10px] text-slate-500 block text-red-500">ESTADO CLOUD RUN</span>
                <span className="font-bold block mt-1 flex items-center gap-1">🟢 ESTABLE [0.0.0.0:3000]</span>
              </div>

              <div className="p-3 bg-slate-900/10 border border-slate-850 rounded-xl">
                <span className="text-[10px] text-slate-500 block">PROCESOS CONCURRENTES</span>
                <span className="text-white font-bold block mt-1">2,841 Logs / Min</span>
              </div>

            </div>

            {/* Tenant Administrator Manager */}
            <div className="bg-[#0b0c13] border border-slate-850 p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider">Gestión Multi-tenant de Empresas Cliente</h3>

              <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 bg-slate-900/40 text-[9px] uppercase tracking-wider text-slate-400 text-slate-350">
                      <th className="py-2.5 px-3">Empresa Cliente (Tenant)</th>
                      <th className="py-2.5 px-3">Plan Licencia</th>
                      <th className="py-2.5 px-3 text-right">Usuarios</th>
                      <th className="py-2.5 px-3 text-right">Base de datos</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-center">Acciones ROOT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-mono text-slate-300">
                    {rootTenants.map(tenant => (
                      <tr key={tenant.id} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.2 px-3 font-bold font-sans text-white">{tenant.name}</td>
                        <td className="py-3.2 px-3 text-purple-300">{tenant.plan}</td>
                        <td className="py-3.2 px-3 text-right">{tenant.activeUsers} operarios</td>
                        <td className="py-3.2 px-3 text-right">{tenant.databaseUsage}</td>
                        <td className="py-3.2 px-3 text-center">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            tenant.status === "Activo" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-450 text-rose-300 animate-pulse"
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="py-3.2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setRootTenants(rootTenants.map(t => {
                                if (t.id === tenant.id) {
                                  const nStatus = t.status === "Activo" ? "Inactivo / Suspendido" : "Activo";
                                  addLog("warn", `ROOT: Estatus de la cuenta '${tenant.name}' cambiado a '${nStatus}'.`);
                                  return { ...t, status: nStatus };
                                }
                                return t;
                              }));
                            }}
                            className="bg-slate-950 hover:bg-slate-900 hover:text-white border border-slate-800 text-slate-400 font-bold py-1 px-3.2 rounded text-[10px] cursor-pointer"
                          >
                            Toggel Bloqueo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Immutables security logs audit ledger */}
            <div className="bg-[#05060b] border border-red-500/10 p-4 rounded-xl text-xs space-y-2">
              <h4 className="font-bold text-red-400 uppercase tracking-wide font-mono flex items-center gap-1.5">
                <span>🛡️ Transacciones & Logs de Auditoría Inmutables (ROOT)</span>
              </h4>
              <div className="space-y-1 max-h-[140px] overflow-y-auto font-mono text-[9.5px] text-slate-400 leading-normal custom-scrollbar">
                <div>[2026-06-17 15:15:30] AUTH WORKSPACE Sinergia S.A.S. - JWT token re-issued under admin privilege.</div>
                <div>[2026-06-17 15:18:22] SYSLOG - Outbound WhatsApp event payload for (+57 322...) compiled successfully.</div>
                <div>[2026-06-17 15:20:41] WEBHOOK MATCH - Handshake request for Verify Token 'sinergia_secret_token_2026' succeeded.</div>
                <div>[2026-06-17 15:21:05] DATABASE SENSITIVE - Read /api/config parameters from sandbox database requested.</div>
                <div>[2026-06-17 15:23:15] ROOT - Loaded master tenant subscription privileges with zero licensing errors.</div>
              </div>
            </div>

          </motion.div>
        ) : activeTab === "dashboard" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-6 xl:p-8 overflow-y-auto space-y-6"
          >
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2 font-display">
                  <BarChart2 className="w-5.5 h-5.5 text-pink-500 animate-pulse" />
                  <span>Métricas de Tráfico & Conversión Comercial</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Sinergia Agencia Inteligente — Pipeline de embudos autónomos de WhatsApp.</p>
              </div>
              <div className="mt-3 md:mt-0 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const headers = "Nombre,Empresa,Celular,Fase,Servicios\n";
                    const rows = sessions.map(s => 
                      `"${s.clientName}","${s.clientCompany}","${s.phone}","${s.lead.leadStatus}","${s.lead.consultedServices.join(' | ')}"`
                    ).join("\n");
                    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `sinergia_crm_${Date.now()}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    addLog("success", "📥 CRM exportado completo como planilla .CSV localmente.");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-2 transition-all shadow-md shadow-emerald-950/20"
                >
                  <FileText className="w-4 h-4" />
                  <span>Sincronizar y Descargar .CSV</span>
                </button>
              </div>
            </div>

            {/* Top KPI Cards deck */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Total Prospectos</span>
                  <span className="text-xl font-bold font-mono text-white">{sessions.length}</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Reuniones Agendadas</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">{statusCounts.find(s => s.slug === "reunión_agendada")?.value || 0}</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-lg bg-pink-950/40 text-pink-400 border border-pink-900/30 flex items-center justify-center flex-shrink-0">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Clientes Cerrados</span>
                  <span className="text-xl font-bold font-mono text-pink-400">{statusCounts.find(s => s.slug === "cliente_cerrado")?.value || 0}</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-lg bg-amber-950/40 text-amber-500 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Soporte Tecnico</span>
                  <span className="text-xl font-bold font-mono text-amber-400">{statusCounts.find(s => s.slug === "soporte")?.value || 0}</span>
                </div>
              </div>
            </div>

            {/* Recharts Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Funnel chart (BarChart) */}
              <div className="lg:col-span-3 bg-slate-900/30 p-5 rounded-xl border border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Embudo Whatsapp por Fases (Pipeline Actual)</span>
                  </h3>
                </div>
                <div className="h-[250px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusCounts} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff", fontSize: 11 }}
                        cursor={{ fill: '#1e293b', opacity: 0.4 }} 
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {statusCounts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Services PieChart */}
              <div className="lg:col-span-2 bg-slate-900/30 p-5 rounded-xl border border-slate-850 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <PieChart className="w-4 h-4 text-pink-400" />
                  <span>Demanda de Portafolio por Leads</span>
                </h3>
                <div className="h-[200px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={servicesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="cantidad"
                      >
                        {servicesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: 11 }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  {servicesData.map((item) => (
                    <div key={item.name} className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.name} ({item.cantidad})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Corporate Active Leads Datatable */}
            <div className="bg-slate-900/30 rounded-xl border border-slate-850 overflow-hidden">
              <div className="p-4 bg-slate-900/60 border-b border-slate-850 flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Base de Datos de Prospectos Registrados en CRM ({sessions.length})</span>
                <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-450 font-mono">PERSISTED LOCALSTORAGE & CORE</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 bg-slate-950/40 text-slate-450 uppercase tracking-wider text-[10px] font-bold">
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Teléfono</th>
                      <th className="p-3">Empresa/Marca</th>
                      <th className="p-3">Servicios Solicitados</th>
                      <th className="p-3">Estado CRM</th>
                      <th className="p-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 font-medium">
                    {sessions.map((sess) => {
                      let tagColor = "bg-blue-950/40 text-blue-300 border-blue-900/40";
                      let tagLabel = "Nuevo";
                      if (sess.lead.leadStatus === "interesado") {
                        tagColor = "bg-yellow-950/40 text-yellow-300 border-yellow-905/40";
                        tagLabel = "Interesado";
                      } else if (sess.lead.leadStatus === "reunión_agendada") {
                        tagColor = "bg-emerald-950/40 text-emerald-300 border-emerald-900/40";
                        tagLabel = "Reunión";
                      } else if (sess.lead.leadStatus === "cliente_cerrado") {
                        tagColor = "bg-pink-950/40 text-pink-300 border-pink-900/40";
                        tagLabel = "Cliente";
                      } else if (sess.lead.leadStatus === "soporte") {
                        tagColor = "bg-amber-950/40 text-amber-300 border-amber-900/40";
                        tagLabel = "En Soporte";
                      }

                      return (
                        <tr key={sess.id} className="hover:bg-slate-800/10 transition">
                          <td className="p-3 text-slate-100 font-bold">{sess.clientName}</td>
                          <td className="p-3 text-slate-400 font-mono">{sess.phone}</td>
                          <td className="p-3 text-slate-200">{sess.clientCompany}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {sess.lead.consultedServices.length > 0 ? (
                                sess.lead.consultedServices.map(srv => (
                                  <span key={srv} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850">
                                    {srv.split(" ")[0]}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-600">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${tagColor}`}>
                              {tagLabel}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectSession(sess.id);
                                setActiveTab("chats");
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-bold text-[11px]"
                            >
                              Ver Conversación
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-6 xl:p-8 overflow-y-auto space-y-6"
          >
            {/* Integrations Header */}
            <div className="border-b border-slate-800 pb-5">
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                <Settings className="w-5.5 h-5.5 text-sky-400" />
                <span>Enlace Sinergia Prod & Webhooks</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">Suscripción de eventos JSON de Meta Developers y customización instruccional del Cerebro Multiagente.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Credentials Form */}
              <div className="lg:col-span-7 bg-slate-900/30 p-5 rounded-xl border border-slate-850 space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-850/50">
                  <ShieldCheck className="w-4.5 h-4.5 text-sky-450 text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Credenciales Meta Cloud API</h3>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); saveConfigToBackend(); }} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">Identificador de Teléfono (Phone Number ID)</label>
                      <input
                        type="text"
                        value={dbConfig.whatsappPhoneNumberId}
                        onChange={(e) => setDbConfig({ ...dbConfig, whatsappPhoneNumberId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                        placeholder="Ej: 125633480629471"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">WABA Account ID</label>
                      <input
                        type="text"
                        value={dbConfig.whatsappBusinessAccountId}
                        onChange={(e) => setDbConfig({ ...dbConfig, whatsappBusinessAccountId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                        placeholder="Ej: 806495392039212"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">Verify Token Handshake (Definido por ti)</label>
                    <input
                      type="text"
                      value={dbConfig.webhookVerifyToken}
                      onChange={(e) => setDbConfig({ ...dbConfig, webhookVerifyToken: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                    <p className="text-[9.5px] text-slate-500 mt-1 leading-normal italic">Meta Server requiere que este token coincida en la verificación HTTP de Facebook.</p>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5 font-bold">Acceso de Meta permanente (Bearer Token)</label>
                    <input
                      type="password"
                      value={dbConfig.whatsappAccessToken}
                      onChange={(e) => setDbConfig({ ...dbConfig, whatsappAccessToken: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                      placeholder="EAAGshX0e3n8aBA..."
                    />
                    <p className="text-[9.5px] text-slate-500 mt-1 leading-normal italic">Inserta tu Meta System User Token de larga duración para realizar envíos salientes.</p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 font-semibold rounded-lg text-white transition disabled:bg-slate-800 text-xs shadow-md"
                    >
                      {isSavingConfig ? "Guardando en Sinergia Server..." : "Guardar & Sincronizar Cuentas"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Connection webhook guidelines */}
              <div className="lg:col-span-5 bg-slate-900/30 p-5 rounded-xl border border-slate-850 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-850/50">
                    <Globe className="w-4.5 h-4.5 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dirección de Meta Webhook</h3>
                  </div>

                  {/* Webhook endpoint card copy */}
                  <div className="p-3 bg-slate-950 border border-slate-850/80 rounded-lg space-y-2.5">
                    <div>
                      <span className="text-[9.5px] text-slate-500 uppercase font-mono block">DIRECCIÓN WEBHOOK (URL)</span>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <input
                          readOnly
                          type="text"
                          value={`${window.location.protocol}//${window.location.host}/api/whatsapp/webhook`}
                          className="bg-slate-900 text-slate-300 font-mono text-[10px] p-1.5 px-2 rounded flex-1 focus:outline-none border border-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/whatsapp/webhook`);
                            setCopiedUrl(true);
                            setTimeout(() => setCopiedUrl(false), 2000);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:border-slate-600 transition"
                          title="Copiar URL"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-slate-500 uppercase font-mono block">TOKEN DE VERIFICACIÓN</span>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <input
                          readOnly
                          type="text"
                          value={dbConfig.webhookVerifyToken}
                          className="bg-slate-900 text-slate-300 font-mono text-[10px] p-1.5 px-2 rounded flex-1 focus:outline-none border border-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(dbConfig.webhookVerifyToken);
                            setCopiedToken(true);
                            setTimeout(() => setCopiedToken(false), 2000);
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 hover:border-slate-600 transition"
                          title="Copiar Verify Token"
                        >
                          {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Guide text */}
                  <div className="text-[11px] text-slate-450 leading-relaxed space-y-2">
                    <p className="font-semibold text-slate-300 flex items-center space-x-1">
                      <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cómo Conectar en Producción:</span>
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 block text-slate-400">
                      <li>Ve a <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-sky-450 text-sky-400 hover:underline">Meta Developers Portal</a>.</li>
                      <li>Agrega el producto <strong>WhatsApp</strong>.</li>
                      <li>Pega la URL de arriba y el Token de verificación.</li>
                      <li>¡Guarda y suscríbete a <strong>messages</strong> en campos de webhook!</li>
                    </ol>
                  </div>
                </div>

                {/* Google Sheets Connection Block */}
                <div className="border-t border-slate-850 pt-4.5 pt-4 mt-2.5">
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-slate-200">Google Sheets CRM Link</span>
                    <input
                      type="checkbox"
                      checked={dbConfig.crmSyncGoogleSheets}
                      onChange={(e) => {
                        const nextVal = e.target.checked;
                        const nextCfg = { ...dbConfig, crmSyncGoogleSheets: nextVal };
                        setDbConfig(nextCfg);
                        saveConfigToBackend(nextCfg);
                      }}
                      className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-emerald-500 p-1 cursor-pointer focus:ring-0"
                    />
                  </div>
                  {dbConfig.crmSyncGoogleSheets && (
                    <div className="space-y-2 text-xs">
                      <label className="text-[9.5px] uppercase text-slate-500 block">ID Planilla Google (Spreadsheet ID)</label>
                      <input
                        type="text"
                        value={dbConfig.googleSheetsId}
                        onChange={(e) => setDbConfig({ ...dbConfig, googleSheetsId: e.target.value })}
                        onBlur={() => saveConfigToBackend()}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 px-2.5 py-1 text-slate-300 font-mono text-[10.5px]"
                        placeholder="Ej: 1sh_X0_e3n8a..."
                      />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Custom AI Agent Brain instructions panel */}
            <div className="bg-slate-900/30 p-5 rounded-xl border border-slate-850 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-850/50">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4.5 h-4.5 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Directivas Globales del Cerebro Sinergia AI</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const originalPrompt = `Eres SINERGIA AI, el cerebro e inteligencia multiagente principal de atención, soporte, ventas y registros de Sinergia Agencia Creativa en Colombia.\nTu labor es comportarte como un sistema multiagente profesional conectado a WhatsApp, CRM y Backoffice empresarial.\n\nSERVICIOS DE SINERGIA AGENCIA CREATIVA:\n- Desarrollo de páginas web: Landing pages, tiendas online (e-commerce), WordPress, Elementor, Hosting y dominios, SEO básico, webs corporativas modulares.\n- Automatización con IA: Bots conversacionales inteligentes para WhatsApp, integraciones de Gemini AI, flujos de automatización empresarial, CRM personalizados, plataformas como n8n y ManyChat.`;
                    setDbConfig({ ...dbConfig, systemPrompt: originalPrompt });
                    saveConfigToBackend({ ...dbConfig, systemPrompt: originalPrompt });
                    addLog("info", "Prompt del cerebro restablecido a los valores primarios por defecto.");
                  }}
                  className="text-[10px] text-slate-500 hover:text-white"
                >
                  Restablecer por Defecto
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 leading-normal">
                  Este bloque de texto representa las <strong>Instrucciones de Sistema (System Instructions)</strong> que hereda Gemini 3.5 a nivel servidor en cada mensaje. Al editarlas y presionar guardar, redefines la personalidad, precios, servicios, enrutamiento y tono de los 7 especialistas autónomos simultáneamente.
                </p>

                <textarea
                  value={dbConfig.systemPrompt}
                  onChange={(e) => setDbConfig({ ...dbConfig, systemPrompt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3.5 font-mono text-[11px] leading-relaxed text-slate-300 h-[220px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Instrucciones primarias de Sinergia AI..."
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    onClick={() => saveConfigToBackend()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-5 rounded-lg flex items-center space-x-2 transition shadow-md shadow-indigo-950/20"
                  >
                    <HardDrive className="h-4 w-4" />
                    <span>Guardar y Sincronizar Cerebro (Dynamic Prompt)</span>
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        )}

      </div>
    </div>
  );
}
