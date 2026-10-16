# =============================================================
# STAGE 1: builder – instala dependências e gera build Next.js
# =============================================================
FROM imagens-base.petrobras.dev.br/petro-node24-alpine:latest AS builder

WORKDIR /app

# Dependências primeiro 
COPY package.json package-lock.json ./
COPY .npmrc .npmrc

RUN npm ci --no-audit --no-fund

# Código da aplicação
COPY . .

# Build Next.js (requer output: 'standalone' no next.config.js)
RUN npm run build \
    && test -f .next/standalone/server.js

# =============================================================
# STAGE 2: runner – imagem final mínima de produção
# =============================================================

FROM imagens-base.petrobras.dev.br/petro-node24-alpine:latest AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Segurança: executa como usuário não-root
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copia apenas os artefatos necessários do build (standalone)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
