# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source code
COPY . .

# Set environment variables (can be overridden)
ENV NODE_ENV=production

# Expose port (if needed, e.g. for web server)
# EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
