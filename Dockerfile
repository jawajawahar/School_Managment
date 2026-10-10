# One image for the whole web system: the Express API serves the built React
# portal, so the browser and the API share a single origin and no API URL has
# to be configured anywhere.

# ---- Stage 1: build the web portal ----
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html tsconfig.json vite.config.ts postcss.config.js tailwind.config.js ./
COPY public ./public
COPY src ./src
# Same-origin by default. Override only if the API lives on another host.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---- Stage 2: API server + built portal ----
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=5000 \
    WEB_DIST_DIR=/app/dist
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=web /app/dist /app/dist
# The WhatsApp session is rewritten at runtime, so the app user must own it.
RUN mkdir -p baileys_auth_info && chown -R node:node /app
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "index.js"]
