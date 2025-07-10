import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as semver from 'semver';

const execAsync = promisify(exec);

interface VersionConfig {
  semantic: boolean;
  autoTag: boolean;
  generateChangelog: boolean;
  conventionalCommits: boolean;
  prereleaseIdentifier: string;
  versionFiles: string[];
  tagPrefix: string;
}

interface CommitInfo {
  hash: string;
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore' | 'build' | 'ci';
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  issues: string[];
}

interface VersionBump {
  currentVersion: string;
  newVersion: string;
  bumpType: 'major' | 'minor' | 'patch' | 'prerelease';
  reason: string;
  commits: CommitInfo[];
}

interface ChangelogEntry {
  version: string;
  date: Date;
  changes: {
    breaking: string[];
    features: string[];
    fixes: string[];
    performance: string[];
    other: string[];
  };
}

export class AutoVersionManager {
  private projectRoot: string;
  private config: VersionConfig;
  private packageJsonPath: string;
  
  constructor(projectRoot: string, config?: Partial<VersionConfig>) {
    this.projectRoot = projectRoot;
    this.packageJsonPath = path.join(projectRoot, 'package.json');
    this.config = {
      semantic: true,
      autoTag: true,
      generateChangelog: true,
      conventionalCommits: true,
      prereleaseIdentifier: 'beta',
      versionFiles: ['package.json', 'package-lock.json'],
      tagPrefix: 'v',
      ...config
    };
  }
  
  async bumpVersion(explicitBump?: 'major' | 'minor' | 'patch' | 'prerelease'): Promise<VersionBump> {
    console.log('🔢 バージョンを更新中...');
    
    const currentVersion = await this.getCurrentVersion();
    const commits = await this.getCommitsSinceLastTag();
    
    // バンプタイプを決定
    const bumpType = explicitBump || this.determineBumpType(commits);
    
    // 新しいバージョンを計算
    const newVersion = this.calculateNewVersion(currentVersion, bumpType);
    
    // バージョンファイルを更新
    await this.updateVersionFiles(newVersion);
    
    // Changelogを生成
    if (this.config.generateChangelog) {
      await this.updateChangelog(currentVersion, newVersion, commits);
    }
    
    // Gitタグを作成
    if (this.config.autoTag) {
      await this.createGitTag(newVersion, commits);
    }
    
    console.log(`✅ バージョンを ${currentVersion} から ${newVersion} に更新しました`);
    
    return {
      currentVersion,
      newVersion,
      bumpType,
      reason: this.getBumpReason(commits, bumpType),
      commits
    };
  }
  
  private async getCurrentVersion(): Promise<string> {
    try {
      if (fs.existsSync(this.packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
        return packageJson.version || '0.0.0';
      }
    } catch (error) {
      console.warn('package.jsonからバージョンを読み取れませんでした');
    }
    
    // Gitタグから取得
    try {
      const { stdout } = await execAsync('git describe --tags --abbrev=0', { cwd: this.projectRoot });
      return stdout.trim().replace(this.config.tagPrefix, '');
    } catch {
      return '0.0.0';
    }
  }
  
  private async getCommitsSinceLastTag(): Promise<CommitInfo[]> {
    try {
      // 最後のタグを取得
      const { stdout: lastTag } = await execAsync(
        'git describe --tags --abbrev=0',
        { cwd: this.projectRoot }
      ).catch(() => ({ stdout: '' }));
      
      // コミットログを取得
      const range = lastTag.trim() ? `${lastTag.trim()}..HEAD` : 'HEAD';
      const { stdout } = await execAsync(
        `git log ${range} --pretty=format:"%H|%s|%b|%D"`,
        { cwd: this.projectRoot }
      );
      
      if (!stdout.trim()) {
        return [];
      }
      
      return stdout.split('\n').map(line => this.parseCommit(line)).filter(Boolean) as CommitInfo[];
    } catch (error) {
      console.error('コミット履歴の取得に失敗しました:', error);
      return [];
    }
  }
  
  private parseCommit(logLine: string): CommitInfo | null {
    const [hash, subject, body, refs] = logLine.split('|');
    
    if (!hash || !subject) return null;
    
    // Conventional Commitsフォーマットを解析
    const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);
    
    let type: CommitInfo['type'] = 'chore';
    let scope: string | undefined;
    let parsedSubject = subject;
    
    if (conventionalMatch) {
      const [, commitType, commitScope, commitSubject] = conventionalMatch;
      type = this.normalizeCommitType(commitType);
      scope = commitScope;
      parsedSubject = commitSubject;
    }
    
    // Breaking changeを検出
    const breaking = subject.includes('!') || body.toLowerCase().includes('breaking change');
    
    // Issue番号を抽出
    const issues = this.extractIssueNumbers(subject + ' ' + body);
    
    return {
      hash: hash.substring(0, 7),
      type,
      scope,
      subject: parsedSubject,
      body: body.trim() || undefined,
      breaking,
      issues
    };
  }
  
