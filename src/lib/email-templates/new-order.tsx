import { Html, Head, Body, Container, Heading, Text, Hr, Link } from "@react-email/components";
import React from "react";

interface NewOrderEmailProps {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  totalAmount: string;
  orderUrl: string;
}

// Email di notifica per l'ADMIN quando arriva un nuovo ordine/richiesta.
export default function NewOrderEmail({
  customerName,
  customerEmail,
  customerPhone,
  productName,
  quantity,
  totalAmount,
  orderUrl,
}: NewOrderEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f4f6f9", fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px", maxWidth: "480px" }}>
          <Heading style={{ fontSize: "20px", color: "#0d1017" }}>Nuovo ordine ricevuto</Heading>
          <Text style={{ color: "#333", fontSize: "14px" }}>
            Hai ricevuto una nuova richiesta su Aurora.
          </Text>
          <Hr style={{ borderColor: "#e6eaf0" }} />
          <Text style={{ fontSize: "14px", margin: "4px 0" }}><strong>Cliente:</strong> {customerName}</Text>
          <Text style={{ fontSize: "14px", margin: "4px 0" }}><strong>Email:</strong> {customerEmail}</Text>
          <Text style={{ fontSize: "14px", margin: "4px 0" }}><strong>Telefono:</strong> {customerPhone}</Text>
          <Hr style={{ borderColor: "#e6eaf0" }} />
          <Text style={{ fontSize: "14px", margin: "4px 0" }}><strong>Ordine:</strong> {productName}</Text>
          <Text style={{ fontSize: "14px", margin: "4px 0" }}><strong>Quantità totale:</strong> {quantity}</Text>
          <Text style={{ fontSize: "16px", margin: "8px 0", fontWeight: "bold", color: "#4da8ff" }}>
            Totale: € {totalAmount}
          </Text>
          <Hr style={{ borderColor: "#e6eaf0" }} />
          <Link href={orderUrl} style={{ fontSize: "14px", color: "#4da8ff" }}>
            Apri il dettaglio nel pannello admin →
          </Link>
        </Container>
      </Body>
    </Html>
  );
}
