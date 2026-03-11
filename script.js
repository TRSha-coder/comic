// Comic Hub - Anime Streaming Website Script

// Global variables
let animeList = [];
let favorites = JSON.parse(localStorage.getItem('animeFavorites')) || [];
let showFavoritesOnly = false;
let currentAnime = null;
let videoSources = [];
let currentEpisode = 1;

// Video source API (using proxy to avoid CORS)
const API_BASE = 'https://api.yaohud.cn/api/v5';

// DOM Elements
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const scoreFilter = document.getElementById('scoreFilter');
const statusFilter = document.getElementById('statusFilter');
const showFavoritesBtn = document.getElementById('showFavoritesOnly');
const favoritesBtn = document.getElementById('favoritesBtn');
const favoritesCount = document.getElementById('favoritesCount');
const totalCount = document.getElementById('totalCount');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('emptyState');
const animeModal = document.getElementById('animeModal');
const modalClose = document.getElementById('modalClose');
const videoModal = document.getElementById('videoModal');
const videoModalClose = document.getElementById('videoModalClose');
const videoLoading = document.getElementById('videoLoading');
const sourcesList = document.getElementById('sourcesList');
const episodesList = document.getElementById('episodesList');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    updateFavoritesCount();
    await loadAnimeData();
    setupEventListeners();
}

// Load anime data from JSON
async function loadAnimeData() {
    try {
        loading.style.display = 'block';
        emptyState.style.display = 'none';
        
        // Always use absolute path for GitHub Pages compatibility
        const basePath = window.location.pathname.includes('/comic/') ? '/comic' : '';
        const dataUrl = `${basePath}/data/anime.json`;
        
        console.log('Fetching from:', dataUrl);
        
        const response = await fetch(dataUrl);
        
        if (!response.ok) {
            throw new Error('Failed to load anime data');
        }
        
        const data = await response.json();
        
        animeList = data.items || [];
        
        console.log(`Loaded ${animeList.length} anime`);
        renderAnime(animeList);
        
    } catch (error) {
        console.error('Error loading anime data:', error);
        showError('加载动漫数据失败');
    } finally {
        loading.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', debounce(filterAnime, 300));
    
    // Filters
    typeFilter.addEventListener('change', filterAnime);
    scoreFilter.addEventListener('change', filterAnime);
    statusFilter.addEventListener('change', filterAnime);
    
    // Favorites
    showFavoritesBtn.addEventListener('click', toggleFavoritesFilter);
    favoritesBtn.addEventListener('click', toggleFavoritesFilter);
    
    // Modal
    modalClose.addEventListener('click', closeModal);
    animeModal.addEventListener('click', (e) => {
        if (e.target === animeModal) {
            closeModal();
        }
    });
    
    // Video Modal
    videoModalClose.addEventListener('click', closeVideoModal);
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });
    
    // Play button
    const modalPlay = document.getElementById('modalPlay');
    if (modalPlay) {
        modalPlay.addEventListener('click', () => {
            if (currentAnime) {
                openVideoModal(currentAnime);
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeVideoModal();
        }
    });
}

// Render anime cards
function renderAnime(anime) {
    animeGrid.innerHTML = '';
    
    if (anime.length === 0) {
        emptyState.style.display = 'block';
        totalCount.textContent = '共 0 部动漫';
        return;
    }
    
    emptyState.style.display = 'none';
    totalCount.textContent = `共 ${anime.length} 部动漫`;
    
    anime.forEach(animeItem => {
        const card = createAnimeCard(animeItem);
        animeGrid.appendChild(card);
    });
}

