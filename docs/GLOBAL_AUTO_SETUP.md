# /Users/hashiguchimasaki/project 配下での自動権限設定

このドキュメントでは、`/Users/hashiguchimasaki/project` フォルダー配下のすべてのプロジェクトでClaude Codeの権限を自動的に許可する設定について説明します。

## 🚀 クイックスタート

```bash
# グローバル設定を適用
/Users/hashiguchimasaki/project/claude-code-auto-action/scripts/setup-global.sh

# シェルを再読み込み
source ~/.zshrc

# 設定を確認
cc-info
```

## 📁 仕組み

### 1. 自動ディレクトリ検出

シェル（zsh/bash）が自動的に現在のディレクトリを監視し、`/Users/hashiguchimasaki/project` 配下にいる場合は自動的にYOLO Modeを有効化します。

```bash
# /Users/hashiguchimasaki/project/my-app にいる場合
$ pwd
/Users/hashiguchimasaki/project/my-app
$ cc-info
✅ Auto-permissions ENABLED for this directory

# 他のディレクトリにいる場合
$ cd ~
$ cc-info
⚠️  Auto-permissions DISABLED (not in project directory)
```

### 2. 設定の優先順位

1. **プロジェクト固有の設定** (`.claude/settings.json`)
2. **グローバル設定** (`~/.claude/global-settings.json`)
3. **デフォルト設定**

### 3. 自動的に許可される操作

- ✅ すべてのnpm/yarn/pnpmコマンド
- ✅ Git操作（commit, push, pull等）
- ✅ ファイルの読み書き編集
- ✅ テスト実行（pytest, jest等）
- ✅ リンター/フォーマッター（eslint, prettier, ruff等）
- ✅ ディレクトリ操作（ls, cd, mkdir等）
- ✅ Task実行、Web検索

### 4. ブロックされる操作

- ❌ rm -rf（破壊的削除）
- ❌ sudo（管理者権限）
- ❌ ssh/scp（リモート接続）
- ❌ curl/wget（ダウンロード）
- ❌ .env, secret, keyファイルの編集
- ❌ システムファイル（/etc, /System）の編集

## 🛠️ 使用方法

### 基本コマンド

```bash
# プロジェクトディレクトリに移動
cd /Users/hashiguchimasaki/project/my-app

# Claudeに質問（自動的に権限許可）
cc "このプロジェクトのバグを修正して"

# ファイル監視と自動コミット
cc-watch

# コスト確認
cc-cost

# コンテキストクリア
cc-clear
```

### 新規プロジェクトのセットアップ

```bash
# プロジェクトディレクトリで実行
cd /Users/hashiguchimasaki/project/new-project
cc-setup

# CLAUDE.mdを編集してプロジェクト情報を追加
vim CLAUDE.md
```

## 🔧 カスタマイズ

### プロジェクト固有の設定を追加

```bash
# .claude/settings.json を作成
mkdir .claude
cat > .claude/settings.json << EOF
{
  "preferredModel": "opus",  // このプロジェクトはOpusを使用
  "hooks": {
    "pre_run": "npm test",   // 実行前に必ずテスト
    "post_task": "/compact"  // タスク後に圧縮
  }
}
EOF
```

### 一時的に安全モードに切り替え

```bash
# 重要な操作の前に
cc-safe "本番環境の設定を変更"
```

## 📊 ステータス確認

```bash
# 現在の設定を表示
cc-info

# ログを確認
tail -f ~/.claude/logs/global.log
```

## ⚠️ 注意事項

1. **セキュリティ**: この設定は開発効率を優先しています。本番環境では使用しないでください。

2. **コスト管理**: 日次上限は$8に設定されていますが、定期的に確認してください。

3. **Git操作**: 自動コミットが有効な場合、意図しないコミットが作成される可能性があります。

4. **ディレクトリ制限**: `/Users/hashiguchimasaki/project` 外では自動権限は無効です。

## 🔄 設定の更新

```bash
# グローバル設定を編集
vim ~/.claude/global-settings.json

# 設定を再読み込み
source ~/.zshrc
```

## 🗑️ アンインストール

```bash
# 設定を削除
rm -rf ~/.claude
rm -rf ~/.git-templates

# .zshrc/.bashrc から CLAUDE_CODE_AUTO_ACTION_GLOBAL セクションを削除
vim ~/.zshrc
```