#!/bin/bash

# 依存関係自動管理スクリプト

COMMAND=$1
PROJECT_ROOT=${2:-$(pwd)}

echo "🔍 依存関係を分析中..."

case "$COMMAND" in
  "install" | "auto-deps")
    echo "📦 不足パッケージを検出してインストール..."
    
    # Node.jsスクリプトを実行
    node -e "
      const { AutoDependencyManager } = require('../dist/src/dependencies/AutoDependencyManager.js');
      const manager = new AutoDependencyManager('$PROJECT_ROOT');
      
      (async () => {
        try {
          await manager.autoInstallMissing();
        } catch (error) {
          console.error('エラー:', error);
          process.exit(1);
        }
      })();
    "
    ;;
    
  "clean" | "clean-deps")
    echo "🧹 未使用パッケージを削除..."
    
    node -e "
      const { AutoDependencyManager } = require('../dist/src/dependencies/AutoDependencyManager.js');
      const manager = new AutoDependencyManager('$PROJECT_ROOT');
      
      (async () => {
        try {
          await manager.cleanUnused();
        } catch (error) {
          console.error('エラー:', error);
          process.exit(1);
        }
      })();
    "
    ;;
    
  "fix-vulnerabilities" | "fix-vulns")
    echo "🔒 セキュリティ脆弱性を修正..."
    
    node -e "
      const { AutoDependencyManager } = require('../dist/src/dependencies/AutoDependencyManager.js');
      const manager = new AutoDependencyManager('$PROJECT_ROOT');
      
      (async () => {
        try {
          await manager.autoFixVulnerabilities();
        } catch (error) {
          console.error('エラー:', error);
          process.exit(1);
        }
      })();
    "
    ;;
    
  "analyze")
    echo "📊 依存関係の完全分析..."
    
    node -e "
      const { AutoDependencyManager } = require('../dist/src/dependencies/AutoDependencyManager.js');
      const manager = new AutoDependencyManager('$PROJECT_ROOT');
      
      (async () => {
        try {
          const analysis = await manager.analyze();
          
          console.log('\\n📋 分析結果:');
          console.log('================');
          
          if (analysis.missing.length > 0) {
            console.log('\\n❌ 不足パッケージ:');
            analysis.missing.forEach(pkg => {
              console.log('  - ' + pkg.name + (pkg.isDev ? ' (dev)' : '') + (pkg.isType ? ' (types)' : ''));
            });
          }
          
          if (analysis.unused.length > 0) {
            console.log('\\n⚠️  未使用パッケージ:');
            analysis.unused.forEach(pkg => console.log('  - ' + pkg));
          }
          
          if (analysis.outdated.length > 0) {
            console.log('\\n📈 更新可能なパッケージ:');
            analysis.outdated.forEach(pkg => {
              console.log('  - ' + pkg.name + ': ' + pkg.current + ' → ' + pkg.latest);
            });
          }
          
          if (analysis.vulnerabilities.length > 0) {
            console.log('\\n🚨 セキュリティ脆弱性:');
            analysis.vulnerabilities.forEach(vuln => {
              const emoji = vuln.severity === 'critical' ? '🔴' : 
                           vuln.severity === 'high' ? '🟠' : 
                           vuln.severity === 'moderate' ? '🟡' : '🟢';
              console.log('  ' + emoji + ' ' + vuln.name + ' (' + vuln.severity + ')' + 
                         (vuln.fixAvailable ? ' - 修正可能' : ' - 手動修正が必要'));
            });
          }
          
          if (analysis.missing.length === 0 && analysis.unused.length === 0 && 
              analysis.vulnerabilities.length === 0) {
            console.log('\\n✅ すべての依存関係が正常です！');
          }
          
        } catch (error) {
          console.error('エラー:', error);
          process.exit(1);
        }
      })();
    "
    ;;
    
  "auto-fix-all")
    echo "🚀 依存関係の完全自動修正..."
    
    # 1. 不足パッケージをインストール
    $0 install "$PROJECT_ROOT"
    
    # 2. セキュリティ脆弱性を修正
    $0 fix-vulnerabilities "$PROJECT_ROOT"
    
    # 3. 未使用パッケージを削除
    $0 clean "$PROJECT_ROOT"
    
    echo "✅ 依存関係の自動修正が完了しました！"
    ;;
    
  *)
    echo "使用方法:"
    echo "  $0 install              - 不足パッケージを自動インストール"
    echo "  $0 clean               - 未使用パッケージを削除"
    echo "  $0 fix-vulnerabilities - セキュリティ脆弱性を修正"
    echo "  $0 analyze             - 依存関係を分析"
    echo "  $0 auto-fix-all        - すべての問題を自動修正"
    exit 1
    ;;
esac