  private normalizeCommitType(type: string): CommitInfo['type'] {
    const typeMap: Record<string, CommitInfo['type']> = {
      feat: 'feat',
      feature: 'feat',
      fix: 'fix',
      bugfix: 'fix',
      docs: 'docs',
      style: 'style',
      refactor: 'refactor',
      perf: 'perf',
      performance: 'perf',
      test: 'test',
      tests: 'test',
      build: 'build',
      ci: 'ci',
      chore: 'chore'
    };
    
    return typeMap[type.toLowerCase()] || 'chore';
  }
  
  private extractIssueNumbers(text: string): string[] {
    const issuePattern = /#(\d+)/g;
    const matches = text.match(issuePattern) || [];
    return matches.map(m => m.substring(1));
  }
  
  private determineBumpType(commits: CommitInfo[]): 'major' | 'minor' | 'patch' {
    // Breaking changeがある場合はメジャーバージョンアップ
    if (commits.some(c => c.breaking)) {
      return 'major';
    }
    
    // 新機能がある場合はマイナーバージョンアップ
    if (commits.some(c => c.type === 'feat')) {
      return 'minor';
    }
    
    // それ以外はパッチバージョンアップ
    return 'patch';
  }
  
  private calculateNewVersion(currentVersion: string, bumpType: 'major' | 'minor' | 'patch' | 'prerelease'): string {
    const current = semver.parse(currentVersion) || semver.parse('0.0.0')!;
    
    switch (bumpType) {
      case 'major':
        return semver.inc(current.version, 'major')!;
      case 'minor':
        return semver.inc(current.version, 'minor')!;
      case 'patch':
        return semver.inc(current.version, 'patch')!;
      case 'prerelease':
        return semver.inc(current.version, 'prerelease', this.config.prereleaseIdentifier)!;
      default:
        return current.version;
    }
  }
  
  private getBumpReason(commits: CommitInfo[], bumpType: string): string {
    if (bumpType === 'major') {
      const breaking = commits.filter(c => c.breaking);
      return `Breaking changes in ${breaking.length} commit(s)`;
    } else if (bumpType === 'minor') {
      const features = commits.filter(c => c.type === 'feat');
      return `${features.length} new feature(s)`;
    } else if (bumpType === 'patch') {
      const fixes = commits.filter(c => c.type === 'fix');
      return `${fixes.length} bug fix(es)`;
    }
    return 'Manual version bump';
  }
  
  private async updateVersionFiles(newVersion: string): Promise<void> {
    for (const file of this.config.versionFiles) {
      const filePath = path.join(this.projectRoot, file);
      
      if (fs.existsSync(filePath)) {
        if (file.endsWith('.json')) {
          await this.updateJsonVersion(filePath, newVersion);
        } else {
          await this.updateTextVersion(filePath, newVersion);
        }
      }
    }
  }
  
