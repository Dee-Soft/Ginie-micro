const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer');

const { sanitizeFileName, validateMicroserviceName } = require('../utils/security');

const templateLoader = require('../utils/template-loader');


async function generateRestMicroservice(serviceName, databaseType, includeRedis) {
  // Validate service name
  validateMicroserviceName(serviceName);

  // Sanitize for file names
  const sanitizedServiceName = sanitizeFileName(serviceName);
  
  const microserviceName = `${sanitizedServiceName}-microservice`;
  const basePath = path.join(process.cwd(), microserviceName);

  
  // Ask for Node.js image version for Dockerfile
  const { nodeImage } = await inquirer.prompt([{
    type: 'input',
    name: 'nodeImage',
    message: `Node.js image for ${sanitizedServiceName} Dockerfile (default: 24-alpine):`,
    default: '24-alpine'
  }]);

  // Use template for .env
  const envContent = await templateLoader.renderTemplate('env', {
    serviceName,
    port: 3000,
    dbHost: `${serviceName}-db`,
    dbPort: databaseType === 'mongodb' ? '27017' : databaseType === 'postgres' ? '5432' : '3306',
    dbName: `${serviceName}_db`,
    dbUser: 'user',
    dbPassword: 'password',
    includeRedis,
    redisHost: includeRedis ? `${serviceName}-redis` : 'redis'
  });


  await fs.writeFile(path.join(basePath, '.env'), envContent);
  await fs.writeFile(path.join(basePath, '.env.example'), envContent);
  
  
  // Create directory structure
  await fs.ensureDir(basePath);

  const dockerfileContent = await templateLoader.renderTemplate('dockerfile', {
    nodeVersion: versions.node,
    port: 3000
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
    description: `${sanitizedServiceName} REST microservice`,
    main: 'src/app.js',
    scripts: {
      start: 'node src/app.js',
      dev: 'nodemon src/app.js',
      test: 'jest'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      helmet: '^7.0.0',
      morgan: '^1.10.0',
      dotenv: '^16.3.1'
    },
    devDependencies: {
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
    'src/config',
    'src/controllers',
    'src/models',
    'src/routes',
    'src/services',
    'src/middleware',
    'src/utils',
    'tests'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(basePath, dir));
  }
  
  // Create empty files
  const files = [
    'src/app.js',
    'src/config/database.js',
    'src/config/server.js',
    `src/controllers/${sanitizedServiceName}.controller.js`,
    `src/models/${sanitizedServiceName}.model.js`,
    `src/routes/${sanitizedServiceName}.routes.js`,
    'src/routes/index.js',
    `src/services/${sanitizedServiceName}.service.js`,
    'src/middleware/validation.js',
    'src/middleware/errorHandler.js',
    'src/utils/logger.js',
    'src/utils/helpers.js',
    `tests/${sanitizedServiceName}.test.js`,
    'tests/setup.js'
  ];
  
  for (const file of files) {
    await fs.writeFile(path.join(basePath, file), '');
  }
  
  return true;
}

module.exports = generateRestMicroservice;