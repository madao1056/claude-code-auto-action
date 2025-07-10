#!/bin/bash

# 自動学習システムの定期更新スクリプト

# プロジェクトルートを検出
find_project_root() {
    local dir="$PWD"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.claude" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    echo "$PWD"
}

PROJECT_ROOT=$(find_project_root)
LOG_FILE="$PROJECT_ROOT/.claude/logs/learning-update.log"
LOCK_FILE="$PROJECT_ROOT/.claude/learning/.update.lock"
UPDATE_INTERVAL=3600  # 1時間（秒）

# ログディレクトリの作成
mkdir -p "$(dirname "$LOG_FILE")"

# ログ関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ロックファイルのチェック
check_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_age=$(($(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)))
        if [[ $lock_age -lt $UPDATE_INTERVAL ]]; then
            log "更新はすでに実行中またはレート制限中です（残り時間: $((UPDATE_INTERVAL - lock_age))秒）"
            return 1
        fi
    fi
    return 0
}

# ロックの作成
create_lock() {
    mkdir -p "$(dirname "$LOCK_FILE")"
    touch "$LOCK_FILE"
}

# ロックの削除
remove_lock() {
    rm -f "$LOCK_FILE"
}

# 更新の実行
run_update() {
    log "🔄 学習システムの更新チェックを開始します..."
    
    # Node.jsスクリプトを実行
    if command -v node >/dev/null 2>&1; then
        cd "$PROJECT_ROOT"
        node src/autofix/approval-interceptor.js --check-updates 2>&1 | tee -a "$LOG_FILE"
        
        # 統計情報も記録
        log "📊 現在の統計情報:"
        node src/autofix/approval-interceptor.js --stats 2>&1 | tee -a "$LOG_FILE"
    else
        log "❌ Node.jsが見つかりません。更新をスキップします。"
        return 1
    fi
    
    log "✅ 更新チェックが完了しました"
}

# ユーザーへの確認
ask_user() {
    if [[ "$1" == "--auto" ]] || [[ "$1" == "-a" ]]; then
        return 0
    fi
    
    echo -e "\n🤖 承認学習システムの更新を開始しますか？"
    echo "これにより、最近の承認パターンを分析し、自動承認ルールを更新します。"
    echo -n "続行しますか？ (y/N): "
    read -r response
    
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            echo "更新をキャンセルしました。"
            return 1
            ;;
    esac
}

# バックグラウンドモード
if [[ "$1" == "--daemon" ]] || [[ "$1" == "-d" ]]; then
    log "🚀 バックグラウンドモードで起動しました"
    
    while true; do
        if check_lock; then
            create_lock
            run_update
            remove_lock
        fi
        
        log "💤 次回の更新まで${UPDATE_INTERVAL}秒待機します..."
        sleep $UPDATE_INTERVAL
    done
fi

# メイン処理
main() {
    # 引数の処理
    case "$1" in
        --help|-h)
            echo "使用方法: $0 [オプション]"
            echo "オプション:"
            echo "  --auto, -a     確認なしで実行"
            echo "  --daemon, -d   バックグラウンドで定期実行"
            echo "  --force, -f    ロックを無視して強制実行"
            echo "  --stats, -s    統計情報のみ表示"
            echo "  --export, -e   学習データをエクスポート"
            echo "  --help, -h     このヘルプを表示"
            exit 0
            ;;
        --stats|-s)
            cd "$PROJECT_ROOT"
            node src/autofix/approval-interceptor.js --stats
            exit 0
            ;;
        --export|-e)
            cd "$PROJECT_ROOT"
            node src/autofix/approval-interceptor.js --export
            exit 0
            ;;
        --force|-f)
            remove_lock
            ;;
    esac
    
    # ユーザー確認
    if ! ask_user "$1"; then
        exit 0
    fi
    
    # ロックチェック
    if ! check_lock; then
        exit 1
    fi
    
    # 更新実行
    create_lock
    trap remove_lock EXIT
    
    run_update
    
    remove_lock
}

# スクリプトの実行
main "$@"