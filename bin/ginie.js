#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
const { securityCheck, sanitizeFileName, validateMicroserviceName } = require('../utils/security');
const { generateDockerCompose, updateDockerCompose } = require('../utils/docker-compose-generator');
const generateNginxConfig = require('../utils/nginx-config-generator');

// Import generators
const generateRestMicroservice = require('../generators/rest-generator');
const generateGrpcMicroservice = require('../generators/grpc-generator');
const generateApiGateway = require('../generators/api-gateway-generator');

program
  .version('1.0.0')
  .description('Ginie-Micro - Microservice Monorepo Generator')
  .action(async () => {
    console.log(chalk.blue.bold('\n🛠️  Welcome to Ginie-Micro Microservice Generator!\n'));
    
    try {
      // Run security check
      await securityCheck();
      
      // Check if we're in a ginie-generated monorepo
      const isMonorepo = await isGinieMonorepo();
      
      if (isMonorepo) {
        await addMicroserviceToMonorepo();
      } else {
        await createNewMonorepo();
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

async function isGinieMonorepo() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return packageJson.scripts && packageJson.scripts.ginie;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function createNewMonorepo() {
  // Prompt for project details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Enter your project name:',
      validate: input => input ? true : 'Project name is required'
    },
    {
      type: 'list',
      name: 'protocol',
      message: 'Choose communication protocol:',
      choices: [
        { name: 'REST (HTTP/JSON)', value: 'rest' },
        { name: 'gRPC (Protocol Buffers)', value: 'grpc' }
      ]
    },
    {
      type: 'confirm',
      name: 'installHusky',
      message: 'Would you like to install Husky for Git hooks?',
      default: true
    },
    {
      type: 'confirm',
      name: 'installCommitizen',
      message: 'Would you like to install Commitizen for standardized commits?',
      default: true
    },
    {
      type: 'confirm',
      name: 'includeApiGateway',
      message: 'Would you like to include an API Gateway?',
      default: true
    },
    {
      type: 'confirm',
      name: 'includeNginx',
      message: 'Would you like to include Nginx load balancer?',
      default: false,
      when: answers => answers.includeApiGateway
    }
  ]);
  
  const projectPath = path.join(process.cwd(), answers.projectName);
  
  // Create project directory
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory ${answers.projectName} already exists!`);
  }
  
  await fs.mkdir(projectPath);
  process.chdir(projectPath);
  
  console.log(chalk.green(`\nCreating ${answers.projectName} project...`));
  
  // Initialize git repository
  const git = simpleGit(projectPath);
  await git.init();
  console.log(chalk.green('✓ Initialized git repository'));
  
  // Generate package.json for monorepo
  const packageJson = await createMonorepoPackageJson(answers);
  await fs.writeJson(path.join(projectPath, 'package.json'), packageJson, { spaces: 2 });
  
  console.log(chalk.green('✓ Created monorepo package.json'));
  
  // Create microservices directory
  const microservicesPath = path.join(projectPath, 'microservices');
  await fs.mkdir(microservicesPath);
  
  // Generate API Gateway if selected
  if (answers.includeApiGateway) {
    process.chdir(microservicesPath);
    await generateApiGateway();
    console.log(chalk.green('✓ Generated API Gateway'));
  }
  
  // Generate initial microservices
  await generateInitialMicroservices(microservicesPath, answers);
  
  // Generate Docker Compose file
  await generateDockerCompose(projectPath, answers);
  console.log(chalk.green('✓ Generated docker-compose.yml'));
  
  // Generate Nginx config only if selected
  if (answers.includeNginx) {
    await generateNginxConfig(projectPath);
    console.log(chalk.green('✓ Generated nginx.conf'));
  }
  
  // Set up git hooks if selected
  if (answers.installHusky) {
    await setupHusky(projectPath);
  }
  
  console.log(chalk.green.bold('\n🎉 Project generation complete!'));
  console.log(chalk.blue('\nNext steps:'));
  console.log(`  cd ${answers.projectName}`);
  console.log('  npm install');
  if (answers.includeNginx || answers.includeApiGateway) {
    console.log('  docker-compose up -d');
  }
  console.log('  # Start developing your microservices!');
}

async function addMicroserviceToMonorepo() {
  const packageJson = await fs.readJson('package.json');
  const projectPath = process.cwd();
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'protocol',
      message: 'Choose communication protocol for new microservice:',
      choices: [
        { name: 'REST (HTTP/JSON)', value: 'rest' },
        { name: 'gRPC (Protocol Buffers)', value: 'grpc' }
      ]
    },
    {
      type: 'input',
      name: 'microserviceName',
      message: 'Enter microservice name:',
      validate: input => {
        if (!input) return 'Microservice name is required';
        validateMicroserviceName(input);
        return true;
      }
    },
    {
      type: 'list',
      name: 'database',
      message: 'Choose database type:',
      choices: [
        { name: 'MongoDB', value: 'mongodb' },
        { name: 'PostgreSQL', value: 'postgres' },
        { name: 'MySQL', value: 'mysql' }
      ],
      default: 'mongodb'
    },
    {
      type: 'confirm',
      name: 'includeRedis',
      message: 'Include Redis for caching?',
      default: true
    }
  ]);
  
  const sanitizedServiceName = sanitizeFileName(answers.microserviceName);
  const microservicesPath = path.join(projectPath, 'microservices');
  await fs.ensureDir(microservicesPath);
  process.chdir(microservicesPath);
  
  if (answers.protocol === 'rest') {
    await generateRestMicroservice(sanitizedServiceName, answers.database, answers.includeRedis);
  } else {
    await generateGrpcMicroservice(sanitizedServiceName, answers.database, answers.includeRedis);
  }
  
  console.log(chalk.green(`✓ Added ${sanitizedServiceName} microservice to monorepo`));
  
  // Update Docker Compose with new service
  await updateDockerCompose(projectPath, {
    name: sanitizedServiceName,
    protocol: answers.protocol,
    database: answers.database,
    includeRedis: answers.includeRedis
  });
  
  console.log(chalk.green('✓ Updated docker-compose.yml with new service'));
}

async function createMonorepoPackageJson(answers) {
  const packageJson = {
    name: answers.projectName,
    version: '1.0.0',
    description: `${answers.projectName} microservices monorepo`,
    scripts: {
      "dev": "concurrently \"npm run dev --workspace=*\"",
      "test": "jest",
      "ginie": "npx ginie-micro",
      "audit": "npm audit --audit-level=moderate",
      "security-check": "npx ginie-micro --security-check",
      "compose:up": "docker-compose up -d",
      "compose:down": "docker-compose down",
      "compose:logs": "docker-compose logs -f"
    },
    "devDependencies": {},
    "workspaces": [
      "microservices/*-microservice",
      "microservices/*-grpc-microservice",
      "microservices/api-gateway"
    ]
  };
  
  if (answers.installCommitizen) {
    packageJson.scripts.commit = "git-cz";
    packageJson.config = {
      "commitizen": {
        "path": "cz-conventional-changelog"
      }
    };
  }
  
  if (answers.installHusky) {
    packageJson.scripts.prepare = "husky install";
    packageJson.devDependencies.husky = "^8.0.0";
  }
  
  if (answers.installCommitizen) {
    packageJson.devDependencies.commitizen = "^4.3.0";
    packageJson.devDependencies["cz-conventional-changelog"] = "^3.3.0";
  }
  
  return packageJson;
}

async function generateInitialMicroservices(microservicesPath, answers) {
  const { microservices } = await inquirer.prompt([
    {
      type: 'input',
      name: 'microservices',
      message: 'Enter initial microservice names (comma-separated):',
      validate: input => input ? true : 'At least one microservice is required',
      filter: input => input.split(',').map(name => name.trim())
    }
  ]);
  
  for (const service of microservices) {
    validateMicroserviceName(service);
    const sanitizedServiceName = sanitizeFileName(service);
    
    const serviceAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'database',
        message: `Choose database type for ${service}:`,
        choices: [
          { name: 'MongoDB', value: 'mongodb' },
          { name: 'PostgreSQL', value: 'postgres' },
          { name: 'MySQL', value: 'mysql' }
        ],
        default: 'mongodb'
      },
      {
        type: 'confirm',
        name: 'includeRedis',
        message: `Include Redis for ${service} caching?`,
        default: true
      }
    ]);
    
    process.chdir(microservicesPath);
    
    if (answers.protocol === 'rest') {
      await generateRestMicroservice(sanitizedServiceName, serviceAnswers.database, serviceAnswers.includeRedis);
    } else {
      await generateGrpcMicroservice(sanitizedServiceName, serviceAnswers.database, serviceAnswers.includeRedis);
    }
    
    console.log(chalk.green(`✓ Generated ${sanitizedServiceName} microservice`));
  }
}

async function setupHusky(projectPath) {
  console.log(chalk.blue('Setting up Husky...'));
  const { execSync } = require('child_process');
  
  execSync('npm exec -- husky install', { stdio: 'inherit', cwd: projectPath });
  
  const huskyDir = path.join(projectPath, '.husky');
  await fs.ensureDir(huskyDir);
  await fs.writeFile(
    path.join(huskyDir, 'pre-commit'),
    '#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\nnpm test\n'
  );
  await fs.chmod(path.join(huskyDir, 'pre-commit'), '755');
  
  console.log(chalk.green('✓ Husky configured with pre-commit hook'));
}

// Add security check command
program
  .command('security-check')
  .description('Run security checks on the project')
  .action(async () => {
    try {
      await securityCheck();
      console.log(chalk.green('✓ Security check passed'));
    } catch (error) {
      console.error(chalk.red('Security check failed:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);