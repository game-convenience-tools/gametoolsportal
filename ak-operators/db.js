const MASTER_ORDER_STAR = ['6', '5', '4', '3', '2', '1'];
const MASTER_ORDER_JOBGROUP = ['先鋒', '狙撃', '前衛', '術師', '重装', '医療', '特殊', '補助'];

const ALL_COLUMNS = [
    { id: 'op', label: 'オペレーター', width: '130px', sortable: true },
    { id: 'star', label: '★', width: '70px', sortable: true },
    { id: 'cv', label: 'CV', width: '120px', sortable: true },
    { id: 'jobGroup', label: '職業', width: '90px', sortable: true },
    { id: 'job', label: '職分', width: '110px', sortable: true }, 
    { id: 'range', label: '攻撃範囲', width: '100px', sortable: true },
    { id: 'cost', label: 'コスト', width: '60px', sortable: true },
    { id: 'block', label: 'ブロック数', width: '90px', sortable: true }, 
    { id: 'hp', label: 'HP', width: '80px', sortable: true },
    { id: 'atk', label: '攻撃力', width: '80px', sortable: true },
    { id: 'def', label: '防御力', width: '80px', sortable: true },
    { id: 'res', label: '術耐性', width: '80px', sortable: true },
    { id: 'reDeploy', label: '再配置', width: '90px', sortable: true }, 
    { id: 'atkSpeed', label: '攻撃速度', width: '95px', sortable: true }, 
    { id: 'obtain', label: '入手方法', width: '180px' }, 
    { id: 'recruitTags', label: '募集タグ', width: '220px' }, 
    { id: 'sName', label: 'スキル名', width: '140px' },
    { id: 'sPriority', label: '特化優先度', width: '95px' },
    { id: 'sSpType', label: 'SPタイプ', width: '95px' }, 
    { id: 'sTrigger', label: '発動タイプ', width: '95px' }, 
    { id: 'sInit', label: '初期SP', width: '65px' }, 
    { id: 'sReq', label: '必要SP', width: '65px' }, 
    { id: 'sDur', label: '持続', width: '50px' },
    { id: 'sEffect', label: '効果詳細', width: '600px' },
    { id: 'sTag', label: 'スキルタグ', visible: true, width: '240px' }
];

const filterKeys = ['sTag', 'star', 'cv', 'jobGroup', 'job', 'range', 'cost', 'block', 'reDeploy', 'atkSpeed', 'obtain', 'recruitTags', 'sPriority', 'sSpType', 'sTrigger'];

let operatorData = [];
let tabs = []; 
let activeTabId = null;
let currentLayoutMode = 'single'; 
let leftTabId = null;
let rightTabId = null;
let activeSide = 'left'; 
let colSettings = ALL_COLUMNS.map(c => ({ id: c.id, visible: true }));
let cvSearchQuery = "";
let sTagSearchQuery = ""; // スキルタグ絞り込み用クエリ
let isComposingSTag = false; // ★スキルタグ用のIME変換中フラグ
let tabCounter = 0;
let cvActiveRowGroup = ""; // 5音ボタンで選択された行（ア、カ、サ…）を保持する変数

function saveState() {
    localStorage.setItem('tabs_data_v40', JSON.stringify(tabs));
    localStorage.setItem('layout_mode_v40', currentLayoutMode);
    localStorage.setItem('left_tab_id_v40', leftTabId);
    localStorage.setItem('right_tab_id_v40', rightTabId);
    localStorage.setItem('active_tab_id_v40', activeTabId);
    localStorage.setItem('active_side_v40', activeSide);
}

