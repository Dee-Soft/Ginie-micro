const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

async function securityCheck() {
  console.log(chalk.blue('Running security checks...'));
  
  // Check Node.js version
  const nodeVersion = process.version;
  const minNodeVersion = '16.0.0';
  if (compareVersions(nodeVersion, minNodeVersion) < 0) {
    throw new Error(`Node.js version ${minNodeVersion} or higher is required. Current version: ${nodeVersion}`);
  }
  
  // Check if running as root
  if (process.getuid && process.getuid() === 0) {
    console.log(chalk.yellow('⚠️  Warning: Running as root user is not recommended'));
  }
  
  // Check directory permissions
  const currentDir = process.cwd();
  try {
    const stats = await fs.stat(currentDir);
    if (stats.mode & 0o022) {
      console.log(chalk.yellow('⚠️  Warning: Directory has overly permissive permissions'));
    }
  } catch (error) {
    // Continue if we can't check permissions
  }
  
  // Check for known vulnerabilities in current directory
  try {
    execSync('npm audit --audit-level=moderate', { stdio: 'pipe' });
  } catch (error) {
    if (error.stdout && error.stdout.toString().includes('found')) {
      console.log(chalk.yellow('⚠️  Warning: npm audit found vulnerabilities'));
      console.log(chalk.yellow('Run "npm audit" for details'));
    }
  }
  
  return true;
}

function compareVersions(v1, v2) {
  const parts1 = v1.replace('v', '').split('.').map(Number);
  const parts2 = v2.replace('v', '').split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

// Security best practices for file generation
function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function validateMicroserviceName(name) {
  if (!name || name.length < 2) {
    throw new Error('Microservice name must be at least 2 characters long');
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new Error('Microservice name can only contain letters, numbers, hyphens, and underscores, and must start with a letter');
  }
  
  return true;
}

module.exports = {
  securityCheck,
  sanitizeFileName,
  validateMicroserviceName
};