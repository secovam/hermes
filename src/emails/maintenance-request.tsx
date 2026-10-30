/* @jsxImportSource react */

import {
  Body,
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

// Mirrors Kerberos' quotation email (apps/server/src/emails/quotation.tsx).
export const MAINTENANCE_SUBJECT = "Solicitud recibida";

// Inline (CID) attachment so the logo needs no public URL; see Resend's embed-inline-images docs.
export const MAINTENANCE_LOGO = {
  content: readFileSync(new URL("logo-grupo-secovam.png", import.meta.url)).toString("base64"),
  content_id: "logo-grupo-secovam",
  content_type: "image/png",
  filename: "logo-grupo-secovam.png",
};

const TITLE = "SOLICITUD DE MANTENIMIENTO";
const BODY = "Se ha solicitado mantenimiento de equipo, será revisado lo antes posible tu folio es";

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

const MaintenanceRequestEmail = ({ folio }: { folio: string }) => (
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
    <Preview>{`${BODY} ${folio}.`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          alt="Grupo Secovam"
          src={`cid:${MAINTENANCE_LOGO.content_id}`}
          style={logo}
          width={200}
        />

        <Heading as="h2" style={heading}>
          {TITLE}
        </Heading>

        <Text style={{ ...text, marginBottom: "10px" }}>{BODY}</Text>

        <Text style={folioText}>{folio}</Text>
      </Container>
    </Body>
  </Html>
);

export const maintenanceEmailText = (folio: string) => `${TITLE}\n\n${BODY} ${folio}.`;

export const renderMaintenanceEmail = (folio: string) =>
  render(<MaintenanceRequestEmail folio={folio} />);