function init() {
    operatorData = (typeof DEFAULT_MASTER_DATA !== 'undefined') ? DEFAULT_MASTER_DATA : [];
    if(localStorage.getItem('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    
    const savedCols = localStorage.getItem('column_settings_v40');
    if(savedCols) {
        let parsed = JSON.parse(savedCols);
        colSettings = parsed;
    } else {
        colSettings = ALL_COLUMNS.map(c => ({ id: c.id, visible: true }));
    }
    
    colSettings = ALL_COLUMNS.map(col => {
        const saved = colSettings.find(s => s.id === col.id);
        return saved ? saved : { id: col.id, visible: true };
    });

    const savedTabs = localStorage.getItem('tabs_data_v40');
    const savedLayout = localStorage.getItem('layout_mode_v40');
    
    if (savedTabs) {
        tabs = JSON.parse(savedTabs);
        tabs.forEach(t => {
            if (!t.selections) t.selections = {};
            filterKeys.forEach(k => {
                if (!Array.isArray(t.selections[k])) {
                    t.selections[k] = [];
                }
            });
        });
        currentLayoutMode = savedLayout || 'single';
        leftTabId = localStorage.getItem('left_tab_id_v40');
        rightTabId = localStorage.getItem('right_tab_id_v40');
        activeTabId = localStorage.getItem('active_tab_id_v40');
        activeSide = localStorage.getItem('active_side_v40') || 'left';
        
        tabs.forEach(t => {
            const match = t.id.match(/-(\d+)$/);
            if (match) { tabCounter = Math.max(tabCounter, parseInt(match[1])); }
        });
    }

    if (tabs.length === 0 || !tabs.some(t => t.id === activeTabId)) {
        tabs = [];
        tabCounter = 1;
        const sels = {}; filterKeys.forEach(k => sels[k] = []);
        const firstTab = {
            id: 'tab-' + Date.now() + '-1',
            name: "検索 1",
            selections: sels,
            keyword: "",
            cvQuery: "",
            currentSort: { key: null, asc: true },
            currentPage: 1,
            pageSize: 50
        };
        tabs.push(firstTab);
        leftTabId = firstTab.id;
        activeTabId = firstTab.id;
        activeSide = 'left';
        currentLayoutMode = 'single';
    }

    renderSearchGrid();
    
    const currentTab = tabs.find(t => t.id === activeTabId);
    if (currentTab) {
        document.getElementById('keywordInput').value = currentTab.keyword;
        cvSearchQuery = currentTab.cvQuery;
    }

    if (localStorage.getItem('search_area_collapsed') === 'true') {
        document.getElementById('searchContainer').classList.add('collapsed');
        document.getElementById('toggleSearchBtn').innerHTML = '▼ 検索フィルターを開く';
    }

    changeLayout(currentLayoutMode, false); 

    window.onclick = (e) => { 
        if (!e.target.closest('.search-item')) {
            let changedCV = false;
            let changedSTag = false;

            document.querySelectorAll('.dropdown-list').forEach(l => {
                if (l.classList.contains('show')) {
                    l.classList.remove('show');
                
                    // 🌟要素のIDやクラスから、閉じられたリストが「cv」か「sTag」かを判別してクリア
                    if (l.id === 'list-cv') {
                        cvSearchQuery = "";
                        changedCV = true;
                    }
                    if (l.id === 'list-sTag') {
                        sTagSearchQuery = "";
                        changedSTag = true;
                    }
                }
            });

            // 閉じられたターゲットのみ再描画して、リスト構造を全表示にリセットしておく
            if (changedCV) updateFilters(true);
            if (changedSTag) updateFilters(false);
        }
    };
}

function createNewTabObj(name) {
    tabCounter++;
    const sels = {}; filterKeys.forEach(k => sels[k] = []);
    return {
        id: 'tab-' + Date.now() + '-' + tabCounter,
        name: name || `検索 ${tabCounter}`,
        selections: sels,
        keyword: "",
        cvQuery: "",
        currentSort: { key: null, asc: true },
        currentPage: 1,
        pageSize: 50
    };
}

function addTab(name) {
    const newTab = createNewTabObj(name);
    tabs.push(newTab);
    if (currentLayoutMode !== 'single') {
        switchTab(newTab.id, activeSide === 'left' ? 'left' : 'right');
    } else {
        switchTab(newTab.id, 'left');
    }
}

function switchTab(id, side) {
    if (side === 'left') leftTabId = id;
    else rightTabId = id;
    
    activeTabId = id;
    activeSide = side;
    
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    cvSearchQuery = tab.cvQuery;
    sTagSearchQuery = ""; // タブ切り替え時はクエリリセット
    document.getElementById('keywordInput').value = tab.keyword;
    const cvIn = document.getElementById('cvInput');
    if(cvIn) cvIn.value = tab.cvQuery;

    saveState();
    refreshAll();
}

function deleteTab(e, targetId) {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    tabs = tabs.filter(t => t.id !== targetId);
    
    if (leftTabId === targetId) leftTabId = tabs[0].id;
    if (rightTabId === targetId) rightTabId = tabs[0].id;
    if (activeTabId === targetId) activeTabId = tabs[0].id;
    
    saveState();
    refreshAll();
}

function changeLayout(mode, shouldSave = true) {
    currentLayoutMode = mode;
    
    document.getElementById('layout-single').classList.toggle('active', mode === 'single');
    document.getElementById('layout-horizontal').classList.toggle('active', mode === 'horizontal');
    document.getElementById('layout-vertical').classList.toggle('active', mode === 'vertical');
    
    const workspace = document.getElementById('workspace');
    const rightView = document.getElementById('rightView');
    
    if (mode === 'single') {
        workspace.classList.remove('view-vertical');
        rightView.style.display = 'none';
        activeSide = 'left';
        activeTabId = leftTabId;
    } else if (mode === 'horizontal') {
        workspace.classList.remove('view-vertical');
        rightView.style.display = 'flex';
        ensureSecondTab();
    } else if (mode === 'vertical') {
        workspace.classList.add('view-vertical');
        rightView.style.display = 'flex';
        ensureSecondTab();
    }
    
    if (shouldSave) saveState();
    refreshAll();
}

function ensureSecondTab() {
    if (tabs.length > 1) {
        if (!rightTabId || rightTabId === leftTabId) {
            rightTabId = tabs.find(t => t.id !== leftTabId).id;
        }
    } else {
        const newTab = createNewTabObj();
        tabs.push(newTab);
        rightTabId = newTab.id;
    }
    if (activeSide === 'right') activeTabId = rightTabId;
    else activeTabId = leftTabId;
}

function setActiveSide(side) {
    activeSide = side;
    activeTabId = (side === 'left') ? leftTabId : rightTabId;
    
    document.getElementById('leftView').classList.toggle('active-side', side === 'left');
    document.getElementById('rightView').classList.toggle('active-side', side === 'right');
    
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    cvSearchQuery = tab.cvQuery;
    sTagSearchQuery = "";
    document.getElementById('keywordInput').value = tab.keyword;
    const cvIn = document.getElementById('cvInput');
    if(cvIn) cvIn.value = tab.cvQuery;
    
    saveState();
    updateFilters();
}

function changePageSizeForTab(tabId, value, side) {
    const tab = tabs.find(t => t.id === tabId);
    if(!tab) return;
    tab.pageSize = value;
    tab.currentPage = 1;
    saveState();
    handleSearch(tabId, side);
}

function setPageForTab(tabId, pageNum, side) {
    const tab = tabs.find(t => t.id === tabId);
    if(!tab) return;
    tab.currentPage = pageNum;
    saveState();
    handleSearch(tabId, side);
}

function normalizeVal(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/\\n/g, '\n').trim();
}

function handleSearch(tabId, side) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const kw = tab.keyword.toLowerCase();
    let filtered = [];
    
    operatorData.forEach((char, originalIdx) => {
        let isFilterMatch = true;
        for(let k of filterKeys) {
            if (k === 'cv') {
                const targetCV = String(char.cv ?? '').toLowerCase();
                if (tab.selections.cv.length && !tab.selections.cv.some(s => targetCV === s.toLowerCase())) { isFilterMatch = false; break; }
                if (tab.cvQuery && !targetCV.includes(tab.cvQuery.toLowerCase())) { isFilterMatch = false; break; }
                continue;
            }
            if(tab.selections[k] && tab.selections[k].length && !['sPriority', 'sSpType', 'sTrigger', 'sTag'].includes(k)) {
                if(['obtain', 'recruitTags'].includes(k)) {
                    const rawVals = (Array.isArray(char[k]) ? char[k] : String(char[k] ?? '').split(',')).map(s => normalizeVal(s));
                    if(!tab.selections[k].some(s => rawVals.includes(normalizeVal(s)))) { isFilterMatch = false; break; }
                } else {
                    if(!tab.selections[k].some(s => normalizeVal(s) === normalizeVal(char[k]))) { isFilterMatch = false; break; }
                }
            }
        }
        // ドロップダウン条件（基本フィルター）に一致していなければその時点で除外
        if (!isFilterMatch) return;

        // キーワード一致判定（オペレーターの基本情報）
        const nameMatched = kw && (char.name || "").toLowerCase().includes(kw);
        const cvMatched = kw && (char.cv || "").toLowerCase().includes(kw);
        const rangeMatched = kw && (char.range || "").toLowerCase().includes(kw);

        // 🌟 修正の核心：スキル個別のフィルタリング
        const filteredSkills = (char.skills || []).filter(s => {
            if(!s) return false;
            
            // 1. まずドロップダウンのスキル系条件（優先度・回復・発動・スキルタグ）で厳格に絞り込む
            if(tab.selections.sPriority.length && !tab.selections.sPriority.some(sel => normalizeVal(sel) === normalizeVal(s.priority))) return false;
            if(tab.selections.sSpType.length && !tab.selections.sSpType.some(sel => normalizeVal(sel) === normalizeVal(s.spType))) return false;
            if(tab.selections.sTrigger.length && !tab.selections.sTrigger.some(sel => normalizeVal(sel) === normalizeVal(s.trigger))) return false;
            if(tab.selections.sTag.length) {
                const sTags = (Array.isArray(s.tag) ? s.tag : String(s.tag ?? '').split(',').map(t => t.trim())).map(t => normalizeVal(t));
                if(!tab.selections.sTag.some(t => sTags.includes(normalizeVal(t)))) return false;
            }
            
            // 2. 上記のスキルタグ等に合格した上で、キーワード検索（kw）が入力されている場合の判定
            if(kw) {
                // 名前やCVがヒットしているなら、スキル条件は（タグさえ合っていれば）中身を問わず合格
                if(nameMatched || cvMatched || rangeMatched) return true;
                // 名前やCVがヒットしていないなら、スキル名かスキル効果にキーワードが含まれている必要がある
                return (s.name || "").toLowerCase().includes(kw) || (s.effect || "").toLowerCase().includes(kw);
            }
            
            return true;
        });

        const hasSkillFilter = tab.selections.sPriority.length || tab.selections.sSpType.length || tab.selections.sTrigger.length || tab.selections.sTag.length;
        
        // 🌟 修正：キーワードがある場合、オペレーター自身（名前等）か「条件を満たしたスキル」のどちらかもキーワードにヒットしていなければ除外
        if (kw && !nameMatched && !cvMatched && !rangeMatched && filteredSkills.length === 0) return;
        
        // スキルタグ等のフィルター、またはキーワードがある場合に、表示対象となるスキルだけをセット
        // （何もヒットしなかった場合は非表示、または空行化の制御）
        if (hasSkillFilter && filteredSkills.length === 0) return; // タグ指定があるのに該当スキルが0なら除外
        
        const displaySkills = (kw || hasSkillFilter) ? (filteredSkills.length > 0 ? filteredSkills : (char.skills || [null])) : (char.skills || [null]);
        filtered.push({ ...char, _originalIdx: originalIdx, _displaySkills: displaySkills });
    });

    if (tab.currentSort.key) {
        filtered.sort((a, b) => {
            let vA = (tab.currentSort.key === 'op') ? a.name : (a[tab.currentSort.key] ?? '');
            let vB = (tab.currentSort.key === 'op') ? b.name : (b[tab.currentSort.key] ?? '');
            const numA = parseFloat(vA), numB = parseFloat(vB);
            if (!isNaN(numA) && !isNaN(numB)) return tab.currentSort.asc ? numA - numB : numB - numA;
            return tab.currentSort.asc ? String(vA).localeCompare(String(vB), 'ja') : String(vB).localeCompare(String(vA), 'ja');
        });
    }

    renderTable(filtered, tab, side);
}

