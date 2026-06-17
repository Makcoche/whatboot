export type LeadStatus = 'nuevo' | 'interesado' | 'reunión_agendada' | 'cliente_cerrado' | 'soporte';

export interface Lead {
  customerName?: string;
  companyName?: string;
  consultedServices: string[];
  leadStatus: LeadStatus;
  needsSummary?: string;
  phone?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  agentId?: string;
  isPrivate?: boolean;
}

export interface ChatSession {
  id: string;
  clientName: string;
  clientCompany: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  lead: Lead;
  messages: Message[];
  activeAgentId: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'transfer';
  message: string;
  agentName?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  accent: string;
  bgAccent: string;
  emoji: string;
}
