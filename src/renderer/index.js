const { ipcRenderer } = require('electron');
const videojs = require('video.js');
const Store = require('electron-store');
const path = require('path');

// 初始化配置存储
const store = new Store();

// 窗口控制
document.getElementById('minimize').addEventListener('click', () => {
  ipcRenderer.send('window-min');
});

document.getElementById('maximize').addEventListener('click', () => {
  ipcRenderer.send('window-max');
});

document.getElementById('close').addEventListener('click', () => {
  ipcRenderer.send('window-close');
});

// 初始化视频播放器
const player = videojs('video-player', {
  controls: true,
  autoplay: false,
  preload: 'auto',
  fluid: true,
  playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3],
  language: 'zh-CN',
  controlBar: {
    children: [
      'playToggle',
      'volumePanel',
      'currentTimeDisplay',
      'timeDivider',
      'durationDisplay',
      'progressControl',
      'pictureInPictureToggle',
      'fullscreenToggle'
    ]
  }
});

// 自定义中文语言包
videojs.addLanguage('zh-CN', {
  "Play": "播放",
  "Pause": "暂停",
  "Current Time": "当前时间",
  "Duration": "时长",
  "Remaining Time": "剩余时间",
  "Stream Type": "媒体流类型",
  "LIVE": "直播",
  "Loaded": "加载完毕",
  "Progress": "进度",
  "Progress Bar": "进度条",
  "progress bar timing: currentTime={1} duration={2}": "进度条时间：当前时间={1} 总时长={2}",
  "Fullscreen": "全屏",
  "Non-Fullscreen": "退出全屏",
  "Picture-in-Picture": "画中画",
  "Exit Picture-in-Picture": "退出画中画",
  "Mute": "静音",
  "Unmute": "取消静音",
  "Playback Rate": "播放速度",
  "Volume Level": "音量",
  "Close": "关闭"
});

// 播放列表管理
let playlist = store.get('playlist', []);
let currentPlayingIndex = -1;
let lastPlaybackRate = 1;
let speedIndicatorTimeout;

// 创建倍速提示元素
function createSpeedIndicator() {
  const controlBar = document.querySelector('.video-js .vjs-control-bar');
  const fullscreenButton = document.querySelector('.vjs-fullscreen-control');
  
  const indicator = document.createElement('div');
  indicator.className = 'vjs-speed-indicator';
  
  // 插入到全屏按钮之前
  controlBar.insertBefore(indicator, fullscreenButton);
  return indicator;
}

const speedIndicator = createSpeedIndicator();

// 显示倍速提示
function showSpeedIndicator(rate) {
  if (!speedIndicator) return;
  
  // 清除之前的定时器
  if (speedIndicatorTimeout) {
    clearTimeout(speedIndicatorTimeout);
    speedIndicatorTimeout = null;
  }
  
  // 更新文本并显示
  speedIndicator.textContent = `${rate.toFixed(2)}倍速`;
  speedIndicator.classList.remove('hide');
  
  // 确保元素已经隐藏后再显示，避免动画问题
  requestAnimationFrame(() => {
    speedIndicator.classList.add('show');
    
    // 2秒后隐藏
    speedIndicatorTimeout = setTimeout(() => {
      hideSpeedIndicator();
    }, 2000);
  });
}

// 隐藏倍速提示
function hideSpeedIndicator() {
  if (!speedIndicator) return;
  
  speedIndicator.classList.remove('show');
  speedIndicator.classList.add('hide');
  
  // 清除定时器
  if (speedIndicatorTimeout) {
    clearTimeout(speedIndicatorTimeout);
    speedIndicatorTimeout = null;
  }
}

// 调整播放速度
function adjustPlaybackRate(delta) {
  const currentRate = player.playbackRate();
  let newRate = Math.round((currentRate + delta) * 100) / 100; // 保留两位小数
  
  // 限制速度范围在 0.25 到 3 之间
  newRate = Math.max(0.25, Math.min(3, newRate));
  
  player.playbackRate(newRate);
}