function formatRangeText(text) {
    if (!text) return '-';
    let formatted = text.replace(/\\n/g, '\n');
    return formatted.replace(/ /g, '<span class="range-invisible-space">□</span>');
}

function renderTable(allData, tab, side) {
    const kw = tab.keyword.toLowerCase();
    const cols = colSettings.filter(s => s.visible).map(s => ALL_COLUMNS.find(c => c.id === s.id)).filter(Boolean);
    
    document.getElementById(`${side}TabLabel`).innerText = `${tab.name} (${allData.length}件)`;
    
    let displayData = allData;
    let totalPages = 1;
    
    const pageSizeStr = String(tab.pageSize || "50");
    const currentPage = parseInt(tab.currentPage) || 1;

    if (pageSizeStr !== "all") {
        const size = parseInt(pageSizeStr) || 50;
        totalPages = Math.ceil(allData.length / size) || 1;
        if (tab.currentPage > totalPages) tab.currentPage = totalPages;
        if (tab.currentPage < 1) tab.currentPage = 1;
        const start = (tab.currentPage - 1) * size;
        displayData = allData.slice(start, start + size);
    }

    const footer = document.getElementById(`${side}Footer`);
    let pSizeOptions = ["10", "20", "50", "100", "all"].map(v => `<option value="${v}" ${pageSizeStr === v ? 'selected' : ''}>${v === 'all' ? '全件' : v + '件'}</option>`).join('');
    
    const currentSize = pageSizeStr === "all" ? allData.length : (parseInt(pageSizeStr) || 50);
    const fromItem = allData.length === 0 ? 0 : (tab.currentPage - 1) * currentSize + 1;
    const toItem = Math.min(tab.currentPage * currentSize, allData.length);

    footer.innerHTML = `
        <div style="margin-right:12px; font-size:0.9em; color:var(--text-sub);">
            ${fromItem}～${toItem}件を表示中
        </div>
        <div class="page-size-selector">
            表示: <select onchange="changePageSizeForTab('${tab.id}', this.value, '${side}')">${pSizeOptions}</select>
        </div>
        <div class="pagination-mini">
            <button class="btn-page-mini" ${tab.currentPage === 1 ? 'disabled' : ''} onclick="setPageForTab('${tab.id}', ${tab.currentPage - 1}, '${side}')">◀</button>
            <span style="padding:0 4px; font-weight:bold;">${tab.currentPage} / ${totalPages}</span>
            <button class="btn-page-mini" ${tab.currentPage === totalPages ? 'disabled' : ''} onclick="setPageForTab('${tab.id}', ${tab.currentPage + 1}, '${side}')">▶</button>
        </div>
    `;

    document.getElementById(`${side}Head`).innerHTML = `<tr>${cols.map(c => {
        const icon = c.sortable ? (tab.currentSort.key === c.id ? (tab.currentSort.asc ? ' ▲' : ' ▼') : ' <span style="opacity:0.3">⇅</span>') : '';
        const stickyCls = (c.id === 'op') ? 'sticky-col' : '';
        return `<th style="width:${c.width}" ${c.sortable ? `onclick="requestSort('${c.id}', '${tab.id}')" class="sortable ${stickyCls}"` : `class="${stickyCls}"`}>${c.label}${icon}</th>`;
    }).join('')}</tr>`;

    let html = "";
    if (displayData.length === 0) {
        html = `<tr><td colspan="${cols.length}" style="text-align:center; padding:30px; color:var(--text-sub);">該当するオペレーターが見つかりません。</td></tr>`;
    } else {
        displayData.forEach(char => {
            const visibleSkills = char._displaySkills || (char.skills || [null]);
            const skillMap = { sName:'name', sPriority:'priority', sSpType:'spType', sTrigger:'trigger', sInit:'initSp', sReq:'reqSp', sDur:'duration', sEffect:'effect', sTag:'tag' };

            visibleSkills.forEach((s, i) => {
                let row = '<tr>';
                cols.forEach(col => {
                    const isMain = !['sName','sPriority','sSpType','sTrigger','sInit','sReq','sDur','sEffect','sTag'].includes(col.id);
                    if (isMain && i > 0) return;
                    
                    let rawVal = isMain ? (col.id === 'op' ? char.name : (char[col.id] ?? '-')) : (s ? (s[skillMap[col.id]] ?? '-') : '-');
                    let display = "";
                    let isSearchable = filterKeys.includes(col.id);
                    let clickableCls = (isSearchable) ? 'clickable-cell' : '';
                    let clickAttr = "";

                    if (typeof rawVal === 'string' && col.id !== 'range') rawVal = rawVal.replace(/\\n/g, '\n');

                    // 🌟 修正の核心：キーワード単語だけでなく、ドロップダウンで今選ばれている単語もハイライト対象のリスト(配列)に加える
                    let highlightWords = [];
                    if (kw) highlightWords.push(kw);
                    if (tab.selections[col.id] && tab.selections[col.id].length) {
                        // ドロップダウンで選択されているワードを追加（大文字小文字を区別しないため小文字化）
                        highlightWords.push(...tab.selections[col.id].map(v => String(v).toLowerCase()));
                    }

                    if (col.id === 'op') display = `<strong>${hl(rawVal, kw)}</strong>`;
                    else if (['obtain','recruitTags','sTag'].includes(col.id)) { 
                        // 🌟 createBadgesにキーワード単語だけでなく、選択されたワードのリスト（配列）をそのまま渡せるようにする
                        display = createBadges(rawVal, col.id, highlightWords); 
                        clickableCls = ""; 
                    }
                    else if (col.id === 'range') display = `<div class="range-monospace">${formatRangeText(hl(rawVal, kw))}</div>`;
                    else display = hl(rawVal, kw);
                    
                    if (clickableCls) {
                        const encVal = encodeURIComponent(String(isMain ? (char[col.id] ?? '-') : (s ? (s[skillMap[col.id]] ?? '-') : '-')));
                        clickAttr = `onclick="handleCellClick('${col.id}', '${encVal}', true)"`;
                    }
                    const stickyCls = (col.id === 'op') ? 'sticky-col' : '';
                    row += `<td ${isMain ? `rowspan="${visibleSkills.length}"` : ''} class="${clickableCls} ${stickyCls}" ${clickAttr}>${display}</td>`;
                });
                html += row + '</tr>';
            });
            
        });
        
    }
    document.getElementById(`${side}Body`).innerHTML = html;
}

