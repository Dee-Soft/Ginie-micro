const fs = require('fs-extra');
const path = require('path');
const templateLoader = require('./template-loader');
const versionChecker = require('./version-checker');

/**
 * Nginx configuration generator
 * @class NginxConfigGenerator
 */
class NginxConfigGenerator {
  constructor() {
    this.templateName = 'nginx.conf';
  }

  /**
   * Generate Nginx configuration
   * @async
   * @param {string} projectPath - Project root path
   * @param {Object} options - Configuration options
   * @param {Array} services - List of services for load balancing
   * @returns {Promise<void>}
   */
  async generateNginxConfig(projectPath, options = {}, services = []) {
    try {
      console.log('🔧 Generating Nginx configuration...');
      
      const latestVersions = await versionChecker.checkAllVersions();
      const context = this.buildTemplateContext(options, services, latestVersions);
      
      const nginxConfig = await templateLoader.renderTemplate(this.templateName, context);
      const nginxPath = path.join(projectPath, 'nginx.conf');
      
      await fs.writeFile(nginxPath, nginxConfig);
      console.log('✅ Nginx configuration generated successfully!');
      
      return nginxPath;
    } catch (error) {
      console.error('❌ Failed to generate Nginx configuration:', error.message);
      throw error;
    }
  }

  /**
   * Build template context for Nginx configuration
   * @param {Object} options - Configuration options
   * @param {Array} services - List of services
   * @param {Object} versions - Docker image versions
   * @returns {Object} Template context
   */
  buildTemplateContext(options, services, versions) {
    const {
      httpPort = 80,
      httpsPort = 443,
      serverName = 'localhost',
      enableSSL = false,
      enableGzip = true,
      enableCaching = true,
      clientMaxBodySize = '10m'
    } = options;

    const upstreamServices = services.map(service => ({
      name: service.name,
      servers: service.instances || [{ host: `${service.name}-service`, port: service.port || 3000 }]
    }));

    return {
      httpPort,
      httpsPort,
      serverName,
      enableSSL,
      enableGzip,
      enableCaching,
      clientMaxBodySize,
      upstreamServices,
      nginxVersion: versions.nginx,
      generatedAt: new Date().toISOString(),
      additionalConfig: this.getAdditionalConfig(options)
    };
  }

  /**
   * Get additional Nginx configuration based on options
   * @param {Object} options - Configuration options
   * @returns {string} Additional configuration blocks
   */
  getAdditionalConfig(options) {
    let config = '';

    if (options.enableSSL) {
      config += `
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/nginx.crt;
    ssl_certificate_key /etc/ssl/private/nginx.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    `;
    }

    if (options.enableGzip) {
      config += `
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    gzip_disable "MSIE [1-6]\\.";
    `;
    }

    if (options.enableCaching) {
      config += `
    # Cache Configuration
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    `;
    }

    return config;
  }

  /**
   * Update existing Nginx configuration with new services
   * @async
   * @param {string} configPath - Path to nginx.conf
   * @param {Array} newServices - New services to add
   * @returns {Promise<void>}
   */
  async updateNginxConfig(configPath, newServices) {
    try {
      let configContent = await fs.readFile(configPath, 'utf8');
      
      newServices.forEach(service => {
        const upstreamBlock = this.generateUpstreamBlock(service);
        const locationBlock = this.generateLocationBlock(service);
        
        // Add upstream block
        if (!configContent.includes(`upstream ${service.name}`)) {
          const httpBlockIndex = configContent.indexOf('http {');
          if (httpBlockIndex !== -1) {
            configContent = configContent.slice(0, httpBlockIndex + 6) + 
                          `\n    ${upstreamBlock}` + 
                          configContent.slice(httpBlockIndex + 6);
          }
        }
        
        // Add location block
        if (!configContent.includes(`location /${service.name}`)) {
          const serverBlockIndex = configContent.indexOf('server {');
          if (serverBlockIndex !== -1) {
            const serverBlockEnd = configContent.indexOf('}', serverBlockIndex);
            configContent = configContent.slice(0, serverBlockEnd) + 
                          `\n        ${locationBlock}` + 
                          configContent.slice(serverBlockEnd);
          }
        }
      });
      
      await fs.writeFile(configPath, configContent);
      console.log('✅ Nginx configuration updated with new services!');
    } catch (error) {
      console.error('❌ Failed to update Nginx configuration:', error.message);
      throw error;
    }
  }

  /**
   * Generate upstream block for a service
   * @param {Object} service - Service configuration
   * @returns {string} Upstream block
   */
  generateUpstreamBlock(service) {
    return `upstream ${service.name} {
        server ${service.name}-service:${service.port || 3000};
        # Add more servers for load balancing:
        # server ${service.name}-service2:${service.port || 3000};
        # server ${service.name}-service3:${service.port || 3000};
    }`;
  }

  /**
   * Generate location block for a service
   * @param {Object} service - Service configuration
   * @returns {string} Location block
   */
  generateLocationBlock(service) {
    return `location /${service.name} {
            proxy_pass http://${service.name};
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # Enable caching if needed
            # proxy_cache my_cache;
            # proxy_cache_valid 200 302 10m;
            # proxy_cache_valid 404 1m;
        }`;
  }
}

module.exports = new NginxConfigGenerator();