// Create anime card element
function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    
    const isFavorite = favorites.includes(anime.id);
    const imageUrl = anime.images?.jpg?.image_url || anime.images?.webp?.image_url || 'https://via.placeholder.com/300x450';
    const title = anime.title_english || anime.title || 'Unknown';
    const score = anime.score || 'N/A';
    const rank = anime.rank || '';
    const type = anime.type || 'Unknown';
    
    card.innerHTML = `
        <div class="anime-card-image">
            <img src="${imageUrl}" alt="${title}" loading="lazy">
            <div class="anime-card-overlay"></div>
            <div class="anime-card-score">
                <i class="fas fa-star"></i> ${score}
            </div>
            <button class="anime-card-favorite ${isFavorite ? 'active' : ''}" data-id="${anime.id}">
                <i class="fas fa-heart"></i>
            </button>
        </div>
        <div class="anime-card-info">
            <h3 class="anime-card-title" title="${title}">${title}</h3>
            <div class="anime-card-meta">
                <span class="anime-card-type">${type}</span>
                ${rank ? `<span class="anime-card-rank">#${rank}</span>` : ''}
            </div>
        </div>
    `;
    
    // Click to open modal
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.anime-card-favorite')) {
            openModal(anime);
        }
    });
    
    // Favorite button
    const favBtn = card.querySelector('.anime-card-favorite');
    favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(anime.id);
    });
    
    return card;
}

// Filter anime based on search and filters
function filterAnime() {
    const searchTerm = searchInput.value.toLowerCase();
    const type = typeFilter.value;
    const minScore = parseFloat(scoreFilter.value) || 0;
    const status = statusFilter.value;
    
    let filtered = animeList.filter(anime => {
        // Search filter - support multiple languages
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = !searchTerm || 
            (anime.title && anime.title.toLowerCase().includes(searchLower)) ||
            (anime.title_english && anime.title_english.toLowerCase().includes(searchLower)) ||
            (anime.title_japanese && anime.title_japanese.toLowerCase().includes(searchLower)) ||
            (anime.synopsis && anime.synopsis.toLowerCase().includes(searchLower)) ||
            (anime.genres && anime.genres.some(g => g.toLowerCase().includes(searchLower)));
        
        // Type filter
        const typeMatch = !type || anime.type === type;
        
        // Score filter
        const scoreMatch = !minScore || (anime.score && anime.score >= minScore);
        
        // Status filter
        const statusMatch = !status || anime.status === status;
        
        // Favorites filter
        const favMatch = !showFavoritesOnly || favorites.includes(anime.id);
        
        return titleMatch && typeMatch && scoreMatch && statusMatch && favMatch;
    });
    
    renderAnime(filtered);
}

// Toggle favorites filter
function toggleFavoritesFilter() {
    showFavoritesOnly = !showFavoritesOnly;
    showFavoritesBtn.classList.toggle('active', showFavoritesOnly);
    filterAnime();
}

// Toggle favorite
function toggleFavorite(animeId) {
    const index = favorites.indexOf(animeId);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(animeId);
    }
    
    localStorage.setItem('animeFavorites', JSON.stringify(favorites));
    updateFavoritesCount();
    filterAnime();
}

// Update favorites count
function updateFavoritesCount() {
    favoritesCount.textContent = favorites.length;
}

// Open modal
function openModal(anime) {
    currentAnime = anime;
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.webp?.large_image_url || anime.images?.jpg?.image_url || 'https://via.placeholder.com/300x450';
    
    document.getElementById('modalImage').src = imageUrl;
    document.getElementById('modalTitle').textContent = anime.title || 'Unknown';
    document.getElementById('modalTitleEnglish').textContent = anime.title_english || '';
    document.getElementById('modalType').textContent = anime.type || 'Unknown';
    document.getElementById('modalEpisodes').textContent = anime.episodes ? `${anime.episodes}集` : 'Unknown';
    document.getElementById('modalStatus').textContent = anime.status || 'Unknown';
    document.getElementById('modalScore').textContent = anime.score || 'N/A';
    document.getElementById('modalRank').textContent = anime.rank || 'N/A';
    document.getElementById('modalSynopsis').textContent = anime.synopsis || '暂无简介';
    document.getElementById('modalLink').href = anime.url || '#';
    
    // Genres
    const genresContainer = document.getElementById('modalGenres');
    genresContainer.innerHTML = (anime.genres || []).map(g => `<span class="tag">${g}</span>`).join('');
    
    // Studios
    const studiosContainer = document.getElementById('modalStudios');
    studiosContainer.innerHTML = (anime.studios || []).map(s => `<span class="tag">${s}</span>`).join('');
    
    // Favorite button
    const favBtn = document.getElementById('modalFavorite');
    const isFavorite = favorites.includes(anime.id);
    favBtn.classList.toggle('active', isFavorite);
    favBtn.innerHTML = `<i class="fas fa-heart"></i> ${isFavorite ? '移除收藏' : '添加收藏'}`;
    favBtn.onclick = () => toggleFavorite(anime.id);
    
    // Play button visibility
    const playBtn = document.getElementById('modalPlay');
    if (playBtn) {
        playBtn.style.display = anime.episodes ? 'inline-block' : 'none';
    }
    
    // Show modal
    animeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    animeModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show error message
function showError(message) {
    animeGrid.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
        </div>
    `;
}

