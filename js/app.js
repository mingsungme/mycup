/* ════════════════════════════════════════════════════════════
   My Cup — Mood-to-Drink Music Player
   슬라이더(당도/온도/바디) → 음료 매트릭스 → YouTube 매칭
   롱프레스 → iTunes 30초 프리뷰 하이브리드 재생
   라이브러리 → LocalStorage (★ 고정 + 정렬, 팬톤 칩 그래픽 카드)
   ════════════════════════════════════════════════════════════ */
'use strict';

const $ = (id) => document.getElementById(id);
const LS_LIB = 'mycup_library';
const LS_KEY = 'mycup_yt_key';
const LS_GKEY = 'mycup_gemini_key';

/* 컵 사이즈 = 플레이리스트 용량 필터 (oz당 1.25곡) */
const SIZES = {
  short:  { label: 'Short',  oz: 8,  tracks: 10, mins: 40 },
  tall:   { label: 'Tall',   oz: 12, tracks: 15, mins: 60 },
  grande: { label: 'Grande', oz: 16, tracks: 20, mins: 80 },
  venti:  { label: 'Venti',  oz: 20, tracks: 25, mins: 95 },
};

const state = {
  sliders: { sweet: 50, temp: 50, body: 50 },
  size: 'tall',         // 기본 용량
  profile: null,        // 현재 음료 프로필
  queue: [],            // 매칭된 유튜브 영상 목록
  qIndex: 0,
  itunes: null,         // iTunes 30초 프리뷰 트랙
  demo: false,          // 데모 모드(키 없음) 여부
  savedMode: false,     // SCR-06: 라이브러리에서 진입했는지
  saved: false,         // 현재 블렌드 저장 여부
  player: null,
  playerReady: false,
  pressing: false,
  wasPlaying: false,
  progressTimer: null,
};

const previewAudio = new Audio();
previewAudio.preload = 'none';

/* ── 유틸 ─────────────────────────────────────── */
function toast(msg, ms = 2600) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (sec) => {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
               : `${m}:${String(s).padStart(2, '0')}`;
};
const LIVE_THRESHOLD = 172800; // 48시간 초과 duration → 24/7 라이브 스트림으로 간주
function getApiKey() {
  return (localStorage.getItem(LS_KEY) || '').trim() ||
         ((window.MYCUP_CONFIG && window.MYCUP_CONFIG.YOUTUBE_API_KEY) || '').trim();
}
function getGeminiKey() {
  return (localStorage.getItem(LS_GKEY) || '').trim() ||
         ((window.MYCUP_CONFIG && window.MYCUP_CONFIG.GEMINI_API_KEY) || '').trim();
}
function loadLib() {
  try { return JSON.parse(localStorage.getItem(LS_LIB)) || []; }
  catch { return []; }
}
function saveLib(lib) { localStorage.setItem(LS_LIB, JSON.stringify(lib)); }
function toTitleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── 화면 전환 ────────────────────────────────── */
const TABS = ['order', 'play', 'library'];
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  $(`scr-${name}`).classList.add('active');
  const tabbar = $('tabbar');
  if (TABS.includes(name)) {
    tabbar.classList.remove('hidden');
    tabbar.querySelectorAll('.tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.go === name));
  } else {
    tabbar.classList.add('hidden');
  }
  if (name === 'library') { renderLibrary(); updateMiniPlayer(); }
  else if (libEditMode) setLibEditMode(false); // 라이브러리를 떠나면 편집 모드 종료
}

/* ════════════════════════════════════════════════
   1) 음료 프로필 — 슬라이더 3종(당도/온도/바디) → 음료 매트릭스
   ════════════════════════════════════════════════ */
