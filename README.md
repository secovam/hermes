# Hermes

Hermes recibe webhooks de GitHub y Dokploy de **Grupo Secovam** y publica avisos en Campfire. También recibe altas de AppSheet, envía un acuse por Resend y avisa en una sala exclusiva cuando Resend acepta el correo. AppSheet usa un ledger SQLite persistente. GitHub y Dokploy siguen sin estado persistente.

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Validación:** Zod
- **Linting:** Ultracite (oxlint + oxfmt)

## Eventos soportados

| Evento                                | Condición                  | Mensaje                                                       |
| ------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `push`                                | Rama `main`                | 📝 **repo** · [sha7](url) mensaje — autor                     |
| `pull_request.opened`                 | Todas las ramas            | 🔀 **repo** · PR [#n título](url) abierto por autor           |
| `pull_request.closed`                 | Mergeado                   | ✅ **repo** · PR [#n título](url) mergeado por autor          |
| `pull_request.closed`                 | Sin merge                  | ❌ **repo** · PR [#n título](url) cerrado sin merge           |
| `issues.opened`                       | —                          | 🐛 **repo** · issue [#n título](url) por autor                |
| `issues.closed`                       | —                          | ☑️ **repo** · issue [#n título](url) cerrado                  |
| `release.published`                   | —                          | 🚀 **repo** · release [tag](url) publicada                    |
| `workflow_run.completed`              | Fallo en `main` o en un PR | 💥 **repo** · workflow [nombre](url) falló en main o en PR #n |
| `issue_comment.created`               | PR, CodeRabbit             | 💬 **repo** · CodeRabbit comentó en PR [#n título](url)       |
| `pull_request_review_comment.created` | CodeRabbit                 | 💬 **repo** · CodeRabbit comentó en un archivo del PR         |

Los comentarios de CodeRabbit se publican en `CAMPFIRE_REVIEW_ROOM_URL` con una vista previa breve y el enlace **Ver comentario en GitHub**, que abre el comentario exacto. Si el comentario incluye un `<summary>`, Hermes muestra ese texto; de lo contrario, usa un extracto del cuerpo.

## Variables de entorno

```env
GITHUB_WEBHOOK_SECRET=xxx # secreto del webhook org-level
CAMPFIRE_ROOM_URL=https://campfire.ejemplo.com/rooms/123/bot/abc/messages
CAMPFIRE_CI_ROOM_URL=https://campfire.ejemplo.com/rooms/456/bot/def/messages # fallos de CI en main y PR
CAMPFIRE_REVIEW_ROOM_URL=https://campfire.ejemplo.com/rooms/789/bot/ghi/messages # CodeRabbit y Macroscope
PORT=3000
LOG_LEVEL=info # debug, info, warn, error
```

Hermes envía una notificación por cada ejecución fallida de un workflow en `main` o asociada a un PR. Configura `CAMPFIRE_CI_ROOM_URL` para la sala dedicada de CI. Si falta, Hermes devuelve un error para ese webhook.

Los workflows disparados por `pull_request` o `pull_request_target` también se incluyen cuando GitHub no adjunta números de PR. En ese caso, el aviso identifica la rama del PR.

## Desarrollo local

```sh
# Instalar dependencias
bun install

# Desarrollo con hot reload
bun run dev

# Verificar código
bun run check

# Formatear código
bun run fix
```

## AppSheet y Resend

`POST /appsheet` requiere `Authorization: Bearer <APPSHEET_WEBHOOK_TOKEN>` incluso en desarrollo. Solo acepta la app y tabla configuradas. `/webhook` sigue reservado para GitHub.

```json
{
  "appId": "appsheet-app-id",
  "table": "Solicitudes",
  "event": "record.created",
  "recordId": "MTTO-00042",
  "email": "persona@example.com",
  "name": "Ana"
}
```

El objeto es estricto y el límite del cuerpo es 16 KiB, incluso sin `Content-Length`. `appId`, `table` y `recordId` admiten de 1 a 200 caracteres. `email` debe ser válido y tener como máximo 254 caracteres. `name` admite hasta 200 y puede estar vacío. No se aceptan campos para asunto, remitente, HTML ni enlaces.

El asunto fijo es `Solicitud recibida`. El correo lleva el título `SOLICITUD DE MANTENIMIENTO` y el texto `Se ha solicitado mantenimiento de equipo, será revisado lo antes posible tu folio es <recordId>.`, por lo que `recordId` debe ser el folio de la solicitud, por ejemplo `MTTO-00042`. La versión HTML sigue el estilo de los correos de Kerberos con React Email (`src/emails/maintenance-request.tsx`). `name` no aparece en el correo.

### Configuración

Las siete variables son obligatorias para esta ruta. Si alguna falta o es inválida, responde `503` sin efectos. Las demás integraciones siguen disponibles.

| Variable                  | Uso                                                |
| ------------------------- | -------------------------------------------------- |
| `APPSHEET_WEBHOOK_TOKEN`  | Token privado compartido con el bot AppSheet.      |
| `APPSHEET_APP_ID`         | ID exacto de la app autorizada.                    |
| `APPSHEET_TABLE`          | Nombre exacto de la tabla autorizada.              |
| `RESEND_API_KEY`          | Clave con permiso de envío en Resend.              |
| `RESEND_FROM`             | Remitente del dominio verificado en Resend.        |
| `APPSHEET_DB_PATH`        | Ruta absoluta, por ejemplo `/data/hermes.sqlite`.  |
| `CAMPFIRE_EMAIL_ROOM_URL` | URL HTTPS del bot de la sala exclusiva de correos. |

El aviso dice `Correo aceptado para envío` e identifica destinatario, asunto, app, tabla, ID del registro y `resend_id`. No contiene el cuerpo del correo. La sala es obligatoria y nunca se sustituye por la general. Sus miembros deben estar autorizados para ver direcciones de correo. `accepted` significa que Resend aceptó la petición, no que el buzón recibió el correo.

### Preparar la activación

Estos pasos son posteriores a la implementación local y requieren autorización de producción. Esta entrega no activa bots ni envía mensajes reales.

1. Verifica el dominio y remitente en Resend y provisiona su clave de envío. Revisa destinatario y texto del acuse con negocio.
2. Crea una sala exclusiva en Campfire, limita sus miembros y configura su bot. Guarda la URL como `CAMPFIRE_EMAIL_ROOM_URL`.
3. Configura las siete variables en Dokploy mediante su gestor de secretos. Comparte secretos solo por el mecanismo seguro de la sesión, nunca por chat ni git.
4. Monta un volumen persistente en `/data` para una sola instancia de Hermes. Usa `APPSHEET_DB_PATH=/data/hermes.sqlite`. El usuario del contenedor tiene UID y GID `65532`. Un bind mount debe ser escribible por ese usuario y tener permisos `0700` en el directorio. La imagen prepara `/data` con esos permisos.
5. En AppSheet, crea un bot para **Adds** en la tabla autorizada. Elige evento **App** para altas mediante la app o **AppSheet database** para cambios directos en esa base. Un cambio directo en otra fuente externa puede requerir configuración adicional. Consulta los [eventos de AppSheet](https://support.google.com/appsheet/answer/11445188?hl=en).
6. Añade una tarea **Call a webhook**, preset **Custom**, verbo **POST**, contenido **JSON**, URL `https://<host-hermes>/appsheet` y header `Authorization: Bearer <token>`. Usa el contrato anterior para el body. Consulta la [configuración oficial de webhooks](https://support.google.com/appsheet/answer/11511244?hl=en).
7. Vincula `recordId` a la clave permanente de la fila. Nunca uses `NOW()`, número de fila o un `UNIQUEID()` nuevo por intento. Conserva también `email` y `name` entre reintentos de la misma alta.
8. Verifica el JSON expandido antes de habilitar el bot. Escapa comillas como `\"`, barras inversas como `\\`, y saltos de línea como `\n`. No concatentes valores sin escape. Un nombre con comillas y salto debe producir JSON como `"name": "Ana \"López\"\nPérez"`. No apliques doble escape si AppSheet ya serializa el valor. La verificación local cubrió estos caracteres en Hermes, no la expansión de una plantilla AppSheet real.
9. Mantén el reloj del host sincronizado. Configura un timeout del proxy y webhook superior a los dos envíos de hasta 20 segundos cada uno. Hermes usa un timeout de inactividad de 60 segundos.

### Deduplicación y respuestas

La identidad es el SHA-256 completo de `JSON.stringify([appId, table, event, recordId])`. La clave del proveedor es `appsheet/<hash>`. Un segundo SHA-256 de `JSON.stringify([email, name])` detecta cambios de datos para esa identidad. Un nuevo `recordId` produce un nuevo correo y aviso.

Antes de enviar, SQLite conserva el JSON exacto de Resend. Todo reintento reutiliza esos bytes, aunque cambien remitente o plantilla. Un lease de 60 segundos reserva el correo a un propietario. Los reintentos inciertos solo se permiten antes de 23 horas desde el primer intento, que nunca se reinicia. Resend documenta una ventana de idempotencia de 24 horas. El margen depende de un reloj correcto. Véase [idempotencia en Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).

Tras persistir `accepted` y `resend_id`, Hermes reserva el aviso con `pending -> sending`. Solo quien reserva publica en Campfire. Un correo aceptado nunca se repite, tampoco días después. Si el proceso cae antes de reservar el aviso, el próximo webhook publica solo ese aviso. Una reserva `sending` o `uncertain` nunca se libera por antigüedad.

| HTTP                          | Resultado                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `200 processed`               | Correo aceptado y aviso confirmado como publicado.                                                            |
| `200 already_processed`       | Ambos efectos ya estaban confirmados. Sin nuevos envíos.                                                      |
| `400` / `401` / `403` / `413` | JSON o payload inválido, token inválido, origen no autorizado o exceso de cuerpo. Sin efectos.                |
| `409 payload_conflict`        | Misma identidad con distinto email o nombre. Sin nuevos efectos.                                              |
| `409 needs_review`            | Rechazo previo, conflicto del proveedor, correo incierto fuera de ventana o aviso reservado sin confirmación. |
| `502 email_not_confirmed`     | Respuesta incierta o rechazo definitivo de Resend. Un rechazo queda bloqueado para revisión.                  |
| `502 campfire_not_confirmed`  | Correo aceptado, aviso incierto. El próximo webhook requiere revisión y no repite efectos.                    |
| `503`                         | Configuración o DB no disponible, lease vigente, rate limit o petición concurrente del proveedor.             |

No hay worker ni cola. Revisa **AppSheet Monitor** y los logs cuando se agoten los reintentos. La verificación local simuló idempotencia del proveedor y contó solicitudes por separado de las aceptaciones. No probó idempotencia externa, entrega SMTP ni publicación real. Los archivos de pruebas se retiraron por decisión del usuario.

### Conservar y conciliar el ledger

SQLite usa WAL, `synchronous=FULL`, consultas parametrizadas y transacciones cortas sin esperar red. El archivo se crea con permisos `0600` porque guarda datos personales. Protege también el directorio, backups y archivos WAL y SHM. `.gitignore` y `.dockerignore` excluyen `data/`, `.sqlite*`, `.db`, `.db-wal` y `.db-shm`; conserva estos nombres para archivos y copias locales.

No hay TTL. Perder el volumen o restaurar una copia antigua puede repetir correos y avisos. Usa la API de backup consistente de SQLite o detén Hermes antes de copiar el conjunto de archivos de la base. No copies únicamente el archivo principal de una base activa en WAL. Conserva la copia protegida fuera del repositorio.

Para un `needs_review`, correlaciona el `key` de los logs con `notifications.key`, `payload_hash`, `first_attempt_at`, `resend_id` y los estados. Inspecciona la base de forma local y restringida, sin volcar cuerpos ni credenciales en logs. Los timestamps se expresan en milisegundos Unix.

1. Detén entradas AppSheet y espera a que no haya peticiones en curso. Obtén un backup consistente antes de cualquier modificación.
2. Para un correo incierto, busca evidencia de aceptación en Resend usando la clave `appsheet/<key>`, destinatario y hora original. Solo evidencia verificable permite confirmar `accepted`, su ID y el HTML determinista del aviso. Si no hay evidencia, mantén el bloqueo. No inventes una nueva clave ni reinicies la fecha del primer intento.
3. Para un aviso incierto, busca en la sala dedicada por ID del registro y `resend_id`. Si existe, una operación revisada puede confirmar `posted`. Si no se encuentra, eso no demuestra ausencia. Conserva la reserva hasta acordar una operación concreta y autorizada.
4. Prepara y revisa cada actualización con condiciones sobre clave, hash y estado esperado. No ejecutes resets genéricos. Hermes no expone un endpoint público de recuperación ni borra reservas automáticamente.

El ledger evita reintentos ciegos. Un aviso incierto puede faltar hasta la conciliación manual. No garantiza entrega exactamente una vez.

## Despliegue (Dokploy)

1. **Crear servicio en Dokploy:**
   - Tipo: Docker
   - Dockerfile: `Dockerfile`
   - Puerto: `3000`

2. **Configurar variables de entorno** en Dokploy (ver sección anterior)

3. **Crear webhook org-level en GitHub:**
   - Ir a: https://github.com/organizations/Secovam/settings/hooks
   - Payload URL: `https://hermes.tudominio.com/webhook`
   - Content type: `application/json`
   - Secret: el mismo valor de `GITHUB_WEBHOOK_SECRET`
   - Eventos: `push`, `pull_request`, `pull_request_review_comment`, `issue_comment`, `issues`, `release`, `workflow_run`

4. **Verificar:**
   - Hacer un commit a `main` en un repo de Secovam
   - Debería aparecer el mensaje en Campfire

## Testing local con ngrok

```sh
# Terminal 1: iniciar servidor
bun run dev

# Terminal 2: exponer con ngrok
ngrok http 3000

# Configurar webhook en GitHub apuntando a la URL de ngrok
```

## Logs

Los logs están en formato JSON estructurado (wide events):

```json
{
  "level": "info",
  "timestamp": "2026-04-23T...",
  "msg": "webhook completed",
  "event": "push",
  "repo": "secovam/repo",
  "action": null,
  "delivery_id": "abc123",
  "duration_ms": 150,
  "status": "success"
}
```
