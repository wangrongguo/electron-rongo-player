# Electron Video Player

一个使用 Electron 开发的跨平台视频播放器，支持多种视频格式和流媒体播放。

<div align="center">
  <img src="assets/001.png" alt="视频播放器预览图" width="800">
</div>

## 功能特点

- 支持多种视频格式 (MP4, AVI, MKV, MOV, FLV, WebM, RMVB, WMV)
- 支持网络视频流播放 (HTTP, HTTPS, RTMP)
- 支持字幕文件加载和显示
- 支持音轨切换
- 播放速度调整
- 画面比例调整
- 全屏播放
- 播放列表管理
- 拖放文件支持
- 键盘快捷键控制
- 自定义主题 (明亮/暗黑)
- 多语言支持
- 自动更新

## 系统要求

- Windows 7 及以上
- macOS 10.11 及以上
- Linux (Ubuntu, Debian, Fedora)

## 安装

1. 克隆仓库：
```bash
git clone [repository-url]
```

2. 安装依赖：
```bash
npm install
```

3. 运行应用：
```bash
npm start
```

## 开发

- 开发模式运行：
```bash
npm run dev
```

- 构建应用：
```bash
# 所有平台
npm run build

# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 快捷键

- 空格：播放/暂停
- 左箭头：后退 5 秒
- 右箭头：前进 5 秒
- 上箭头：音量增加
- 下箭头：音量减少
- F：全屏
- M：静音
- ESC：退出全屏

## 技术栈

- Electron
- Vue.js
- Video.js
- HLS.js
- Node.js

## 许可证

MIT 