function handleCellClick(key, val, isEncoded = false) {
    let v = isEncoded ? decodeURIComponent(val) : val;
    addOrToggleSelection(key, v);
}

function renderSearchGrid() {
    const grid = document.getElementById('searchGrid');
    if(!grid) return;
    const labels = { star:'★', cv:'CV', jobGroup:'職業', job:'職分', range:'攻撃範囲', cost:'コスト', block:'ブロック数', reDeploy:'再配置', atkSpeed:'攻撃速度', obtain:'入手方法', recruitTags:'募集タグ', sPriority:'特化優先度', sSpType:'SPタイプ', sTrigger:'発動タイプ', sTag:'スキルタグ' };
    
    grid.innerHTML = `<div class="search-item keyword-item"><label>キーワード</label><div class="input-wrapper"><input type="text" id="keywordInput" oninput="updateKeyword(this.value)" placeholder="名前/スキル/効果..."><span class="main-clear-btn" onclick="updateKeyword('')">×</span></div></div>`;
    
    filterKeys.forEach(k => {
        const itemClass = (k === 'sTag') ? 'search-item stag-item' : 'search-item';
        grid.innerHTML += `<div class="${itemClass}"><label>${labels[k]}</label><div class="chip-container" onclick="toggleDrop(event,'${k}')"><div id="chips-${k}"></div><span class="placeholder" id="ph-${k}">選択なし</span><span class="main-clear-btn" onclick="clearSel(event,'${k}')">×</span></div><div class="dropdown-list" id="list-${k}"></div></div>`;
        
    });
}

function updateKeyword(val) {
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    tab.keyword = val;
    tab.currentPage = 1;
    document.getElementById('keywordInput').value = val;
    saveState();
    refreshAll();
}

function filterCVOptions(val, event) {
    event.stopPropagation();
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    tab.cvQuery = val;
    tab.currentPage = 1;
    cvSearchQuery = val;
    document.getElementById('list-cv').classList.add('show');
    saveState();
    updateFilters(true);
    refreshAll();
}

// スキルタグドロップダウン内でのインクリメンタルサーチ用関数
function filterSTagOptions(val, event) {
    event.stopPropagation();
    sTagSearchQuery = val;
    // IME変換中でなければ、リストの描画を更新
    if (!isComposingSTag) {
        updateFilters();
    }
}

function refreshAll() {
    renderTabs();
    if (leftTabId) handleSearch(leftTabId, 'left');
    if (currentLayoutMode !== 'single' && rightTabId) handleSearch(rightTabId, 'right');
    updateFilters();
    
    document.getElementById('leftView').classList.toggle('active-side', activeSide === 'left');
    const rView = document.getElementById('rightView');
    if (rView && rView.style.display !== 'none') {
        document.getElementById('rightView').classList.toggle('active-side', activeSide === 'right');
    }
}

function renderTabs() {
    const bar = document.getElementById('tabBar');
    const addBtn = bar.querySelector('.btn-add-tab');
    const oldTabs = bar.querySelectorAll('.tab');
    oldTabs.forEach(t => t.remove());

    tabs.forEach(t => {
        const tabEl = document.createElement('div');
        const isActive = (t.id === activeTabId);
        
        tabEl.className = `tab ${isActive ? 'active' : ''}`;
        tabEl.onclick = () => switchTab(t.id, currentLayoutMode !== 'single' ? activeSide : 'left');
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'tab-name';
        nameSpan.textContent = t.name;
        nameSpan.ondblclick = (e) => {
            const newName = prompt("タブ名を変更:", t.name);
            if (newName) { 
                t.name = newName; 
                saveState();
                renderTabs(); 
            }
        };

        const closeBtn = document.createElement('span');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = (e) => deleteTab(e, t.id);

        tabEl.appendChild(nameSpan);
        if (tabs.length > 1) tabEl.appendChild(closeBtn);
        bar.insertBefore(tabEl, addBtn);
    });
}

