const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');

const { sanitizeFileName, validateMicroserviceName } = require('../utils/security');

const templateLoader = require('../utils/template-loader');


async function generateGrpcMicroservice(serviceName, databaseType, includeRedis) {
  // Validate service name
  validateMicroserviceName(serviceName);

  // Sanitize for file names
  const sanitizedServiceName = sanitizeFileName(serviceName);
  
  const microserviceName = `${sanitizedServiceName}-grpc-microservice`;
  const basePath = path.join(process.cwd(), microserviceName);

  // Ask for Node.js image version for Dockerfile
  const { nodeImage } = await inquirer.prompt([{
    type: 'input',
    name: 'nodeImage',
    message: `Node.js image for ${sanitizedServiceName} Dockerfile (default: 24-alpine):`,
    default: '24-alpine'
  }]);
  
  // Create directory structure
  await fs.ensureDir(basePath);

  // Use template for .env
  const envContent = await templateLoader.renderTemplate('env', {
    serviceName,
    port: 3000,
    dbHost: `${sanitizedServiceName}-db`,
    dbPort: databaseType === 'mongodb' ? '27017' : databaseType === 'postgres' ? '5432' : '3306',
    dbName: `${sanitizedServiceName}_db`,
    dbUser: 'user',
    dbPassword: 'password',
    includeRedis,
    redisHost: includeRedis ? `${sanitizedServiceName}-redis` : 'redis'
  });

  await fs.writeFile(path.join(basePath, '.env'), envContent);
  await fs.writeFile(path.join(basePath, '.env.example'), envContent);

  const dockerfileContent = await templateLoader.renderTemplate('dockerfile', {
    nodeVersion: versions.node,
    port: 50051
  });
  
    
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
    description: `${sanitizedServiceName} gRPC microservice`,
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
    `proto/${sanitizedServiceName}.proto`,
    'src/server.js',
    'src/client.js',
    'src/config/grpc.js',
    `src/handlers/${sanitizedServiceName}.handler.js`,
    `src/services/${sanitizedServiceName}.service.js`,
    'src/utils/logger.js',
    'src/utils/helpers.js',
    `tests/${sanitizedServiceName}.test.js`,
    'tests/server.test.js',
    'tests/client.test.js'
  ];
  
  for (const file of files) {
    await fs.writeFile(path.join(basePath, file), '');
  }
  
  return true;
}

module.exports = generateGrpcMicroservice;