function mixHex(a, b, t) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x, y) => Math.round(x + (y - x) * t);
  return '#' + [c(r1, r2), c(g1, g2), c(b1, b2)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/* 음료 매트릭스: [HOT/COLD][바디 light/mid/heavy][당도 low/mid/high]
   커피뿐 아니라 차·주스·스무디·과일 음료까지 — 팬톤 칩 그래픽(emoji)·컬러·무드 포함 */
const D = (name, emoji, color, sub, query, itunesTerm, vibe) =>
  ({ name, emoji, color, sub, query, itunesTerm, vibe });

/* query: 컴필레이션 영상이 아니라 '공식 뮤직비디오가 있는 음원'을 찾는 검색어 */
const DRINKS = {
  hot: [
    [ // body: LIGHT
      D('GREEN TEA', '🌿', '#9caf6f', 'CALM · ZEN · LEAF BLEND', 'calm piano ballad official music video', 'piano ambient', 'warm acoustic'),
      D('CHAMOMILE', '🌼', '#d9c47a', 'SOFT · FLORAL · EVENING BLEND', 'soft acoustic ballad official music video', 'acoustic cafe', 'warm acoustic'),
      D('HONEY YUZU TEA', '🍯', '#e0a83e', 'SWEET · CITRUS · WARM BLEND', 'sweet acoustic pop official music video', 'sweet acoustic pop', 'warm acoustic'),
    ],
    [ // body: MEDIUM
      D('MATCHA LATTE', '🍵', '#88a764', 'EARTHY · SMOOTH · GREEN BLEND', 'mellow r&b official music video', 'chill lofi', 'chill lofi beats'),
      D('CHAI LATTE', '🫖', '#b07b4a', 'SPICED · COZY · MILK BLEND', 'jazz soul official music video', 'jazz cafe', 'cozy jazz'),
      D('CARAMEL LATTE', '🍮', '#c98e4f', 'SWEET · BUTTERY · COZY BLEND', 'city pop official music video', 'city pop', 'warm acoustic'),
    ],
    [ // body: HEAVY
      D('COFFEE', '☕', '#3f2d22', 'INTENSE · DARK · ROASTED BLEND', 'smooth jazz vocal official music video', 'jazz piano', 'cozy jazz'),
      D('FLAT WHITE', '🥛', '#a07852', 'SMOOTH · VELVET · MILK BLEND', 'soul ballad official music video', 'smooth jazz', 'cozy jazz'),
      D('HOT CHOCOLATE', '🍫', '#6e4a33', 'SWEET · RICH · COCOA BLEND', 'r&b soul official music video', 'soul r&b', 'cozy jazz'),
    ],
  ],
  cold: [
    [ // body: LIGHT
      D('KIWI JUICE', '🥝', '#9bbf3b', 'TANGY · GREEN · FRESH BLEND', 'indie pop official music video', 'indie pop', 'fresh indie pop'),
      D('LEMONADE', '🍋', '#dede8d', 'ZESTY · SPARKLING · SUMMER BLEND', 'summer pop official music video', 'summer pop', 'fresh indie pop'),
      D('ORANGE JUICE', '🍊', '#f5a637', 'BRIGHT · CITRUS · MORNING BLEND', 'upbeat pop official music video', 'happy pop', 'fresh indie pop'),
    ],
    [ // body: MEDIUM
      D('GREEN JUICE', '🥬', '#4f8f46', 'CLEAN · CRISP · DETOX BLEND', 'chill house official music video', 'chill house', 'fresh indie pop'),
      D('PEACH ICED TEA', '🍑', '#e8a06a', 'BREEZY · FRUITY · AFTERNOON BLEND', 'chill pop official music video', 'chill pop', 'fresh indie pop'),
      D('MANGO SMOOTHIE', '🥭', '#f3b04e', 'TROPICAL · SWEET · SUNNY BLEND', 'tropical house official music video', 'tropical house', 'fresh indie pop'),
    ],
    [ // body: HEAVY
      D('COLD BREW', '🧊', '#3a2a20', 'BOLD · SLOW · DARK BLEND', 'dark r&b official music video', 'dark r&b', 'chill lofi beats'),
      D('ICED LATTE', '🥤', '#b9986e', 'CHILL · SMOOTH · STUDY BLEND', 'mellow pop official music video', 'lofi', 'chill lofi beats'),
      D('BERRY SMOOTHIE', '🫐', '#a64d79', 'SWEET · BERRY · VELVET BLEND', 'k-r&b official music video', 'k-r&b', 'chill lofi beats'),
    ],
  ],
};

const level3 = (v) => (v >= 67 ? 2 : v >= 34 ? 1 : 0);

function pickDrink(s) {
  return DRINKS[s.temp >= 50 ? 'hot' : 'cold'][level3(s.body)][level3(s.sweet)];
}

function buildProfile(s) {
  const hot = s.temp >= 50;
  const drink = pickDrink(s);
  const code = `${Math.round(s.sweet / 10)}${Math.round(s.temp / 10)}${Math.round(s.body / 10)}`.padStart(3, '0')
             + (hot ? ' C' : ' U');
  // 컵 비주얼용 컬러: 음료 고유색을 당도(밝게)·바디(진하게)로 살짝 변조
  const cupColor = mixHex(mixHex(drink.color, '#ffffff', (s.sweet / 100) * 0.18),
                          '#1f1b14', (s.body / 100) * 0.12);
  return { name: drink.name, emoji: drink.emoji, color: drink.color, cupColor,
           code, sub: drink.sub, sliders: { ...s }, hot, size: state.size,
           vibe: drink.vibe, query: drink.query, itunesTerm: drink.itunesTerm };
}

/* ── SCR-02 컵 비주얼 실시간 반영 ─────────────── */
const SLIDER_KEYS = ['sweet', 'temp', 'body'];

function updateCupVisual() {
  const s = state.sliders;
  SLIDER_KEYS.forEach((k) => { $(`val-${k}`).textContent = s[k]; });
  const p = buildProfile(s);
  $('cup-fill').style.height = `${45 + s.body * 0.45}%`;
  $('cup-fill').style.background = p.cupColor;
  $('cup-ice').classList.toggle('on', s.temp <= 35);
  $('cup-steam').classList.toggle('on', s.temp >= 65);
  $('cup-name').childNodes[0].textContent = `${p.emoji} ${p.name}  `;
  $('cup-code').textContent = p.code;
  $('atmosphere-title').textContent = `Today: ${toTitleCase(p.name)} Mood`;
}

/* ════════════════════════════════════════════════
   2) API — YouTube Data API v3 / iTunes Search(JSONP)
   ════════════════════════════════════════════════ */
/* 데모 모드(키 없음): 공식 뮤직비디오가 있는 음원들로 무드별 플레이리스트 구성 */
const DEMO_TITLES = {
  '2Vv-BfVoq4g': ['Ed Sheeran - Perfect (Official Music Video)', 'Ed Sheeran'],
  '450p7goxZqg': ['John Legend - All of Me (Official Video)', 'John Legend'],
  'YQHsXMglC9A': ['Adele - Hello (Official Music Video)', 'Adele'],
  'V1Pl8CzNzCw': ['Billie Eilish, Khalid - lovely (Official Music Video)', 'Billie Eilish'],
  'wXhTHyIgQ_U': ['Post Malone - Circles (Official Music Video)', 'Post Malone'],
  'RgKAFK5djSk': ['Wiz Khalifa - See You Again ft. Charlie Puth (Official Video)', 'Wiz Khalifa'],
  'JGwWNGJdvx8': ['Ed Sheeran - Shape of You (Official Music Video)', 'Ed Sheeran'],
  'hT_nvWreIhg': ['OneRepublic - Counting Stars (Official Music Video)', 'OneRepublic'],
  'ZbZSe6N_BXs': ['Pharrell Williams - Happy (Official Music Video)', 'Pharrell Williams'],
  '60ItHLz5WEA': ['Alan Walker - Faded (Official Music Video)', 'Alan Walker'],
  'kXYiU_JCYtU': ['Linkin Park - Numb (Official Music Video)', 'Linkin Park'],
  'OPf0YbXqDm0': ['Mark Ronson - Uptown Funk ft. Bruno Mars (Official Video)', 'Mark Ronson'],
  '09R8_2nJtjg': ['Maroon 5 - Sugar (Official Music Video)', 'Maroon 5'],
  'CevxZvSJLk8': ['Katy Perry - Roar (Official Music Video)', 'Katy Perry'],
  'nfWlot6h_JM': ['Taylor Swift - Shake It Off (Official Video)', 'Taylor Swift'],
  'kJQP7kiw5Fk': ['Luis Fonsi - Despacito ft. Daddy Yankee (Official Video)', 'Luis Fonsi'],
};
const DEMO_SETS = {
  'cozy jazz': ['2Vv-BfVoq4g', '450p7goxZqg', 'YQHsXMglC9A', 'V1Pl8CzNzCw', 'wXhTHyIgQ_U', 'RgKAFK5djSk'],
  'warm acoustic': ['2Vv-BfVoq4g', 'JGwWNGJdvx8', '450p7goxZqg', 'hT_nvWreIhg', 'YQHsXMglC9A', 'ZbZSe6N_BXs'],
  'chill lofi beats': ['wXhTHyIgQ_U', 'V1Pl8CzNzCw', '60ItHLz5WEA', 'RgKAFK5djSk', 'kXYiU_JCYtU', 'YQHsXMglC9A'],
  'fresh indie pop': ['OPf0YbXqDm0', 'ZbZSe6N_BXs', '09R8_2nJtjg', 'CevxZvSJLk8', 'nfWlot6h_JM', 'kJQP7kiw5Fk'],
};

function demoQueue(profile, count) {
  // 무드 세트 우선 + 부족하면 전체 풀에서 채움 (중복 없이)
  const ids = [...(DEMO_SETS[profile.vibe] || DEMO_SETS['chill lofi beats'])];
  for (const id of Object.keys(DEMO_TITLES)) {
    if (ids.length >= count) break;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, count).map((id) => ({
    videoId: id,
    title: DEMO_TITLES[id][0],
    channel: DEMO_TITLES[id][1],
    thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  }));
}

/* YouTube 검색 (음악 카테고리 + 임베드 가능 영상만) */
async function ytSearch(q, key, max) {
  const url = 'https://www.googleapis.com/youtube/v3/search'
    + `?part=snippet&type=video&videoCategoryId=10&maxResults=${max}`
    + `&videoEmbeddable=true&videoSyndicated=true&safeSearch=none`
    + `&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`YouTube API 오류 (HTTP ${res.status})`);
    err.kind = res.status === 403 ? 'quota' : 'api';
    throw err;
  }
  const data = await res.json();
  return (data.items || [])
    .filter((i) => i.id && i.id.videoId)
    .map((i) => ({
      videoId: i.id.videoId,
      title: i.snippet.title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
      channel: i.snippet.channelTitle,
      thumb: (i.snippet.thumbnails.medium || i.snippet.thumbnails.default || {}).url ||
             `https://i.ytimg.com/vi/${i.id.videoId}/hqdefault.jpg`,
    }));
}

