# Starter support bot: a plain node:http server compiled from TypeScript.
# The server reads PORT and listens on 0.0.0.0. It has no runtime dependencies,
# so the runtime stage only needs the compiled dist/ folder and package.json.

# ---- build: full install, type-check, compile -------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/
RUN npm run build

# ---- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
CMD ["node", "dist/server.js"]
