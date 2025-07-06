# 他のプロジェクトでClaude Code Auto Actionを使用する方法

このドキュメントでは、Claude Code Auto Actionの設定を他のプロジェクトで再利用する方法を説明します。

## 方法1: セットアップスクリプトを使用（推奨）

最も簡単な方法は、提供されているセットアップスクリプトを使用することです。

```bash
# 新しいプロジェクトに移動
cd /path/to/your/project

# セットアップスクリプトを実行
/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/setup-project.sh

# シンボリックリンクを使用する場合（設定の変更が即座に反映される）
/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/setup-project.sh --link
```

## 方法2: グローバルエイリアスを設定

シェルにエイリアスを追加して、どこからでもアクセスできるようにします。

```bash
# エイリアスを追加
/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/setup-project.sh --aliases

# シェルを再読み込み
source ~/.zshrc  # または ~/.bashrc

# 使用例
ccp "このプロジェクトのREADMEを改善して"  # プロジェクト固有の設定を使用
ccaa-watch  # ファイル監視を開始
ccaa-commit  # 自動コミット
```

## 方法3: 環境変数でパスを指定

```bash
# .zshrc or .bashrc に追加
export CLAUDE_AUTO_ACTION_HOME="/Users/hashiguchimasaki/project/claude-code-auto-action"

# 任意のディレクトリから実行
$CLAUDE_AUTO_ACTION_HOME/scripts/claude-auto.sh watch
```

## 方法4: VSCode/Cursorのワークスペース設定

### ワークスペース設定（.vscode/settings.json）

```json
{
  "claude.configPath": "/Users/hashiguchimasaki/project/claude-code-auto-action/.claude/settings.json",
  "claude.permissionsPath": "/Users/hashiguchimasaki/project/claude-code-auto-action/.claude/permissions.json",
  "claude.scriptsPath": "/Users/hashiguchimasaki/project/claude-code-auto-action/scripts",
  
  // タスク自動実行
  "task.autoDetect": "on",
  "terminal.integrated.automationProfile.osx": {
    "path": "/bin/zsh",
    "args": ["-c", "source /Users/hashiguchimasaki/project/claude-code-auto-action/scripts/setup-project.sh --link"]
  }
}
```

### タスク定義（.vscode/tasks.json）

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Claude Auto Commit",
      "type": "shell",
      "command": "/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/claude-auto.sh",
      "args": ["commit"],
      "problemMatcher": [],
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Claude Watch",
      "type": "shell",
      "command": "/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/claude-auto.sh",
      "args": ["watch"],
      "isBackground": true,
      "problemMatcher": []
    }
  ]
}
```

## 方法5: npmパッケージとして参照（Node.jsプロジェクト）

package.jsonに追加:

```json
{
  "scripts": {
    "claude:setup": "node /Users/hashiguchimasaki/project/claude-code-auto-action/scripts/setup.js",
    "claude:watch": "/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/claude-auto.sh watch",
    "claude:commit": "/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/claude-auto.sh commit",
    "precommit": "npm run claude:commit"
  },
  "claude": {
    "autoActionPath": "/Users/hashiguchimasaki/project/claude-code-auto-action"
  }
}
```

## プロジェクト固有の設定をオーバーライド

各プロジェクトで独自の設定を持ちたい場合:

```bash
# 基本設定をコピー
cp /Users/hashiguchimasaki/project/claude-code-auto-action/.claude/settings.json .claude/

# プロジェクト固有の設定を編集
vi .claude/settings.json
```

### 設定の優先順位

1. プロジェクトローカルの `.claude/settings.json`
2. 環境変数 `CLAUDE_CONFIG_PATH` で指定されたパス
3. グローバル設定 `~/.claude/settings.json`
4. Claude Code Auto Actionのデフォルト設定

## ベストプラクティス

1. **共有設定はシンボリックリンク** - 更新が即座に反映される
2. **プロジェクト固有設定はコピー** - 独立性を保つ
3. **CLAUDE.mdは必ずプロジェクト固有** - コンテキストを正確に
4. **定期的に本体を更新** - `cd $CLAUDE_AUTO_ACTION_HOME && git pull`

## トラブルシューティング

### パスが見つからない場合
```bash
# 絶対パスを確認
echo $CLAUDE_AUTO_ACTION_HOME
realpath /Users/hashiguchimasaki/project/claude-code-auto-action
```

### 権限エラー
```bash
# 実行権限を付与
chmod +x /Users/hashiguchimasaki/project/claude-code-auto-action/scripts/*.sh
```

### 設定が反映されない
```bash
# キャッシュをクリア
rm -rf ~/.claude/cache
# Claudeを再起動
claude /restart
```