/* Gemini 선곡 엔진: 음료 프로필 + 용량(곡수)에 맞는 실제 발매곡 리스트 생성 */
async function geminiPickTracks(profile, count) {
  const gkey = getGeminiKey();
  if (!gkey) return [];
  const s = profile.sliders;
  const prompt =
    `당신은 음료 무드 기반 음악 큐레이터입니다.\n` +
    `음료 프로필: ${profile.name} (${profile.sub})\n` +
    `당도 ${s.sweet}% / 온도 ${s.temp}% (${profile.hot ? 'HOT' : 'COLD'}) / 바디 ${s.body}%\n` +
    `장르 무드: ${profile.itunesTerm}\n\n` +
    `이 무드에 어울리는, 실제로 발매되었고 YouTube에 공식 뮤직비디오가 있는 곡 ${count}곡을 골라주세요.\n` +
    `규칙: 같은 아티스트 최대 2곡, 한국·해외 곡을 적절히 섞고, 존재하지 않는 곡은 절대 포함하지 마세요.\n` +
    `가급적 공식 뮤직비디오가 유명한(조회수 높은) 곡 위주로 골라주세요 — videoId를 정확히 아는 곡이 우선입니다.\n` +
    `videoId는 그 곡의 공식 뮤직비디오 YouTube 영상 ID(11자)를 정확히 아는 경우에만 넣고, 불확실하면 null로 두세요.\n` +
    `JSON 배열로만 답하세요: [{"artist":"아티스트","title":"곡명","videoId":"YouTube영상ID 또는 null"}, ...]`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(gkey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
      }),
    });
  if (!res.ok) throw new Error(`Gemini API 오류 (HTTP ${res.status})`);
  const data = await res.json();
  const text = data.candidates && data.candidates[0] &&
               data.candidates[0].content.parts.map((p) => p.text || '').join('');
  const list = JSON.parse(text);
  return (Array.isArray(list) ? list : [])
    .filter((t) => t && t.artist && t.title)
    .slice(0, count)
    .map((t) => ({ artistName: t.artist, trackName: t.title, previewUrl: null,
                   videoId: (typeof t.videoId === 'string' && /^[\w-]{11}$/.test(t.videoId)) ? t.videoId : null }));
}

/* ── YouTube 쿼터를 쓰지 않는 보조 도구들 ──────────
   1) 썸네일 검증: 영상 ID가 유효하면 mqdefault가 320px,
      무효하면 120px 플레이스홀더가 옴 (Data API 호출 없음)
   2) 매칭 캐시: 한 번 찾은 곡↔영상 ID는 localStorage에 저장해 재검색 방지 */
const LS_VCACHE = 'mycup_video_cache';

function validateVideoId(id) {
  return new Promise((resolve) => {
    if (!id || !/^[\w-]{11}$/.test(id)) return resolve(false);
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 5000);
    img.onload = () => { clearTimeout(timer); resolve(img.naturalWidth > 130); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  });
}

function vcacheGet(k) {
  try { return (JSON.parse(localStorage.getItem(LS_VCACHE)) || {})[k] || null; }
  catch { return null; }
}
function vcacheSet(k, v) {
  try {
    const c = JSON.parse(localStorage.getItem(LS_VCACHE)) || {};
    c[k] = v;
    localStorage.setItem(LS_VCACHE, JSON.stringify(c));
  } catch { /* 저장 실패해도 동작에는 지장 없음 */ }
}

