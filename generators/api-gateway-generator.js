const fs = require('fs-extra');
const path = require('path');

async function generateApiGateway(includeNginx = false) {
  const gatewayName = 'api-gateway';
  const basePath = path.join(process.cwd(), gatewayName);
  
  // Create directory structure
  await fs.ensureDir(basePath);
  
  // Create Dockerfile
  const dockerfileContent = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
`;
  
  await fs.writeFile(path.join(basePath, 'Dockerfile'), dockerfileContent);
  
  // Create package.json
  const packageJson = {
    name: gatewayName,
    version: '1.0.0',
    description: 'API Gateway for microservices',
    main: 'src/app.js',
    scripts: {
      start: 'node src/app.js',
      dev: 'nodemon src/app.js',
      test: 'jest'
    },
    dependencies: {
      express: '^4.18.2',
      'http-proxy-middleware': '^2.0.6',
      cors: '^2.8.5',
      helmet: '^7.0.0',
      morgan: '^1.10.0',
      dotenv: '^16.3.1',
      'express-rate-limit': '^6.7.0'
    },
    devDependencies: {
      nodemon: '^3.0.1',
      jest: '^29.6.4'
    }
  };
  
  await fs.writeJson(path.join(basePath, 'package.json'), packageJson, { spaces: 2 });
  
  // Create directory structure
  const dirs = [
    'src/config',
    'src/controllers',
    'src/middleware',
    'src/routes',
    'src/services',
    'src/utils',
    'tests'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(basePath, dir));
  }
  
  // Create empty files
  const files = [
    'src/app.js',
    'src/config/server.js',
    'src/config/proxy.js',
    'src/middleware/auth.js',
    'src/middleware/rateLimit.js',
    'src/middleware/validation.js',
    'src/routes/index.js',
    'src/routes/health.js',
    'src/services/serviceDiscovery.js',
    'src/utils/logger.js',
    'tests/app.test.js'
  ];
  
  for (const file of files) {
    await fs.writeFile(path.join(basePath, file), '');
  }
  
  // Create .env file with gateway configuration
  const envContent = `# API Gateway Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Service Discovery
SERVICE_DISCOVERY_TYPE=static

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true
`;
  
  await fs.writeFile(path.join(basePath, '.env'), envContent);
  await fs.writeFile(path.join(basePath, '.env.example'), envContent);
  
  return true;
}

module.exports = generateApiGateway;