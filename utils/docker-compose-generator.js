const fs = require('fs-extra');
const path = require('path');

async function generateDockerCompose(projectPath, options) {
  const { projectName, includeApiGateway, includeNginx, protocol } = options;
  
  const dockerCompose = {
    version: '3.8',
    services: {},
    networks: {
      gateway_network: {
        driver: 'bridge'
      },
      internal_network: {
        driver: 'bridge',
        internal: true
      }
    },
    volumes: {}
  };

  // Add API Gateway if selected
  if (includeApiGateway) {
    dockerCompose.services['api-gateway'] = {
      build: {
        context: './microservices/api-gateway',
        dockerfile: 'Dockerfile'
      },
      ports: ['3000:3000'],
      environment: ['NODE_ENV=development'],
      networks: ['gateway_network', 'internal_network'],
      depends_on: [],
      restart: 'unless-stopped'
    };
  }

  // Add Nginx if selected
  if (includeNginx) {
    dockerCompose.services['nginx'] = {
      image: 'nginx:alpine',
      ports: ['80:80'],
      volumes: ['./nginx.conf:/etc/nginx/nginx.conf:ro'],
      networks: ['gateway_network'],
      depends_on: includeApiGateway ? ['api-gateway'] : [],
      restart: 'unless-stopped'
    };
  }

  await fs.writeJson(path.join(projectPath, 'docker-compose.yml'), dockerCompose, { spaces: 2 });
}

async function updateDockerCompose(projectPath, serviceInfo) {
  const composePath = path.join(projectPath, 'docker-compose.yml');
  
  if (!await fs.pathExists(composePath)) {
    await generateDockerCompose(projectPath, {
      projectName: path.basename(projectPath),
      includeApiGateway: false,
      includeNginx: false,
      protocol: serviceInfo.protocol
    });
  }
  
  const dockerCompose = await fs.readJson(composePath);
  const serviceName = serviceInfo.name.toLowerCase();
  
  // Add microservice
  dockerCompose.services[`${serviceName}-service`] = {
    build: {
      context: `./microservices/${serviceName}-${serviceInfo.protocol === 'grpc' ? 'grpc-' : ''}microservice`,
      dockerfile: 'Dockerfile'
    },
    environment: [
      'NODE_ENV=development',
      `DB_HOST=${serviceName}-db`,
      'DB_PORT=27017',
      `DB_NAME=${serviceName}_db`
    ],
    networks: ['internal_network'],
    depends_on: [`${serviceName}-db`],
    restart: 'unless-stopped'
  };
  
  // Add database
  dockerCompose.services[`${serviceName}-db`] = {
    image: serviceInfo.database === 'mongodb' ? 'mongo:6' : 
           serviceInfo.database === 'postgres' ? 'postgres:15' : 'mysql:8',
    environment: serviceInfo.database === 'mongodb' ? [
      'MONGO_INITDB_DATABASE=admin'
    ] : serviceInfo.database === 'postgres' ? [
      'POSTGRES_DB=mydb',
      'POSTGRES_USER=user',
      'POSTGRES_PASSWORD=password'
    ] : [
      'MYSQL_DATABASE=mydb',
      'MYSQL_USER=user',
      'MYSQL_PASSWORD=password',
      'MYSQL_ROOT_PASSWORD=rootpassword'
    ],
    volumes: [`${serviceName}-db-data:/data/db`],
    networks: ['internal_network'],
    restart: 'unless-stopped'
  };
  
  // Add Redis if selected
  if (serviceInfo.includeRedis) {
    dockerCompose.services[`${serviceName}-redis`] = {
      image: 'redis:7-alpine',
      networks: ['internal_network'],
      restart: 'unless-stopped'
    };
    
    // Add Redis environment variable to service
    dockerCompose.services[`${serviceName}-service`].environment.push(
      `REDIS_HOST=${serviceName}-redis`,
      'REDIS_PORT=6379'
    );
    
    // Add Redis dependency
    dockerCompose.services[`${serviceName}-service`].depends_on.push(`${serviceName}-redis`);
  }
  
  // Add volume for database
  dockerCompose.volumes[`${serviceName}-db-data`] = {};
  
  await fs.writeJson(composePath, dockerCompose, { spaces: 2 });
}

module.exports = {
  generateDockerCompose,
  updateDockerCompose
};