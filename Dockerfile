FROM node:20

# Install Playwright system dependencies using playwright's script
RUN apt-get update && apt-get install -y \
    curl \
    && npx playwright install-deps \
    && apt-get clean

# Install additional common dependencies as a fallback
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    fonts-liberation \
    && apt-get clean

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Install Playwright browsers with verbose output
RUN npm run postinstall && echo "Playwright browsers installed successfully" || echo "Playwright browser installation failed"

# Expose port 3000
EXPOSE 3131

# Start the application
CMD ["npm", "start"]