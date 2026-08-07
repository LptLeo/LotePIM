# ================= Fase 1: Build =================
# Instala dependências e gera o build estático em /app/dist/frontend/browser
FROM node:22-alpine AS build
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ================= Fase 2: Servidor web =================
# Imagem final: nginx servindo os arquivos estáticos (com SPA fallback)
FROM nginx:1.27-alpine AS server
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
