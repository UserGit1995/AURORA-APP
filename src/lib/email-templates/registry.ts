import NewOrderEmail from "./new-order";
import OrderConfirmationEmail from "./order-confirmation";
import AdminMessageEmail from "./admin-message";

export interface TemplateEntry {
  component: React.FC<any>;
  subject: string | ((data: any) => string);
  displayName?: string;
  previewData?: Record<string, any>;
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  new_order: {
    component: NewOrderEmail,
    subject: (data: any) => `Nuovo ordine da ${data.customerName ?? "un cliente"}`,
    displayName: "Notifica nuovo ordine (admin)",
  },
  order_confirmation: {
    component: OrderConfirmationEmail,
    subject: (data: any) => `Il tuo ${data.orderType ?? "ordine"} è stato ricevuto — Aurora`,
    displayName: "Conferma ordine (cliente)",
  },
  admin_message: {
    component: AdminMessageEmail,
    subject: (data: any) => data.subject || `Un messaggio da Aurora riguardo al tuo ordine`,
    displayName: "Messaggio libero dell'admin al cliente",
  },
};