// 监听播放速率变化
player.on('ratechange', () => {
  const currentRate = player.playbackRate();
  // 只有当速率真正改变时才更新
  if (currentRate !== lastPlaybackRate) {
    lastPlaybackRate = currentRate;
    showSpeedIndicator(currentRate);
    
    // 如果当前正在播放视频，保存状态
    if (currentPlayingIndex !== -1) {
      const currentVideo = playlist[currentPlayingIndex];
      savePlaybackState(currentVideo.path);
    }
  }
});

// 保存播放位置和速率
function savePlaybackState(videoPath) {
  if (!videoPath) return;
  
  const states = store.get('playbackStates', {});
  states[videoPath] = {
    currentTime: player.currentTime(),
    playbackRate: player.playbackRate(),
    lastAccessed: Date.now()
  };
  store.set('playbackStates', states);
}

// 加载播放位置和速率
function loadPlaybackState(videoPath) {
  if (!videoPath) return;
  
  const states = store.get('playbackStates', {});
  const state = states[videoPath];
  
  if (state) {
    // 获取视频总时长
    const duration = player.duration();
    
    // 如果播放位置接近视频结尾(最后1秒)或已结束，则从头开始播放
    if (duration && (state.currentTime >= duration - 1)) {
      player.currentTime(0);
    } else {
      // 否则设置保存的播放位置
      player.currentTime(state.currentTime);
    }
    
    // 设置播放速率
    player.playbackRate(state.playbackRate);
    lastPlaybackRate = state.playbackRate;
  }
}

// 清理过期的播放状态（30天前的记录）
function cleanupOldPlaybackStates() {
  const states = store.get('playbackStates', {});
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const newStates = Object.entries(states).reduce((acc, [key, value]) => {
    if (value.lastAccessed > thirtyDaysAgo) {
      acc[key] = value;
    }
    return acc;
  }, {});
  
  store.set('playbackStates', newStates);
}

// 定期清理过期播放状态
setInterval(cleanupOldPlaybackStates, 24 * 60 * 60 * 1000); // 每24小时清理一次

function updatePlaylist() {
  const playlistElement = document.getElementById('video-list');
  playlistElement.innerHTML = '';
  
  playlist.forEach((video, index) => {
    const li = document.createElement('li');
    li.className = index === currentPlayingIndex ? 'playing' : '';
    
    // 创建视频名称容器
    const nameSpan = document.createElement('span');
    nameSpan.className = 'video-name';
    nameSpan.textContent = video.name;
    li.appendChild(nameSpan);
    
    // 创建删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      removeFromPlaylist(index);
    };
    li.appendChild(deleteBtn);
    
    li.addEventListener('click', () => {
      playVideo(index);
    });
    
    playlistElement.appendChild(li);
  });
}

function addVideo(videoPath, videoName, videoType) {
  const existingIndex = playlist.findIndex(v => v.path === videoPath);
  if (existingIndex === -1) {
    playlist.push({
      path: videoPath,
      name: videoName || path.basename(videoPath),
      type: videoType || 'video/mp4'
    });
    store.set('playlist', playlist);
    updatePlaylist();
  }
}

function removeFromPlaylist(index) {
  const video = playlist[index];
  playlist.splice(index, 1);
  store.set('playlist', playlist);
  
  // 如果删除的是当前播放的视频，停止播放并保存状态
  if (index === currentPlayingIndex) {
    savePlaybackState(video.path);
    currentPlayingIndex = -1;
    player.pause();
  } else if (index < currentPlayingIndex) {
    currentPlayingIndex--;
  }
  updatePlaylist();
}

function playVideo(index) {
  if (index >= 0 && index < playlist.length) {
    // 保存当前视频的播放状态
    if (currentPlayingIndex !== -1) {
      const currentVideo = playlist[currentPlayingIndex];
      savePlaybackState(currentVideo.path);
    }
    
    const video = playlist[index];
    player.src({ type: video.type, src: video.path });
    
    // 加载新视频的播放状态
    loadPlaybackState(video.path);
    
    player.play();
    currentPlayingIndex = index;
    updatePlaylist();
  }
}

