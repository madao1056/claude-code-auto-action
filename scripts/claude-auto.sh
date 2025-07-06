#!/bin/bash

# Claude Code Auto Action Main Script
# Implements YOLO mode and automatic optimizations

CLAUDE_CONFIG="$HOME/.claude/settings.json"
CLAUDE_PERMISSIONS="$HOME/.claude/permissions.json"
CLAUDE_LOG="$HOME/.claude/logs/cc.log"
YOLO_MODE=${CLAUDE_PERMISSIONS_MODE:-"ask"}
DAILY_LIMIT=${CLAUDE_COST_LIMIT_PER_DAY:-8}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log activity
log_activity() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$CLAUDE_LOG"
}

# Function to check permissions
check_permission() {
    local action=$1
    local path=$2
    
    # If in YOLO mode, allow everything except deny list
    if [ "$YOLO_MODE" == "bypassPermissions" ]; then
        # Check deny list
        if jq -r '.rules.deny[]' "$CLAUDE_PERMISSIONS" 2>/dev/null | grep -q "$action"; then
            echo -e "${RED}Error: Action '$action' is in deny list${NC}"
            log_activity "DENIED: $action on $path (in deny list)"
            return 1
        fi
        log_activity "YOLO ALLOWED: $action on $path"
        return 0
    fi
    
    # Normal permission check
    if jq -r '.rules.allow[]' "$CLAUDE_PERMISSIONS" 2>/dev/null | grep -q "$action"; then
        log_activity "ALLOWED: $action on $path"
        return 0
    fi
    
    echo -e "${YELLOW}Permission required for: $action on $path${NC}"
    read -p "Allow? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_activity "USER ALLOWED: $action on $path"
        return 0
    fi
    
    log_activity "USER DENIED: $action on $path"
    return 1
}

