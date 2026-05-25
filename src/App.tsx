import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Users, Bot, Send, RefreshCw, FileText, CheckCheck, 
  Plus, Phone, Building, Briefcase, Layers, Terminal, AlertCircle, 
  Calendar, CheckCircle, Clock, Sparkles, Code, AlertTriangle, ChevronRight, UserPlus, Trash2, Globe, HeartHandshake,
  BarChart2, PieChart, TrendingUp, Settings, Copy, Check, ShieldCheck, HelpCircle, HardDrive
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

export default function App() {
  // Sinergia State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("whatbot_sessions_v1");
    return saved ? JSON.parse(saved) : PRESET_CLIENTS;
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || "juan-restaurante";
  });

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "agents" | "dashboard" | "integrations">("chats");

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
  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // 1. Add User Message to Chat UI
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    sendMessage(inputText);
  };

  // Click on a simulation quick pill
  const handleQuickPill = (pillText: string) => {
    sendMessage(pillText);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 1. Header Global Superior */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-950/20">
            <Bot className="h-5 w-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-white text-lg">WhatBot</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block mr-1"></span>
                SINERGIA AI ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Lerebro multiagente conectado a WhatsApp, CRM & backoffice empresarial</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Colombia (GMT-5)</span>
          </div>

          <button 
            type="button"
            onClick={resetAllSessions}
            className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/40 hover:bg-red-950/30 border border-slate-850 hover:border-red-900/40 rounded-lg transition-all duration-200 flex items-center space-x-2"
            title="Restablecer Simulador"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>
        </div>
      </header>

      {/* 2. Cuerpo Principal de Trabajo */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden max-w-[1920px] mx-auto w-full">
        
        {/* COLUMNA IZQUIERDA: Configuración y Selección de Chats (lg:col-span-3) */}
        <aside className="lg:col-span-3 border-r border-slate-850 bg-slate-900/30 p-4 xl:p-5 flex flex-col space-y-4/5 overflow-y-auto">
          
          {/* Tabs header */}
          <div className="flex bg-slate-950/65 p-1 rounded-lg border border-slate-850">
            <button 
              type="button"
              onClick={() => setActiveTab("chats")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-1.5 ${activeTab === 'chats' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-250'}`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Chats</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab("agents")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-1.5 ${activeTab === 'agents' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-250'}`}
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>Agentes</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-1.5 ${activeTab === 'dashboard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-250'}`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Métricas</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab("integrations")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-1.5 ${activeTab === 'integrations' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-250'}`}
            >
              <Settings className="w-3.5 h-3.5 text-sky-400" />
              <span>Ajustes</span>
            </button>
          </div>

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
              <div className="flex-1 flex flex-col space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Canal de Chat Simulado (WhatsApp Web)</span>
                
                <div className="space-y-1.5 max-h-[450px] lg:max-h-none overflow-y-auto pr-1">
                  {sessions.map((sess) => {
                    const isActive = sess.id === activeSessionId;
                    const sessAgent = getAgentById(sess.activeAgentId);
                    
                    // CRM Status badge classes
                    let statusLabel = "Nuevo";
                    let statusColor = "bg-blue-900/30 text-blue-300 border-blue-800/40";
                    if (sess.lead.leadStatus === "interesado") {
                      statusLabel = "Interesado";
                      statusColor = "bg-yellow-905/30 text-yellow-300 border-yellow-800/40";
                    } else if (sess.lead.leadStatus === "reunión_agendada") {
                      statusLabel = "Reunión";
                      statusColor = "bg-emerald-900/30 text-emerald-300 border-emerald-800/40";
                    } else if (sess.lead.leadStatus === "cliente_cerrado") {
                      statusLabel = "Cliente";
                      statusColor = "bg-pink-900/30 text-pink-300 border-pink-800/40";
                    } else if (sess.lead.leadStatus === "soporte") {
                      statusLabel = "En Soporte";
                      statusColor = "bg-amber-900/30 text-amber-300 border-amber-800/40";
                    }

                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => handleSelectSession(sess.id)}
                        className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 flex items-start space-x-2.5 relative group ${
                          isActive 
                            ? "bg-slate-800/80 border-slate-700 shadow-md ring-1 ring-emerald-500/20" 
                            : "bg-slate-900/40 border-slate-850 hover:bg-slate-850/60 hover:border-slate-800"
                        }`}
                      >
                        {/* Profile Photo */}
                        <div className="relative flex-shrink-0">
                          <img 
                            src={sess.avatar} 
                            alt={sess.clientName} 
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full border border-slate-700 bg-slate-900 object-cover"
                          />
                          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500`}></span>
                        </div>

                        {/* Mid metadata */}
                        <div className="flex-1 min-w-0 pr-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-100 text-xs truncate">{sess.clientName}</span>
                            <span className="text-[9px] text-slate-500 font-medium">{sess.timestamp}</span>
                          </div>
                          
                          <p className="text-[11px] text-slate-350 truncate mt-0.5 font-medium">{sess.clientCompany}</p>
                          <p className="text-[10px] text-slate-400 italic truncate mt-1">"{sess.lastMessage}"</p>

                          {/* Interactive status info below */}
                          <div className="flex items-center space-x-1.5 mt-2">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-850 flex items-center space-x-1`}>
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
                            className="absolute right-1 top-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity duration-150"
                            title="Eliminar Chat"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </button>
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
            <section className="lg:col-span-5 border-r border-slate-850 flex flex-col bg-slate-950/80 min-h-[600px] xl:min-h-0 relative">
          
          {/* Header del Chat */}
          <div className="bg-slate-900/90 border-b border-slate-850 px-4 py-3 flex items-center justify-between sticky top-[73px] z-10 backdrop-blur-md">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative">
                <img 
                  src={activeSession?.avatar} 
                  alt={activeSession?.clientName}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full border border-slate-700 bg-slate-950 object-cover"
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500"></span>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-white text-sm truncate leading-tight">{activeSession?.clientName}</h3>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{activeSession?.clientCompany}</span>
                  <span className="h-1 w-1 bg-slate-700 rounded-full"></span>
                  <span className="text-[10px] text-emerald-400 truncate">{activeSession?.phone}</span>
                </div>
              </div>
            </div>

            {/* Agente Asignado Badge en WhatsApp */}
            <div className={`p-1.5 rounded-lg border flex items-center space-x-2 ${activeAgent.bgAccent} max-w-[170px]`}>
              <span className="text-base leading-none">{activeAgent.emoji}</span>
              <div className="min-w-0 pr-1">
                <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-extrabold leading-none">Agente Activo</span>
                <span className="text-[10.5px] font-bold block truncate leading-tight">{activeAgent.name}</span>
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
              transition={{ duration: 0.2 }}
              className="bg-indigo-950/40 border-b border-indigo-900/40 px-4 py-2 flex items-center justify-between text-[11px] text-indigo-300"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 animate-pulse" />
                <span className="truncate">Sinergia AI redirigió el canal al <strong>{activeAgent.role}</strong>.</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-indigo-900/40 border border-indigo-805 rounded text-indigo-400 select-none uppercase font-bold tracking-widest ml-2 flex-shrink-0">
                MULTIAGENT DEVIATION
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Area de Globos del Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-[350px]" style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
            
            {activeSession?.messages.map((msg, idx) => {
              
              if (msg.sender === "system") {
                return (
                  <div key={msg.id || idx} className="flex justify-center my-2 select-none">
                    <span className="bg-slate-900/90 text-slate-400 text-[10px] font-medium px-3 py-1 rounded shadow-sm border border-slate-850 leading-relaxed text-center max-w-[85%]">
                      ⚙️ {msg.text}
                    </span>
                  </div>
                );
              }

              const isUser = msg.sender === "user";
              const msgAgent = msg.agentId ? getAgentById(msg.agentId) : getAgentById(activeSession.activeAgentId);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-md relative group ${
                    isUser 
                      ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-tr-none" 
                      : "bg-slate-900 border border-slate-800 text-slate-150 rounded-tl-none"
                  }`}>
                    
                    {/* Bot Agent Header Indicator inside speech bubble */}
                    {!isUser && (
                      <div className="flex items-center space-x-1.5 text-[9px] uppercase font-bold text-indigo-400 mb-1 border-b border-slate-800/60 pb-1">
                        <span>{msgAgent.emoji}</span>
                        <span>{msgAgent.name}</span>
                      </div>
                    )}

                    <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                    
                    <div className="flex items-center justify-end space-x-1 mt-1.5 text-[9px] text-slate-400 font-medium">
                      <span>{msg.timestamp}</span>
                      {isUser && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
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
          <div className="bg-slate-900 border-t border-slate-850 p-3.5 space-y-3">
            
            {/* Quick Prompts Píldoras */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Píldoras rápidas (Simular intenciones del Cliente)</span>
              
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickPill("Hola, necesito que me diseñen una página web moderna con catálogo de servicios.")}
                  className="px-2 py-1 text-[10px] bg-indigo-950/45 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-900/50 rounded-full transition duration-150 flex items-center space-x-1"
                >
                  <Code className="w-2.5 h-2.5" />
                  <span>Pedir Web</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Urgente, mi hosting se cayó y tengo correos rechazados. Ayuda.")}
                  className="px-2 py-1 text-[10px] bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-900/40 rounded-full transition duration-150 flex items-center space-x-1"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Soporte / Falla</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Quiero automatizar mi WhatsApp con un bot de IA avanzada n8n. ¿Qué costo tiene?")}
                  className="px-2 py-1 text-[10px] bg-purple-950/45 hover:bg-purple-900/60 text-purple-300 border border-purple-900/50 rounded-full transition duration-150 flex items-center space-x-1"
                >
                  <Bot className="w-2.5 h-2.5" />
                  <span>Pedir Bot IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Hola. Quiero agendar una reunión comercial para mañana en Google Meet sobre Meta Ads.")}
                  className="px-2 py-1 text-[10px] bg-emerald-950/45 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-900/50 rounded-full transition duration-150 flex items-center space-x-1"
                >
                  <Calendar className="w-2.5 h-2.5" />
                  <span>Agendar Reunión</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPill("Buenas, ¿cuánto cuesta el community manager y diseño de marca?")}
                  className="px-2 py-1 text-[10px] bg-pink-950/45 hover:bg-pink-900/60 text-pink-300 border border-pink-900/50 rounded-full transition duration-150 flex items-center space-x-1"
                >
                  <Globe className="w-2.5 h-2.5" />
                  <span>Redes / Diseño</span>
                </button>
              </div>
            </div>

            {/* Main input Chat Form */}
            <form onSubmit={handleFormSubmit} className="flex items-center space-x-2">
              <input 
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Escribe un mensaje de WhatsApp simulando al cliente..."
                className="flex-1 bg-slate-950 text-white placeholder-slate-500 border border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl transition duration-150 flex-shrink-0 shadow-md shadow-emerald-950/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </section>

        {/* COLUMNA DERECHA: Ficha CRM, Checklist de Servicios y Log del Backoffice (lg:col-span-4) */}
        <aside className="lg:col-span-4 bg-slate-900/20 p-4 xl:p-5 flex flex-col space-y-4 xl:space-y-5 overflow-y-auto">
          
          {/* CRM Ficha Comercial Card */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3.5 shadow-sm">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4.5 h-4.5 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ficha CRM de WhatsApp</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCRM(!isEditingCRM)}
                className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 px-2.5 py-1 bg-slate-950 border border-slate-850 rounded-md transition duration-150"
              >
                {isEditingCRM ? "Cancelar" : "Modificar CRM"}
              </button>
            </div>

            {isEditingCRM ? (
              <div className="space-y-3 bg-slate-950/70 p-3 rounded-lg border border-slate-850 text-xs">
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Nombre Propietario</label>
                  <input 
                    type="text"
                    value={editedName}
                    onChange={e => setEditedName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Empresa / Negocio</label>
                  <input 
                    type="text"
                    value={editedCompany}
                    onChange={e => setEditedCompany(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Teléfono</label>
                  <input 
                    type="text"
                    value={editedPhone}
                    onChange={e => setEditedPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 block mb-1">Fase Pipeline</label>
                  <select
                    value={editedStatus}
                    onChange={e => setEditedStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-905 border border-slate-800 rounded px-2 py-1 text-white focus:outline-none text-xs"
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
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded block transition duration-150"
                >
                  Guardar Cambios
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="grid grid-cols-2 gap-2 border-b border-slate-850/60 pb-3">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Cliente</span>
                    <span className="font-bold text-slate-100">{activeSession?.clientName || "Sin registrar"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Marca / Empresa</span>
                    <span className="font-bold text-slate-100 flex items-center space-x-1">
                      <Building className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{activeSession?.clientCompany || "Sin registrar"}</span>
                    </span>
                  </div>
                </div>

                <div className="border-b border-slate-850/60 pb-3">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Resumen del Requerimiento en WhatsApp</span>
                  <p className="text-[11px] leading-relaxed italic bg-slate-950/50 p-2 rounded border border-slate-850/60 text-slate-300 mt-1">
                    {activeSession?.lead.needsSummary ? `"${activeSession?.lead.needsSummary}"` : "Esperando que el cliente exprese su necesidad o requerimiento técnico..."}
                  </p>
                </div>

                {/* Servicios de Sinergia Activos / Checklist */}
                <div className="space-y-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Servicios del Portafolio Detectados (Inteligencia Sinergia)</span>
                  
                  <div className="grid grid-cols-1 gap-1.5 pt-0.5">
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
                          className={`px-2.5 py-1.5 rounded border text-[11px] flex items-center justify-between ${
                            isDetected 
                              ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/60" 
                              : "bg-slate-950/30 text-slate-500 border-slate-850"
                          }`}
                        >
                          <span className="font-medium">{item.label}</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${isDetected ? "bg-emerald-400 animate-pulse" : "bg-slate-800"}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CRM Visual Funnel Pipeline */}
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850 space-y-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Embudo de Ventas Backoffice</h3>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { statusId: "nuevo", step: 1, label: "Saludo & Recepción", description: "Clasificación inicial de datos" },
                { statusId: "interesado", step: 2, label: "Interesado Calificado", description: "Demanda información comercial" },
                { statusId: "reunión_agendada", step: 3, label: "Reunión de Negocio", description: "Coordinado Google Meet de ventas" },
                { statusId: "cliente_cerrado", step: 4, label: "Cliente Sinergia", description: "Contratación de servicios realizada" },
                { statusId: "soporte", step: 5, label: "Incidencias / Soporte", description: "Asesoría o incidencias de hosting" }
              ].map((stepObj) => {
                const isSelected = activeSession?.lead.leadStatus === stepObj.statusId;
                
                // Color mapping for active states
                let borderClass = isSelected ? "border-indigo-500 bg-indigo-950/20 text-indigo-200" : "border-slate-850 bg-slate-950/30 text-slate-450";
                if (isSelected) {
                  if (stepObj.statusId === "nuevo") borderClass = "border-blue-500 bg-blue-950/20 text-blue-200";
                  if (stepObj.statusId === "interesado") borderClass = "border-yellow-500 bg-yellow-950/20 text-yellow-200";
                  if (stepObj.statusId === "reunión_agendada") borderClass = "border-emerald-500 bg-emerald-950/20 text-emerald-250";
                  if (stepObj.statusId === "cliente_cerrado") borderClass = "border-pink-500 bg-pink-950/20 text-pink-250";
                  if (stepObj.statusId === "soporte") borderClass = "border-amber-500 bg-amber-950/20 text-amber-250";
                }

                return (
                  <div 
                    key={stepObj.statusId}
                    className={`flex items-start space-x-3 p-2 rounded-lg border transition duration-200 ${borderClass}`}
                  >
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] mt-0.5 ${
                      isSelected ? "bg-slate-100 text-slate-950" : "bg-slate-900 border border-slate-800"
                    }`}>
                      {stepObj.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-[11px] leading-tight text-white">{stepObj.label}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{stepObj.description}</p>
                    </div>
                    
                    {/* Tick for selected */}
                    {isSelected && (
                      <span className="ml-auto text-white text-[10px] font-extrabold uppercase bg-emerald-600/30 border border-emerald-500/20 px-1 py-0.5 rounded leading-none">
                        ACTIVO
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Retro Logs Terminal Viewer */}
          <div className="bg-slate-905 p-4 rounded-xl border border-slate-850 space-y-2 flex-grow flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 border-b border-slate-850/60">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-mono">Consola Logs Sinergia AI</h3>
              </div>
              <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5 rounded uppercase font-mono tracking-widest font-bold">
                LOGGING LIVE
              </span>
            </div>

            <div className="bg-black/90 rounded-md p-3 font-mono text-[9.5px] leading-5 text-slate-300 h-[190px] overflow-y-auto space-y-1 mt-2.5 max-h-[190px] xl:max-h-none flex-1">
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
                  <div key={log.id} className="border-b border-slate-900/50 pb-1 flex items-start space-x-1.5">
                    <span className="text-slate-600 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={`${textCol} flex-shrink-0 font-bold`}>{typePrefix}</span>
                    <span className={`${textCol} break-all`}>
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
        ) : activeTab === "dashboard" ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-9 p-6 xl:p-8 overflow-y-auto space-y-6"
          >
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                  <BarChart2 className="w-5.5 h-5.5 text-pink-500" />
                  <span>Métricas de Tráfico & Conversión Comercial</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">Sinergia Agencia Inteligente — Pipeline unificado de embudos autónomos de WhatsApp.</p>
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
