FROM node:18-alpine
WORKDIR /app
# Copy package files
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
# Update the dev command to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]