import { Html, Head, Body, Container, Section, Text, Heading, Hr, Link, Preview } from "@react-email/components";
import * as React from "react";

interface OrderConfirmationEmailProps {
  customerName: string;
  summaryLines: string[]; // es. ["Bicchieri PLA 200ml x 5 — € 44,50", ...]
  totalLabel: string; // es. "€ 51,40" o "da definire"
  orderType?: "ordine" | "richiesta di personalizzazione"; // testo variabile in base al contesto
  trackingUrl?: string; // link privato per rivedere lo stato di questo ordine
}

export default function OrderConfirmationEmail({
  customerName,
  summaryLines,
  totalLabel,
  orderType = "ordine",
  trackingUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Il tuo {orderType} è stato ricevuto</Preview>
      <Body style={{ backgroundColor: "#f4f6f9", fontFamily: "Arial, sans-serif", padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 8, padding: 32, maxWidth: 480 }}>
          <Heading style={{ fontSize: 20, margin: "0 0 8px" }}>Grazie, {customerName}!</Heading>
          <Text style={{ fontSize: 14, color: "#333", margin: "0 0 16px" }}>
            Il tuo {orderType} è stato ricevuto correttamente. Ti contatteremo a breve per confermare i dettagli.
          </Text>
          <Hr style={{ borderColor: "#e6eaf0", margin: "16px 0" }} />
          {summaryLines.map((line, i) => (
            <Text key={i} style={{ fontSize: 14, margin: "4px 0", color: "#333" }}>{line}</Text>
          ))}
          <Hr style={{ borderColor: "#e6eaf0", margin: "16px 0" }} />
          <Text style={{ fontSize: 15, fontWeight: "bold", margin: "4px 0" }}>Totale: {totalLabel}</Text>
          {trackingUrl && (
            <Text style={{ fontSize: 14, margin: "16px 0 4px" }}>
              <Link href={trackingUrl} style={{ color: "#4da8ff" }}>Vedi lo stato del tuo {orderType} →</Link>
            </Text>
          )}
          <Text style={{ fontSize: 12, color: "#8b95a8", marginTop: 24 }}>
            Se non hai effettuato tu questa richiesta, puoi ignorare questa email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
