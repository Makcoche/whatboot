import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sinergia AI Core System Prompts
const SYSTEM_INSTRUCTION = `
Eres SINERGIA AI, el cerebro e inteligencia multiagente principal de atención, soporte, ventas y registros de Sinergia Agencia Creativa en Colombia.
Tu labor es comportarte como un sistema multiagente profesional conectado a WhatsApp, CRM y Backoffice empresarial.

SERVICIOS DE SINERGIA AGENCIA CREATIVA:
- Desarrollo de páginas web: Landing pages, tiendas online (e-commerce), WordPress, Elementor, Hosting y dominios, SEO básico, webs corporativas modulares.
- Automatización con IA: Bots conversacionales inteligentes para WhatsApp, integraciones de Gemini AI, flujos de automatización empresarial, CRM personalizados, plataformas como n8n y ManyChat.
- Marketing digital: Campañas de anuncios en Meta Ads (Facebook/Instagram), Google Ads, construcción de embudos de ventas integrales.
- Manejo de redes sociales: Estrategias de contenido, Reels altamente creativos, branding corporativo, Community Management para marcas.
- Diseño de marca: Diseño gráfico publicitario, branding institucional, producción audiovisual profesional.

REGLAS DE TONO Y ESTILO TRASCENDENTALES:
1. Actúa como un agente de carne y hueso (humano, empático, inteligente y muy corporativo). Nunca digas ser una "inteligencia artificial desarrollada por Google" ni uses jerga robótica.
2. Sé directo, breve y de alto impacto estratégico. En WhatsApp el espacio es valioso. Tus mensajes no deben pasarse de 1 a 3 párrafos y deben usar emojis con moderación y encanto.
3. El idioma principal es español, con un tono cercano, seguro y asertivo (adecuado a Colombia/LATAM).
4. No des precios fijos de inmediato. Siempre recalca: "El presupuesto se ajusta a la medida de tu solución y complejidad. Déjanos saber un par de detalles para cotizar exactamente lo necesario."
5. Tu propósito dorado es la conversión: capturar leads, descubrir el nombre del contacto, su empresa, su dolor o necesidad de automatización/mercadeo, y orientarlo a una reunión de negocios o aclaración técnica.

DINÁMICA DE LOS ASISTENTES ESPECIALIZADOS (MULTIAGENTE):
El sistema emula derivar el chat internamente al asistente con la especialidad correcta. Detecta la intención y asigna de las siguientes opciones:
- "Recepción": Para recién llegados, saludos, consultas sobre quiénes somos en general o preguntas muy abiertas.
- "Ventas": Para clientes con alto interés comercial que preguntan por cotizar servicios, beneficios de negocio o quieren saber cómo impulsar sus ventas generales.
- "Páginas Web": Para consultas puntuales sobre landing pages, webs en WordPress, dominios, hosting o tiendas online.
- "Automatización IA": Para integraciones de bots de WhatsApp, software de IA para empresas, automatización con n8n, ManyChat o CRM.
- "Redes Sociales": Para creación de contenido, Instagram/TikTok, branding, diseño gráfico, reels o servicios de community manager.
- "Soporte": Para resolver inconvenientes técnicos reales (hosting caído, bot pegado, correos corporativos bloqueados) o para clientes molestos/preocupados.
- "Administrativo": Para agendar reuniones, solicitar datos formales (teléfono, correo), coordinar cotizaciones escritas o programar al equipo humano.
`;

// Production Dynamic Configuration Store
interface AppConfig {
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappAccessToken: string;
  webhookVerifyToken: string;
  systemPrompt: string;
  crmSyncGoogleSheets: boolean;
  googleSheetsId: string;
}

let currentConfig: AppConfig = {
  whatsappPhoneNumberId: "125633480629471",
  whatsappBusinessAccountId: "806495392039212",
  whatsappAccessToken: "",
  webhookVerifyToken: "sinergia_secret_token_2026",
  systemPrompt: SYSTEM_INSTRUCTION.trim(),
  crmSyncGoogleSheets: false,
  googleSheetsId: "1sh_X0_e3n8a_EXAMPLE_SPREADSHEET_ID_yR9V-b7Q",
};

// Endpoints for active platform settings
app.get("/api/config", (req, res) => {
  res.json(currentConfig);
});

