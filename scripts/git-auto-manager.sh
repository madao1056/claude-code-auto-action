#!/bin/bash

# Git Auto Manager
# Git操作を完全自動化するスクリプト

# 設定
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SETTINGS_FILE="$PROJECT_DIR/.claude/settings.json"
LOG_FILE="$PROJECT_DIR/logs/git-auto.log"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 通知関数
notify() {
    local status="$1"
    local message="$2"
    "$SCRIPT_DIR/notify-completion.sh" "$status" "$message" 1
}

# Gitステータスをチェック
check_git_status() {
    cd "$PROJECT_DIR" || exit 1
    
    # 変更があるかチェック
    if [[ -z $(git status --porcelain) ]]; then
        return 1  # 変更なし
    fi
    return 0  # 変更あり
}

# 自動コミット
auto_commit() {
    log "🔄 自動コミット開始..."
    
    # 全ての変更をステージング
    git add -A
    
    # コミットメッセージを生成
    local changes=$(git diff --cached --stat)
    local file_count=$(git diff --cached --name-only | wc -l | tr -d ' ')
    local message=""
    
    # ファイルの種類に基づいてメッセージを生成
    if git diff --cached --name-only | grep -q "\.md$"; then
        message="docs: Update documentation"
    elif git diff --cached --name-only | grep -q "package\.json"; then
        message="deps: Update dependencies"
    elif git diff --cached --name-only | grep -q "test"; then
        message="test: Update tests"
    elif git diff --cached --name-only | grep -q "\.sh$"; then
        message="scripts: Update scripts"
    elif git diff --cached --name-only | grep -q "\.ts$\|\.js$"; then
        message="feat: Update code"
    else
        message="chore: Update files"
    fi
    
    # ファイル数を追加
    if [ "$file_count" -gt 1 ]; then
        message="$message ($file_count files)"
    fi
    
    # コミット実行
    git commit -m "$message" -m "Auto-committed by Git Auto Manager" -m "Files changed: $file_count"
    
    log "✅ コミット完了: $message"
}

# 自動プッシュ
auto_push() {
    log "🚀 自動プッシュ開始..."
    
    # 現在のブランチ名を取得
    local branch=$(git rev-parse --abbrev-ref HEAD)
    
    # リモートが設定されているかチェック
    if ! git remote | grep -q "origin"; then
        log "❌ リモートが設定されていません"
        return 1
    fi
    
    # プッシュ実行
    if git push origin "$branch" 2>&1 | tee -a "$LOG_FILE"; then
        log "✅ プッシュ完了"
        notify "completed" "Git自動プッシュ完了"
    else
        log "⚠️ プッシュ失敗 - コンフリクト解決を試みます"
        handle_push_conflict "$branch"
    fi
}

# プッシュコンフリクトの処理
handle_push_conflict() {
    local branch="$1"
    
    log "🔧 コンフリクト解決を開始..."
    
    # まずフェッチ
    git fetch origin
    
    # デフォルトはローカルを優先（設定から読み取り可能）
    local strategy=$(jq -r '.git.conflictStrategy // "local"' "$SETTINGS_FILE" 2>/dev/null || echo "local")
    
    if [ "$strategy" = "local" ]; then
        log "📌 ローカルの変更を優先します"
        # 強制プッシュ（注意：これは破壊的）
        if git push --force-with-lease origin "$branch"; then
            log "✅ 強制プッシュ完了（ローカル優先）"
            notify "warning" "Git強制プッシュ完了（ローカル優先）"
        else
            # それでも失敗したらマージを試みる
            merge_with_remote "$branch" "local"
        fi
    else
        log "📌 リモートの変更を優先します"
        merge_with_remote "$branch" "remote"
    fi
}

# リモートとマージ
merge_with_remote() {
    local branch="$1"
    local strategy="$2"
    
    log "🔀 マージ処理を開始..."
    
    # 一旦スタッシュ
    git stash push -m "Auto-stash before merge"
    
    # リモートの最新を取得
    git pull origin "$branch" --no-edit
    
    # コンフリクトがある場合
    if git ls-files -u | wc -l | grep -q -v "^0"; then
        log "⚠️ マージコンフリクト検出"
        
        if [ "$strategy" = "local" ]; then
            # ローカルを優先
            git status --porcelain | grep "^UU" | awk '{print $2}' | xargs git checkout --ours --
        else
            # リモートを優先
            git status --porcelain | grep "^UU" | awk '{print $2}' | xargs git checkout --theirs --
        fi
        
        # コンフリクトを解決としてマーク
        git add -A
        git commit -m "fix: Auto-resolve merge conflicts (strategy: $strategy)"
    fi
    
    # スタッシュを戻す
    git stash pop || true
    
    # 再度プッシュ
    if git push origin "$branch"; then
        log "✅ マージ後のプッシュ完了"
        notify "completed" "Gitコンフリクト自動解決完了"
    else
        log "❌ プッシュ失敗 - 手動介入が必要です"
        notify "failed" "Git自動化失敗 - 手動介入が必要"
    fi
}

# 自動マージ（PRの自動マージ）
auto_merge_pr() {
    local pr_number="$1"
    
    if [ -z "$pr_number" ]; then
        # 現在のブランチに関連するPRを探す
        local branch=$(git rev-parse --abbrev-ref HEAD)
        pr_number=$(gh pr list --head "$branch" --json number -q '.[0].number' 2>/dev/null)
    fi
    
    if [ -n "$pr_number" ]; then
        log "🔀 PR #$pr_number の自動マージを開始..."
        
        # CIの状態をチェック
        local checks_status=$(gh pr checks "$pr_number" --json status -q '.[] | select(.status != "COMPLETED" or .conclusion != "SUCCESS")' 2>/dev/null)
        
        if [ -z "$checks_status" ]; then
            # 全てのチェックが成功
            if gh pr merge "$pr_number" --auto --merge; then
                log "✅ PR #$pr_number 自動マージ設定完了"
                notify "completed" "PR自動マージ設定完了"
            fi
        else
            log "⏳ CI実行中 - 自動マージは後で実行されます"
        fi
    fi
}

# ブランチの自動作成と切り替え
auto_create_branch() {
    local branch_name="$1"
    local base_branch="${2:-main}"
    
    if [ -z "$branch_name" ]; then
        # タスク名から自動生成
        branch_name="feature/auto-$(date +%Y%m%d-%H%M%S)"
    fi
    
    log "🌿 ブランチ作成: $branch_name"
    
    git checkout -b "$branch_name" "$base_branch"
    git push -u origin "$branch_name"
    
    log "✅ ブランチ作成完了: $branch_name"
}

# メイン処理
main() {
    local command="${1:-auto}"
    
    # ログディレクトリ作成
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "$command" in
        "auto")
            # 完全自動モード
            if check_git_status; then
                auto_commit
                auto_push
            else
                log "ℹ️ 変更がありません"
            fi
            ;;
        "commit")
            auto_commit
            ;;
        "push")
            auto_push
            ;;
        "merge")
            auto_merge_pr "$2"
            ;;
        "branch")
            auto_create_branch "$2" "$3"
            ;;
        "conflict")
            handle_push_conflict "$(git rev-parse --abbrev-ref HEAD)"
            ;;
        *)
            echo "Usage: $0 [auto|commit|push|merge|branch|conflict]"
            exit 1
            ;;
    esac
}

# 実行
main "$@"