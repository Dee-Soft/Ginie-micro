const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');
const versionChecker = require('../utils/version-checker');
const templateLoader = require('../utils/template-loader');

async function updateDockerImages() {
  console.log(chalk.blue('🔄 Updating Docker images to latest versions...'));
  
  try {
    const latestVersions = await versionChecker.checkAllVersions();
    
    // Update all Dockerfiles in the project
    await updateProjectDockerfiles(latestVersions);
    
    // Update docker-compose.yml
    await updateDockerCompose(latestVersions);
    
    console.log(chalk.green('✅ Docker images updated successfully!'));
  } catch (error) {
    console.error(chalk.red('❌ Failed to update Docker images:'), error.message);
    process.exit(1);
  }
}

async function updateProjectDockerfiles(latestVersions) {
  const projectRoot = process.cwd();
  
  // Find all Dockerfiles in the project
  const dockerfiles = await findFiles(projectRoot, 'Dockerfile');
  
  for (const dockerfile of dockerfiles) {
    try {
      let content = await fs.readFile(dockerfile, 'utf8');
      
      // Update Node.js version
      content = content.replace(
        /FROM node:\d+-alpine/,
        `FROM node:${latestVersions.node}`
      );
      
      await fs.writeFile(dockerfile, content);
      console.log(chalk.green(`✓ Updated ${path.relative(projectRoot, dockerfile)}`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not update ${dockerfile}: ${error.message}`));
    }
  }
}

async function updateDockerCompose(latestVersions) {
  const composePath = path.join(process.cwd(), 'docker-compose.yml');
  
  if (!await fs.pathExists(composePath)) {
    return;
  }
  
  try {
    let content = await fs.readFile(composePath, 'utf8');
    
    // Update database images
    content = content.replace(
      /image: mongo:\d+/,
      `image: mongo:${latestVersions.mongodb}`
    );
    
    content = content.replace(
      /image: postgres:\d+/,
      `image: postgres:${latestVersions.postgres}`
    );
    
    content = content.replace(
      /image: mysql:\d+/,
      `image: mysql:${latestVersions.mysql}`
    );
    
    content = content.replace(
      /image: redis:\d+-alpine/,
      `image: redis:${latestVersions.redis}`
    );
    
    content = content.replace(
      /image: nginx:alpine/,
      `image: nginx:${latestVersions.nginx}`
    );
    
    await fs.writeFile(composePath, content);
    console.log(chalk.green('✓ Updated docker-compose.yml'));
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Could not update docker-compose.yml: ${error.message}`));
  }
}

async function findFiles(dir, filename) {
  const files = [];
  
  async function scanDirectory(currentDir) {
    const items = await fs.readdir(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          await scanDirectory(fullPath);
        }
      } else if (item === filename) {
        files.push(fullPath);
      }
    }
  }
  
  await scanDirectory(dir);
  return files;
}

async function updateNpmPackages() {
  console.log(chalk.blue('📦 Updating npm packages...'));
  
  try {
    execSync('npm outdated', { stdio: 'pipe' });
    
    // Update packages
    execSync('npm update', { stdio: 'inherit' });
    
    // Audit fixes
    execSync('npm audit fix', { stdio: 'inherit' });
    
    console.log(chalk.green('✅ npm packages updated successfully!'));
  } catch (error) {
    if (error.stdout && error.stdout.toString().includes('npm audit')) {
      console.log(chalk.yellow('⚠️  npm audit found issues that need manual review'));
    } else {
      console.log(chalk.yellow('⚠️  npm update completed with warnings'));
    }
  }
}

// Command line interface
const command = process.argv[2];

async function main() {
  switch (command) {
    case 'docker':
      await updateDockerImages();
      break;
    case 'npm':
      await updateNpmPackages();
      break;
    case 'all':
      await updateDockerImages();
      await updateNpmPackages();
      break;
    default:
      console.log(`
Usage: npm run update:[command]

Commands:
  docker    - Update Docker images to latest versions
  npm       - Update npm packages
  all       - Update both Docker images and npm packages

Examples:
  npm run update:docker
  npm run update:npm
  npm run update:all
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  updateDockerImages,
  updateNpmPackages
};