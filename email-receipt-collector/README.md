# Email Receipt Collector

メール内の領収書を自動的に収集し、Google Driveに整理して保存するツールです。PDF、画像形式の領収書に対応し、日本語・英語の両方をサポートします。

## 機能

- **自動メール検索**: Gmail APIを使用して領収書を含むメールを自動検索
- **多形式対応**: PDF、JPG、PNG、その他の画像形式に対応
- **OCR機能**: 画像形式の領収書からテキストを抽出（日本語・英語対応）
- **スマート検出**: キーワードとパターンマッチングによる領収書の自動検出
- **自動整理**: 年/月/ベンダー名でフォルダを自動作成して整理
- **メタデータ保存**: 元のメール情報と抽出データをJSONで保存
- **スケジュール実行**: cronによる定期的な自動実行

## セットアップ

### 1. 必要条件

- Node.js 14以上
- Google Cloud Platformアカウント
- Gmail APIとGoogle Drive APIの有効化

### 2. インストール

```bash
# リポジトリをクローン
cd email-receipt-collector

# 依存関係をインストール
npm install
```

### 3. Google API設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 以下のAPIを有効化:
   - Gmail API
   - Google Drive API
4. 認証情報を作成:
   - 「認証情報を作成」→「OAuth クライアント ID」
   - アプリケーションの種類: 「デスクトップ」
   - リダイレクトURI: `http://localhost:3000/oauth2callback`
5. 認証情報のJSONファイルをダウンロード

### 4. 初期設定

```bash
# セットアップスクリプトを実行
npm run setup
```

セットアップスクリプトで以下を設定:

- Google認証情報の登録
- Google DriveフォルダIDの設定
- 必要なディレクトリの作成

### 5. 環境設定

`.env`ファイルを編集して設定をカスタマイズ:

```env
# Gmail検索クエリ
EMAIL_SEARCH_QUERY=subject:(receipt OR invoice OR 領収書 OR 請求書) has:attachment

# 一度に処理する最大メール数
MAX_RESULTS=50

# 実行スケジュール（cron形式）
# 例: 毎日午前9時 = "0 9 * * *"
# 無効化する場合は "disabled" を設定
CRON_SCHEDULE=0 9 * * *

# ログレベル
LOG_LEVEL=info
```

## 使用方法

### 手動実行（1回のみ）

```bash
npm start -- --once
```

### スケジュール実行

```bash
npm start
```

デフォルトでは毎日午前9時に自動実行されます。

## フォルダ構造

Google Drive内に以下の構造でファイルが保存されます:

```
指定したフォルダ/
├── 2024/
│   ├── 2024-01/
│   │   ├── Amazon/
│   │   │   ├── 2024-01-15_Amazon_receipt.pdf
│   │   │   └── 2024-01-15_Amazon_metadata.json
│   │   └── 楽天/
│   │       ├── 2024-01-20_楽天_領収書.pdf
│   │       └── 2024-01-20_楽天_metadata.json
│   └── 2024-02/
│       └── ...
```

## 領収書検出ロジック

以下の要素を組み合わせて領収書を検出:

1. **キーワード検出**:
   - 英語: receipt, invoice, bill, payment, total, amount
   - 日本語: 領収書、請求書、合計、金額、支払、明細

2. **パターンマッチング**:
   - 価格表記（$123.45, ¥1,234, 1,234円）
   - 日付形式
   - 注文番号/取引番号

3. **ファイル名分析**:
   - receipt, invoice, 領収書などを含むファイル名

## トラブルシューティング

### 認証エラー

```bash
# トークンをリセット
rm config/token.json
npm start
```

### OCRが機能しない

- Tesseract.jsが正しくインストールされているか確認
- 画像の品質が十分か確認（解像度が低すぎる場合は認識率が下がります）

### ログの確認

```bash
# エラーログ
cat logs/error.log

# 全ログ
cat logs/combined.log
```

## セキュリティ

- 認証情報は`config/`フォルダに保存されます
- このフォルダは`.gitignore`に含まれており、Gitにはコミットされません
- 本番環境では適切なアクセス権限を設定してください

## ライセンス

MIT License