/* 핵심 매칭: 선곡은 Gemini/iTunes, 재생은 YouTube.
   YouTube Data API '검색'은 쿼터(곡당 100유닛)를 크게 먹으므로 최후 보조로만 사용:
   1) 매칭 캐시 조회 (쿼터 0)
   2) Gemini가 준 videoId를 썸네일로 검증 (쿼터 0)
   3) 둘 다 없을 때만 YouTube 검색 (쿼터 소모) → 실패 시 iTunes 30초 프리뷰
   곡수는 컵 사이즈(Short 10 / Tall 15 / Grande 20 / Venti 25)로 결정 */
async function searchYouTube(profile) {
  const key = getApiKey();
  const gkey = getGeminiKey();
  const count = (SIZES[profile.size] || SIZES.tall).tracks;
  // YouTube '재생'은 쿼터를 안 쓰므로, Gemini 키만 있어도 풀 곡 재생 가능
  if (!key && !gkey) return { items: demoQueue(profile, count), demo: true, engine: 'demo' };

  let tracks = [];
  let engine = 'itunes';
  if (gkey) {
    try {
      // ID 검증 탈락분을 대비해 여유분(+6)까지 요청 — 최종 큐는 count로 자름
      tracks = await geminiPickTracks(profile, Math.min(count + 6, 40));
      if (tracks.length) engine = 'gemini';
    } catch { /* Gemini 실패 → iTunes 폴백 */ }
  }
  if (!tracks.length) {
    tracks = await searchItunesTracks(profile.itunesTerm || profile.query, count);
  }

  let quotaBlocked = false;
  if (tracks.length >= 3) {
    const found = await Promise.all(tracks.map(async (t) => {
      // 30초 프리뷰는 YouTube와 무관하게 확보 (키 불필요)
      const preview = t.previewUrl ||
        await searchItunesTracks(`${t.artistName} ${t.trackName}`, 1)
          .then((a) => (a[0] ? a[0].previewUrl : null)).catch(() => null);

      const cacheKey = `${t.artistName}|${t.trackName}`.toLowerCase();
      // 1) 캐시 → 2) Gemini videoId(썸네일 검증) → 3) YouTube 검색(쿼터 소모)
      let videoId = vcacheGet(cacheKey);
      if (!videoId && t.videoId && await validateVideoId(t.videoId)) videoId = t.videoId;
      if (!videoId && key && !quotaBlocked) {
        try {
          const v = await ytSearch(`${t.artistName} ${t.trackName} official music video`, key, 1);
          if (v.length) videoId = v[0].videoId;
        } catch (e) {
          if (e.kind === 'quota') quotaBlocked = true;
        }
      }
      if (videoId) {
        vcacheSet(cacheKey, videoId);
        return { videoId, title: `${t.trackName} — ${t.artistName}`, channel: t.artistName,
                 thumb: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, preview };
      }
      // 영상 매칭 실패 → 30초 프리뷰 전용 트랙으로라도 큐에 포함
      return preview
        ? { videoId: null, title: `${t.trackName} — ${t.artistName}`,
            channel: t.artistName, thumb: t.artwork || '', preview }
        : null;
    }));
    const seen = new Set();
    const deduped = found.filter((i) => {
      if (!i) return false;
      const k = i.videoId || `p:${i.title}`;
      return !seen.has(k) && seen.add(k);
    });
    // 풀곡(YT 매칭 성공) 우선, 부족분만 30초 프리뷰로 채움
    const items = [...deduped.filter((i) => i.videoId), ...deduped.filter((i) => !i.videoId)];
    if (items.length >= 3) {
      const allPreview = items.every((i) => !i.videoId);
      return { items: items.slice(0, count), demo: false,
               engine: allPreview ? 'itunes-preview' : engine };
    }
  }
  // 폴백: 무드 키워드로 공식 MV 직접 검색 (키 없거나 쿼터 소진이면 데모 큐레이션)
  if (key && !quotaBlocked) {
    try {
      const items = await ytSearch(profile.query, key, Math.min(count, 50));
      if (!items.length) { const e = new Error('empty'); e.kind = 'empty'; throw e; }
      return { items, demo: false, engine: 'youtube' };
    } catch (e) {
      if (e.kind !== 'quota') throw e;
    }
  }
  return { items: demoQueue(profile, count), demo: true, engine: 'demo' };
}

/* iTunes Search API — CORS 회피를 위해 JSONP 사용 (키 불필요)
   무드 키워드로 실제 발매 곡들을 추려 반환 */
function searchItunesTracks(term, limit = 10) {
  return new Promise((resolve) => {
    const cb = '__mycup_it_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const timer = setTimeout(() => done([]), 8000);
    function done(tracks) {
      clearTimeout(timer);
      delete window[cb];
      script.remove();
      resolve(tracks);
    }
    window[cb] = (data) => {
      const list = ((data && data.results) || [])
        .filter((r) => r.previewUrl)
        .map((r) => ({ trackName: r.trackName, artistName: r.artistName,
                       previewUrl: r.previewUrl, artwork: r.artworkUrl100 }));
      done(list.slice(0, limit));
    };
    script.src = 'https://itunes.apple.com/search'
      + `?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit + 5}&country=KR&callback=${cb}`;
    script.onerror = () => done([]);
    document.head.appendChild(script);
  });
}

function searchItunes(term) {
  return searchItunesTracks(term, 1).then((a) => a[0] || null);
}

/* ════════════════════════════════════════════════
   3) SCR-03 블렌딩 — 매칭 + 로딩 애니메이션
   ════════════════════════════════════════════════ */
const BREW_MSGS = ['재료를 고르는 중...', '무드를 추출하는 중...', '플레이리스트를 블렌딩 중...'];

