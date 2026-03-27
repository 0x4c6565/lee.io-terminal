FROM nginx:1.29.7-alpine

COPY css/ /usr/share/nginx/html/css
COPY js/ /usr/share/nginx/html/js
COPY index.html /usr/share/nginx/html/index.html