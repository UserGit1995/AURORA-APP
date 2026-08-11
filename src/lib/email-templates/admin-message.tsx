import { Html, Head, Body, Container, Section, Text, Heading, Hr, Link, Preview } from "@react-email/components";
import * as React from "react";

interface AdminMessageEmailProps {
  customerName: string;
  message: string; // testo libero scritto dall'admin (o suggerito dall'IA)
  orderReference?: string; // es. "Ordine #ORD-2026-8812", facoltativo
  trackingUrl?: string;
}

// Stesso stile grafico delle altre email Aurora (order-confirmation.tsx),
// ma per un messaggio libero scritto dall'admin verso un cliente
// specifico — non un modello fisso.
export default function AdminMessageEmail({ customerName, message, orderReference, trackingUrl }: AdminMessageEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Un messaggio da Aurora riguardo al tuo ordine</Preview>
      <Body style={{ backgroundColor: "#f4f6f9", fontFamily: "Arial, sans-serif", padding: "24px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 8, padding: 32, maxWidth: 480 }}>
          <Heading style={{ fontSize: 20, margin: "0 0 8px" }}>Ciao {customerName},</Heading>
          {orderReference && (
            <Text style={{ fontSize: 13, color: "#8b95a8", margin: "0 0 16px" }}>{orderReference}</Text>
          )}
          <Hr style={{ borderColor: "#e6eaf0", margin: "16px 0" }} />
          {message.split("\n").map((line, i) => (
            <Text key={i} style={{ fontSize: 14, margin: "4px 0", color: "#333", whiteSpace: "pre-wrap" }}>{line}</Text>
          ))}
          <Hr style={{ borderColor: "#e6eaf0", margin: "16px 0" }} />
          {trackingUrl && (
            <Text style={{ fontSize: 14, margin: "16px 0 4px" }}>
              <Link href={trackingUrl} style={{ color: "#4da8ff" }}>Vedi lo stato del tuo ordine →</Link>
            </Text>
          )}
          <Text style={{ fontSize: 12, color: "#8b95a8", marginTop: 24 }}>
            Aurora — se hai domande, rispondi pure a questa email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