async function blend() {
  if (!navigator.onLine) { toast('오프라인 상태예요. 네트워크 연결을 확인해 주세요.'); return; }
  state.profile = buildProfile(state.sliders);
  showScreen('loading');
  $('brew-error').classList.add('hidden');
  $('brew-bar-fill').style.width = '8%';

  let msgIdx = 0;
  $('brew-msg').textContent = BREW_MSGS[0];
  const msgTimer = setInterval(() => {
    msgIdx = Math.min(msgIdx + 1, BREW_MSGS.length - 1);
    $('brew-msg').textContent = BREW_MSGS[msgIdx];
    $('brew-bar-fill').style.width = `${(msgIdx + 1) * 30 + 8}%`;
  }, 850);

  try {
    const [yt, it] = await Promise.all([
      searchYouTube(state.profile),
      searchItunes(state.profile.itunesTerm).catch(() => null),
      delay(2600), // 조제 애니메이션 최소 노출
    ]);
    clearInterval(msgTimer);
    $('brew-bar-fill').style.width = '100%';
    await delay(350);

    state.queue = yt.items;
    state.qIndex = 0;
    state.demo = yt.demo;
    state.engine = yt.engine || (yt.demo ? 'demo' : 'itunes');
    state.itunes = it;
    state.savedMode = false;
    enterPlay(false); // 플리 생성 후 자동재생 ✕ — ▶ 눌러야 시작
    if (yt.engine === 'itunes-preview')
      toast('YouTube 검색 할당량 소진 — iTunes 30초 프리뷰 모드로 재생해요 ♪', 4200);
    else if (yt.demo) toast('데모 모드 — ⚙ 설정에서 YouTube API 키를 입력하면 실시간 매칭돼요', 3600);
  } catch (e) {
    clearInterval(msgTimer);
    const msgEl = $('brew-error-msg');
    if (!navigator.onLine) msgEl.textContent = '오프라인 상태예요. 연결 후 재시도해 주세요.';
    else if (e.kind === 'empty') msgEl.textContent = '해당 조합의 레시피가 없습니다. 슬라이더를 조정해 보세요.';
    else if (e.kind === 'quota') msgEl.textContent = 'API 키 권한/할당량 문제가 발생했어요. (HTTP 403)';
    else msgEl.textContent = '플레이리스트 매칭에 실패했어요. ' + (e.message || '');
    $('brew-error').classList.remove('hidden');
  }
}

/* ════════════════════════════════════════════════
   4) SCR-04/06 재생 — YouTube Iframe + iTunes 롱프레스
   ════════════════════════════════════════════════ */
let ytApiReady = new Promise((resolve) => {
  window.onYouTubeIframeAPIReady = resolve;
});
(function loadYtApi() {
  const s = document.createElement('script');
  s.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(s);
})();

async function ensurePlayer(videoId, autostart = true) {
  await ytApiReady;
  if (state.player) {
    // cueVideoById: 로드만 하고 재생은 ▶ 버튼을 기다림
    if (autostart) state.player.loadVideoById(videoId);
    else state.player.cueVideoById(videoId);
    return;
  }
  state.player = new YT.Player('yt-player', {
    width: '100%', height: '100%', videoId,
    playerVars: { playsinline: 1, rel: 0, controls: 0, modestbranding: 1, iv_load_policy: 3 },
    events: {
      onReady: (e) => {
        state.playerReady = true;
        startProgress();
        if (autostart) e.target.playVideo();
      },
      onStateChange: onPlayerState,
      onError: () => {
        toast('영상을 재생할 수 없어 다음 곡으로 넘어가요');
        nextTrack();
      },
    },
  });
}

function playerPlaying() {
  return state.playerReady && state.player &&
         state.player.getPlayerState && state.player.getPlayerState() === YT.PlayerState.PLAYING;
}

/* 현재 곡이 iTunes 프리뷰 전용(videoId 없음)인지 — 쿼터 소진 폴백 모드 */
function isAudioMode() {
  const t = state.queue[state.qIndex];
  return !!(t && !t.videoId && t.preview);
}
function isPlaying() {
  return isAudioMode() ? !previewAudio.paused : playerPlaying();
}
function togglePlayback() {
  if (isAudioMode()) {
    previewAudio.paused ? previewAudio.play().catch(() => {}) : previewAudio.pause();
  } else {
    if (!state.player || !state.playerReady) return;
    playerPlaying() ? state.player.pauseVideo() : state.player.playVideo();
  }
  setTimeout(updateMiniPlayer, 300);
}
function syncPlayUi() {
  const playing = isPlaying();
  $('btn-toggle').textContent = playing ? '❚❚' : '▶';
  $('btn-mini-toggle').textContent = playing ? '❚❚' : '▶';
  document.querySelector('.pantone-media').classList.toggle('playing', playing);
}
previewAudio.addEventListener('play', syncPlayUi);
previewAudio.addEventListener('pause', syncPlayUi);
previewAudio.addEventListener('ended', () => {
  if (isAudioMode() && !state.pressing) nextTrack(); // 프리뷰 모드: 30초 끝나면 다음 곡
});

function onPlayerState(e) {
  const playing = e.data === YT.PlayerState.PLAYING;
  $('btn-toggle').textContent = playing ? '❚❚' : '▶';
  $('btn-mini-toggle').textContent = playing ? '❚❚' : '▶';
  // 영상은 노출하지 않음 — 음료 카드 위 이퀄라이저로만 재생 상태 표시
  document.querySelector('.pantone-media').classList.toggle('playing', playing);
  if (e.data === YT.PlayerState.ENDED) nextTrack();
}

function startProgress() {
  clearInterval(state.progressTimer);
  state.progressTimer = setInterval(() => {
    if (isAudioMode()) {
      const dur = previewAudio.duration || 30;
      const cur = previewAudio.currentTime || 0;
      const pct = Math.min(100, (cur / dur) * 100);
      $('progress-fill').style.width = `${pct}%`;
      $('progress-head').style.left = `${pct}%`;
      $('time-cur').textContent = fmt(cur);
      $('time-dur').textContent = `${fmt(dur)} · 30s PREVIEW`;
      $('mini-progress-fill').style.width = `${pct}%`;
      return;
    }
    if (!state.playerReady || !state.player || !state.player.getDuration) return;
    const dur = state.player.getDuration() || 0;
    const cur = state.player.getCurrentTime() || 0;
    const isLive = dur > LIVE_THRESHOLD;
    let pct;
    if (isLive) {
      pct = 100;
      $('time-cur').textContent = 'ON AIR';
      $('time-dur').textContent = '24/7 LIVE';
    } else {
      pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;
      $('time-cur').textContent = fmt(cur);
      $('time-dur').textContent = dur > 0 ? fmt(dur) : 'LIVE';
    }
    $('progress-fill').style.width = `${pct}%`;
    $('progress-head').style.left = `${pct}%`;
    $('mini-progress-fill').style.width = `${pct}%`;
  }, 500);
}

