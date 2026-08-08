# ================= Fase 1: Build do backend =================
FROM node:22-alpine AS backend-build
WORKDIR /app/backend
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npm run build

# ================= Fase 2: Build do frontend =================
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ================= Fase 3: Produção =================
# Backend (Express) serve a API e o build estático do frontend
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY --from=backend-build /app/backend/package.json ./
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=frontend-build /app/frontend/dist/frontend/browser ./public
EXPOSE 3000
CMD ["sh", "-c", "npx typeorm schema:sync -d dist/config/appDataSource.js && node dist/server.js"]
