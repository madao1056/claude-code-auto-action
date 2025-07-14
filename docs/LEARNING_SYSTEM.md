# 学習システム仕様書

## 概要

Claude Code Auto Actionの学習システムは、ユーザーの行動パターンを学習し、繰り返し作業を自動化します。

## アーキテクチャ

### データ構造

```
.claude/learning/
├── approval-history.json    # 承認履歴
├── approval-patterns.json   # 学習済みパターン
├── learning-config.json     # 学習設定
└── completion/
    ├── patterns.json        # コード補完パターン
    ├── preferences.json     # 個人設定
    └── team-conventions.json # チーム規約
```

## 承認学習システム

### 学習プロセス

1. **記録フェーズ**
   - すべての承認/拒否を記録
   - コンテキスト情報（ファイルタイプ、操作内容）を保存

2. **パターン抽出**
   - 3回以上同じ承認 → 自動承認パターンに追加
   - 危険なパターンは除外

3. **自動適用**
   - 学習済みパターンにマッチ → 自動承認
   - 新しいパターン → ユーザーに確認

### 安全性機能

#### 危険パターンの定義

```javascript
const dangerousPatterns = [
  'rm -rf',
  'sudo',
  'ssh',
  'chmod 777',
  '.env',
  'credentials',
  'password',
  'secret',
];
```

#### 自動承認の条件

- 使用回数 ≥ 3回
- 信頼度 ≥ 0.8
- 危険パターンを含まない

## コード補完学習

### 学習対象

1. **関数パターン**

   ```typescript
   // 学習前
   const handler =

   // 学習後（自動補完）
   const handler = async (req, res) => {
     try {
       // implementation
     } catch (error) {
       console.error(error);
       res.status(500).json({ error: 'Internal Server Error' });
     }
   };
   ```

2. **インポートパターン**
   - よく使うパッケージの組み合わせ
   - プロジェクト固有のインポート順序

3. **コーディングスタイル**
   - インデント（スペース/タブ）
   - クォート（シングル/ダブル）
   - セミコロンの有無

### 学習アルゴリズム

```typescript
interface LearningScore {
  frequency: number; // 使用頻度
  recency: number; // 最近の使用
  contextMatch: number; // コンテキスト一致度
}

function calculateScore(pattern: Pattern): number {
  const daysSinceLastUse = (Date.now() - pattern.lastUsed) / (1000 * 60 * 60 * 24);

  const recencyScore =
    daysSinceLastUse < 1 ? 2.0 : daysSinceLastUse < 7 ? 1.5 : daysSinceLastUse > 30 ? 0.5 : 1.0;

  return pattern.frequency * recencyScore * contextMatchScore;
}
```

## データプライバシー

### ローカル保存

- すべての学習データはローカルに保存
- 外部サーバーへの送信なし

### データ管理

```bash
# データエクスポート
claude-code learning export > my-patterns.json

# データインポート
claude-code learning import team-patterns.json

# データ削除
claude-code learning reset
```

### チーム共有

```bash
# チームパターンの共有
claude-code learning share --team

# 個人パターンの除外
claude-code learning export --exclude-personal
```

## 学習の最適化

### 定期更新

```bash
# crontabに追加
0 * * * * /path/to/scripts/auto-learning-update.sh --auto
```

### パフォーマンス設定

```json
{
  "learning": {
    "maxPatterns": 1000, // 最大パターン数
    "cleanupThreshold": 30, // 30日使用なしで削除
    "minFrequency": 2, // 最小使用回数
    "updateInterval": 3600 // 更新間隔（秒）
  }
}
```

## 統計とレポート

### 利用統計

```bash
claude-code learning stats

# 出力例：
総パターン数: 156
自動承認パターン: 42
今日の学習: 8件
節約時間: 約2.5時間
```

### 詳細レポート

```bash
claude-code learning report --detailed

# 出力例：
最も使用されるパターン:
1. "npm install" - 45回
2. "git commit" - 38回
3. "*.test.ts" - 32回
```

## トラブルシューティング

### 学習をリセット

```bash
# 特定のパターンを削除
claude-code learning remove --pattern "rm -rf"

# 全データをリセット
claude-code learning reset --confirm
```

### デバッグモード

```bash
# 学習プロセスの詳細ログ
export CLAUDE_LEARNING_DEBUG=true
claude-code learning update
```

### バックアップとリストア

```bash
# バックアップ作成
claude-code learning backup

# リストア
claude-code learning restore --from backup-2024-01-01.tar.gz
```

## 今後の改善計画

1. **機械学習モデルの導入**
   - より高度なパターン認識
   - 異常検知

2. **クラウド同期**（オプション）
   - 複数デバイス間での同期
   - チーム学習の集約

3. **コンテキスト認識の強化**
   - プロジェクトタイプ別の学習
   - ブランチ別の設定

4. **予測精度の向上**
   - ユーザーフィードバックの活用
   - A/Bテスト機能
