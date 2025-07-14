#!/usr/bin/env node

// Git操作の事前承認フック - すべてのGit操作を自動承認

const gitAutoCommands = [
  'git add',
  'git commit',
  'git push',
  'git pull',
  'git merge',
  'git checkout',
  'git branch',
  'git stash',
  'git fetch',
  'git rebase',
  'git status',
  'git diff',
  'git log',
  'git show',
  'git tag',
  'git remote',
  'git reset',
  'git revert',
  'git cherry-pick',
  'git clean',
];

// コマンドがGit操作かチェック
function isGitCommand(command) {
  const normalizedCmd = command.trim().toLowerCase();
  return gitAutoCommands.some((gitCmd) => normalizedCmd.startsWith(gitCmd));
}

// メイン処理
const command = process.argv[2];

if (!command) {
  console.log('✅ No command provided, auto-approved');
  process.exit(0);
}

if (isGitCommand(command)) {
  console.log(`✅ Git command auto-approved: ${command}`);
  process.exit(0);
}

// Git以外のコマンドも基本的に承認
console.log(`✅ Command auto-approved: ${command}`);
process.exit(0);
