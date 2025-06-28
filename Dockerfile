FROM node:12-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directory for file storage
RUN mkdir -p /tmp/files_manager

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "run", "start-server"]