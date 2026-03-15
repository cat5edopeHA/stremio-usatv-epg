FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src/ ./src/

ENV PORT=7001
EXPOSE 7001

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
    CMD node -e "fetch('http://localhost:7001/manifest.json').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