# Function to auto-commit
auto_commit() {
    echo -e "${GREEN}Running auto-commit...${NC}"
    
    # Check if we have changes
    if [ -z "$(git status --porcelain)" ]; then
        echo "No changes to commit"
        return 0
    fi
    
    # Run pre-commit hooks
    if [ -f ".git/hooks/pre-commit" ]; then
        echo "Running pre-commit hooks..."
        if ! .git/hooks/pre-commit; then
            echo -e "${RED}Pre-commit hooks failed${NC}"
            return 1
        fi
    fi
    
    # Stage all changes
    git add -A
    
    # Generate commit message using Claude with YOLO mode
    local diff=$(git diff --cached --stat)
    local files=$(git diff --cached --name-only | head -5)
    
    echo "Generating commit message..."
    local commit_msg=$(claude --dangerously-skip-permissions "Generate a conventional commit message for these changes:
Files: $files
Stats: $diff

Format: type(scope): description" 2>/dev/null | head -1)
    
    if [ -z "$commit_msg" ]; then
        commit_msg="chore: automated commit $(date +%Y%m%d-%H%M%S)"
    fi
    
    # Commit with generated message
    git commit -m "$commit_msg" -m "Co-authored-by: Claude <noreply@anthropic.com>"
    echo -e "${GREEN}Committed: $commit_msg${NC}"
    log_activity "AUTO COMMIT: $commit_msg"
}

# Function to run automated tasks
run_automated_tasks() {
    local auto_format=$(jq -r '.automation.auto_format' "$CLAUDE_CONFIG")
    local auto_lint=$(jq -r '.automation.auto_lint' "$CLAUDE_CONFIG")
    local auto_test=$(jq -r '.automation.auto_test' "$CLAUDE_CONFIG")
    
    if [ "$auto_format" == "true" ]; then
        echo "Formatting code..."
        npm run format 2>/dev/null || prettier --write . 2>/dev/null || true
    fi
    
    if [ "$auto_lint" == "true" ]; then
        echo "Linting code..."
        npm run lint 2>/dev/null || eslint . --fix 2>/dev/null || true
    fi
    
    if [ "$auto_test" == "true" ]; then
        echo "Running tests..."
        npm test 2>/dev/null || true
    fi
}

# Function to handle file operations
handle_file_operation() {
    local operation=$1
    local file_path=$2
    
    if ! check_permission "$operation" "$file_path"; then
        return 1
    fi
    
    # Check if confirmation is required
    local require_confirm=$(jq -r ".operations.require_confirmation_for_${operation}" "$CLAUDE_PERMISSIONS")
    if [ "$require_confirm" == "true" ]; then
        read -p "Are you sure you want to $operation $file_path? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Operation cancelled"
            return 1
        fi
    fi
    
    return 0
}

# Function to check daily cost
check_daily_cost() {
    local cost_file="$HOME/.claude/daily_cost"
    local today=$(date +%Y-%m-%d)
    
    # Reset cost if new day
    if [ -f "$cost_file" ]; then
        local last_date=$(head -1 "$cost_file" 2>/dev/null)
        if [ "$last_date" != "$today" ]; then
            echo "$today" > "$cost_file"
            echo "0.00" >> "$cost_file"
        fi
    else
        echo "$today" > "$cost_file"
        echo "0.00" >> "$cost_file"
    fi
    
    local current_cost=$(tail -1 "$cost_file")
    if (( $(echo "$current_cost > $DAILY_LIMIT" | bc -l) )); then
        echo -e "${RED}Daily cost limit exceeded! Current: \$$current_cost / \$$DAILY_LIMIT${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Daily cost: \$$current_cost / \$$DAILY_LIMIT${NC}"
    return 0
}

# Function to compact context
compact_context() {
    echo -e "${YELLOW}Compacting context...${NC}"
    claude /compact summary=dot_points max=1500 2>/dev/null
    echo -e "${GREEN}Context compacted${NC}"
    log_activity "CONTEXT COMPACTED"
}

# Function to monitor and optimize
monitor_and_optimize() {
    while true; do
        # Check cost every 5 minutes
        if ! check_daily_cost; then
            echo -e "${RED}Cost limit reached. Stopping monitor.${NC}"
            break
        fi
        
        # Check context usage
        local context_usage=$(claude /cost --json 2>/dev/null | jq -r '.contextUsage // 0')
        if (( $(echo "$context_usage > 0.9" | bc -l) )); then
            echo -e "${YELLOW}High context usage detected: ${context_usage}${NC}"
            compact_context
        fi
        
        sleep 300 # 5 minutes
    done
}

# Main command handler
case "$1" in
    "commit")
        check_permission "git-commit" "."
        auto_commit
        ;;
    "auto")
        run_automated_tasks
        ;;
    "watch")
        echo -e "${GREEN}Watching for changes...${NC}"
        echo -e "${YELLOW}YOLO Mode: $YOLO_MODE${NC}"
        
        # Start cost monitor in background
        monitor_and_optimize &
        MONITOR_PID=$!
        
        # Watch for file changes
        fswatch -o . --exclude ".git" --exclude "node_modules" | while read f; do
            echo -e "${YELLOW}Change detected...${NC}"
            run_automated_tasks
            
            local auto_commit_enabled=$(jq -r '.autoCommit.enabled' "$CLAUDE_CONFIG" 2>/dev/null)
            if [ "$auto_commit_enabled" == "true" ]; then
                auto_commit
            fi
        done
        
        # Cleanup
        kill $MONITOR_PID 2>/dev/null
        ;;
    "cost")
        check_daily_cost
        ;;
    "compact")
        compact_context
        ;;
    "yolo")
        export CLAUDE_PERMISSIONS_MODE=bypassPermissions
        echo -e "${YELLOW}YOLO Mode activated! Use with caution.${NC}"
        log_activity "YOLO MODE ACTIVATED"
        ;;
    "safe")
        export CLAUDE_PERMISSIONS_MODE=ask
        echo -e "${GREEN}Safe mode activated.${NC}"
        log_activity "SAFE MODE ACTIVATED"
        ;;
    "status")
        echo -e "${GREEN}Claude Auto Status:${NC}"
        echo "Mode: $YOLO_MODE"
        check_daily_cost
        echo "Log: $CLAUDE_LOG"
        ;;
    *)
        echo "Usage: claude-auto {commit|auto|watch|cost|compact|yolo|safe|status}"
        echo ""
        echo "Commands:"
        echo "  commit  - Auto-commit with AI message"
        echo "  auto    - Run automated tasks"
        echo "  watch   - Watch files and auto-commit"
        echo "  cost    - Check daily cost"
        echo "  compact - Compact context"
        echo "  yolo    - Enable YOLO mode"
        echo "  safe    - Enable safe mode"
        echo "  status  - Show current status"
        exit 1
        ;;
esac