// 定期保存播放位置（每30秒）
setInterval(() => {
  if (currentPlayingIndex !== -1 && !player.paused()) {
    const currentVideo = playlist[currentPlayingIndex];
    savePlaybackState(currentVideo.path);
  }
}, 30000);

// 自动播放下一个
player.on('ended', () => {
  if (currentPlayingIndex < playlist.length - 1) {
    playVideo(currentPlayingIndex + 1);
  }
});

// 打开文件按钮
document.getElementById('open-file').addEventListener('click', async () => {
  const filePaths = await ipcRenderer.invoke('open-file-dialog');
  filePaths.forEach(filePath => {
    addVideo(filePath);
  });
});

// 播放上一个视频
function playPreviousVideo() {
  if (currentPlayingIndex > 0) {
    playVideo(currentPlayingIndex - 1);
  }
}

// 播放下一个视频
function playNextVideo() {
  if (currentPlayingIndex < playlist.length - 1) {
    playVideo(currentPlayingIndex + 1);
  }
}

// 键盘快捷键支持
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (player.paused()) {
      player.play();
    } else {
      player.pause();
    }
    e.preventDefault();
  } else if (e.code === 'ArrowRight') {
    if (e.shiftKey) {
      // Shift + 右箭头：加速
      adjustPlaybackRate(0.25);
    } else {
      player.currentTime(player.currentTime() + 5);
    }
  } else if (e.code === 'ArrowLeft') {
    if (e.shiftKey) {
      // Shift + 左箭头：减速
      adjustPlaybackRate(-0.25);
    } else {
      player.currentTime(player.currentTime() - 5);
    }
  } else if (e.code === 'ArrowUp') {
    player.volume(Math.min(player.volume() + 0.1, 1));
  } else if (e.code === 'ArrowDown') {
    player.volume(Math.max(player.volume() - 0.1, 0));
  } else if (e.code === 'KeyF') {
    if (player.isFullscreen()) {
      player.exitFullscreen();
    } else {
      player.requestFullscreen();
    }
  } else if (e.code === 'KeyM') {
    player.muted(!player.muted());
  } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
    // 数字键 0：恢复正常速度
    player.playbackRate(1);
  } else if (e.code >= 'Digit1' && e.code <= 'Digit9') {
    // 数字键 1-9：快速切换到对应倍速
    const rate = (parseInt(e.code.replace('Digit', '')) + 1) / 2;
    if (rate <= 3) {
      player.playbackRate(rate);
    }
  } else if (e.code >= 'Numpad1' && e.code <= 'Numpad9') {
    // 小键盘 1-9：快速切换到对应倍速
    const rate = (parseInt(e.code.replace('Numpad', '')) + 1) / 2;
    if (rate <= 3) {
      player.playbackRate(rate);
    }
  } else if (e.code === 'PageUp') {
    // PgUp：播放上一个视频
    playPreviousVideo();
    e.preventDefault();
  } else if (e.code === 'PageDown') {
    // PgDn：播放下一个视频
    playNextVideo();
    e.preventDefault();
  }
});

// 在关闭窗口前保存播放状态
window.addEventListener('beforeunload', () => {
  if (currentPlayingIndex !== -1) {
    const currentVideo = playlist[currentPlayingIndex];
    savePlaybackState(currentVideo.path);
  }
});

// 初始化播放列表
updatePlaylist();

// 支持拖放文件
document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();

  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('video/')) {
      addVideo(file.path, file.name, file.type);
    }
  }
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

// HLS 支持
if (Hls.isSupported()) {
  player.on('sourceopen', function() {
    const video = document.querySelector('video');
    const hls = new Hls();
    
    player.on('loadstart', function() {
      const currentSrc = player.currentSrc();
      if (currentSrc.endsWith('.m3u8')) {
        hls.loadSource(currentSrc);
        hls.attachMedia(video);
      }
    });
  });
} 