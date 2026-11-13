/* @jsxImportSource react */

import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from "@react-email/components";
import { readFileSync } from "node:fs";
import { render } from "@react-email/render";

// Inline (CID) attachment so the logo needs no public URL; see Resend's embed-inline-images docs.
export const MAINTENANCE_LOGO = {
  content: readFileSync(new URL("logo-grupo-secovam.png", import.meta.url)).toString("base64"),
  content_id: "logo-grupo-secovam",
  content_type: "image/png",
  filename: "logo-grupo-secovam.png",
};

export type MaintenanceEvent =
  | { event: "record.created"; recordId: string }
  | { event: "maintenance.started"; recordId: string }
  | { event: "maintenance.finished"; recordId: string }
  | { event: "approval.confirmed"; recordId: string; reportUrl: string }
  | { event: "approval.rejected"; recordId: string; reason: string };

// Each email reads: lead, folio highlighted, then tail. Texts come from "Contenido de correos MTTO".
const COPY: Record<
  MaintenanceEvent["event"],
  { subject: (folio: string) => string; title: string; lead: string; tail?: string }
> = {
  "approval.confirmed": {
    lead: "El mantenimiento de tu equipo con folio",
    subject: () => "Visto bueno confirmado",
    tail: "ha sido finalizado totalmente. En el enlace encontrarás los detalles del reporte y del mantenimiento realizado. Saludos.",
    title: "VISTO BUENO CONFIRMADO",
  },
  "approval.rejected": {
    lead: "El visto bueno del mantenimiento de tu equipo con folio",
    subject: (folio) => `Visto bueno rechazado - ${folio}`,
    tail: "fue rechazado por el siguiente motivo:",
    title: "VISTO BUENO RECHAZADO",
  },
  "maintenance.finished": {
    lead: "Hola, el mantenimiento de tu equipo con folio",
    subject: (folio) => `Mantenimiento terminado - ${folio}`,
    tail: "ha sido terminado. Esperamos tu confirmación de Vo. Bo.",
    title: "MANTENIMIENTO TERMINADO",
  },
  "maintenance.started": {
    lead: "El mantenimiento de tu equipo con folio",
    subject: () => "Mantenimiento iniciado",
    tail: "ha sido iniciado, nos pondremos en contacto para darte más detalles.",
    title: "MANTENIMIENTO INICIADO",
  },
  "record.created": {
    lead: "Se ha solicitado mantenimiento de equipo, será revisado lo antes posible tu folio es",
    subject: () => "Solicitud recibida",
    title: "SOLICITUD DE MANTENIMIENTO",
  },
};

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "Roboto, Verdana, sans-serif",
  padding: "20px",
};

const container = {
  backgroundColor: "#ffffff",
  borderRadius: "5px",
  maxWidth: "600px",
  padding: "30px",
};

const logo = { height: "auto", marginBottom: "24px", maxWidth: "200px" };

const heading = { color: "#333333", fontSize: "24px", marginBottom: "20px" };

const text = { color: "#333333", fontSize: "16px", lineHeight: "1.6" };

const folioText = {
  color: "#009f4d",
  fontSize: "18px",
  fontWeight: "bold",
  lineHeight: "1.6",
  marginBottom: "10px",
  marginTop: "0",
};

const reasonText = {
  ...text,
  backgroundColor: "#f6f9fc",
  borderLeft: "4px solid #009f4d",
  padding: "12px 16px",
  whiteSpace: "pre-wrap" as const,
};

const button = {
  backgroundColor: "#009f4d",
  borderRadius: "5px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "12px 20px",
};

const MaintenanceEmail = ({ payload }: { payload: MaintenanceEvent }) => {
  const copy = COPY[payload.event];
  return (
    <Html lang="es">
      <Head>
        <Font
          fallbackFontFamily="Verdana"
          fontFamily="Roboto"
          fontStyle="normal"
          fontWeight={400}
          webFont={{
            format: "woff2",
            url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxK.woff2",
          }}
        />
        <Font
          fallbackFontFamily="Verdana"
          fontFamily="Roboto"
          fontStyle="normal"
          fontWeight={700}
          webFont={{
            format: "woff2",
            url: "https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxK.woff2",
          }}
        />
      </Head>
      <Preview>{`${copy.lead} ${payload.recordId}${copy.tail ? ` ${copy.tail}` : "."}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            alt="Grupo Secovam"
            src={`cid:${MAINTENANCE_LOGO.content_id}`}
            style={logo}
            width={200}
          />

          <Heading as="h2" style={heading}>
            {copy.title}
          </Heading>

          <Text style={{ ...text, marginBottom: "10px" }}>{copy.lead}</Text>

          <Text style={folioText}>{payload.recordId}</Text>

          {copy.tail && <Text style={text}>{copy.tail}</Text>}

          {payload.event === "approval.rejected" && (
            <>
              <Text style={reasonText}>{payload.reason}</Text>
              <Text style={text}>Revisaremos el caso y nos pondremos en contacto contigo.</Text>
            </>
          )}

          {payload.event === "approval.confirmed" && (
            <Button href={payload.reportUrl} style={button}>
              Ver reporte
            </Button>
          )}
        </Container>
      </Body>
    </Html>
  );
};

const plainText = (payload: MaintenanceEvent) => {
  const copy = COPY[payload.event];
  const lines = [
    copy.title,
    "",
    `${copy.lead} ${payload.recordId}${copy.tail ? ` ${copy.tail}` : "."}`,
  ];
  if (payload.event === "approval.rejected") {
    lines.push("", payload.reason, "", "Revisaremos el caso y nos pondremos en contacto contigo.");
  }
  if (payload.event === "approval.confirmed") {
    lines.push("", `Ver reporte: ${payload.reportUrl}`);
  }
  return lines.join("\n");
};

export const renderMaintenanceEmail = async (payload: MaintenanceEvent) => ({
  html: await render(<MaintenanceEmail payload={payload} />),
  subject: COPY[payload.event].subject(payload.recordId),
  text: plainText(payload),
});
