# Stage 1: build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: serve with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: serve SPA and forward /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 18080
CMD ["nginx", "-g", "daemon off;"]