function updateFilters(onlyCV = false) {
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    const getUT = (p) => { let t=[]; operatorData.forEach(d=>{ const v=d[p]; if(v) { if(Array.isArray(v)) t.push(...v); else t.push(...String(v).split(',').map(s=>s.trim())); } }); return [...new Set(t)].filter(v => v && v !== '-').sort(); };
    
    if (typeof isComposingSTag === 'undefined') window.isComposingSTag = false;
    if (typeof isComposingCV === 'undefined') window.isComposingCV = false;

    const currentActiveElementId = document.activeElement ? document.activeElement.id : null;

    filterKeys.forEach(k => {
        if (onlyCV && k !== 'cv') return;
        let opts = [];
        const skillKeys = { sPriority: 'priority', sSpType: 'spType', sTrigger: 'trigger', sTag: 'tag' };

        // --- ① オプションデータの抽出（データロジック） ---
        if (k === 'star') opts = [...MASTER_ORDER_STAR];
        else if (k === 'jobGroup') opts = [...MASTER_ORDER_JOBGROUP];
        else if (k === 'cost') {
            opts = [...new Set(operatorData.map(d => String(d[k] || '-')))].filter(v => v && v !== '-');
            opts.sort((a, b) => { const nA = parseFloat(a), nB = parseFloat(b); if (!isNaN(nA) && !isNaN(nB)) return nA - nB; return a.localeCompare(b, 'ja'); });
        } else if (k === 'cv') {
            opts = [...new Set(operatorData.map(d => d.cv))].filter(v => v && v !== '-');
            if (typeof cvSearchQuery !== 'undefined' && cvSearchQuery) {
                opts = opts.filter(o => o.toLowerCase().includes(cvSearchQuery.toLowerCase()));
            }
        } else if (skillKeys[k]) { 
            const subKey = skillKeys[k];
            if (k === 'sTag') {
                let tags = []; operatorData.forEach(d => { (d.skills || []).forEach(s => { if (s && s.tag) tags.push(...String(s.tag).split(',').map(t => t.trim())); }); });
                opts = [...new Set(tags)].filter(v => v && v !== '-').sort();
                if (sTagSearchQuery) {
                    opts = opts.filter(o => o.toLowerCase().includes(sTagSearchQuery.toLowerCase()));
                }
            } else {
                opts = [...new Set(operatorData.flatMap(d => (d.skills||[]).map(s => s[subKey])))].filter(v => v && v !== '-').sort(); 
            }
        } else if (['obtain', 'recruitTags'].includes(k)) opts = getUT(k); 
        else opts = [...new Set(operatorData.map(d => String(d[k] || '-')))].filter(v => v && v !== '-').sort(); 

        // --- ② HTML要素の描画制御 ---
        const list = document.getElementById(`list-${k}`); 
        if(list) {
            // 一度リストを完全にクリア
            list.innerHTML = "";

            // 検索ボックス（cv / sTag）の生成・維持コンテキスト
            let savedSearchBox = (k === 'cv') ? document.getElementById('cvSearchBoxDiv') : (k === 'sTag' ? document.getElementById('sTagSearchBoxDiv') : null);

            // 【Aパターン】CV（キャラクターボイス）専用レイアウト
            if (k === 'cv') {
                // 検索ボックスの作成・挿入
                if (!savedSearchBox) {
                    savedSearchBox = document.createElement('div');
                    savedSearchBox.id = 'cvSearchBoxDiv';
                    savedSearchBox.style = "position: sticky; top: 0; background: var(--bg-table); padding: 6px; border-bottom: 1px solid var(--border-color); z-index: 10; grid-column: 1 / -1; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; gap: 6px;";
                    savedSearchBox.onclick = (e) => e.stopPropagation();
                    
                    const inputEl = document.createElement('input');
                    inputEl.type = "text";
                    inputEl.id = "cvInnerSearchInput";
                    inputEl.placeholder = "CVを絞り込み...";
                    inputEl.style = "width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main); font-size: 0.85em; outline: none;";
                    
                    inputEl.addEventListener('compositionstart', () => { isComposingCV = true; });
                    inputEl.addEventListener('compositionend', (e) => { 
                        isComposingCV = false; 
                        cvSearchQuery = e.target.value;
                        updateFilters(true);
                    });
                    inputEl.addEventListener('input', (e) => {
                        cvSearchQuery = e.target.value;
                        if (!isComposingCV) { updateFilters(true); }
                    });
                    savedSearchBox.appendChild(inputEl);

                    const rowBtnContainer = document.createElement('div');
                    rowBtnContainer.id = "cvRowBtnContainer";
                    rowBtnContainer.style = "display: flex; flex-wrap: wrap; gap: 4px; width: 100%; box-sizing: border-box;";
                    savedSearchBox.appendChild(rowBtnContainer);
                }

                savedSearchBox.querySelector('input').value = typeof cvSearchQuery !== 'undefined' ? cvSearchQuery : "";
                
                const rowBtnContainer = savedSearchBox.querySelector('#cvRowBtnContainer');
                if (rowBtnContainer) {
                    rowBtnContainer.innerHTML = "";
                    const rowGenders = ['すべて', 'ア', 'カ', 'サ', 'タ', 'ナ', 'ハ', 'マ', 'ヤ', 'ラ', 'ワ', '他'];
                    rowGenders.forEach(g => {
                        const btn = document.createElement('button');
                        btn.textContent = g;
                        btn.type = "button";
                        const isActive = (g === 'すべて' && !cvActiveRowGroup) || (cvActiveRowGroup === g);
                        btn.style = `padding: 4px 6px; font-size: 0.8em; border-radius: 4px; cursor: pointer; border: 1px solid var(--border-color); font-weight: bold; transition: all 0.1s ease; min-width: 32px; text-align: center; box-sizing: border-box;`;
                        if (isActive) {
                            btn.style.background = "var(--accent, #2196f3)";
                            btn.style.color = "#ffffff";
                        } else {
                            btn.style.background = "var(--bg-card, rgba(255,255,255,0.7))";
                            btn.style.color = "var(--text-main)";
                        }
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            cvActiveRowGroup = (g === 'すべて') ? "" : g;
                            updateFilters(true);
                        };
                        rowBtnContainer.appendChild(btn);
                    });
                }
                list.appendChild(savedSearchBox);

                // CVリストのグループ化表示（五十音順）
                list.style.minWidth = "500px";
                list.style.gridTemplateColumns = "1fr";

                const groups = { 'ア行': [], 'カ行': [], 'サ行': [], 'タ行': [], 'ナ行': [], 'ハ行': [], 'マ行': [], 'ヤ行': [], 'ラ行': [], 'ワ行': [], 'その他': [] };
                opts.forEach(o => {
                    const matchedRecord = operatorData.find(d => d.cv === o);
                    const kana = matchedRecord && matchedRecord.kana ? matchedRecord.kana.trim() : '';
                    const firstChar = kana.charAt(0);
                    let groupName = 'その他';
                    if (firstChar) {
                        if (/[ア-オァ-ォぁ-お]/.test(firstChar)) groupName = 'ア行';
                        else if (/[カ-コガ-ゴか-こが-ご]/.test(firstChar)) groupName = 'カ行';
                        else if (/[サ-ソザ-ゾさ-そざ-ぞ]/.test(firstChar)) groupName = 'サ行';
                        else if (/[タ-トダ-ドた-とだ-ど]/.test(firstChar)) groupName = 'タ行';
                        else if (/[ナ-ノな-の]/.test(firstChar)) groupName = 'ナ行';
                        else if (/[ハ-ホバ-ボパ-ポは-ほば-ぼぱ-ぽ]/.test(firstChar)) groupName = 'ハ行';
                        else if (/[マ-モま-も]/.test(firstChar)) groupName = 'マ行';
                        else if (/[ヤ-ヨャ-ョや-よゃ-ょ]/.test(firstChar)) groupName = 'ヤ行';
                        else if (/[ラ-ロら-ろ]/.test(firstChar)) groupName = 'ラ行';
                        else if (/[ワヲンわをん]/.test(firstChar)) groupName = 'ワ行';
                    }
                    if (cvActiveRowGroup) {
                        if (cvActiveRowGroup === '他' && groupName !== 'その他') return;
                        if (cvActiveRowGroup !== '他' && !groupName.startsWith(cvActiveRowGroup)) return;
                    }
                    groups[groupName].push(o);
                });

                Object.keys(groups).forEach(groupName => {
                    const cvsInGroup = groups[groupName];
                    if (cvsInGroup.length === 0) return;

                    cvsInGroup.sort((a, b) => {
                        const matchedA = operatorData.find(d => d.cv === a), matchedB = operatorData.find(d => d.cv === b);
                        const kanaAChar = (matchedA && matchedA.kana ? matchedA.kana.trim().charAt(0) : '') || '';
                        const kanaBChar = (matchedB && matchedB.kana ? matchedB.kana.trim().charAt(0) : '') || '';
                        if (kanaAChar !== kanaBChar) return kanaAChar.localeCompare(kanaBChar, 'ja');
                        return a.localeCompare(b, 'ja');
                    });

                    const groupWrapper = document.createElement('div');
                    groupWrapper.style = "grid-column: 1 / -1; display: block; width: 100%; padding: 6px 8px; border-bottom: 1px solid var(--border-color, rgba(207, 218, 223, 0.6)); box-sizing: border-box;";
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'cv-group-header'; groupHeader.textContent = `【${groupName}】`;
                    groupHeader.style = "font-weight: bold; font-size: 0.85em; color: var(--accent, #2196f3); margin-bottom: 6px; pointer-events: none; text-align: left;";
                    groupWrapper.appendChild(groupHeader);

                    let currentSubChar = null, currentGrid = null;
                    cvsInGroup.forEach(o => {
                        const matched = operatorData.find(d => d.cv === o);
                        let subChar = (matched && matched.kana ? matched.kana.trim().charAt(0) : '') || 'その他';
                        subChar = subChar.replace(/[ァｧぁ]/g, 'ア').replace(/[ィｨぃ]/g, 'イ').replace(/[ゥｩぅ]/g, 'ウ').replace(/[ェｪぇ]/g, 'エ').replace(/[ォｫぉ]/g, 'オ')
                                         .replace(/[ガが]/g, 'カ').replace(/[ギぎ]/g, 'キ').replace(/[グぐ]/g, 'ク').replace(/[ゲげ]/g, 'ケ').replace(/[ゴご]/g, 'コ')
                                         .replace(/[ザざ]/g, 'サ').replace(/[ジじ]/g, 'シ').replace(/[ズず]/g, 'ス').replace(/[ゼぜ]/g, 'セ').replace(/[ゾぞ]/g, 'ソ')
                                         .replace(/[ダだ]/g, 'タ').replace(/[ヂぢ]/g, 'チ').replace(/[ヅづっッ]/g, 'ツ').replace(/[デで]/g, 'テ').replace(/[ドど]/g, 'ト')
                                         .replace(/[バパばぱ]/g, 'ハ').replace(/[ビピびぴ]/g, 'ヒ').replace(/[ブプぶぷ]/g, 'フ').replace(/[ベペべぺ]/g, 'ヘ').replace(/[ボポぼぽ]/g, 'ホ')
                                         .replace(/[ャゃ]/g, 'ヤ').replace(/[ュゅ]/g, 'ユ').replace(/[ョょ]/g, 'ヨ').replace(/[ヮゎ]/g, 'ワ');

                        if (subChar !== currentSubChar) {
                            currentSubChar = subChar;
                            currentGrid = document.createElement('div');
                            currentGrid.style = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; box-sizing: border-box; width: 100%; margin-bottom: 6px;";
                            groupWrapper.appendChild(currentGrid);
                        }

                        const itemDiv = document.createElement('div');
                        itemDiv.className = `dropdown-item ${tab.selections[k].includes(o) ? 'selected' : ''}`;
                        itemDiv.style = "padding: 6px 4px; font-size: 0.9em; text-align: center; border-radius: 4px; cursor: pointer; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;";
                        itemDiv.onclick = (e) => { e.stopPropagation(); handleCellClick(k, encodeURIComponent(o), true); };
                        itemDiv.innerHTML = String(o).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
                        if (currentGrid) currentGrid.appendChild(itemDiv);
                    });
                    list.appendChild(groupWrapper);
                });

            // 【Bパターン】JOB（職分）専用レイアウト
            } else if (k === 'job') {
                list.style.display = "block";
                list.style.minWidth = "450px"; 
                list.style.gridTemplateColumns = "1fr";

                const groups = {};
                MASTER_ORDER_JOBGROUP.forEach(jg => groups[jg.trim()] = []);
                groups['その他'] = [];

                opts.forEach(o => {
                    const matchedRecord = operatorData.find(d => d.job === o);
                    const jg = matchedRecord && matchedRecord.jobGroup ? matchedRecord.jobGroup.trim() : 'その他';
                    if (groups[jg]) groups[jg].push(o); else groups['その他'].push(o);
                });

                [...MASTER_ORDER_JOBGROUP, 'その他'].forEach(groupName => {
                    const jobsInGroup = groups[groupName.trim()];
                    if (!jobsInGroup || jobsInGroup.length === 0) return;

                    jobsInGroup.sort((a, b) => a.localeCompare(b, 'ja'));

                    const groupWrapper = document.createElement('div');
                    groupWrapper.style = "grid-column: 1 / -1; display: block; width: 100%; padding: 6px 8px; border-bottom: 1px solid var(--border-color, rgba(207, 218, 223, 0.6)); box-sizing: border-box; text-align: left;";
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'job-group-header'; groupHeader.textContent = `【${groupName}】`;
                    groupHeader.style = "font-weight: bold; font-size: 0.85em; color: var(--accent, #2196f3); margin-bottom: 6px; pointer-events: none; text-align: left; display: block;";
                    groupWrapper.appendChild(groupHeader);

                    const gridContainer = document.createElement('div');
                    gridContainer.style = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; box-sizing: border-box; width: 100%;";

                    jobsInGroup.forEach(o => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = `dropdown-item ${tab.selections[k].includes(o) ? 'selected' : ''}`;
                        itemDiv.style = "padding: 6px 4px; font-size: 0.9em; text-align: center; border-radius: 4px; cursor: pointer; box-sizing: border-box; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0; display: block;";
                        itemDiv.onclick = (e) => { e.stopPropagation(); handleCellClick(k, encodeURIComponent(o), true); };
                        itemDiv.innerHTML = String(o).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
                        gridContainer.appendChild(itemDiv);
                    });
                    groupWrapper.appendChild(gridContainer);
                    list.appendChild(groupWrapper);
                });

            // 【Cパターン】それ以外の共通（フラットなリスト表示）
            } else {
                // sTag の場合はリスト最上部に検索ボックスを挿入
                if (k === 'sTag') {
                    if (!savedSearchBox) {
                        savedSearchBox = document.createElement('div');
                        savedSearchBox.id = 'sTagSearchBoxDiv';
                        savedSearchBox.style = "position: sticky; top: 0; background: var(--bg-table); padding: 6px; border-bottom: 1px solid var(--border-color); z-index: 10;";
                        savedSearchBox.onclick = (e) => e.stopPropagation();
                        
                        const inputEl = document.createElement('input');
                        inputEl.type = "text"; inputEl.id = "sTagInnerSearchInput"; placeholder = "スキルタグを絞り込み...";
                        inputEl.style = "width: 100%; box-sizing: border-box; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main); font-size: 0.85em;";
                        inputEl.addEventListener('compositionstart', () => { isComposingSTag = true; });
                        inputEl.addEventListener('compositionend', (e) => { isComposingSTag = false; filterSTagOptions(e.target.value, e); });
                        inputEl.addEventListener('input', (e) => { if (!isComposingSTag) { filterSTagOptions(e.target.value, e); } });
                        savedSearchBox.appendChild(inputEl);
                    }
                    savedSearchBox.querySelector('input').value = sTagSearchQuery;
                    list.appendChild(savedSearchBox);
                }

                // 標準的なアイテム要素の生成
                opts.forEach(o => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = `dropdown-item ${tab.selections[k].includes(o) ? 'selected' : ''}`;
                    itemDiv.onclick = (e) => { e.stopPropagation(); handleCellClick(k, encodeURIComponent(o), true); };
                    
                    if (k === 'range') {
                        itemDiv.innerHTML = `<div class="range-monospace" style="font-size:12px; background:rgba(0,0,0,0.03); padding:4px; border-radius:4px;">${formatRangeText(o)}</div>`;
                    } else {
                        itemDiv.innerHTML = String(o).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
                    }
                    list.appendChild(itemDiv);
                });
            }
        }

        // --- ③ チップス（選択バッジ）の描画 ---
        const chips = document.getElementById(`chips-${k}`); 
        if(chips) {
            chips.innerHTML = "";
            tab.selections[k].forEach(v => {
                const chipDiv = document.createElement('div');
                chipDiv.className = `chip ${k === 'range' ? 'chip-range' : ''}`;
                const removeSpan = document.createElement('span');
                removeSpan.className = 'remove-chip'; removeSpan.textContent = '×';
                removeSpan.onclick = (e) => { e.stopPropagation(); handleCellClick(k, encodeURIComponent(v), true); };
                chipDiv.appendChild(removeSpan);
                if (k === 'range') {
                    const rc = document.createElement('div'); rc.className = 'range-monospace'; rc.style.fontSize = '10px';
                    rc.innerHTML = formatRangeText(v); chipDiv.appendChild(rc);
                } else chipDiv.appendChild(document.createTextNode(String(v).replace(/\\n/g, ' ').replace(/\n/g, ' ')));
                chips.appendChild(chipDiv);
            });
        }
        
        if (k !== 'cv') {
            const ph = document.getElementById(`ph-${k}`);
            if(ph) ph.style.display = tab.selections[k].length ? 'none' : 'block';
        }
    });

    // --- ④ 入力フォーカス・キャレット位置の復元 ---
    if (currentActiveElementId === 'cvInnerSearchInput') {
        const cvInput = document.getElementById('cvInnerSearchInput');
        if (cvInput && document.activeElement !== cvInput) { cvInput.focus(); }
        if (cvInput && !window.isComposingCV) {
            const valLen = cvInput.value.length; cvInput.setSelectionRange(valLen, valLen);
        }
    } else if (currentActiveElementId === 'sTagInnerSearchInput') {
        const sTagInput = document.getElementById('sTagInnerSearchInput');
        if (sTagInput && document.activeElement !== sTagInput) { sTagInput.focus(); }
        if (sTagInput && !window.isComposingSTag) {
            const valLen = sTagInput.value.length; sTagInput.setSelectionRange(valLen, valLen);
        }
    }
}