// Video player functions
async function openVideoModal(anime) {
    currentAnime = anime;
    currentEpisode = 1;
    
    // Show modal
    videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Set title
    document.getElementById('videoTitle').textContent = anime.title || 'Unknown';
    document.getElementById('videoEpisode').textContent = `第 ${currentEpisode} 集`;
    
    // Show loading
    videoLoading.style.display = 'flex';
    document.querySelector('.video-player-container').style.display = 'none';
    
    // Search for video sources
    await searchVideoSources(anime);
}

// Video source API
// Note: Due to CORS restrictions, we'll use direct search links as primary method
const VIDEO_SEARCH_SOURCES = [
    // 直接播放
    { name: 'YouTube', searchUrl: 'https://www.youtube.com/results?search_query=', searchParam: 'q', icon: 'youtube', type: 'embed' },
    { name: '📺 本地视频', searchUrl: '', searchParam: '', icon: 'video', type: 'local' },
    // 主流视频平台
    { name: 'B站', searchUrl: 'https://search.bilibili.com/video?keyword=', searchParam: 'keyword', icon: 'bilibili' },
    { name: 'B站漫画', searchUrl: 'https://manga.bilibili.com/search?word=', searchParam: 'word', icon: 'bilibili' },
    { name: 'AcFun', searchUrl: 'https://www.acfun.cn/search/?keyword=', searchParam: 'keyword', icon: 'acfun' },
    { name: '优酷', searchUrl: 'https://search.youku.com/search_video?keyword=', searchParam: 'keyword', icon: 'youku' },
    { name: '爱奇艺', searchUrl: 'https://so.iq.com/?w=', searchParam: 'w', icon: 'iqiyi' },
    { name: '腾讯视频', searchUrl: 'https://v.qq.com/x/search/?q=', searchParam: 'q', icon: 'tencent' },
    // 网盘
    { name: '百度网盘', searchUrl: 'https://pan.baidu.com/search?keyword=', searchParam: 'word', icon: 'cloud' },
    { name: '阿里云盘', searchUrl: 'https://www.alipan.com/search?keyword=', searchParam: 'keyword', icon: 'cloud' },
    { name: '夸克网盘', searchUrl: 'https://pan.quark.cn/search?keyword=', searchParam: 'keyword', icon: 'cloud' },
    // 搜索引擎
    { name: 'Google', searchUrl: 'https://www.google.com/search?q=', searchParam: 'q', icon: 'google' },
    { name: 'Bing', searchUrl: 'https://www.bing.com/search?q=', searchParam: 'q', icon: 'bing' },
    { name: '百度', searchUrl: 'https://www.baidu.com/s?wd=', searchParam: 'wd', icon: 'baidu' }
];

// Video source quality categories
const SOURCE_CATEGORIES = {
    embed: ['YouTube'],
    local: ['📺 本地视频'],
    primary: ['B站', 'B站漫画', 'AcFun', '优酷', '爱奇艺', '腾讯视频'],
    cloud: ['百度网盘', '阿里云盘', '夸克网盘'],
    search: ['Google', 'Bing', '百度']
};

let currentVideoPlayer = null;

