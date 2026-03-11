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
        
        const response = await fetch('data/anime.json');
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
    const title = anime.title || 'Unknown';
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
        // Search filter
        const titleMatch = !searchTerm || 
            (anime.title && anime.title.toLowerCase().includes(searchTerm)) ||
            (anime.title_english && anime.title_english.toLowerCase().includes(searchTerm));
        
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

async function searchVideoSources(anime) {
    try {
        // Use title to search for video sources
        const searchTitle = anime.title_english || anime.title;
        
        // Try to fetch from API (using JSONP or proxy)
        const searchUrl = `${API_BASE}/yingshi?msg=${encodeURIComponent(searchTitle)}`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        videoLoading.style.display = 'none';
        document.querySelector('.video-player-container').style.display = 'block';
        
        if (data && data.code === 200 && data.data) {
            videoSources = data.data;
            renderVideoSources();
            renderEpisodes();
            
            // Auto play first source
            if (videoSources.length > 0) {
                playVideo(videoSources[0].url);
            }
        } else {
            showVideoError('未找到播放源');
        }
    } catch (error) {
        console.error('Error searching video sources:', error);
        videoLoading.style.display = 'none';
        document.querySelector('.video-player-container').style.display = 'block';
        
        // Fallback: show message to open in new tab
        showVideoError('无法自动播放，请点击上方链接跳转观看');
    }
}

function renderVideoSources() {
    sourcesList.innerHTML = videoSources.map((source, index) => `
        <button class="source-btn" data-url="${source.url}" data-index="${index}">
            ${source.name || `播放源 ${index + 1}`}
        </button>
    `).join('');
    
    // Add click listeners
    sourcesList.querySelectorAll('.source-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.dataset.url;
            playVideo(url);
        });
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

function playVideo(url) {
    const videoEmbed = document.getElementById('videoEmbed');
    
    // Check if it's a direct video URL or needs iframe
    if (url.includes('iframe') || url.startsWith('http')) {
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