function enterPlay(autostart = true) {
  const p = state.profile;
  const track = state.queue[state.qIndex];
  if (!p || !track) return;

  showScreen('play');
  state.saved = false;
  $('btn-save').textContent = state.savedMode ? '✓ 라이브러리에 저장된 블렌드' : '＋ 라이브러리에 저장';
  $('btn-save').disabled = state.savedMode;

  $('play-title').textContent = toTitleCase(p.name);
  $('pantone-name').childNodes[0].textContent = p.name + ' ';
  $('pantone-code').textContent = p.code;
  $('pantone-sub').textContent = p.sub;
  const swatch = $('pantone-swatch');
  swatch.style.background = mixHex(p.color, '#ffffff', 0.78); // 옅은 음료 틴트 위 그래픽
  swatch.style.opacity = '1';
  $('swatch-emoji').textContent = p.emoji || '🥤';

  renderUpNext();
  renderReceipt();
  playCurrent(autostart);
}

/* 현재 곡의 iTunes 30초 프리뷰 (곡별 프리뷰 우선, 없으면 블렌드 대표 트랙) */
function currentPreview() {
  const t = state.queue[state.qIndex];
  if (t && t.preview) return { url: t.preview, label: t.title };
  if (state.itunes && state.itunes.previewUrl)
    return { url: state.itunes.previewUrl, label: `${state.itunes.trackName} — ${state.itunes.artistName}` };
  return null;
}

async function playCurrent(autostart = true) {
  const track = state.queue[state.qIndex];
  if (!track) return;
  $('now-playing').textContent = `♪ ${track.title} · ${track.channel}`;
  const pv = currentPreview();
  $('press-track').textContent = pv ? pv.label : '미리듣기 트랙 없음';
  $('progress-fill').style.width = '0%';
  $('progress-head').style.left = '0%';
  $('pantone-swatch').style.opacity = '1'; // 영상 대신 항상 음료 그래픽 카드 노출
  $('btn-toggle').textContent = '▶';
  renderUpNext();
  updateMiniPlayer();

  if (track.videoId) {
    if (!state.pressing) previewAudio.pause(); // 프리뷰 모드 잔여 오디오 정지
    await ensurePlayer(track.videoId, autostart);
  } else if (track.preview) {
    // iTunes 30초 프리뷰 모드 (YouTube 쿼터 소진 폴백)
    if (state.player && state.player.pauseVideo) { try { state.player.pauseVideo(); } catch {} }
    previewAudio.src = track.preview;
    previewAudio.currentTime = 0;
    if (autostart) previewAudio.play().catch(() => {});
    startProgress();
  }
}

function nextTrack() {
  if (!state.queue.length) return;
  state.qIndex = (state.qIndex + 1) % state.queue.length;
  playCurrent();
}
function prevTrack() {
  if (!state.queue.length) return;
  state.qIndex = (state.qIndex - 1 + state.queue.length) % state.queue.length;
  playCurrent();
}

function renderUpNext() {
  const list = $('upnext-list');
  list.innerHTML = '';
  const rest = state.queue.length - 1;
  $('upnext-count').textContent = rest > 0 ? `${rest} blends queued` : 'single blend';
  state.queue.forEach((t, i) => {
    if (i === state.qIndex) return;
    const li = document.createElement('li');
    li.className = 'upnext-item';
    li.innerHTML = `
      <img class="upnext-thumb" src="${t.thumb}" alt="" loading="lazy" />
      <div class="upnext-meta">
        <p class="upnext-title"></p>
        <p class="upnext-ch"></p>
      </div><span>▶</span>`;
    li.querySelector('.upnext-title').textContent = t.title;
    li.querySelector('.upnext-ch').textContent = t.channel;
    li.addEventListener('click', () => { state.qIndex = i; playCurrent(); });
    list.appendChild(li);
  });
  $('upnext-sec').classList.toggle('hidden', state.queue.length <= 1);
}

const ENGINE_LABELS = {
  gemini: 'Gemini Curation',
  itunes: 'iTunes Curation',
  youtube: 'YouTube Match',
  demo: 'Demo Curation',
  'itunes-preview': 'iTunes 30s Preview',
};

