const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const templateLoader = require('./template-loader');
const versionChecker = require('./version-checker');

/**
 * Docker Compose configuration generator
 * @class DockerComposeGenerator
 */
class DockerComposeGenerator {
  constructor() {
    this.templateName = 'docker-compose';
  }

  /**
   * Generate Docker Compose configuration
   * @async
   * @param {string} projectPath - Project root path
   * @param {Object} options - Generation options
   * @returns {Promise<void>}
   */
  async generateDockerCompose(projectPath, options = {}) {
    try {
      console.log('🔧 Generating Docker Compose configuration...');
      
      const latestVersions = await versionChecker.checkAllVersions();
      const context = this.buildTemplateContext(options, latestVersions);
      
      const composeContent = await templateLoader.renderTemplate(this.templateName, context);
      const composePath = path.join(projectPath, 'docker-compose.yml');
      
      await fs.writeFile(composePath, composeContent);
      console.log('✅ Docker Compose configuration generated successfully!');
      
      return composePath;
    } catch (error) {
      console.error('❌ Failed to generate Docker Compose configuration:', error.message);
      throw error;
    }
  }

  /**
   * Build template context for Docker Compose
   * @param {Object} options - Generation options
   * @param {Object} versions - Docker image versions
   * @returns {Object} Template context
   */
  buildTemplateContext(options, versions) {
    const {
      projectName = 'microservices',
      includeApiGateway = false,
      includeNginx = false,
      services = [],
      networks = ['gateway_network', 'internal_network'],
      volumes = []
    } = options;

    const composeServices = this.buildServicesConfig(services, versions, includeApiGateway, includeNginx);
    const composeVolumes = this.buildVolumesConfig(services);

    return {
      version: '3.8',
      services: composeServices,
      networks: this.buildNetworksConfig(networks),
      volumes: composeVolumes,
      generatedAt: new Date().toISOString(),
      projectName
    };
  }

  /**
   * Build services configuration
   * @param {Array} services - List of services
   * @param {Object} versions - Docker image versions
   * @param {boolean} includeApiGateway - Whether to include API gateway
   * @param {boolean} includeNginx - Whether to include Nginx
   * @returns {Object} Services configuration
   */
  buildServicesConfig(services, versions, includeApiGateway, includeNginx) {
    const composeServices = {};

    // Add microservices
    services.forEach(service => {
      composeServices[`${service.name}-service`] = this.buildMicroserviceConfig(service, versions);
      
      // Add database service
      if (service.database) {
        composeServices[`${service.name}-db`] = this.buildDatabaseConfig(service, versions);
      }
      
      // Add Redis service if enabled
      if (service.includeRedis) {
        composeServices[`${service.name}-redis`] = this.buildRedisConfig(service, versions);
      }
    });

    // Add API Gateway if enabled
    if (includeApiGateway) {
      composeServices['api-gateway'] = this.buildApiGatewayConfig(versions);
    }

    // Add Nginx if enabled
    if (includeNginx) {
      composeServices['nginx'] = this.buildNginxConfig(versions);
    }

    return composeServices;
  }

  /**
   * Build microservice configuration
   * @param {Object} service - Service configuration
   * @param {Object} versions - Docker image versions
   * @returns {Object} Microservice configuration
   */
  buildMicroserviceConfig(service, versions) {
    const config = {
      build: {
        context: `./microservices/${service.name}-${service.protocol === 'grpc' ? 'grpc-' : ''}microservice`,
        dockerfile: 'Dockerfile'
      },
      environment: [
        'NODE_ENV=development',
        `DB_HOST=${service.name}-db`,
        `DB_PORT=${service.database === 'mongodb' ? '27017' : service.database === 'postgres' ? '5432' : '3306'}`,
        `DB_NAME=${service.name}_db`,
        'DB_USER=user',
        'DB_PASSWORD=password'
      ],
      networks: ['internal_network'],
      depends_on: [`${service.name}-db`],
      restart: 'unless-stopped'
    };

    if (service.includeRedis) {
      config.environment.push(
        `REDIS_HOST=${service.name}-redis`,
        'REDIS_PORT=6379'
      );
      config.depends_on.push(`${service.name}-redis`);
    }

    if (service.ports && service.ports.length > 0) {
      config.ports = service.ports;
    }

    return config;
  }

