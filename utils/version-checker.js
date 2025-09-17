const axios = require('axios');
const chalk = require('chalk');

class VersionChecker {
  constructor() {
    this.cache = new Map();
    this.cacheTime = 30 * 60 * 1000; // 30 minutes cache
  }

  async getLatestNodeVersion() {
    try {
      const response = await axios.get('https://registry.npmjs.org/node', {
        timeout: 5000
      });
      const versions = Object.keys(response.data.versions);
      const alpineVersion = versions
        .filter(v => v.includes('-alpine'))
        .sort((a, b) => new Date(response.data.time[b]) - new Date(response.data.time[a]))[0];
      
      return alpineVersion || versions.sort().pop();
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not fetch latest Node version, using fallback'));
      return '18-alpine';
    }
  }

  async getLatestDockerImage(image) {
    const cacheKey = `docker-${image}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let version;
      switch (image) {
        case 'mongodb':
          version = await this.getLatestMongoVersion();
          break;
        case 'postgres':
          version = await this.getLatestPostgresVersion();
          break;
        case 'mysql':
          version = await this.getLatestMySQLVersion();
          break;
        case 'redis':
          version = await this.getLatestRedisVersion();
          break;
        case 'nginx':
          version = await this.getLatestNginxVersion();
          break;
        default:
          version = 'latest';
      }
      
      this.setToCache(cacheKey, version);
      return version;
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not fetch latest ${image} version, using fallback`));
      return this.getFallbackVersion(image);
    }
  }

  async getLatestMongoVersion() {
    try {
      const response = await axios.get('https://registry.hub.docker.com/v2/repositories/library/mongo/tags/', {
        timeout: 5000
      });
      const tags = response.data.results
        .filter(tag => tag.name.match(/^\d+\.\d+$/))
        .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
      return tags[0]?.name || '6';
    } catch (error) {
      return '6';
    }
  }

  async getLatestPostgresVersion() {
    try {
      const response = await axios.get('https://registry.hub.docker.com/v2/repositories/library/postgres/tags/', {
        timeout: 5000
      });
      const tags = response.data.results
        .filter(tag => tag.name.match(/^\d+$/))
        .sort((a, b) => parseInt(b.name) - parseInt(a.name));
      return tags[0]?.name || '15';
    } catch (error) {
      return '15';
    }
  }

  async getLatestMySQLVersion() {
    try {
      const response = await axios.get('https://registry.hub.docker.com/v2/repositories/library/mysql/tags/', {
        timeout: 5000
      });
      const tags = response.data.results
        .filter(tag => tag.name.match(/^\d+\.\d+$/))
        .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
      return tags[0]?.name || '8';
    } catch (error) {
      return '8';
    }
  }

  async getLatestRedisVersion() {
    try {
      const response = await axios.get('https://registry.hub.docker.com/v2/repositories/library/redis/tags/', {
        timeout: 5000
      });
      const tags = response.data.results
        .filter(tag => tag.name.match(/^\d+-alpine$/))
        .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
      return tags[0]?.name || '7-alpine';
    } catch (error) {
      return '7-alpine';
    }
  }

  async getLatestNginxVersion() {
    try {
      const response = await axios.get('https://registry.hub.docker.com/v2/repositories/library/nginx/tags/', {
        timeout: 5000
      });
      const tags = response.data.results
        .filter(tag => tag.name.includes('alpine'))
        .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
      return tags[0]?.name || 'alpine';
    } catch (error) {
      return 'alpine';
    }
  }

  getFallbackVersion(image) {
    const fallbacks = {
      mongodb: '6',
      postgres: '15',
      mysql: '8',
      redis: '7-alpine',
      nginx: 'alpine'
    };
    return fallbacks[image] || 'latest';
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTime) {
      return cached.value;
    }
    return null;
  }

  setToCache(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  async checkAllVersions() {
    console.log(chalk.blue('🔍 Checking for latest Docker image versions...'));
    
    const versions = {
      node: await this.getLatestNodeVersion(),
      mongodb: await this.getLatestDockerImage('mongodb'),
      postgres: await this.getLatestDockerImage('postgres'),
      mysql: await this.getLatestDockerImage('mysql'),
      redis: await this.getLatestDockerImage('redis'),
      nginx: await this.getLatestDockerImage('nginx')
    };

    console.log(chalk.green('✓ Latest versions fetched successfully'));
    return versions;
  }
}

module.exports = new VersionChecker();