function addOrToggleSelection(key, val) {
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    const idx = tab.selections[key].indexOf(val); 
    if(idx === -1) tab.selections[key].push(val); 
    else tab.selections[key].splice(idx, 1); 
    if (key === 'jobGroup') tab.selections.job = []; 
    if (key === 'cv') {
        tab.cvQuery = "";
        const cvIn = document.getElementById('cvInput');
        if(cvIn) cvIn.value = "";
    }
    tab.currentPage = 1;
    saveState();
    refreshAll(); 
}

function clearSel(e, k){ 
    e.stopPropagation(); 
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    tab.selections[k] = []; 
    if(k === 'jobGroup') tab.selections.job = []; 
    if (k === 'cv') {
        tab.cvQuery = "";
        const cvIn = document.getElementById('cvInput');
        if(cvIn) cvIn.value = "";
    }
    if (k === 'sTag') {
        sTagSearchQuery = ""; // スキルタグ全クリア時は絞り込み文字列もクリア
    }
    tab.currentPage = 1;
    saveState();
    refreshAll(); 
}

function toggleDrop(e, k) {
    if(e) e.stopPropagation();
    
    filterKeys.forEach(key => {
        if(key !== k) {
            const l = document.getElementById(`list-${key}`);
            if(l && l.classList.contains('show')) {
                l.classList.remove('show');
                if (key === 'cv') { cvSearchQuery = ""; cvActiveRowGroup = ""; } // 🌟追加
                if (key === 'sTag') { sTagSearchQuery = ""; }
                updateFilters(key === 'cv'); 
            }
        }
    });

    const list = document.getElementById(`list-${k}`);
    if(!list) return;

    if(list.classList.contains('show')) {
        list.classList.remove('show');
        if (k === 'cv') { cvSearchQuery = ""; cvActiveRowGroup = ""; } // 🌟追加
        if (k === 'sTag') { sTagSearchQuery = ""; }
        updateFilters(k === 'cv');
    } else {
        list.classList.add('show');
        
        setTimeout(() => {
            if (k === 'cv') {
                const input = document.getElementById('cvInnerSearchInput');
                if (input) input.focus();
            }
            if (k === 'sTag') {
                const input = document.getElementById('sTagInnerSearchInput');
                if (input) input.focus();
            }
        }, 50);
    }
}

