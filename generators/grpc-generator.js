const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');

const { sanitizeFileName, validateMicroserviceName } = require('../utils/security');

async function generateGrpcMicroservice(serviceName, databaseType = 'mongodb', includeRedis = true) {
  const microserviceName = `${serviceName}-grpc-microservice`;
  const basePath = path.join(process.cwd(), microserviceName);

  // Validate service name
  validateMicroserviceName(serviceName);
  
  // Sanitize for file names
  const sanitizedName = sanitizeFileName(serviceName);
  
  // Ask for Node.js image version for Dockerfile
  const { nodeImage } = await inquirer.prompt([{
    type: 'input',
    name: 'nodeImage',
    message: `Node.js image for ${serviceName} Dockerfile (default: 24-alpine):`,
    default: '24-alpine'
  }]);
  
  // Create directory structure
  await fs.ensureDir(basePath);

  // Add database-specific environment variables
  const envContent = `# ${serviceName} Microservice Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database Configuration
DB_HOST=${serviceName}-db
DB_PORT=${databaseType === 'mongodb' ? '27017' : databaseType === 'postgres' ? '5432' : '3306'}
DB_NAME=${serviceName}_db
DB_USER=user
DB_PASSWORD=password

# Redis Configuration
${includeRedis ? `REDIS_HOST=${serviceName}-redis
REDIS_PORT=6379` : '# REDIS_HOST=redis\n# REDIS_PORT=6379'}
`;

  await fs.writeFile(path.join(basePath, '.env'), envContent);
  await fs.writeFile(path.join(basePath, '.env.example'), envContent);
  
  
  // Create Dockerfile
  const dockerfileContent = `FROM node:${nodeImage}

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY proto/ ./proto/
COPY src/ ./src/

EXPOSE 50051

CMD ["npm", "start"]
`;
  
  await fs.writeFile(path.join(basePath, 'Dockerfile'), dockerfileContent);
  
  // Create other files (empty)
  await fs.writeFile(path.join(basePath, '.dockerignore'), 'node_modules\nnpm-debug.log\n.env');
  await fs.writeFile(path.join(basePath, '.env'), '');
  await fs.writeFile(path.join(basePath, '.env.example'), '');
  await fs.writeFile(path.join(basePath, '.gitignore'), 'node_modules/\n.env\n.DS_Store\nlogs/\n*.log');
  
  // Create package.json
  const packageJson = {
    name: microserviceName,
    version: '1.0.0',
    description: `${serviceName} gRPC microservice`,
    main: 'src/server.js',
    scripts: {
      start: 'node src/server.js',
      dev: 'nodemon src/server.js',
      'generate:proto': 'grpc_tools_node_protoc --js_out=import_style=commonjs,binary:. --grpc_out=. --plugin=protoc-gen-grpc=./node_modules/.bin/grpc_tools_node_protoc_plugin proto/${serviceName}.proto',
      test: 'jest'
    },
    dependencies: {
      '@grpc/grpc-js': '^1.8.0',
      '@grpc/proto-loader': '^0.7.8',
      'google-protobuf': '^3.21.2'
    },
    devDependencies: {
      'grpc-tools': '^1.12.4',
      nodemon: '^3.0.1',
      jest: '^29.6.4'
    }
  };
  
  await fs.writeFile(
    path.join(basePath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create directory structure
  const dirs = [
    'proto',
    'src/config',
    'src/handlers',
    'src/services',
    'src/utils',
    'tests'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(basePath, dir));
  }
  
  // Create empty files
  const files = [
    `proto/${serviceName}.proto`,
    'src/server.js',
    'src/client.js',
    'src/config/grpc.js',
    `src/handlers/${serviceName}.handler.js`,
    `src/services/${serviceName}.service.js`,
    'src/utils/logger.js',
    'src/utils/helpers.js',
    `tests/${serviceName}.test.js`,
    'tests/server.test.js',
    'tests/client.test.js'
  ];
  
  for (const file of files) {
    await fs.writeFile(path.join(basePath, file), '');
  }
  
  return true;
}

module.exports = generateGrpcMicroservice;