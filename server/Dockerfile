# Bagimlilik yok: sunucu yalnizca Node'un gomulu http ve node:sqlite
# modullerini kullaniyor. Bu yuzden npm install adimi da yok.
FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app
COPY server.js ./

# Root olarak calistirmiyoruz; /data disaridan monte edilen hacim.
RUN mkdir -p /data && chown -R node:node /app /data
USER node

ENV PORT=8080 DB_DIR=/data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/health || exit 1

CMD ["node", "server.js"]