async function searchVideoSources(anime) {
    try {
        // Use English title for search (more likely to work on Chinese platforms)
        const searchTitle = anime.title_english || anime.title;
        const searchJapanese = anime.title_japanese || '';

        videoLoading.style.display = 'none';
        document.querySelector('.video-player-container').style.display = 'block';

        // Create search source buttons with better titles
        videoSources = VIDEO_SEARCH_SOURCES.map((source) => {
            let query = searchTitle;
            let type = source.type || 'external';
            
            if (source.name === 'YouTube') {
                query = `${searchTitle} episode 1`;
            } else if (source.name.includes('网盘') || source.name.includes('云盘')) {
                query = `${searchTitle} 动漫`;
            }
            
            return {
                name: source.name,
                category: getSourceCategory(source.name),
                url: source.searchUrl ? `${source.searchUrl}${encodeURIComponent(query)}` : '',
                icon: source.icon || 'external-link',
                isExternal: type === 'external',
                type: type
            };
        });

        renderVideoSources(searchTitle);
        renderEpisodes();

    } catch (error) {
        console.error('Error searching video sources:', error);
        showVideoError('无法加载播放源');
    }
}

// Get source category for UI grouping
function getSourceCategory(sourceName) {
    if (SOURCE_CATEGORIES.embed.includes(sourceName)) return 'embed';
    if (SOURCE_CATEGORIES.local.includes(sourceName)) return 'local';
    if (SOURCE_CATEGORIES.primary.includes(sourceName)) return 'primary';
    if (SOURCE_CATEGORIES.cloud.includes(sourceName)) return 'cloud';
    if (SOURCE_CATEGORIES.search.includes(sourceName)) return 'search';
    return 'other';
}

// Get icon name for each source
function getSourceIcon(sourceName) {
    const icons = {
        'B站': 'tv',
        'B站漫画': 'book-open',
        'AcFun': 'play-circle',
        '优酷': 'youku',
        '爱奇艺': 'iqiyi',
        '腾讯视频': 'tencent',
        'Google': 'google',
        'Bing': 'bing',
        '百度': 'baidu'
    };
    return icons[sourceName] || 'external-link-alt';
}

function renderVideoSources(searchTitle) {
    // Group sources by category
    const groupedSources = {
        embed: [],
        local: [],
        primary: [],
        cloud: [],
        search: [],
        other: []
    };

    videoSources.forEach((source, index) => {
        const category = source.category || 'other';
        if (!groupedSources[category]) groupedSources[category] = [];
        groupedSources[category].push({ ...source, originalIndex: index });
    });

    let html = '';

    // Direct play sources
    if (groupedSources.embed.length > 0) {
        html += `<div class="source-group"><span class="source-group-title">🎬 直接播放</span>`;
        html += groupedSources.embed.map((source) => `
            <button class="source-btn active" data-url="${source.url}" data-index="${source.originalIndex}" data-type="youtube">
                <i class="fab fa-youtube"></i> ${source.name}
            </button>
        `).join('');
        html += `</div>`;
    }

    // Local video
    if (groupedSources.local.length > 0) {
        html += `<div class="source-group"><span class="source-group-title">📁 本地/URL播放</span>`;
        html += groupedSources.local.map((source) => `
            <button class="source-btn" data-index="${source.originalIndex}" data-type="local">
                <i class="fas fa-video"></i> 输入视频地址播放
            </button>
        `).join('');
        html += `</div>`;
    }

    // Primary sources (video platforms)
    if (groupedSources.primary.length > 0) {
        html += `<div class="source-group"><span class="source-group-title">在线观看</span>`;
        html += groupedSources.primary.map((source) => `
            <button class="source-btn" data-url="${source.url}" data-index="${source.originalIndex}" data-type="external">
                <i class="fas fa-${getSourceIcon(source.name)}"></i> ${source.name}
            </button>
        `).join('');
        html += `</div>`;
    }

    // Cloud storage
    if (groupedSources.cloud.length > 0) {
        html += `<div class="source-group"><span class="source-group-title">网盘资源</span>`;
        html += groupedSources.cloud.map((source) => `
            <button class="source-btn" data-url="${source.url}" data-index="${source.originalIndex}" data-type="external">
                <i class="fas fa-${getSourceIcon(source.name)}"></i> ${source.name}
            </button>
        `).join('');
        html += `</div>`;
    }

    // Search engines
    if (groupedSources.search.length > 0) {
        html += `<div class="source-group"><span class="source-group-title">搜索引擎</span>`;
        html += groupedSources.search.map((source) => `
            <button class="source-btn" data-url="${source.url}" data-index="${source.originalIndex}" data-type="external">
                <i class="fas fa-${getSourceIcon(source.name)}"></i> ${source.name}
            </button>
        `).join('');
        html += `</div>`;
    }

    sourcesList.innerHTML = html;
    
    // Add click listeners
    sourcesList.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            const url = btn.dataset.url;
            
            if (type === 'youtube') {
                window.open(url, '_blank');
            } else if (type === 'local') {
                showLocalVideoInput();
            } else {
                window.open(url, '_blank');
            }
        });
    });
}

