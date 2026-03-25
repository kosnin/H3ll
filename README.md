# H3ll 🔥

3D高難易度回避アクションゲーム / 3D Bullet Hell Survival Game

![Three.js](https://img.shields.io/badge/Three.js-0.160.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 概要

**H3ll** は、Three.jsで作られたブラウザベースの3Dサバイバル弾幕ゲームです。プレイヤーはマウスで自由に移動し、あらゆる方向から飛来する弾やギミックを回避して生き残ります。

## プレイ方法

| 操作 | アクション |
|------|---------|
| マウス移動 | 平面移動 |
| 左クリック | 上昇 |
| 右クリック | 下降 |
| W / S | カメラ上下 |
| A / D | カメラ左右回転 |
| スクロール | ズーム |
| Q | カメラリセット |

## セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/H3ll.git
cd H3ll

# ローカルサーバーを起動（ES Modulesのため必須）
python3 -m http.server 8080
# または
npx serve .
```

ブラウザで `http://localhost:8080` を開いてプレイ！

## 技術スタック

- **Three.js** (v0.160.0) — 3Dレンダリング （CDN経由）
- **Vanilla JavaScript** (ES Modules) — ゲームロジック
- **HTML5 / CSS3** — UI

## プロジェクト構成

```
H3ll/
├── index.html          # エントリーポイント
├── styles.css          # UI スタイル
├── js/
│   ├── main.js         # ゲームループ・初期化
│   ├── player.js       # プレイヤー制御
│   ├── bullets.js      # 弾幕システム
│   ├── gimmicks.js     # ギミック（レーザー、車等）
│   ├── phases.js       # フェーズ管理・難易度スケーリング
│   ├── collision.js    # 当たり判定
│   ├── effects.js      # 視覚エフェクト
│   └── ui.js           # UI管理
├── .gitignore
├── LICENSE
└── README.md
```

## ライセンス

[MIT License](LICENSE)
