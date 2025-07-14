import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);

interface EnvironmentConfig {
  autoDetect: boolean;
  generateDockerfile: boolean;
  setupCI: boolean;
  configureEnvVars: boolean;
  installDependencies: boolean;
  setupDatabase: boolean;
  generateDockerCompose: boolean;
}

interface ProjectInfo {
  type: 'node' | 'python' | 'ruby' | 'go' | 'java' | 'php' | 'dotnet';
  framework?: string;
  runtime?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'bundler' | 'composer';
  database?: 'postgres' | 'mysql' | 'mongodb' | 'redis' | 'sqlite';
  services: string[];
  ports: number[];
}

interface ServiceConfig {
  name: string;
  image: string;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
}

export class AutoEnvironmentSetup {
  private projectRoot: string;
  private config: EnvironmentConfig;
  private projectInfo: ProjectInfo | null = null;

  constructor(projectRoot: string, config?: Partial<EnvironmentConfig>) {
    this.projectRoot = projectRoot;
    this.config = {
      autoDetect: true,
      generateDockerfile: true,
      setupCI: true,
      configureEnvVars: true,
      installDependencies: true,
      setupDatabase: true,
      generateDockerCompose: true,
      ...config,
    };
  }

  async setupEnvironment(): Promise<void> {
    console.log('🚀 環境構築を開始します...');

    // プロジェクトタイプを検出
    if (this.config.autoDetect) {
      this.projectInfo = await this.detectProjectType();
      console.log(
        `✅ プロジェクトタイプを検出: ${this.projectInfo.type} (${this.projectInfo.framework || 'vanilla'})`
      );
    }

    // 依存関係をインストール
    if (this.config.installDependencies && this.projectInfo) {
      await this.installDependencies();
    }

    // 環境変数を設定
    if (this.config.configureEnvVars) {
      await this.configureEnvironmentVariables();
    }

    // Dockerfileを生成
    if (this.config.generateDockerfile) {
      await this.generateDockerfile();
    }

    // Docker Composeを生成
    if (this.config.generateDockerCompose && this.projectInfo) {
      await this.generateDockerCompose();
    }

    // データベースをセットアップ
    if (this.config.setupDatabase && this.projectInfo?.database) {
      await this.setupDatabase();
    }

    // CI/CDをセットアップ
    if (this.config.setupCI) {
      await this.setupCICD();
    }

    // 開発サーバーを起動
    await this.startDevelopmentServer();

    console.log('✅ 環境構築が完了しました！');
  }

  private async detectProjectType(): Promise<ProjectInfo> {
    const info: ProjectInfo = {
      type: 'node',
      services: [],
      ports: [],
    };

    // package.jsonを確認
    if (fs.existsSync(path.join(this.projectRoot, 'package.json'))) {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf-8')
      );
      info.type = 'node';

      // パッケージマネージャーを検出
      if (fs.existsSync(path.join(this.projectRoot, 'yarn.lock'))) {
        info.packageManager = 'yarn';
      } else if (fs.existsSync(path.join(this.projectRoot, 'pnpm-lock.yaml'))) {
        info.packageManager = 'pnpm';
      } else {
        info.packageManager = 'npm';
      }

      // フレームワークを検出
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps['next']) {
        info.framework = 'nextjs';
        info.ports.push(3000);
      } else if (deps['@angular/core']) {
        info.framework = 'angular';
        info.ports.push(4200);
      } else if (deps['react']) {
        info.framework = 'react';
        info.ports.push(3000);
      } else if (deps['vue']) {
        info.framework = 'vue';
        info.ports.push(8080);
      } else if (deps['express']) {
        info.framework = 'express';
        info.ports.push(3000);
      } else if (deps['@nestjs/core']) {
        info.framework = 'nestjs';
        info.ports.push(3000);
      }

      // Node.jsバージョンを検出
      if (packageJson.engines?.node) {
        info.runtime = packageJson.engines.node;
      }

