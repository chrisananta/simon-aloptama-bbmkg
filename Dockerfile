# syntax=docker/dockerfile:1

##########################
# Stage 1: deps + build  #
##########################
FROM node:20-bookworm-slim AS builder

# bcrypt & prisma engine butuh openssl + toolchain compile native module
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifest dulu supaya layer cache npm install kepakai selama
# package.json/lockfile tidak berubah
COPY package.json package-lock.json ./
COPY simon-backend/prisma ./simon-backend/prisma

# npm ci akan trigger "postinstall" -> prisma generate
# (butuh akses internet ke binaries.prisma.sh saat build image)
RUN npm ci

# Copy seluruh source code
COPY . .

# Build frontend (vite) + bundle server (esbuild) -> ./dist
RUN npm run build


##########################
# Stage 2: runtime image #
##########################
FROM node:20-bookworm-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# node_modules dibawa apa adanya dari builder (termasuk prisma CLI,
# dipakai entrypoint untuk "prisma migrate deploy" saat container start)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/simon-backend/prisma ./simon-backend/prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Jalan sebagai non-root user bawaan image node
USER node

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.cjs"]