app.post("/api/config", (req, res) => {
  try {
    const configUpdate = req.body;
    currentConfig = {
      ...currentConfig,
      ...configUpdate
    };
    console.log("[Sinergia AI Config] Configuration updated dynamically:", currentConfig);
    res.json({ success: true, message: "Ajustes de producción guardados y sincronizados.", config: currentConfig });
  } catch (error: any) {
    res.status(500).json({ error: "Falla al guardar configuración.", details: error.message });
  }
});

// Direct active in-memory store to match real WhatsApp users dynamically with the Sinergia AI brain
interface LiveSession {
  phone: string;
  customerName: string;
  companyName: string;
  leadStatus: string;
  needsSummary: string;
  consultedServices: string[];
  messages: { role: "user" | "assistant"; text: string; timestamp: Date }[];
}

const liveSessionsStore = new Map<string, LiveSession>();

// WhatsApp Cloud API Webhook Handlers (GET for Verification, POST for Business Events)
app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`[WhatsApp Webhook Handshake] mode: ${mode}, token: ${token}`);

  if (mode === "subscribe" && token === currentConfig.webhookVerifyToken) {
    console.log("[WhatsApp Webhook] Verification successful!");
    return res.status(200).send(challenge);
  } else {
    console.warn("[WhatsApp Webhook] Verification failed or token mismatched.");
    return res.status(403).send("Forbidden: verification token mismatch");
  }
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  try {
    const payload = req.body;
    console.log("[Incoming WhatsApp Cloud API Webhook Event]:", JSON.stringify(payload, null, 2));

    // Acknowledge the notification instantly to Meta servers as required (within 3s response window)
    res.status(200).send("EVENT_RECEIVED");

    // Process asynchronously so we don't hold Facebook HTTP threads
    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    
    if (value && value.messages && value.messages[0]) {
      const msg = value.messages[0];
      
      // Handle simple incoming text messages
      if (msg.type === "text" && msg.from) {
        const from = msg.from; // Sender's WhatsApp number
        const textStr = msg.text?.body;
        const profileName = value.contacts?.[0]?.profile?.name || "";

        if (textStr) {
          console.log(`[Real WhatsApp Interaction] Received from ${from} (${profileName}): "${textStr}"`);
          
          // 1. Initialize or pull existing session
          if (!liveSessionsStore.has(from)) {
            liveSessionsStore.set(from, {
              phone: from,
              customerName: profileName || "Cliente WhatsApp",
              companyName: "Por registrar",
              leadStatus: "nuevo",
              needsSummary: "Iniciado espontáneamente en WhatsApp",
              consultedServices: [],
              messages: []
            });
          }
          
          const session = liveSessionsStore.get(from)!;
          session.messages.push({ role: "user", text: textStr, timestamp: new Date() });
          
          // Constrain history to prevent context explosion
          if (session.messages.length > 20) {
            session.messages.shift();
          }

          // 2. Query Gemini Multiagent Engine for answer & CRM updates
          let responseText = "";
          let detectedAgent = "Recepción";
          let leadUpdates: any = {};

          if (ai) {
            const leadContext = `
INFORMACIÓN ACTUANTE EN EL CRM CENTRAL:
- Nombre detectado: ${session.customerName}
- Empresa: ${session.companyName}
- Estado del Embudo: ${session.leadStatus}
- Necesidad Actual: ${session.needsSummary}
- Especialidades Interesadas: ${session.consultedServices.join(", ") || "Ninguna"}
`;
            const recentConversation = session.messages
              .map(m => `${m.role === "user" ? "Cliente" : "Sinergia Agent"}: ${m.text}`)
              .join("\n");
            
            const prompt = `
Analiza la conversación REAL de WhatsApp y asume el rol del especialista correspondiente para Sinergia Agencia Creativa.

${leadContext}

HISTORIAL DE CHAT RECIENTE:
${recentConversation}

ÚLTIMO MENSAJE NUEVO DEL CLIENTE:
"${textStr}"

Decide qué especialista de Sinergia (Recepción, Ventas, Páginas Web, Automatización IA, Redes Sociales, Soporte, Administrativo) responde mejor.
Extrae cualquier nuevo dato relevante (nombre del cliente, nombre de negocio, servicios insinuados) para guardar en CRM.

Entrega ÚNICAMENTE una estructura JSON válida que encaje estrictamente con el esquema:
{
  "message": "Mensaje corto estructurado y bien formateado en español con salto de renglón si es oportuno",
  "detectedAgent": "departamento",
  "leadUpdates": {
    "customerName": "Nombre",
    "companyName": "Empresa",
    "consultedServices": ["Servicios comentados"],
    "leadStatus": "nuevo o interesado o reunión_agendada o cliente_cerrado o soporte",
    "needsSummary": "Idea clave"
  }
}
`;

            try {
              const geminiRes = await ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: prompt,
                config: {
                  systemInstruction: currentConfig.systemPrompt,
                  responseMimeType: "application/json"
                }
              });
              
              const parsed = JSON.parse(geminiRes.text || "{}");
              responseText = parsed.message || "";
              detectedAgent = parsed.detectedAgent || "Recepción";
              leadUpdates = parsed.leadUpdates || {};
            } catch (err) {
              console.warn("[WhatsApp Webhook] Falló Gemini, aplicando enrutador heurístico:", err);
            }
          }

          // Fallback Heuristics
          if (!responseText) {
            const lower = textStr.toLowerCase();
            if (lower.includes("web") || lower.includes("página") || lower.includes("pagina") || lower.includes("landing")) {
              responseText = `¡Hola! Aquí Santiago, Líder de Canales Web en Sinergia. 💻 Diseñamos páginas adaptables en WordPress o customizadas para convertir visitas en ventas. ¿Buscas posicionar una landing page o consolidar un e-commerce corporativo?`;
              detectedAgent = "Páginas Web";
              leadUpdates = { leadStatus: "interesado", consultedServices: ["Desarrollo Web"], needsSummary: "Preguntas de creación web" };
            } else if (lower.includes("bot") || lower.includes("automatizar") || lower.includes("ia") || lower.includes("whatsapp")) {
              responseText = `¡Excelente iniciativa! Te habla Mateo, Asistente de Automatización e IA en Sinergia. 🤖 Conectamos la API oficial de WhatsApp con Inteligencia Artificial o flujos n8n para que no pierdas ningún lead. ¿Tienes interés en un calificador automático de prospectos o FAQs?`;
              detectedAgent = "Automatización IA";
              leadUpdates = { leadStatus: "interesado", consultedServices: ["Bots e Inteligencia Artificial"], needsSummary: "Automatización de WhatsApp" };
            } else {
              responseText = `¡Hola! Soy Valeria de Recepción en Sinergia Agencia Creativa Colombia. 👋 Qué alegría conversar contigo. Cuéntame, ¿estás buscando el diseño o desarrollo de un sitio web, automatizar tu WhatsApp con IA, pautas publicitarias en Meta o diseño creativo premium?`;
              detectedAgent = "Recepción";
              leadUpdates = { leadStatus: "nuevo", consultedServices: [], needsSummary: "Contacto entrante" };
            }
          }

          // Guardar actualizaciones sobre la sesión en memoria
          if (leadUpdates.customerName && leadUpdates.customerName !== "Cliente WhatsApp" && leadUpdates.customerName !== "Nombre") {
            session.customerName = leadUpdates.customerName;
          }
          if (leadUpdates.companyName && leadUpdates.companyName !== "Empresa" && leadUpdates.companyName !== "Por registrar") {
            session.companyName = leadUpdates.companyName;
          }
          if (leadUpdates.leadStatus) {
            session.leadStatus = leadUpdates.leadStatus;
          }
          if (leadUpdates.needsSummary) {
            session.needsSummary = leadUpdates.needsSummary;
          }
          if (leadUpdates.consultedServices && Array.isArray(leadUpdates.consultedServices)) {
            leadUpdates.consultedServices.forEach((srv: string) => {
              if (!session.consultedServices.includes(srv)) {
                session.consultedServices.push(srv);
              }
            });
          }

          session.messages.push({ role: "assistant", text: responseText, timestamp: new Date() });

          // 3. Dispatch reply to user's real WhatsApp if bearer token config is defined
          if (currentConfig.whatsappAccessToken && currentConfig.whatsappPhoneNumberId) {
            console.log(`[Meta Cloud Outbound Request] Dispatching message to ${from}...`);
            try {
              const url = `https://graph.facebook.com/v18.0/${currentConfig.whatsappPhoneNumberId}/messages`;
              const response = await fetch(url, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${currentConfig.whatsappAccessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "text",
                  text: { body: responseText }
                })
              });
              const resData = await response.json();
              console.log(`[Meta Cloud API Send Result]:`, JSON.stringify(resData));
            } catch (sendErr) {
              console.error("[WhatsApp Outbound Error] Failed to dispatch via Meta API:", sendErr);
            }
          } else {
            console.warn("[Meta Cloud API Bypass] No Token or Phone ID stored. Message saved. Outbound skipped.");
          }
        }
      }
    }
  } catch (error: any) {
    console.error("[WhatsApp Webhook Core Error]:", error);
  }
});

