# ================= Fase 1: Build =================
# Instala dependências e compila o TypeScript para /app/dist
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ================= Fase 2: Produção =================
# Imagem final enxuta: só runtime + build compilado
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "npx typeorm schema:sync -d dist/config/appDataSource.js && node dist/server.js"]
