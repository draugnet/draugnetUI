FROM nginx:alpine as web

RUN rm -rf /usr/share/nginx/html/*
COPY ./webroot /usr/share/nginx/html