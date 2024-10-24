# Frontend Dockerfile
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json /app/
RUN npm install

# Copy the rest of the frontend code
COPY . /app

# Expose port 5173 for the React app
EXPOSE 5173

# Command to run the React app
CMD ["npm", "run", "dev"]
