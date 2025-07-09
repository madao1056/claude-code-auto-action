# 📋 Claude Code Auto Action - Version History

## Version 1.1.0 (2025-07-09)
### 🧠 Adaptive Thinking Mode System
- **Default Mode**: `think_hard` (10,000 tokens) - すべてのタスクで高品質な思考
- **Auto-escalation**: 2回以上の修正で自動的に `ultrathink` (31,999 tokens) に昇格
- **Context-aware**: タスクの種類に応じた思考モード選択
  - `codeRevision`: コード修正時
  - `complexTask`: 複雑なタスク
  - `errorHandling`: エラー処理時

### 🎯 思考モード階層
```
think: 4,000 tokens - 基本的な思考
think_hard: 10,000 tokens - より深い思考（デフォルト）
think_harder: 20,000 tokens - さらに深い思考
ultrathink: 31,999 tokens - 最強思考モード
```

### 🔧 設定ファイル
`.claude/settings.local.json` に `thinkingMode` 設定を追加

---

## Version 1.0.0 (2025-07-06)
### 🚀 Initial Release
- Multi-agent orchestration system
- Task distribution with intelligent routing  
- Top-down command hierarchy
- Bottom-up reporting system
- Parallel process control
- Real-time communication hub
- Auto-approval patterns for commands
- Git automation support
- VSCode/Cursor extension integration

---

## Version Naming Convention
- **Major (X.0.0)**: 大規模な機能追加や破壊的変更
- **Minor (1.X.0)**: 新機能追加（後方互換性あり）
- **Patch (1.1.X)**: バグ修正や小さな改善