      // データベースを検出
      if (deps['pg'] || deps['postgres']) {
        info.database = 'postgres';
      } else if (deps['mysql'] || deps['mysql2']) {
        info.database = 'mysql';
      } else if (deps['mongodb'] || deps['mongoose']) {
        info.database = 'mongodb';
      } else if (deps['redis']) {
        info.services.push('redis');
      }
    }

    // requirements.txtを確認（Python）
    else if (
      fs.existsSync(path.join(this.projectRoot, 'requirements.txt')) ||
      fs.existsSync(path.join(this.projectRoot, 'Pipfile')) ||
      fs.existsSync(path.join(this.projectRoot, 'pyproject.toml'))
    ) {
      info.type = 'python';
      info.packageManager = 'pip';

      const requirementsPath = path.join(this.projectRoot, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const requirements = fs.readFileSync(requirementsPath, 'utf-8');

        if (requirements.includes('django')) {
          info.framework = 'django';
          info.ports.push(8000);
        } else if (requirements.includes('flask')) {
          info.framework = 'flask';
          info.ports.push(5000);
        } else if (requirements.includes('fastapi')) {
          info.framework = 'fastapi';
          info.ports.push(8000);
        }

        if (requirements.includes('psycopg2')) {
          info.database = 'postgres';
        } else if (requirements.includes('pymongo')) {
          info.database = 'mongodb';
        }
      }
    }

    // Gemfileを確認（Ruby）
    else if (fs.existsSync(path.join(this.projectRoot, 'Gemfile'))) {
      info.type = 'ruby';
      info.packageManager = 'bundler';

      const gemfile = fs.readFileSync(path.join(this.projectRoot, 'Gemfile'), 'utf-8');
      if (gemfile.includes('rails')) {
        info.framework = 'rails';
        info.ports.push(3000);
      } else if (gemfile.includes('sinatra')) {
        info.framework = 'sinatra';
        info.ports.push(4567);
      }
    }

    // go.modを確認（Go）
    else if (fs.existsSync(path.join(this.projectRoot, 'go.mod'))) {
      info.type = 'go';
      info.ports.push(8080);
    }

    // pom.xmlを確認（Java）
    else if (
      fs.existsSync(path.join(this.projectRoot, 'pom.xml')) ||
      fs.existsSync(path.join(this.projectRoot, 'build.gradle'))
    ) {
      info.type = 'java';
      info.ports.push(8080);

      if (fs.existsSync(path.join(this.projectRoot, 'pom.xml'))) {
        const pom = fs.readFileSync(path.join(this.projectRoot, 'pom.xml'), 'utf-8');
        if (pom.includes('spring-boot')) {
          info.framework = 'spring-boot';
        }
      }
    }

    // composer.jsonを確認（PHP）
    else if (fs.existsSync(path.join(this.projectRoot, 'composer.json'))) {
      info.type = 'php';
      info.packageManager = 'composer';

      const composer = JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, 'composer.json'), 'utf-8')
      );
      if (composer.require?.['laravel/framework']) {
        info.framework = 'laravel';
        info.ports.push(8000);
      } else if (composer.require?.['symfony/framework-bundle']) {
        info.framework = 'symfony';
        info.ports.push(8000);
      }
    }

    return info;
  }

  private async installDependencies(): Promise<void> {
    if (!this.projectInfo) return;

    console.log('📦 依存関係をインストール中...');

    const commands: Record<string, string> = {
      npm: 'npm install',
      yarn: 'yarn install',
      pnpm: 'pnpm install',
      pip: 'pip install -r requirements.txt',
      bundler: 'bundle install',
      composer: 'composer install',
    };

    const command = commands[this.projectInfo.packageManager || 'npm'];
    if (command) {
      try {
        await execAsync(command, { cwd: this.projectRoot });
        console.log('✅ 依存関係のインストールが完了しました');
      } catch (error) {
        console.error('依存関係のインストールに失敗しました:', error);
      }
    }
  }

  private async configureEnvironmentVariables(): Promise<void> {
    console.log('🔐 環境変数を設定中...');

    const envPath = path.join(this.projectRoot, '.env');
    const envExamplePath = path.join(this.projectRoot, '.env.example');

    // .env.exampleが存在する場合はコピー
    if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env.exampleから.envを作成しました');
    }

    // .envが存在しない場合は新規作成
    if (!fs.existsSync(envPath)) {
      const defaultEnv = this.generateDefaultEnv();
      fs.writeFileSync(envPath, defaultEnv);
      console.log('✅ デフォルトの.envファイルを作成しました');
    }

    // .gitignoreに.envを追加
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.env')) {
        fs.appendFileSync(gitignorePath, '\n# Environment variables\n.env\n.env.local\n');
      }
    }
  }

  private generateDefaultEnv(): string {
    const env: string[] = [
      '# Application',
      'NODE_ENV=development',
      `PORT=${this.projectInfo?.ports[0] || 3000}`,
      '',
      '# Database',
    ];

    if (this.projectInfo?.database) {
      switch (this.projectInfo.database) {
        case 'postgres':
          env.push(
            'DATABASE_URL=postgresql://user:password@localhost:5432/myapp',
            'POSTGRES_USER=user',
            'POSTGRES_PASSWORD=password',
            'POSTGRES_DB=myapp'
          );
          break;
        case 'mysql':
          env.push(
            'DATABASE_URL=mysql://user:password@localhost:3306/myapp',
            'MYSQL_ROOT_PASSWORD=rootpassword',
            'MYSQL_DATABASE=myapp',
            'MYSQL_USER=user',
            'MYSQL_PASSWORD=password'
          );
          break;
        case 'mongodb':
          env.push(
            'MONGODB_URI=mongodb://localhost:27017/myapp',
            'MONGO_INITDB_ROOT_USERNAME=root',
            'MONGO_INITDB_ROOT_PASSWORD=password'
          );
          break;
      }
    }

    env.push(
      '',
      '# Redis',
      'REDIS_URL=redis://localhost:6379',
      '',
      '# Security',
      'JWT_SECRET=your-secret-key-here',
      'SESSION_SECRET=your-session-secret-here'
    );

    return env.join('\n');
  }

  private async generateDockerfile(): Promise<void> {
    console.log('🐳 Dockerfileを生成中...');

    const dockerfilePath = path.join(this.projectRoot, 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      console.log('ℹ️  Dockerfileは既に存在します');
      return;
    }

    const dockerfile = this.createDockerfileContent();
    fs.writeFileSync(dockerfilePath, dockerfile);

    // .dockerignoreも生成
    const dockerignore = this.createDockerignoreContent();
    fs.writeFileSync(path.join(this.projectRoot, '.dockerignore'), dockerignore);

    console.log('✅ Dockerfileを生成しました');
  }

  private createDockerfileContent(): string {
    if (!this.projectInfo) return '';

    const templates: Record<string, string> = {
      node: `# Build stage
FROM node:${this.projectInfo.runtime || '18-alpine'} AS builder
WORKDIR /app
COPY package*.json ./
RUN ${this.projectInfo.packageManager || 'npm'} ci --only=production

# Production stage
FROM node:${this.projectInfo.runtime || '18-alpine'}
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE ${this.projectInfo.ports[0] || 3000}
CMD ["${this.projectInfo.packageManager || 'npm'}", "start"]`,

      python: `FROM python:${this.projectInfo.runtime || '3.11-slim'}
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE ${this.projectInfo.ports[0] || 8000}
CMD ["python", "app.py"]`,

      ruby: `FROM ruby:${this.projectInfo.runtime || '3.2-slim'}
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
EXPOSE ${this.projectInfo.ports[0] || 3000}
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]`,

      go: `# Build stage
FROM golang:${this.projectInfo.runtime || '1.21-alpine'} AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main .

# Production stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE ${this.projectInfo.ports[0] || 8080}
CMD ["./main"]`,

      java: `FROM openjdk:${this.projectInfo.runtime || '17-slim'}
WORKDIR /app
COPY target/*.jar app.jar
EXPOSE ${this.projectInfo.ports[0] || 8080}
CMD ["java", "-jar", "app.jar"]`,

      php: `FROM php:${this.projectInfo.runtime || '8.2-apache'}
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader
COPY . .
RUN chown -R www-data:www-data /var/www/html
EXPOSE 80
CMD ["apache2-foreground"]`,

      dotnet: `FROM mcr.microsoft.com/dotnet/sdk:${this.projectInfo.runtime || '7.0'} AS builder
WORKDIR /app
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:${this.projectInfo.runtime || '7.0'}
WORKDIR /app
COPY --from=builder /app/out .
EXPOSE 80
CMD ["dotnet", "app.dll"]`,
    };

    return templates[this.projectInfo.type] || templates.node;
  }

  private createDockerignoreContent(): string {
    return `node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
.vscode
.idea
.DS_Store
dist
build
*.log
coverage
.nyc_output
.pytest_cache
__pycache__
*.pyc
.mypy_cache`;
  }

  private async generateDockerCompose(): Promise<void> {
    console.log('🐳 Docker Composeファイルを生成中...');

    const composePath = path.join(this.projectRoot, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
      console.log('ℹ️  docker-compose.ymlは既に存在します');
      return;
    }

    const services: ServiceConfig[] = [
      {
        name: 'app',
        image: 'app',
        ports: [`${this.projectInfo!.ports[0] || 3000}:${this.projectInfo!.ports[0] || 3000}`],
        environment: {
          NODE_ENV: 'development',
        },
        volumes: ['.:/app', '/app/node_modules'],
      },
    ];

    // データベースサービスを追加
    if (this.projectInfo?.database) {
      const dbService = this.createDatabaseService(this.projectInfo.database);
      if (dbService) {
        services.push(dbService);
        services[0].depends_on = [dbService.name];
      }
    }

    // Redisサービスを追加
    if (this.projectInfo?.services.includes('redis')) {
      services.push({
        name: 'redis',
        image: 'redis:7-alpine',
        ports: ['6379:6379'],
      });
      services[0].depends_on = [...(services[0].depends_on || []), 'redis'];
    }

    const compose = {
      version: '3.8',
      services: services.reduce((acc, service) => {
        acc[service.name] = {
          image: service.image,
          build: service.name === 'app' ? '.' : undefined,
          ports: service.ports,
          environment: service.environment,
          volumes: service.volumes,
          depends_on: service.depends_on,
        };
        return acc;
      }, {} as any),
    };

    const yamlStr = yaml.dump(compose);
    fs.writeFileSync(composePath, yamlStr);

    console.log('✅ docker-compose.ymlを生成しました');
  }

  private createDatabaseService(database: string): ServiceConfig | null {
    const configs: Record<string, ServiceConfig> = {
      postgres: {
        name: 'postgres',
        image: 'postgres:15-alpine',
        ports: ['5432:5432'],
        environment: {
          POSTGRES_USER: 'user',
          POSTGRES_PASSWORD: 'password',
          POSTGRES_DB: 'myapp',
        },
        volumes: ['postgres_data:/var/lib/postgresql/data'],
      },
      mysql: {
        name: 'mysql',
        image: 'mysql:8',
        ports: ['3306:3306'],
        environment: {
          MYSQL_ROOT_PASSWORD: 'rootpassword',
          MYSQL_DATABASE: 'myapp',
          MYSQL_USER: 'user',
          MYSQL_PASSWORD: 'password',
        },
        volumes: ['mysql_data:/var/lib/mysql'],
      },
      mongodb: {
        name: 'mongodb',
        image: 'mongo:6',
        ports: ['27017:27017'],
        environment: {
          MONGO_INITDB_ROOT_USERNAME: 'root',
          MONGO_INITDB_ROOT_PASSWORD: 'password',
        },
        volumes: ['mongo_data:/data/db'],
      },
    };

    return configs[database] || null;
  }

  private async setupDatabase(): Promise<void> {
    if (!this.projectInfo?.database) return;

    console.log(`🗄️  ${this.projectInfo.database}データベースをセットアップ中...`);

    // Docker Composeが存在する場合は起動
    if (fs.existsSync(path.join(this.projectRoot, 'docker-compose.yml'))) {
      try {
        await execAsync(`docker-compose up -d ${this.projectInfo.database}`, {
          cwd: this.projectRoot,
        });
        console.log('✅ データベースコンテナを起動しました');

        // 接続待機
        console.log('データベースの起動を待機中...');
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // マイグレーション実行
        await this.runDatabaseMigrations();
      } catch (error) {
        console.error('データベースの起動に失敗しました:', error);
      }
    }
  }

  private async runDatabaseMigrations(): Promise<void> {
    if (!this.projectInfo) return;

    const migrationCommands: Record<string, Record<string, string>> = {
      node: {
        express: 'npm run migrate',
        nestjs: 'npm run migration:run',
      },
      python: {
        django: 'python manage.py migrate',
        flask: 'flask db upgrade',
      },
      ruby: {
        rails: 'rails db:migrate',
      },
    };

    const commands = migrationCommands[this.projectInfo.type];
    if (commands && this.projectInfo.framework) {
      const command = commands[this.projectInfo.framework];
      if (command) {
        try {
          console.log('マイグレーションを実行中...');
          await execAsync(command, { cwd: this.projectRoot });
          console.log('✅ マイグレーションが完了しました');
        } catch (error) {
          console.warn('マイグレーションの実行に失敗しました:', error);
        }
      }
    }
  }

  private async setupCICD(): Promise<void> {
    console.log('🔄 CI/CDパイプラインを設定中...');

    const githubDir = path.join(this.projectRoot, '.github', 'workflows');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    // GitHub Actionsワークフローを生成
    const workflow = this.generateGitHubActionsWorkflow();
    fs.writeFileSync(path.join(githubDir, 'ci.yml'), workflow);

    console.log('✅ GitHub Actionsワークフローを生成しました');
  }

  private generateGitHubActionsWorkflow(): string {
    if (!this.projectInfo) return '';

    const workflows: Record<string, string> = {
      node: `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      ${
        this.projectInfo.database
          ? `${this.projectInfo.database}:
        image: ${this.projectInfo.database}:latest
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5`
          : ''
      }
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: '${this.projectInfo.packageManager || 'npm'}'
    
    - name: Install dependencies
      run: ${this.projectInfo.packageManager || 'npm'} ci
    
    - name: Run tests
      run: ${this.projectInfo.packageManager || 'npm'} test
    
    - name: Run linter
      run: ${this.projectInfo.packageManager || 'npm'} run lint
    
    - name: Build
      run: ${this.projectInfo.packageManager || 'npm'} run build`,

      python: `name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install pytest flake8
    
    - name: Run tests
      run: pytest
    
    - name: Run linter
      run: flake8 .`,
    };

    return workflows[this.projectInfo.type] || workflows.node;
  }

  private async startDevelopmentServer(): Promise<void> {
    console.log('🚀 開発サーバーを起動中...');

    // Docker Composeが存在する場合
    if (fs.existsSync(path.join(this.projectRoot, 'docker-compose.yml'))) {
      console.log('\n開発環境を起動するには以下のコマンドを実行してください:');
      console.log('  docker-compose up');
      return;
    }

    // package.jsonのスクリプトを確認
    if (this.projectInfo?.type === 'node') {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        if (packageJson.scripts?.dev) {
          console.log('\n開発サーバーを起動するには以下のコマンドを実行してください:');
          console.log(`  ${this.projectInfo.packageManager || 'npm'} run dev`);
        } else if (packageJson.scripts?.start) {
          console.log('\n開発サーバーを起動するには以下のコマンドを実行してください:');
          console.log(`  ${this.projectInfo.packageManager || 'npm'} start`);
        }
      }
    }
  }

  async generateSetupScript(): Promise<void> {
    console.log('📝 セットアップスクリプトを生成中...');

    const script = `#!/bin/bash

# ${this.projectInfo?.framework || 'Project'} Setup Script
# Generated by Claude Code Auto Action

echo "🚀 Starting project setup..."

# Check prerequisites
command -v ${this.projectInfo?.type === 'node' ? 'node' : this.projectInfo?.type} >/dev/null 2>&1 || { 
  echo "❌ ${this.projectInfo?.type} is not installed. Please install it first."; 
  exit 1; 
}

# Install dependencies
echo "📦 Installing dependencies..."
${this.getInstallCommand()}

# Setup environment
if [ ! -f .env ]; then
  echo "🔐 Creating .env file..."
  cp .env.example .env 2>/dev/null || touch .env
fi

# Setup database
if command -v docker-compose >/dev/null 2>&1; then
  echo "🗄️ Starting database..."
  docker-compose up -d ${this.projectInfo?.database || ''}
  sleep 5
fi

# Run migrations
echo "📊 Running migrations..."
${this.getMigrationCommand()}

echo "✅ Setup completed!"
echo ""
echo "To start the development server, run:"
echo "  ${this.getStartCommand()}"
`;

    const scriptPath = path.join(this.projectRoot, 'setup.sh');
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');

    console.log('✅ setup.shスクリプトを生成しました');
  }

  private getInstallCommand(): string {
    const commands: Record<string, string> = {
      npm: 'npm install',
      yarn: 'yarn install',
      pnpm: 'pnpm install',
      pip: 'pip install -r requirements.txt',
      bundler: 'bundle install',
      composer: 'composer install',
    };

    return commands[this.projectInfo?.packageManager || 'npm'] || 'echo "No install command"';
  }

  private getMigrationCommand(): string {
    if (!this.projectInfo) return 'echo "No migrations to run"';

    const commands: Record<string, Record<string, string>> = {
      node: {
        express: 'npm run migrate 2>/dev/null || echo "No migrations"',
        nestjs: 'npm run migration:run 2>/dev/null || echo "No migrations"',
      },
      python: {
        django: 'python manage.py migrate',
        flask: 'flask db upgrade',
      },
      ruby: {
        rails: 'rails db:migrate',
      },
    };

    const typeCommands = commands[this.projectInfo.type];
    if (typeCommands && this.projectInfo.framework) {
      return typeCommands[this.projectInfo.framework] || 'echo "No migrations"';
    }

    return 'echo "No migrations to run"';
  }

  private getStartCommand(): string {
    if (!this.projectInfo) return 'npm start';

    const commands: Record<string, string> = {
      npm: 'npm run dev || npm start',
      yarn: 'yarn dev || yarn start',
      pnpm: 'pnpm dev || pnpm start',
      pip: 'python app.py',
      bundler: 'rails server',
      composer: 'php -S localhost:8000',
    };

    return commands[this.projectInfo.packageManager || 'npm'] || 'npm start';
  }
}
