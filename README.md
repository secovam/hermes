# Hermes

Bot stateless que recibe webhooks del GitHub de **Grupo Secovam** y notificaciones de despliegue de Dokploy, y los postea en salas de Campfire.

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

Los comentarios de CodeRabbit se publican en `CAMPFIRE_REVIEW_ROOM_URL`. El resto de eventos de GitHub sigue yendo a `CAMPFIRE_ROOM_URL`.

Las notificaciones de despliegue llegan a `POST /dokploy` y se publican en `CAMPFIRE_DOKPLOY_ROOM_URL` (✅ éxito, ❌ error).

## Variables de entorno

Se validan al arrancar en `src/env.ts`. Si falta una obligatoria, el proceso no inicia y el error aparece en los logs de Dokploy.

```env
GITHUB_WEBHOOK_SECRET=xxx # obligatoria; secreto del webhook org-level
CAMPFIRE_ROOM_URL=https://campfire.ejemplo.com/rooms/123/bot/abc/messages # obligatoria; actividad de GitHub
CAMPFIRE_DOKPLOY_ROOM_URL=https://campfire.ejemplo.com/rooms/456/bot/def/messages # opcional; despliegues de Dokploy
CAMPFIRE_REVIEW_ROOM_URL=https://campfire.ejemplo.com/rooms/789/bot/ghi/messages # opcional; comentarios de CodeRabbit
PORT=3000
LOG_LEVEL=info # debug, info, warn, error
```

Si falta una sala opcional, solo fallan los avisos que dependen de ella.

### Obtener la URL de una sala de Campfire

1. En Campfire, crea un bot y agrégalo a la sala que recibirá los avisos ([guía de bots](https://github.com/basecamp/campfire-bot-kit)).
2. Copia la URL de publicación del bot para esa sala. Incluye la clave del bot: trátala como una contraseña.
3. Puedes usar la misma URL en varias variables para concentrar todos los avisos en una sala.

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

2. **Configurar variables de entorno** en el servicio de Hermes → Environment (ver sección anterior) y redesplegar.

3. **Crear webhook org-level en GitHub:**
   - Ir a: https://github.com/organizations/Secovam/settings/hooks
   - Payload URL: `https://hermes.tudominio.com/webhook`
   - Content type: `application/json`
   - Secret: el mismo valor de `GITHUB_WEBHOOK_SECRET`
   - Eventos: `push`, `pull_request`, `pull_request_review_comment`, `issue_comment`, `issues`, `release`, `workflow_run`

4. **Notificaciones de Dokploy:**
   - En Dokploy → Notifications, crea una notificación de tipo webhook.
   - URL: `https://hermes.tudominio.com/dokploy`

5. **Verificar:**
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
