# Joy-Con PC Utility

Nintendo SwitchのJoy-ConをPCに接続し、キーボードやマウスとして使用するためのユーティリティです。
ボタンやスティックの入力を、キーボードショートカットやマウス操作に自由にマッピングできます。

## ディレクトリ構成

*   `main.py`: FastAPI + Socket.IO によるバックエンドサーバー。
*   `list_joycons.py`: PCに接続されているJoy-Conの検出・一覧表示用スクリプト。
*   `read_joycon.py`: Joy-Conからの生の入力レポートを読み取るテスト用スクリプト。
*   `parse_input.py`: ボタンマッピングやHD振動のテスト用スクリプト。
*   `templates/`: バックエンドから提供するHTMLテンプレート。
*   `ui/`: Vite + React + TypeScript + Electron で構成された設定画面UI。

---

## 実行方法

### 1. Python環境のセットアップ

プロジェクトのルートディレクトリで、仮想環境の作成と依存関係のインストールを行います。

**Windows:**
```shell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**macOS / Linux:**
```shell
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. アプリケーションの起動

#### 開発モードでの起動

`start-test-env.bat` を実行すると、バックエンドのPythonスクリプトと、UIを開発モードで起動するElectronアプリが同時に立ち上がります。

```shell
# または手動で別々のターミナルで起動する場合:
# ターミナル 1 (Backend):
python main.py

# ターミナル 2 (Frontend UI):
cd ui
npm install
npm run dev
```

起動後、ブラウザで `http://127.0.0.1:8000` にアクセスするか、Electronウィンドウ上で接続されているJoy-Conの設定を行うことができます。

#### 配布用パッケージのビルド (Electron)

`ui` ディレクトリでビルドを行います。
```shell
cd ui
npm run build
```
ビルド完了後、インストーラー等の配布用パッケージが生成されます。
