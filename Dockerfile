# Multi-stage Dockerfile for Promptfoo Test Engine
FROM node:22-alpine

WORKDIR /app

COPY package.json tsconfig.json promptfooconfig.yaml ./
COPY src/ src/
COPY tests/ tests/

RUN node --experimental-strip-types --test tests/promptfoo.test.ts

EXPOSE 8080

CMD ["node", "--experimental-strip-types", "src/cli.ts"]
