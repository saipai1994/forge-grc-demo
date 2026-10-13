FROM node:22-slim
WORKDIR /app
COPY . .
ENV PORT=8080 FORGE_DATA=/data FORGE_SHOW_DEMO_LOGINS=0
VOLUME /data
EXPOSE 8080
CMD ["node","server/server.js"]
