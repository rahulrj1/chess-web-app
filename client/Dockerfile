# Frontend Dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy stockfish engine to public folder for Web Worker access
RUN mkdir -p public/stockfish && \
    cp node_modules/stockfish.js/stockfish.js public/stockfish/stockfish.js

# Copy source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Start the React development server
CMD ["npm", "start"]