// Endpoint to retrieve real conversations
app.get("/api/live-sessions", (req, res) => {
  res.json(Array.from(liveSessionsStore.values()));
});

// Endpoint: Multiagent WhatsApp Chat Simulator
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, currentLead } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const latestUserMessage = messages[messages.length - 1]?.text || "";
    const lastMsgLower = latestUserMessage.toLowerCase();

    // Setup a highly robust Local Emulator so that even if the API Key is missing or fails (quota, network, invalid key),
    // the system perfectly maps the context to a beautifully crafted agent response for ALL 7 core departments!
    const getLocalEmulatorResponse = () => {
      // Default: Recepción
      let responseMsg = "¡Hola! Qué gusto saludarte. Soy Valeria, Directora de Recepción en Sinergia Agencia Creativa. 👋 Estamos felices de apoyarte a escalar tu marca con canales digitales de alto impacto. Cuéntame: ¿Estás pensando en diseñar una página web moderna, automatizar tu WhatsApp con IA, delegar tus redes sociales con un Community Manager o impulsar tus ventas con campañas publicitarias?";
      let agent = "Recepción";
      let updateStatus = currentLead?.leadStatus || "nuevo";
      let updatedServices = currentLead?.consultedServices || [];
      const updatedName = currentLead?.customerName || "";

      // Match Páginas Web - Web Development
      if (
        lastMsgLower.includes("web") ||
        lastMsgLower.includes("página") ||
        lastMsgLower.includes("pagina") ||
        lastMsgLower.includes("landing") ||
        lastMsgLower.includes("wordpress") ||
        lastMsgLower.includes("tienda") ||
        lastMsgLower.includes("ecommerce") ||
        lastMsgLower.includes("e-commerce")
      ) {
        responseMsg = "¡Hola! Soy Santiago, Especialista en Canales Web en Sinergia. 💻 Diseñamos páginas ultra-rápidas, optimizadas para Google y totalmente autogestionables en WordPress o código a medida. ¿Tu objetivo es una landing page de alta conversión, una tienda online con pasarela de pagos, o una web corporativa institucional? Cuéntame un poco más de tu idea para darte un estimado aproximado.";
        agent = "Páginas Web";
        updateStatus = "interesado";
        if (!updatedServices.includes("Desarrollo Web")) {
          updatedServices = [...updatedServices, "Desarrollo Web"];
        }
      }
      // Match Automatización IA
      else if (
        lastMsgLower.includes("bot") ||
        lastMsgLower.includes("automatizar") ||
        lastMsgLower.includes("automatizacion") ||
        lastMsgLower.includes("automatización") ||
        lastMsgLower.includes("ia") ||
        lastMsgLower.includes("whatsapp") ||
        lastMsgLower.includes("n8n") ||
        lastMsgLower.includes("manychat") ||
        lastMsgLower.includes("agent")
      ) {
        responseMsg = "¡Excelente iniciativa! Aquí Mateo, Asistente de Automatización e IA. 🤖 Ayudamos a empresas a conectar sus canales de WhatsApp con inteligencias artificiales avanzadas y flujos de n8n para responder 24/7 sin fallas y calificar leads en automático. ¿Diseñamos un bot de ventas para calificar prospectos o necesitas automatizar la postventa y FAQs de tu equipo?";
        agent = "Automatización IA";
        updateStatus = "interesado";
        if (!updatedServices.includes("Bots e Inteligencia Artificial")) {
          updatedServices = [...updatedServices, "Bots e Inteligencia Artificial"];
        }
      }
      // Match Redes Sociales / Diseño / CM
      else if (
        lastMsgLower.includes("social") ||
        lastMsgLower.includes("redes") ||
        lastMsgLower.includes("instagram") ||
        lastMsgLower.includes("tiktok") ||
        lastMsgLower.includes("community") ||
        lastMsgLower.includes("manager") ||
        lastMsgLower.includes("diseño") ||
        lastMsgLower.includes("diseno") ||
        lastMsgLower.includes("branding") ||
        lastMsgLower.includes("marca") ||
        lastMsgLower.includes("reels") ||
        lastMsgLower.includes("feed")
      ) {
        responseMsg = "¡Qué gran proyecto! Te saluda Valentina, Directora Creativa de Sinergia. 🎨 Nos encargamos de que tu marca brille con Reels dinámicos, historias interactivas, dirección de arte editorial y planes de Community Management diseñados para vender más. ¿Buscas posicionar tu marca personal, delegar el diseño diario de tus feeds o crear contenido en video viral?";
        agent = "Redes Sociales";
        updateStatus = "interesado";
        if (!updatedServices.includes("Manejo de Redes Sociales")) {
          updatedServices = [...updatedServices, "Manejo de Redes Sociales"];
        }
        if (!updatedServices.includes("Diseño Gráfico")) {
          updatedServices = [...updatedServices, "Diseño Gráfico"];
        }
      }
      // Match Soporte Técnico / Falla
      else if (
        lastMsgLower.includes("soporte") ||
        lastMsgLower.includes("caido") ||
        lastMsgLower.includes("caído") ||
        lastMsgLower.includes("caida") ||
        lastMsgLower.includes("caída") ||
        lastMsgLower.includes("falla") ||
        lastMsgLower.includes("error") ||
        lastMsgLower.includes("dañado") ||
        lastMsgLower.includes("daño") ||
        lastMsgLower.includes("urgente") ||
        lastMsgLower.includes("ayuda") ||
        lastMsgLower.includes("problema") ||
        lastMsgLower.includes("no sirve") ||
        lastMsgLower.includes("rechazado") ||
        lastMsgLower.includes("no funciona")
      ) {
        responseMsg = "¡Atención prioritaria inmediata! Soy Alejandro, tu Asistente de Soporte Técnico en Sinergia. 🌐 Lamento mucho la novedad relevante en tu sistema. Nos pondremos a revisar tu hosting, bot o correo corporativo en este mismo instante para normalizarlo de raíz. Por favor, compárteme la URL de tu sitio o el error específico que aparece para acelerar la resolución.";
        agent = "Soporte";
        updateStatus = "soporte";
      }
      // Match Agendar / Administrativo
      else if (
        lastMsgLower.includes("agendar") ||
        lastMsgLower.includes("reunion") ||
        lastMsgLower.includes("reunión") ||
        lastMsgLower.includes("cita") ||
        lastMsgLower.includes("meet") ||
        lastMsgLower.includes("zoom") ||
        lastMsgLower.includes("calendario") ||
        lastMsgLower.includes("programar")
      ) {
        responseMsg = "¡Excelente! Te saluda Carolina del área de Agenda Corporativa. 📅 Estoy lista para coordinar nuestra videollamada interactiva vía Google Meet de 15 minutos para estructurar tu propuesta comercial formal con nuestro director del proyecto. ¿Te queda bien mañana por la mañana o prefieres en la tarde? Compárteme tu correo de contacto principal para enviarte la invitación oficial.";
        agent = "Administrativo";
        updateStatus = "reunión_agendada";
      }
      // Match Ventas / Cotizar / Precios
      else if (
        lastMsgLower.includes("precio") ||
        lastMsgLower.includes("cuánto") ||
        lastMsgLower.includes("cuanto") ||
        lastMsgLower.includes("costo") ||
        lastMsgLower.includes("costos") ||
        lastMsgLower.includes("cotizar") ||
        lastMsgLower.includes("cotizacion") ||
        lastMsgLower.includes("cotización") ||
        lastMsgLower.includes("comercial") ||
        lastMsgLower.includes("vender") ||
        lastMsgLower.includes("ventas") ||
        lastMsgLower.includes("portafolio") ||
        lastMsgLower.includes("venda")
      ) {
        responseMsg = "¡Hola! Soy Camilo, Especialista en Desarrollo Comercial en Sinergia. 📈 Para garantizarte el mayor retorno de inversión posible, personalizamos el presupuesto al 100% de acuerdo a la escala, volumen de contactos e integraciones necesarias. ¿Qué te parece si agendamos un breve Meet de 10 minutos para definir el alcance exacto de tu proyecto y darte la propuesta óptima hoy mismo?";
        agent = "Ventas";
        updateStatus = "interesado";
        if (!updatedServices.includes("Facebook/Meta Ads")) {
          updatedServices = [...updatedServices, "Facebook/Meta Ads"];
        }
      }

      return {
        message: responseMsg,
        detectedAgent: agent,
        leadUpdates: {
          customerName: updatedName,
          companyName: currentLead?.companyName || "",
          consultedServices: updatedServices,
          leadStatus: updateStatus,
          needsSummary: `Solicitud de clasificación asistida por Sinergia Local Router (${agent})`
        },
        transferringAnimation: agent !== (currentLead?.activeAgentId || "Recepción")
      };
    };

    if (!ai) {
      console.warn("GEMINI_API_KEY is not defined. Emulating a local test response.");
      return res.json(getLocalEmulatorResponse());
    }

    // Build context
    const leadContext = `
INFORMACIÓN ACTUAL EN EL CRM DEL CLIENTE:
- Nombre detectado: ${currentLead?.customerName || "No registrado aún"}
- Empresa: ${currentLead?.companyName || "No registrada aún"}
- Estado actual: ${currentLead?.leadStatus || "nuevo"}
- Resumen de necesidades: ${currentLead?.needsSummary || "Búsqueda inicial"}
- Servicios registrados: ${currentLead?.consultedServices?.join(", ") || "Ninguno"}
`;

    const instructionsPrompt = `
Analiza la conversación simulada de WhatsApp para Sinergia Agencia Creativa y responde de forma asertiva al cliente.

${leadContext}

ÚLTIMO MENSAJE DEL CLIENTE EN WHATSAPP:
"${latestUserMessage}"

Por favor, decide de manera ultra-inteligente cuál departamento debe procesar y responder esta conversación (Recepción, Ventas, Páginas Web, Automatización IA, Redes Sociales, Soporte, Administrativo). 
Completa los campos de actualización de CRM si el cliente te ha dado nueva información en este mensaje (nombre, nombre de su negocio, servicios comentados, o si corresponde agendar reunión o reportar falla de soporte).

Devuelve tu respuesta únicamente como JSON matching el esquema solicitado.
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: instructionsPrompt,
        config: {
          systemInstruction: currentConfig.systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: {
                type: Type.STRING,
                description: "La respuesta de WhatsApp en español. Corta, persuasiva, cercana y profesional."
              },
              detectedAgent: {
                type: Type.STRING,
                description: "El departamento asignado a responder: 'Recepción', 'Ventas', 'Páginas Web', 'Automatización IA', 'Redes Sociales', 'Soporte' o 'Administrativo'."
              },
              leadUpdates: {
                type: Type.OBJECT,
                description: "Información extraída de la conversación para nutrir el CRM.",
                properties: {
                  customerName: {
                    type: Type.STRING,
                    description: "Nombre propio del cliente si lo menciona u obtienes del contexto."
                  },
                  companyName: {
                    type: Type.STRING,
                    description: "Empresa, tienda o negocio del cliente si fue mencionado."
                  },
                  consultedServices: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Lista ajustada de los servicios de Sinergia en los que se detecta interés."
                  },
                  leadStatus: {
                    type: Type.STRING,
                    description: "El estado sugerido para el CRM: nuevo, interesado, reunión_agendada, cliente_cerrado, soporte."
                  },
                  needsSummary: {
                    type: Type.STRING,
                    description: "Una pequeña frase resumen de lo que ha solicitado."
                  }
                },
                required: ["consultedServices", "leadStatus"]
              },
              transferringAnimation: {
                type: Type.BOOLEAN,
                description: "True si se transfiere a un agente diferente del que estaba atendiendo antes."
              }
            },
            required: ["message", "detectedAgent", "leadUpdates", "transferringAnimation"]
          }
        }
      });

      const outputText = response.text;
      const parsed = JSON.parse(outputText || "{}");
      res.json(parsed);

    } catch (apiError) {
      console.warn("Gemini API call failed (quota limit, invalid key, or network timeout). Falling back gracefully to Sinergia Local Router:", apiError);
      return res.json(getLocalEmulatorResponse());
    }

  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({
      error: "Ocurrió un error al procesar el mensaje con Sinergia AI.",
      details: error.message
    });
  }
});

// Configure Vite middleware in development or serve built files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted successfully (Development Mode).");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static files directory served (Production Mode).");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Sinergia AI Engine] Server available on http://localhost:${PORT}`);
  });
}

startServer();