function renderReceipt() {
  const p = state.profile;
  const s = p.sliders;
  const size = SIZES[p.size] || SIZES.tall;
  $('receipt-batch').textContent = `#BATCH-${p.code.replace(' ', '')}-${p.name.split(' ')[0]}`;
  $('receipt-rows').innerHTML = [
    ['SWEETNESS', `${s.sweet}%`],
    ['TEMPERATURE', `${p.hot ? 'HOT' : 'COLD'} (${s.temp}%)`],
    ['BODY', `${s.body}%`],
    ['SIZE', `${size.label.toUpperCase()} (${size.oz}OZ)`],
    ['BLEND', `${p.emoji} ${p.name}`],
  ].map(([k, v]) => `<div class="receipt-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
  $('receipt-music-rows').innerHTML = [
    ['MOOD', toTitleCase(p.sub.split('·').join(' '))],
    ['TRACKS', `${state.queue.length} SONGS · ~${size.mins} MIN`],
    ['SOURCE', ENGINE_LABELS[state.engine] || (state.demo ? 'Demo Curation' : 'YouTube Match')],
    ['30s PREVIEW', state.itunes ? state.itunes.trackName : '—'],
  ].map(([k, v]) => `<div class="receipt-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
}

/* ── NOW BREWING 미니 플레이어 (라이브러리 하단) ── */
function updateMiniPlayer() {
  const mp = $('miniplayer');
  if (!mp) return;
  if (libEditMode || !state.profile || !state.queue.length) { mp.classList.add('hidden'); return; }
  mp.classList.remove('hidden');
  $('mini-art').textContent = state.profile.emoji || '🥤';
  $('mini-name').textContent = toTitleCase(state.profile.name);
  $('btn-mini-toggle').textContent = isPlaying() ? '❚❚' : '▶';
}

/* ── 롱프레스: YouTube 일시정지 ↔ iTunes 30초 ── */
function setupLongPress() {
  const card = $('pantone-card');
  let timer = null;

  const start = () => {
    const pv = currentPreview();
    if (!pv) return;
    state.pressing = true;
    card.classList.add('pressed');
    state.wasPlaying = playerPlaying();
    if (state.player && state.player.pauseVideo) state.player.pauseVideo();
    previewAudio.src = pv.url;
    previewAudio.currentTime = 0;
    previewAudio.play().catch(() => toast('미리듣기를 재생할 수 없어요'));
  };
  const end = () => {
    clearTimeout(timer);
    if (!state.pressing) return;
    state.pressing = false;
    card.classList.remove('pressed');
    previewAudio.pause();
    if (state.wasPlaying && state.player && state.player.playVideo) state.player.playVideo();
  };

  card.addEventListener('pointerdown', () => {
    if (isAudioMode() || !currentPreview()) return; // 프리뷰 모드에선 이미 프리뷰 재생 중
    timer = setTimeout(start, 350);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) =>
    card.addEventListener(ev, end));
  card.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ════════════════════════════════════════════════
   5) SCR-05 라이브러리 — 팬톤 칩 그래픽 카드 + ★ 고정
   ════════════════════════════════════════════════ */
function saveCurrentBlend() {
  const p = state.profile;
  const t = state.queue[state.qIndex];
  if (!p || !t) { toast('저장할 블렌드가 없어요'); return; }
  const lib = loadLib();
  lib.unshift({
    id: Date.now(),
    savedAt: Date.now(),
    name: p.name, emoji: p.emoji, code: p.code, color: p.color, sub: p.sub,
    sliders: p.sliders, hot: p.hot, vibe: p.vibe, size: p.size || 'tall',
    videoId: t.videoId, videoTitle: t.title, channel: t.channel, thumb: t.thumb,
    preview: t.preview || null, // 저장 곡 자체의 iTunes 30초 프리뷰
    itunes: state.itunes, demo: state.demo,
    starred: false,
  });
  saveLib(lib);
  state.saved = true;
  $('btn-save').textContent = '✓ 저장됨';
  $('btn-save').disabled = true;
  toast('라이브러리에 저장됐어요 ☕');
}

function sortedLib() {
  const lib = loadLib();
  const mode = $('sort-select').value;
  const cmp = mode === 'name'
    ? (a, b) => a.name.localeCompare(b.name)
    : (a, b) => b.savedAt - a.savedAt;
  // 1순위: ★ 켜진 카드 최상단 그룹 고정 → 2순위: 그룹 내 선택 필터 기준 정렬
  return [...lib.filter((i) => i.starred).sort(cmp),
          ...lib.filter((i) => !i.starred).sort(cmp)];
}

let libEditMode = false;

function setLibEditMode(on) {
  libEditMode = on;
  $('btn-lib-edit').textContent = on ? '완료' : '편집';
  $('btn-lib-edit').classList.toggle('on', on);
  $('lib-grid').classList.toggle('editing', on);
  $('btn-edit-done').classList.toggle('hidden', !on); // 하단 큰 종료 버튼
  updateMiniPlayer(); // 편집 중엔 미니플레이어 자리 양보
}

function deleteBlend(id) {
  const lib = loadLib().filter((i) => i.id !== id);
  saveLib(lib);
  renderLibrary();
  toast('블렌드를 삭제했어요');
  if (!lib.length) setLibEditMode(false);
}

function renderLibrary() {
  const grid = $('lib-grid');
  const items = sortedLib();
  grid.innerHTML = '';
  grid.classList.toggle('editing', libEditMode);
  $('lib-empty').classList.toggle('hidden', items.length > 0);

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'lib-card' + (item.starred ? ' starred' : '');
    // 팬톤 칩 그래픽 카드: 음료 고유색 틴트 + 음료 그래픽 (유튜브 썸네일 ✕)
    const tint = mixHex(item.color || '#c9a06a', '#ffffff', 0.78);
    card.innerHTML = `
      <button class="lib-del" aria-label="삭제">✕</button>
      <button class="lib-star${item.starred ? ' on' : ''}" aria-label="즐겨찾기">${item.starred ? '★' : '☆'}</button>
      <div class="lib-swatch" style="background:${tint}">
        <span class="lib-emoji">${item.emoji || '🥤'}</span>
      </div>
      <div class="lib-label">
        <p class="lib-name"></p>
        <p class="lib-code"></p>
      </div>`;
    card.querySelector('.lib-name').textContent = item.name;
    card.querySelector('.lib-code').textContent =
      `${item.code} · ${new Date(item.savedAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`;
    card.querySelector('.lib-del').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBlend(item.id);
    });
    card.querySelector('.lib-star').addEventListener('click', (e) => {
      e.stopPropagation();
      const lib = loadLib();
      const target = lib.find((i) => i.id === item.id);
      if (target) { target.starred = !target.starred; saveLib(lib); }
      renderLibrary();
    });
    card.addEventListener('click', () => {
      if (libEditMode) return; // 편집 모드에선 재생 진입 방지
      openSaved(item);
    });
    grid.appendChild(card);
  });
}

/* 저장 당시 음료 이름으로 매트릭스에서 검색 키워드 복원 */
function findDrinkByName(name) {
  for (const temp of ['hot', 'cold'])
    for (const row of DRINKS[temp])
      for (const d of row)
        if (d.name === name) return d;
  return null;
}

