FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && npm config set registry https://registry.npmmirror.com/ && pnpm install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["pnpm", "run", "start", "-p", "3001"]
