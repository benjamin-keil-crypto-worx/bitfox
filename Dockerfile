FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++ git

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

RUN mkdir -p logs

ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "trade-live.js"]