  /**
   * Build database configuration
   * @param {Object} service - Service configuration
   * @param {Object} versions - Docker image versions
   * @returns {Object} Database configuration
   */
  buildDatabaseConfig(service, versions) {
    const imageMap = {
      mongodb: `mongo:${versions.mongodb}`,
      postgres: `postgres:${versions.postgres}`,
      mysql: `mysql:${versions.mysql}`
    };

    const config = {
      image: imageMap[service.database],
      networks: ['internal_network'],
      volumes: [`${service.name}-db-data:/data/db`],
      restart: 'unless-stopped'
    };

    // Add database-specific environment variables
    if (service.database === 'mongodb') {
      config.environment = ['MONGO_INITDB_DATABASE=admin'];
    } else if (service.database === 'postgres') {
      config.environment = [
        'POSTGRES_DB=mydb',
        'POSTGRES_USER=user',
        'POSTGRES_PASSWORD=password'
      ];
    } else if (service.database === 'mysql') {
      config.environment = [
        'MYSQL_DATABASE=mydb',
        'MYSQL_USER=user',
        'MYSQL_PASSWORD=password',
        'MYSQL_ROOT_PASSWORD=rootpassword'
      ];
    }

    return config;
  }

  /**
   * Build Redis configuration
   * @param {Object} service - Service configuration
   * @param {Object} versions - Docker image versions
   * @returns {Object} Redis configuration
   */
  buildRedisConfig(service, versions) {
    return {
      image: `redis:${versions.redis}`,
      networks: ['internal_network'],
      restart: 'unless-stopped'
    };
  }

  /**
   * Build API Gateway configuration
   * @param {Object} versions - Docker image versions
   * @returns {Object} API Gateway configuration
   */
  buildApiGatewayConfig(versions) {
    return {
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

  /**
   * Build Nginx configuration
   * @param {Object} versions - Docker image versions
   * @returns {Object} Nginx configuration
   */
  buildNginxConfig(versions) {
    return {
      image: `nginx:${versions.nginx}`,
      ports: ['80:80', '443:443'],
      volumes: [
        './nginx.conf:/etc/nginx/nginx.conf:ro',
        './ssl:/etc/ssl:ro'
      ],
      networks: ['gateway_network'],
      depends_on: ['api-gateway'],
      restart: 'unless-stopped'
    };
  }

  /**
   * Build networks configuration
   * @param {Array} networks - Network names
   * @returns {Object} Networks configuration
   */
  buildNetworksConfig(networks) {
    const config = {};
    
    networks.forEach(network => {
      config[network] = {
        driver: 'bridge',
        ...(network === 'internal_network' && { internal: true })
      };
    });
    
    return config;
  }

  /**
   * Build volumes configuration
   * @param {Array} services - List of services
   * @returns {Object} Volumes configuration
   */
  buildVolumesConfig(services) {
    const volumes = {};
    
    services.forEach(service => {
      if (service.database) {
        volumes[`${service.name}-db-data`] = {};
      }
    });
    
    return volumes;
  }

  /**
   * Update existing Docker Compose with new service
   * @async
   * @param {string} composePath - Path to docker-compose.yml
   * @param {Object} serviceInfo - New service information
   * @returns {Promise<void>}
   */
  async updateDockerCompose(composePath, serviceInfo) {
    try {
      const fileContent = await fs.readFile(composePath, 'utf8');
      const dockerCompose = yaml.load(fileContent);
      
      // Add new microservice
      const latestVersions = await versionChecker.checkAllVersions();
      const serviceConfig = this.buildMicroserviceConfig(serviceInfo, latestVersions);
      dockerCompose.services[`${serviceInfo.name}-service`] = serviceConfig;
      
      // Add database if specified
      if (serviceInfo.database) {
        const dbConfig = this.buildDatabaseConfig(serviceInfo, latestVersions);
        dockerCompose.services[`${serviceInfo.name}-db`] = dbConfig;
      }
      
      // Add Redis if specified
      if (serviceInfo.includeRedis) {
        const redisConfig = this.buildRedisConfig(serviceInfo, latestVersions);
        dockerCompose.services[`${serviceInfo.name}-redis`] = redisConfig;
      }
      
      // Add volume if database exists
      if (serviceInfo.database) {
        dockerCompose.volumes[`${serviceInfo.name}-db-data`] = {};
      }
      
      const yamlStr = yaml.dump(dockerCompose, { indent: 2 });
      await fs.writeFile(composePath, yamlStr);
      
      console.log('✅ Docker Compose updated with new service!');
    } catch (error) {
      console.error('❌ Failed to update Docker Compose:', error.message);
      throw error;
    }
  }
}

module.exports = new DockerComposeGenerator();