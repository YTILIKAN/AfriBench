FROM nginx:1.27-alpine

# Frontend statique servi par nginx ; l'API est proxifiée vers le backend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/ /usr/share/nginx/html/

# Ne pas servir les Dockerfiles / configs nginx comme assets
RUN rm -f /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf

EXPOSE 80