// Show local video input
function showLocalVideoInput() {
    const videoEmbed = document.getElementById('videoEmbed');
    videoEmbed.innerHTML = `
        <div class="local-video-input">
            <h3>📺 输入视频地址播放</h3>
            <p>支持 MP4, WebM, M3U8 (HLS) 等格式</p>
            <input type="text" id="videoUrlInput" placeholder="粘贴视频URL..." 
                   style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin: 10px 0;">
            <button class="btn btn-primary" onclick="playLocalVideo()">
                <i class="fas fa-play"></i> 播放
            </button>
        </div>
    `;
}

// Play local video using Video.js
function playLocalVideo() {
    const url = document.getElementById('videoUrlInput').value.trim();
    if (!url) {
        alert('请输入视频地址');
        return;
    }
    
    const videoEmbed = document.getElementById('videoEmbed');
    
    if (currentVideoPlayer) {
        currentVideoPlayer.dispose();
    }
    
    videoEmbed.innerHTML = `
        <video id="local-video-player" class="video-js vjs-big-play-centered" 
               controls preload="auto" width="100%" height="400"
               data-setup='{"fluid": true}'>
            <source src="${url}" type="video/mp4" />
            <p class="vjs-no-js">您的浏览器不支持视频播放</p>
        </video>
    `;
    
    currentVideoPlayer = videojs('local-video-player');
    currentVideoPlayer.play().catch(e => {
        console.error('播放失败:', e);
    });
}

function renderEpisodes() {
    if (!currentAnime || !currentAnime.episodes) {
        document.getElementById('videoEpisodes').style.display = 'none';
        return;
    }
    
    document.getElementById('videoEpisodes').style.display = 'block';
    const totalEpisodes = currentAnime.episodes;
    
    episodesList.innerHTML = '';
    for (let i = 1; i <= Math.min(totalEpisodes, 100); i++) {
        const epBtn = document.createElement('button');
        epBtn.className = `episode-btn ${i === currentEpisode ? 'active' : ''}`;
        epBtn.textContent = i;
        epBtn.addEventListener('click', () => {
            currentEpisode = i;
            document.getElementById('videoEpisode').textContent = `第 ${i} 集`;
            renderEpisodes();
            // In a real implementation, you'd fetch the episode-specific URL
        });
        episodesList.appendChild(epBtn);
    }
}

function playVideo(url, isExternal = false) {
    const videoEmbed = document.getElementById('videoEmbed');
    
    if (isExternal) {
        // Open external link in new tab
        window.open(url, '_blank');
        videoEmbed.innerHTML = `
            <div class="video-external">
                <i class="fas fa-external-link-alt"></i>
                <p>正在跳转到播放页面...</p>
                <a href="${url}" target="_blank" class="btn btn-primary">点击打开</a>
            </div>
        `;
    } else if (url.includes('iframe') || url.startsWith('http')) {
        videoEmbed.innerHTML = `<iframe src="${url}" frameborder="0" allowfullscreen></iframe>`;
    } else {
        videoEmbed.innerHTML = `<video controls><source src="${url}" type="video/mp4">您的浏览器不支持视频播放</video>`;
    }
}

function showVideoError(message) {
    const videoEmbed = document.getElementById('videoEmbed');
    videoEmbed.innerHTML = `
        <div class="video-error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${message}</p>
            <a href="https://www.bilibili.com/search?keyword=${encodeURIComponent(currentAnime?.title || '')}" target="_blank" class="btn btn-primary">
                <i class="fas fa-external-link-alt"></i> 在B站搜索
            </a>
        </div>
    `;
}

function closeVideoModal() {
    videoModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Clear video
    document.getElementById('videoEmbed').innerHTML = '';
    videoSources = [];
}