function allClear(){ 
    const tab = tabs.find(t => t.id === activeTabId);
    if(!tab) return;
    tab.keyword = ""; 
    tab.cvQuery = "";
    sTagSearchQuery = ""; // 一括リセット時もクリア
    tab.currentPage = 1;
    const cvIn = document.getElementById('cvInput');
    if(cvIn) cvIn.value = "";
    document.getElementById('keywordInput').value = "";
    filterKeys.forEach(k => tab.selections[k] = []); 
    saveState();
    refreshAll(); 
}

function hl(t, w){ if(!w) return t; const escaped = w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); return String(t).replace(new RegExp(`(${escaped})`,'gi'), '<span class="highlight">$1</span>'); }

function createBadges(rawVal, colId, highlightWords = []) {
    if (!rawVal || rawVal === '-') return '-';
    
    const vals = Array.isArray(rawVal) 
        ? rawVal 
        : String(rawVal).split(',').map(s => s.trim());
        
    return vals.map(v => {
        const encVal = encodeURIComponent(v);
        let displayVal = v;

        // 🌟 渡されたハイライト単語リストをループして、一致するものをすべて順番にハイライトする
        if (Array.isArray(highlightWords) && highlightWords.length > 0) {
            highlightWords.forEach(word => {
                if (!word || !word.trim()) return;
                displayVal = hl(displayVal, word); // 既存の hl 関数を連続適用
            });
        } else if (typeof highlightWords === 'string' && highlightWords) {
            displayVal = hl(displayVal, highlightWords);
        }
        
        return `<span class="badge badge-${colId}" onclick="event.stopPropagation(); handleCellClick('${colId}', '${encVal}', true)">${displayVal}</span>`;
    }).join(' ');
}

