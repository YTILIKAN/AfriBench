FROM node:20-alpine AS build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine

# PORT : injecté par Railway (8080 en local). BACKEND_URL : upstream de l'API.
# NGINX_ENVSUBST_FILTER limite la substitution aux seules variables du template
# (sinon envsubst viderait les variables nginx comme $host).
ENV PORT=8080 \
    BACKEND_URL=http://backend:8080 \
    NGINX_ENVSUBST_FILTER=^(PORT|BACKEND_URL)$

COPY frontend/docker-entrypoint.d/15-backend-resolver.sh /docker-entrypoint.d/15-backend-resolver.sh
RUN chmod +x /docker-entrypoint.d/15-backend-resolver.sh

COPY frontend/nginx.template.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/frontend/dist /usr/share/nginx/html/

EXPOSE 8080
