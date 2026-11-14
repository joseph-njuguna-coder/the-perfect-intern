FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# After you commit package-lock.json, change this to: npm ci --omit=dev
RUN npm install --omit=dev
COPY knexfile.js ./
COPY src ./src
COPY scripts ./scripts
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