function requestSort(id, tabId) { 
    const tab = tabs.find(t => t.id === tabId);
    if (tab.currentSort.key === id) tab.currentSort.asc = !tab.currentSort.asc; 
    else { tab.currentSort.key = id; tab.currentSort.asc = true; } 
    saveState();
    refreshAll();
}

function exportData() { 
    const b = new Blob([JSON.stringify(operatorData, null, 2)], {type: 'application/json'}); 
    const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(b), download: 'arknights_data.json'}); 
    a.click(); 
}

function toggleDarkMode() { const isDark = document.documentElement.getAttribute('data-theme') === 'dark'; document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark'); localStorage.setItem('theme', isDark ? 'light' : 'dark'); }
function openColumnModal() { const container = document.getElementById('columnListContainer'); container.innerHTML = colSettings.map(s => { const match = ALL_COLUMNS.find(c => c.id === s.id); if(!match) return ''; return `<div class="column-item" draggable="true" ondragstart="drag(event)" ondragover="allowDrop(event)" ondrop="drop(event)" data-id="${s.id}">☰ <input type="checkbox" id="chk-${s.id}" ${s.visible ? 'checked' : ''}> <label for="chk-${s.id}">${match.label}</label></div>`; }).join(''); document.getElementById('columnModal').style.display = 'block'; }
function saveColumnSettings() { colSettings = Array.from(document.querySelectorAll('.column-item')).map(item => ({ id: item.dataset.id, visible: item.querySelector('input').checked })); localStorage.setItem('column_settings_v40', JSON.stringify(colSettings)); refreshAll(); closeModal('columnModal'); }
let draggedItem = null; function drag(e) { draggedItem = e.currentTarget; } function allowDrop(e) { e.preventDefault(); } function drop(e) { e.preventDefault(); const list = document.getElementById('columnListContainer'); const items = [...list.querySelectorAll('.column-item')]; const curIdx = items.indexOf(e.currentTarget), dragIdx = items.indexOf(draggedItem); if (curIdx > dragIdx) list.insertBefore(draggedItem, e.currentTarget.nextSibling); else list.insertBefore(draggedItem, e.currentTarget); }
function openManual() { window.open('アークナイツオペレーターデータベースマニュアル.html', '_blank'); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function toggleSearchArea() {
    const container = document.getElementById('searchContainer');
    const btn = document.getElementById('toggleSearchBtn');
    const isCollapsed = container.classList.toggle('collapsed');
    
    if (isCollapsed) {
        btn.innerHTML = '▼ 検索フィルターを開く';
        localStorage.setItem('search_area_collapsed', 'true');
    } else {
        btn.innerHTML = '▲ 検索フィルターを閉じる';
        localStorage.setItem('search_area_collapsed', 'false');
    }
}
// キーワードに一致する部分のみを強調表示（マーク）する関数
function highlightText(text, keyword) {
    if (!text) return '';
    if (!keyword || !keyword.trim()) return text;
    
    // 特殊文字をエスケープ
    const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // 大文字小文字を区別せず、一致した部分を<mark>で囲む
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    return text.replace(regex, '<mark class="highlight">$1</mark>');
}
window.onload = init;