  private async updateJsonVersion(filePath: string, newVersion: string): Promise<void> {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      content.version = newVersion;
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    } catch (error) {
      console.error(`Failed to update ${filePath}:`, error);
    }
  }
  
  private async updateTextVersion(filePath: string, newVersion: string): Promise<void> {
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // バージョンパターンを置換
      const versionPatterns = [
        /version\s*=\s*["'][\d.]+["']/gi,
        /version:\s*["'][\d.]+["']/gi,
        /__version__\s*=\s*["'][\d.]+["']/gi
      ];
      
      for (const pattern of versionPatterns) {
        content = content.replace(pattern, (match) => {
          return match.replace(/[\d.]+/, newVersion);
        });
      }
      
      fs.writeFileSync(filePath, content);
    } catch (error) {
      console.error(`Failed to update ${filePath}:`, error);
    }
  }
  
  private async updateChangelog(oldVersion: string, newVersion: string, commits: CommitInfo[]): Promise<void> {
    console.log('📝 CHANGELOG.mdを更新中...');
    
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    const entry = this.generateChangelogEntry(newVersion, commits);
    
    let changelog = '';
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf-8');
    } else {
      changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }
    
    // エントリを挿入
    const entryText = this.formatChangelogEntry(entry);
    const insertPosition = changelog.indexOf('\n## ');
    
    if (insertPosition > -1) {
      changelog = changelog.slice(0, insertPosition) + '\n' + entryText + changelog.slice(insertPosition);
    } else {
      changelog += '\n' + entryText;
    }
    
    fs.writeFileSync(changelogPath, changelog);
  }
  
  private generateChangelogEntry(version: string, commits: CommitInfo[]): ChangelogEntry {
    const entry: ChangelogEntry = {
      version,
      date: new Date(),
      changes: {
        breaking: [],
        features: [],
        fixes: [],
        performance: [],
        other: []
      }
    };
    
    for (const commit of commits) {
      const message = commit.scope 
        ? `**${commit.scope}:** ${commit.subject}`
        : commit.subject;
      
      if (commit.breaking) {
        entry.changes.breaking.push(message);
      }
      
      switch (commit.type) {
        case 'feat':
          entry.changes.features.push(message);
          break;
        case 'fix':
          entry.changes.fixes.push(message);
          break;
        case 'perf':
          entry.changes.performance.push(message);
          break;
        default:
          if (!commit.breaking) {
            entry.changes.other.push(message);
          }
      }
    }
    
    return entry;
  }
  
  private formatChangelogEntry(entry: ChangelogEntry): string {
    let text = `## [${entry.version}] - ${entry.date.toISOString().split('T')[0]}\n\n`;
    
    if (entry.changes.breaking.length > 0) {
      text += '### ⚠ BREAKING CHANGES\n\n';
      entry.changes.breaking.forEach(change => {
        text += `- ${change}\n`;
      });
      text += '\n';
    }
    
    if (entry.changes.features.length > 0) {
      text += '### Features\n\n';
      entry.changes.features.forEach(change => {
        text += `- ${change}\n`;
      });
      text += '\n';
    }
    
    if (entry.changes.fixes.length > 0) {
      text += '### Bug Fixes\n\n';
      entry.changes.fixes.forEach(change => {
        text += `- ${change}\n`;
      });
      text += '\n';
    }
    
    if (entry.changes.performance.length > 0) {
      text += '### Performance Improvements\n\n';
      entry.changes.performance.forEach(change => {
        text += `- ${change}\n`;
      });
      text += '\n';
    }
    
    return text;
  }
  
  private async createGitTag(version: string, commits: CommitInfo[]): Promise<void> {
    const tag = `${this.config.tagPrefix}${version}`;
    const message = this.generateTagMessage(version, commits);
    
    try {
      // タグを作成
      await execAsync(`git tag -a ${tag} -m "${message}"`, { cwd: this.projectRoot });
      console.log(`✅ Gitタグ ${tag} を作成しました`);
      
      // リモートにプッシュするかを確認
      console.log('タグをリモートにプッシュするには以下を実行してください:');
      console.log(`  git push origin ${tag}`);
    } catch (error) {
      console.error('タグの作成に失敗しました:', error);
    }
  }
  
  private generateTagMessage(version: string, commits: CommitInfo[]): string {
    let message = `Release ${version}\n\n`;
    
    const features = commits.filter(c => c.type === 'feat');
    const fixes = commits.filter(c => c.type === 'fix');
    
    if (features.length > 0) {
      message += `Features:\n${features.map(c => `- ${c.subject}`).join('\n')}\n\n`;
    }
    
    if (fixes.length > 0) {
      message += `Bug Fixes:\n${fixes.map(c => `- ${c.subject}`).join('\n')}\n\n`;
    }
    
    return message;
  }
  
  async createRelease(version?: string): Promise<void> {
    const targetVersion = version || await this.getCurrentVersion();
    console.log(`🚀 リリース ${targetVersion} を作成中...`);
    
    // リリースノートを生成
    const releaseNotes = await this.generateReleaseNotes(targetVersion);
    
    // GitHubリリースを作成（gh CLIを使用）
    try {
      const { stdout } = await execAsync('gh --version', { cwd: this.projectRoot });
      if (stdout) {
        await this.createGitHubRelease(targetVersion, releaseNotes);
      }
    } catch {
      console.log('GitHub CLIが見つかりません。手動でリリースを作成してください。');
    }
    
    // リリースアーティファクトを生成
    await this.generateReleaseArtifacts(targetVersion);
  }
  
  private async generateReleaseNotes(version: string): Promise<string> {
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    
    if (!fs.existsSync(changelogPath)) {
      return `Release ${version}`;
    }
    
    const changelog = fs.readFileSync(changelogPath, 'utf-8');
    
    // バージョンセクションを抽出
    const versionPattern = new RegExp(`## \\[${version}\\][^#]*`, 's');
    const match = changelog.match(versionPattern);
    
    if (match) {
      return match[0].trim();
    }
    
    return `Release ${version}`;
  }
  
  private async createGitHubRelease(version: string, notes: string): Promise<void> {
    const tag = `${this.config.tagPrefix}${version}`;
    
    try {
      await execAsync(
        `gh release create ${tag} --title "Release ${version}" --notes "${notes}"`,
        { cwd: this.projectRoot }
      );
      console.log('✅ GitHubリリースを作成しました');
    } catch (error) {
      console.error('GitHubリリースの作成に失敗しました:', error);
    }
  }
  
  private async generateReleaseArtifacts(version: string): Promise<void> {
    const artifactsDir = path.join(this.projectRoot, 'releases', version);
    
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }
    
    // ビルドを実行
    try {
      console.log('📦 リリースアーティファクトを生成中...');
      await execAsync('npm run build', { cwd: this.projectRoot });
      
      // distディレクトリをコピー
      const distPath = path.join(this.projectRoot, 'dist');
      if (fs.existsSync(distPath)) {
        await execAsync(`cp -r ${distPath} ${artifactsDir}/`, { cwd: this.projectRoot });
      }
      
      // tarballを作成
      await execAsync(
        `tar -czf release-${version}.tar.gz -C ${artifactsDir} .`,
        { cwd: this.projectRoot }
      );
      
      console.log(`✅ リリースアーティファクトを生成しました: release-${version}.tar.gz`);
    } catch (error) {
      console.error('アーティファクトの生成に失敗しました:', error);
    }
  }
  
  async validateVersion(): Promise<boolean> {
    console.log('🔍 バージョンの整合性を検証中...');
    
    const currentVersion = await this.getCurrentVersion();
    const errors: string[] = [];
    
    // 各ファイルのバージョンをチェック
    for (const file of this.config.versionFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        const fileVersion = await this.extractVersionFromFile(filePath);
        if (fileVersion && fileVersion !== currentVersion) {
          errors.push(`${file}: ${fileVersion} (expected: ${currentVersion})`);
        }
      }
    }
    
    // タグとの整合性をチェック
    try {
      const { stdout } = await execAsync(
        `git tag -l "${this.config.tagPrefix}${currentVersion}"`,
        { cwd: this.projectRoot }
      );
      
      if (!stdout.trim()) {
        console.warn(`⚠️  タグ ${this.config.tagPrefix}${currentVersion} が存在しません`);
      }
    } catch {
      // タグチェックは失敗しても続行
    }
    
    if (errors.length > 0) {
      console.error('❌ バージョンの不整合が見つかりました:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }
    
    console.log('✅ バージョンの整合性が確認されました');
    return true;
  }
  
  private async extractVersionFromFile(filePath: string): Promise<string | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (filePath.endsWith('.json')) {
        const json = JSON.parse(content);
        return json.version || null;
      }
      
      // テキストファイルからバージョンを抽出
      const versionMatch = content.match(/version\s*[:=]\s*["']?([\d.]+\S*)/i);
      return versionMatch ? versionMatch[1] : null;
    } catch {
      return null;
    }
  }
}