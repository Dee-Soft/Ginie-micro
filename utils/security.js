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
    const worldWritable = (stats.mode & 0o0002) !== 0;
    const groupWritable = (stats.mode & 0o0020) !== 0;
    
    if (worldWritable) {
      throw new Error('Directory has world-writable permissions (security risk)');
    }
    
    if (groupWritable && process.getgid && stats.gid !== process.getgid()) {
      console.log(chalk.yellow('⚠️  Warning: Directory has group-writable permissions for different group'));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log(chalk.yellow('⚠️  Warning: Could not check directory permissions'));
    }
  }
  
  // Check for suspicious environment variables
  const suspiciousEnvVars = ['AWS_', 'GCP_', 'AZURE_', 'SECRET', 'PASSWORD', 'TOKEN', 'KEY'];
  const foundSuspicious = Object.keys(process.env).filter(envVar => 
    suspiciousEnvVars.some(suspicious => envVar.includes(suspicious))
  );
  
  if (foundSuspicious.length > 0) {
    console.log(chalk.yellow('⚠️  Warning: Suspicious environment variables detected'));
    console.log(chalk.yellow('   Consider using .env files instead of environment variables'));
  }
  
  // Check for known vulnerabilities
  try {
    console.log(chalk.blue('Checking for npm vulnerabilities...'));
    execSync('npm audit --audit-level=moderate', { 
      stdio: 'pipe',
      timeout: 30000 // 30 second timeout
    });
  } catch (error) {
    if (error.stdout && error.stdout.toString().includes('found')) {
      const auditOutput = error.stdout.toString();
      const vulnerabilityCount = (auditOutput.match(/found (\d+) vulnerabilities/g) || [])[0];
      throw new Error(`npm audit found vulnerabilities: ${vulnerabilityCount}`);
    } else if (error.signal === 'SIGTERM') {
      console.log(chalk.yellow('⚠️  npm audit timed out, skipping vulnerability check'));
    } else {
      console.log(chalk.yellow('⚠️  Could not complete npm audit check'));
    }
  }
  
  // Check for common security misconfigurations
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      
      // Check for scripts that might be dangerous
      const dangerousScripts = ['preinstall', 'postinstall', 'prepublish'];
      dangerousScripts.forEach(script => {
        if (packageJson.scripts && packageJson.scripts[script]) {
          console.log(chalk.yellow(`⚠️  Warning: ${script} script found - review for security`));
        }
      });
    }
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not check package.json for security issues'));
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

function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid file name');
  }
  
  // Remove any path traversal attempts
  let sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  // Ensure it doesn't start or end with special characters
  sanitized = sanitized.replace(/^[_-]+/, '').replace(/[_-]+$/, '');
  
  // Ensure it's not empty
  if (sanitized.length === 0) {
    throw new Error('File name became empty after sanitization');
  }
  
  // Limit length to prevent issues
  if (sanitized.length > 50) {
    sanitized = sanitized.substring(0, 50);
  }
  
  return sanitized;
}

function validateMicroserviceName(name) {
  if (!name || name.length < 2) {
    throw new Error('Microservice name must be at least 2 characters long');
  }
  
  if (name.length > 30) {
    throw new Error('Microservice name must be less than 30 characters');
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new Error('Microservice name can only contain letters, numbers, hyphens, and underscores, and must start with a letter');
  }
  
  // Check for reserved names
  const reservedNames = ['api', 'app', 'server', 'client', 'admin', 'root', 'system'];
  if (reservedNames.includes(name.toLowerCase())) {
    throw new Error('Microservice name is reserved');
  }
  
  // Check for potentially problematic names
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error('Microservice name cannot contain path traversal characters');
  }
  
  return true;
}

module.exports = {
  securityCheck,
  sanitizeFileName,
  validateMicroserviceName
};