#!/bin/bash

# 自動ドキュメント生成スクリプト

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
DOCS_DIR="$PROJECT_ROOT/docs"

echo "📚 ドキュメント生成を開始します..."

# TypeScriptビルドチェック
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "⚠️  ビルドされたファイルが見つかりません。ビルド中..."
    cd "$PROJECT_ROOT" && npm run build
fi

# ドキュメントジェネレーターを実行
node -e "
const { AutoDocumentationGenerator } = require('./dist/documentation/AutoDocumentationGenerator.js');

(async () => {
  try {
    const generator = new AutoDocumentationGenerator('$PROJECT_ROOT');
    await generator.generateAll();
    console.log('✅ ドキュメント生成が完了しました');
    console.log('📁 生成されたドキュメント: $DOCS_DIR');
  } catch (error) {
    console.error('❌ ドキュメント生成エラー:', error);
    process.exit(1);
  }
})();
"