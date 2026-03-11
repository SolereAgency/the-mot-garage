FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g tsx
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["tsx", "server.ts"]