/* SCR-06: 저장된 블렌드 — 자동재생 없이 큐만 세팅, ▶ 눌러야 시작 */
async function openSaved(item) {
  const drink = findDrinkByName(item.name);
  state.profile = {
    name: item.name, emoji: item.emoji || '🥤', code: item.code,
    color: item.color, cupColor: item.color, sub: item.sub || '',
    sliders: item.sliders, hot: item.hot, vibe: item.vibe || 'chill lofi beats',
    size: item.size || 'tall',
    query: drink ? drink.query : `${item.vibe || 'chill'} music playlist`,
    itunesTerm: drink ? drink.itunesTerm : '',
  };
  const savedTrack = { videoId: item.videoId, title: item.videoTitle, channel: item.channel,
                       thumb: item.thumb, preview: item.preview || null };
  state.queue = [savedTrack];
  state.qIndex = 0;
  state.itunes = item.itunes || null;
  state.demo = !!item.demo;
  state.savedMode = true;
  enterPlay(false); // 자동재생 ✕ — 음료 그래픽 + ▶ 대기

  // 같은 무드의 음악 목록을 백그라운드로 채워 Coming Up Next 표시
  try {
    const yt = await searchYouTube(state.profile);
    if (!state.savedMode || state.queue[0].videoId !== savedTrack.videoId) return; // 화면 이탈 시 무시
    const cap = (SIZES[state.profile.size] || SIZES.tall).tracks - 1;
    const extra = yt.items.filter((v) => v.videoId !== savedTrack.videoId).slice(0, cap); // 저장곡 포함 용량만큼
    state.queue = [savedTrack, ...extra];
    state.demo = yt.demo;
    state.engine = yt.engine || 'itunes';
    renderUpNext();
    renderReceipt();
  } catch { /* 목록 로드 실패해도 저장 곡 재생에는 지장 없음 */ }
}

/* ════════════════════════════════════════════════
   6) 초기화 & 이벤트 바인딩
   ════════════════════════════════════════════════ */
function init() {
  // SCR-01 → SCR-02
  $('btn-enter').addEventListener('click', () => showScreen('order'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && $('scr-splash').classList.contains('active')) showScreen('order');
  });

  // 슬라이더 (당도/온도/바디)
  SLIDER_KEYS.forEach((k) => {
    $(`sl-${k}`).addEventListener('input', (e) => {
      state.sliders[k] = +e.target.value;
      updateCupVisual();
    });
  });
  updateCupVisual();

  // 컵 사이즈 선택 (플레이리스트 용량 필터)
  document.querySelectorAll('.size-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.size = chip.dataset.size;
      document.querySelectorAll('.size-chip').forEach((c) =>
        c.classList.toggle('active', c === chip));
      const sz = SIZES[state.size];
      $('blend-eta').textContent = `${sz.tracks} tracks · about ${sz.mins} min`;
    });
  });

  // 블렌딩
  $('btn-blend').addEventListener('click', blend);
  $('btn-retry').addEventListener('click', blend);
  $('btn-reset-sliders').addEventListener('click', () => {
    state.sliders = { sweet: 50, temp: 50, body: 50 };
    SLIDER_KEYS.forEach((k) => { $(`sl-${k}`).value = 50; });
    updateCupVisual();
    showScreen('order');
  });

  // 재생 컨트롤 (곡별로 YouTube / iTunes 프리뷰 자동 선택)
  $('btn-toggle').addEventListener('click', togglePlayback);
  $('btn-next').addEventListener('click', nextTrack);
  $('btn-prev').addEventListener('click', prevTrack);
  $('progress-track').addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (isAudioMode()) {
      previewAudio.currentTime = ratio * (previewAudio.duration || 30);
      return;
    }
    if (!state.player || !state.playerReady || !state.player.getDuration) return;
    const dur = state.player.getDuration();
    if (!dur || dur > LIVE_THRESHOLD) return; // 라이브 스트림은 시킹 불가
    state.player.seekTo(ratio * dur, true);
  });
  $('btn-play-back').addEventListener('click', () =>
    showScreen(state.savedMode ? 'library' : 'order'));
  $('btn-save').addEventListener('click', saveCurrentBlend);
  setupLongPress();

  // NOW BREWING 미니 플레이어
  $('btn-mini-toggle').addEventListener('click', togglePlayback);
  $('mini-meta').addEventListener('click', () => showScreen('play'));

  // 탭바
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      const go = t.dataset.go;
      if (go === 'play' && !state.queue.length) {
        toast('먼저 슬라이더로 블렌드를 만들어 보세요 ☕');
        showScreen('order');
        return;
      }
      showScreen(go);
    });
  });
  $('btn-go-order').addEventListener('click', () => showScreen('order'));
  $('sort-select').addEventListener('change', renderLibrary);
  $('btn-lib-edit').addEventListener('click', () => setLibEditMode(!libEditMode));
  $('btn-edit-done').addEventListener('click', () => setLibEditMode(false));

  // ⚙ 설정 모달
  $('btn-settings').addEventListener('click', () => {
    $('input-yt-key').value = localStorage.getItem(LS_KEY) || '';
    $('input-gemini-key').value = localStorage.getItem(LS_GKEY) || '';
    $('modal-settings').classList.remove('hidden');
  });
  $('btn-settings-close').addEventListener('click', () => $('modal-settings').classList.add('hidden'));
  $('modal-settings').addEventListener('click', (e) => {
    if (e.target === $('modal-settings')) $('modal-settings').classList.add('hidden');
  });
  $('btn-key-save').addEventListener('click', () => {
    const yt = $('input-yt-key').value.trim();
    const gm = $('input-gemini-key').value.trim();
    if (yt) localStorage.setItem(LS_KEY, yt); else localStorage.removeItem(LS_KEY);
    if (gm) localStorage.setItem(LS_GKEY, gm); else localStorage.removeItem(LS_GKEY);
    toast(yt || gm ? 'API 키가 저장됐어요 (localStorage)' : '키가 비어 있어요 — 데모 모드로 동작합니다');
    $('modal-settings').classList.add('hidden');
  });
  $('btn-key-clear').addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_GKEY);
    $('input-yt-key').value = '';
    $('input-gemini-key').value = '';
    toast('저장된 키를 모두 삭제했어요 — 데모 모드로 동작합니다');
  });

  // 네트워크 상태
  window.addEventListener('offline', () => toast('오프라인 상태예요 — 재생/매칭이 제한됩니다'));
  window.addEventListener('online', () => toast('다시 온라인이 됐어요 ✨'));
}

document.addEventListener('DOMContentLoaded', init);
