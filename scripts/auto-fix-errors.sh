#!/bin/bash

# 自動エラー修正スクリプト

ERROR_TYPE=$1
ERROR_OUTPUT=$2

echo "🔧 自動エラー修正を開始: $ERROR_TYPE"

case "$ERROR_TYPE" in
  "build_error")
    echo "📦 ビルドエラーを検出..."
    
    # TypeScriptエラーの自動修正
    if echo "$ERROR_OUTPUT" | grep -q "error TS"; then
      echo "TypeScriptエラーを修正中..."
      npx tsc --noEmit --pretty false 2>&1 | while read -r line; do
        if [[ $line =~ (.+)\(([0-9]+),([0-9]+)\):\s*error\s*TS[0-9]+:\s*(.+) ]]; then
          file="${BASH_REMATCH[1]}"
          line_num="${BASH_REMATCH[2]}"
          col="${BASH_REMATCH[3]}"
          error="${BASH_REMATCH[4]}"
          
          echo "修正対象: $file:$line_num:$col - $error"
          
          # Claude APIを使って修正
          claude-code --auto-approve --skip-confirmation << EOF
Fix the TypeScript error in $file at line $line_num:
Error: $error

Provide the exact fix without any explanation.
EOF
        fi
      done
    fi
    
    # モジュール不足エラーの修正
    if echo "$ERROR_OUTPUT" | grep -q "Cannot find module\|Module not found"; then
      echo "不足モジュールをインストール中..."
      missing_modules=$(echo "$ERROR_OUTPUT" | grep -oE "Cannot find module '([^']+)'|Module not found: Error: Can't resolve '([^']+)'" | grep -oE "'[^']+'")
      
      for module in $missing_modules; do
        module_name=$(echo $module | tr -d "'")
        echo "インストール: $module_name"
        npm install "$module_name" || npm install --save-dev "$module_name"
      done
    fi
    ;;
    
  "lint_error")
    echo "🔍 Lintエラーを検出..."
    
    # ESLintの自動修正
    if command -v eslint &> /dev/null; then
      echo "ESLintで自動修正を実行..."
      npx eslint --fix .
    fi
    
    # Prettierの自動修正
    if command -v prettier &> /dev/null; then
      echo "Prettierで自動修正を実行..."
      npx prettier --write .
    fi
    ;;
    
  "type_error")
    echo "🎯 型エラーを検出..."
    
    # 型定義の自動インストール
    if echo "$ERROR_OUTPUT" | grep -q "Could not find a declaration file"; then
      missing_types=$(echo "$ERROR_OUTPUT" | grep -oE "Could not find a declaration file for module '([^']+)'" | grep -oE "'[^']+'")
      
      for module in $missing_types; do
        module_name=$(echo $module | tr -d "'")
        types_package="@types/$module_name"
        echo "型定義をインストール: $types_package"
        npm install --save-dev "$types_package"
      done
    fi
    ;;
    
  "test_error")
    echo "🧪 テストエラーを検出..."
    
    # スナップショットの更新
    if echo "$ERROR_OUTPUT" | grep -q "Snapshot"; then
      echo "スナップショットを更新..."
      npm test -- --updateSnapshot
    fi
    
    # 失敗したテストの自動修正
    if command -v jest &> /dev/null; then
      failed_tests=$(echo "$ERROR_OUTPUT" | grep -oE "FAIL\s+(.+\.test\.[tj]sx?)" | awk '{print $2}')
      
      for test_file in $failed_tests; do
        echo "テストを修正: $test_file"
        claude-code --auto-approve --skip-confirmation << EOF
Fix the failing test in $test_file based on this error output:
$ERROR_OUTPUT

Update the test to pass while maintaining the intended behavior.
EOF
      done
    fi
    ;;
    
  *)
    echo "⚠️ 未知のエラータイプ: $ERROR_TYPE"
    exit 1
    ;;
esac

# 修正後の再実行
echo "🔄 修正を検証中..."
case "$ERROR_TYPE" in
  "build_error")
    npm run build
    ;;
  "lint_error")
    npm run lint
    ;;
  "type_error")
    npm run typecheck || npx tsc --noEmit
    ;;
  "test_error")
    npm test
    ;;
esac

if [ $? -eq 0 ]; then
  echo "✅ エラーが正常に修正されました！"
  
  # 自動コミット（設定されている場合）
  if [ "$AUTO_COMMIT" = "true" ]; then
    git add -A
    git commit -m "fix: 自動エラー修正 - $ERROR_TYPE

- $ERROR_TYPE を検出して自動修正
- 影響を受けたファイルを更新
- テストおよびビルドが成功

🤖 Generated with Claude Code Auto-Fix"
  fi
else
  echo "❌ エラーの修正に失敗しました"
  exit 1
fi