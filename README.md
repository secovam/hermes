# Hermes

Bot stateless que recibe webhooks del GitHub de **Grupo Secovam** y postea notificaciones en una sala de Campfire.

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Validación:** Zod
- **Linting:** Ultracite (oxlint + oxfmt)

## Eventos soportados

| Evento                                | Condición       | Mensaje                                                 |
| ------------------------------------- | --------------- | ------------------------------------------------------- |
| `push`                                | Rama `main`     | 📝 **repo** · [sha7](url) mensaje — autor               |
| `pull_request.opened`                 | Todas las ramas | 🔀 **repo** · PR [#n título](url) abierto por autor     |
| `pull_request.closed`                 | Mergeado        | ✅ **repo** · PR [#n título](url) mergeado por autor    |
| `pull_request.closed`                 | Sin merge       | ❌ **repo** · PR [#n título](url) cerrado sin merge     |
| `issues.opened`                       | —               | 🐛 **repo** · issue [#n título](url) por autor          |
| `issues.closed`                       | —               | ☑️ **repo** · issue [#n título](url) cerrado            |
| `release.published`                   | —               | 🚀 **repo** · release [tag](url) publicada              |
| `workflow_run.completed`              | Fallo en `main` | 💥 **repo** · workflow [nombre](url) falló en main      |
| `issue_comment.created`               | PR, CodeRabbit  | 💬 **repo** · CodeRabbit comentó en PR [#n título](url) |
| `pull_request_review_comment.created` | CodeRabbit      | 💬 **repo** · CodeRabbit comentó en un archivo del PR   |

Los comentarios de CodeRabbit se publican en `CAMPFIRE_REVIEW_ROOM_URL` con una vista previa breve y el enlace **Ver comentario en GitHub**, que abre el comentario exacto. Si el comentario incluye un `<summary>`, Hermes muestra ese texto; de lo contrario, usa un extracto del cuerpo.

## Variables de entorno

```env
GITHUB_WEBHOOK_SECRET=xxx # secreto del webhook org-level
CAMPFIRE_ROOM_URL=https://campfire.ejemplo.com/rooms/123/bot/abc/messages
CAMPFIRE_REVIEW_ROOM_URL=https://campfire.ejemplo.com/rooms/789/bot/ghi/messages # CodeRabbit y Macroscope
PORT=3000
LOG_LEVEL=info # debug, info, warn, error
```

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
