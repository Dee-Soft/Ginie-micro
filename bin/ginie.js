const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
const { securityCheck } = require('../utils/security');

// Import generators
const generateRestMicroservice = require('../generators/rest-generator');
const generateGrpcMicroservice = require('../generators/grpc-generator');

program
  .version('1.0.0')
  .description('Ginie - Microservice Monorepo Generator')
  .action(async () => {
    console.log(chalk.blue.bold('\n🛠️  Welcome to Ginie Microservice Generator!\n'));
    
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
  
  // Generate initial microservices
  await generateInitialMicroservices(microservicesPath, answers);
  
  // Set up git hooks if selected
  if (answers.installHusky) {
    await setupHusky(projectPath);
  }
  
  console.log(chalk.green.bold('\n🎉 Project generation complete!'));
  console.log(chalk.blue('\nNext steps:'));
  console.log(`  cd ${answers.projectName}`);
  console.log('  npm install');
  console.log('  # Start developing your microservices!');
}

async function addMicroserviceToMonorepo() {
  const packageJson = await fs.readJson('package.json');
  
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
      validate: input => input ? true : 'Microservice name is required'
    }
  ]);
  
  const microservicesPath = path.join(process.cwd(), 'microservices');
  await fs.ensureDir(microservicesPath);
  process.chdir(microservicesPath);
  
  if (answers.protocol === 'rest') {
    await generateRestMicroservice(answers.microserviceName);
  } else {
    await generateGrpcMicroservice(answers.microserviceName);
  }
  
  console.log(chalk.green(`✓ Added ${answers.microserviceName} microservice to monorepo`));
}

async function createMonorepoPackageJson(answers) {
  const packageJson = {
    name: answers.projectName,
    version: '1.0.0',
    description: `${answers.projectName} microservices monorepo`,
    scripts: {
      "dev": "concurrently \"npm run dev --workspace=*\"",
      "test": "jest",
      "ginie": "npx ginie",  // Added ginie script
      "audit": "npm audit --audit-level=moderate",
      "security-check": "npx ginie --security-check"
    },
    "devDependencies": {},
    "workspaces": [
      "microservices/*-microservice",
      "microservices/*-grpc-microservice"
    ]
  };
  
  // Add commit script if commitizen is selected
  if (answers.installCommitizen) {
    packageJson.scripts.commit = "git-cz";
    packageJson.config = {
      "commitizen": {
        "path": "cz-conventional-changelog"
      }
    };
  }
  
  // Add husky and commitizen if selected
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
    process.chdir(microservicesPath);
    
    if (answers.protocol === 'rest') {
      await generateRestMicroservice(service);
    } else {
      await generateGrpcMicroservice(service);
    }
    
    console.log(chalk.green(`✓ Generated ${service} microservice`));
  }
}

async function setupHusky(projectPath) {
  console.log(chalk.blue('Setting up Husky...'));
  const { execSync } = require('child_process');
  
  // Use npm exec to run husky install
  execSync('npm exec -- husky install', { stdio: 'inherit', cwd: projectPath });
  
  // Add sample pre-commit hook
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