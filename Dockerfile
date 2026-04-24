# Stage 1: Instalar solo dependencias de producción
FROM oven/bun:1.3-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# Stage 2: Imagen final mínima
FROM oven/bun:1.3-alpine AS release

# Crear usuario no-root para ejecutar la aplicación
RUN addgroup --gid 65532 hermes && \
    adduser --uid 65532 --ingroup hermes --disabled-password --gecos "" hermes

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copiar solo lo necesario para producción con permisos correctos
COPY --from=prod-deps --chown=hermes:hermes /app/node_modules node_modules
COPY --chown=hermes:hermes src ./src
COPY --chown=hermes:hermes package.json ./

# Cambiar al usuario no-root
USER hermes

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
