import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare, PhoneCall, Terminal, FileCode, Users, Bot,
} from "lucide-react";
import { listWhatsappContacts } from "@/lib/whatsapp.functions";
import { ChatTab } from "@/components/whatsapp/ChatTab";
import { CallsTab } from "@/components/whatsapp/CallsTab";
import { ApiHubTab } from "@/components/whatsapp/ApiHubTab";
import { TemplatesTab } from "@/components/whatsapp/TemplatesTab";
import { CrmTab } from "@/components/whatsapp/CrmTab";
import { AiCopilotTab } from "@/components/whatsapp/AiCopilotTab";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  component: WhatsappPage,
});

type NavTab = "chat" | "calls" | "api_hub" | "templates" | "crm" | "ai_copilot";

const NAV_ITEMS: { id: NavTab; label: string; icon: any }[] = [
  { id: "chat", label: "Chat Live WhatsApp", icon: MessageSquare },
  { id: "calls", label: "Chiamate Admin", icon: PhoneCall },
  { id: "api_hub", label: "Config. Numero & API", icon: Terminal },
  { id: "templates", label: "Modelli HSM Meta", icon: FileCode },
  { id: "crm", label: "Anagrafica Clienti", icon: Users },
  { id: "ai_copilot", label: "Gemini AI Copilot", icon: Bot },
];

function WhatsappPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("chat");

  const fetchContacts = useServerFn(listWhatsappContacts);
  const { data: contacts = [] } = useQuery({
    queryKey: ["admin", "whatsappContacts"],
    queryFn: () => fetchContacts({ data: undefined }),
    refetchInterval: 15000,
  });
  const unreadTotal = contacts.filter((c: any) => c.unread_count > 0 && !c.archived).length;

  return (
    <div className="card-elevated aurora-glow flex h-[80vh] overflow-hidden rounded-xl border border-border">
      {/* Menu laterale, stessa struttura dell'originale */}
      <aside className="flex w-16 shrink-0 flex-col justify-between border-r border-border bg-card/40 md:w-56">
        <nav className="space-y-1 p-2 pt-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = item.id === "chat" ? unreadTotal : undefined;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-all ${
                  isActive
                    ? "border border-primary/30 bg-primary/15 text-primary shadow-[0_0_18px_-6px_rgb(71_188_238_/_45%)]"
                    : "border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden truncate md:inline">{item.label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Contenuto della sezione attiva */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "calls" && <CallsTab />}
        {activeTab === "api_hub" && <ApiHubTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "crm" && <CrmTab />}
        {activeTab === "ai_copilot" && <AiCopilotTab />}
      </div>
    </div>
  );
}
