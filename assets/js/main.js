/* =========================================== */
/* 1. 代码块语言切换功能                         */
/* =========================================== */

/**
 * 为每个代码块添加语言切换下拉框
 * 要求：在 pre code 标签上提供 data-cpp-code 和 data-go-code 属性
 */
function setupCodeBlockSwitchers() {
    const switchers = document.querySelectorAll('.code-switcher');

    switchers.forEach(switcher => {
        // 获取默认的 pre > code 元素
        const defaultPre = switcher.querySelector('pre');
        const defaultCode = defaultPre?.querySelector('code');
        if (!defaultCode) return;

        // 获取默认语言（从 data-default-lang 读取，默认为 cpp）
        const defaultLang = switcher.getAttribute('data-default-lang') || 'cpp';

        // 收集所有语言的代码（包括默认语言）
        const codeMap = new Map();
        
        // 1. 添加默认语言
        codeMap.set(defaultLang, {
            code: defaultCode.textContent,
            className: defaultCode.className
        });

        // 2. 添加 template 中定义的备用语言
        const templates = switcher.querySelectorAll('template[data-lang]');
        templates.forEach(tmpl => {
            const lang = tmpl.getAttribute('data-lang');
            const codeContent = tmpl.content.querySelector('code');
            if (codeContent) {
                codeMap.set(lang, {
                    code: codeContent.textContent,
                    className: codeContent.className
                });
            }
        });

        // 如果没有备用语言，则无需添加下拉框
        if (codeMap.size <= 1) return;

        // 创建下拉框
        const select = document.createElement('select');
        select.className = 'code-lang-select';
        for (let lang of codeMap.keys()) {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang.toUpperCase();
            select.appendChild(option);
        }
        select.value = defaultLang;
        switcher.appendChild(select);

        // 保存 codeMap 和当前显示的 pre 元素引用
        switcher.codeMap = codeMap;
        let currentPre = defaultPre;

        // 语言切换事件
        select.addEventListener('change', function(e) {
            const newLang = e.target.value;
            const langData = switcher.codeMap.get(newLang);
            if (!langData) return;

            // 创建新的 pre 和 code 元素
            const newPre = document.createElement('pre');
            const newCode = document.createElement('code');
            newCode.className = langData.className;
            newCode.textContent = langData.code;
            newPre.appendChild(newCode);

            // 替换当前显示的 pre
            switcher.replaceChild(newPre, currentPre);
            currentPre = newPre;

            // 重新高亮
            hljs.highlightElement(newCode);
            // 重新生成行号
            if (hljs.lineNumbersBlock) {
                const oldLineNumbers = newPre.querySelector('.hljs-ln');
                if (oldLineNumbers) oldLineNumbers.remove();
                hljs.lineNumbersBlock(newCode);
            }
        });
    });
}

/* =========================================== */
/* 2. 动态生成目录核心逻辑（仅兼容H2-H5）          */
/* =========================================== */

/**
 * 生成动态目录函数
 * 从文章内容中提取H2-H5标题，构建层级目录结构
 */
function generateDynamicCatalog() {
    // 获取目录列表容器元素
    const catalogList = document.getElementById('dynamicCatalogList');
    
    // 获取文章内容区域中的所有H2-H5标题元素
    const articleTitles = document.querySelectorAll('.article-content h2, .article-content h3, .article-content h4, .article-content h5');
    
    // 清空原有目录内容
    catalogList.innerHTML = '';

    // 检查是否有标题元素，无标题时显示提示信息
    if (articleTitles.length === 0) {
        const emptyTip = document.createElement('div');
        emptyTip.className = 'catalog-empty-tip';
        emptyTip.textContent = '本文暂无目录';
        catalogList.appendChild(emptyTip);
        return;
    }

    // 初始化父级容器指针：索引0不用，1对应H1(不用)，2对应H2的父容器，以此类推
    // 初始时，所有层级的父容器都是根目录列表
    const parentContainers = {
        1: catalogList,
        2: catalogList,
        3: catalogList,
        4: catalogList,
        5: catalogList
    };

    // 遍历所有标题元素，生成目录项
    articleTitles.forEach(title => {
        // 1. 准备 ID 和链接
        let titleId = title.getAttribute('id');
        if (!titleId) {
            titleId = 'title-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            title.setAttribute('id', titleId);
        }

        const catalogLink = document.createElement('a');
        catalogLink.className = 'catalog-link';
        catalogLink.href = '#' + titleId;
        catalogLink.textContent = title.textContent;

        // 2. 获取当前标题层级
        const currentLevel = parseInt(title.tagName.replace('H', ''));
        const itemClassName = `catalog-item-level${currentLevel}`;

        // 3. 创建列表项
        const catalogItem = document.createElement('li');
        catalogItem.className = itemClassName;
        catalogItem.appendChild(catalogLink);

        // 4. 找到正确的父级容器并添加
        // 父级容器就是上一级(parentContainers[currentLevel - 1])
        // 注意：如果是H2，currentLevel-1=1，parentContainers[1] 是 catalogList，正确。
        const parentUl = parentContainers[currentLevel - 1];
        parentUl.appendChild(catalogItem);

        // 5. 为当前层级准备容器（供下一级使用）
        // 只要不是最后一级(H5)，我们就创建一个空的 ul 挂在当前 item 下，
        // 并更新 parentContainers 指针，让后面更高的层级指向这里。
        if (currentLevel < 5) {
            const childUl = document.createElement('ul');
            childUl.className = 'catalog-list';
            catalogItem.appendChild(childUl);
            
            // 更新指针：当前层级(currentLevel)的子元素，应该放在这里
            parentContainers[currentLevel] = childUl;
        }
        
        // 6. 清理工作：重置比当前层级更高的指针
        // 防止后面出现低级标题时，错误地挂载到之前的高级标题下
        for (let i = currentLevel + 1; i <= 5; i++) {
            parentContainers[i] = parentContainers[currentLevel];
        }
    });
}

/* =========================================== */
/* 3. 自动编号图片（图）和表格（表）                */
/* =========================================== */

/**
 * 自动为所有 figure 的 figcaption 生成图编号
 * 支持去除的前缀格式：
 *   - "图N"、"图N."、"图N："、"图N " (N为数字)
 *   - "图 " (图后跟空格，无数字)
 * 若无上述前缀，则直接添加编号
 */
function autoNumberFigures() {
    const figures = document.querySelectorAll('figure');
    figures.forEach((figure, index) => {
        const figcaption = figure.querySelector('figcaption');
        if (!figcaption) return;

        let originalText = figcaption.innerText.trim();
        // 匹配两种前缀：
        // 1. "图" + 数字 + 可选标点/空白
        // 2. "图" + 至少一个空白（无数字）
        const regex = /^图\s*(?:\d+\s*[.:：]?\s*|\s+)/;
        let description = originalText.replace(regex, '').trim();
        // 如果去除后为空（原内容只有“图”和数字/空格），则保留原描述但去掉前缀
        if (description === '') {
            description = originalText.replace(regex, '').trim();
        }
        const newText = `图${index + 1} ${description}`;
        figcaption.innerText = newText;
    });
}

/**
 * 自动为所有 class="table-caption" 的元素生成表编号
 * 支持去除的前缀格式：
 *   - "表N"、"表N."、"表N："、"表N " (N为数字)
 *   - "表 " (表后跟空格，无数字)
 * 若无上述前缀，则直接添加编号
 */
function autoNumberTables() {
    const tableCaptions = document.querySelectorAll('.table-caption');
    tableCaptions.forEach((captionElem, index) => {
        let originalText = captionElem.innerText.trim();
        // 匹配两种前缀：
        // 1. "表" + 数字 + 可选标点/空白
        // 2. "表" + 至少一个空白（无数字）
        const regex = /^表\s*(?:\d+\s*[.:：]?\s*|\s+)/;
        let description = originalText.replace(regex, '').trim();
        if (description === '') {
            description = originalText.replace(regex, '').trim();
        }
        const newText = `表${index + 1} ${description}`;
        captionElem.innerText = newText;
    });
}

/* =========================================== */
/* 4. 页面初始化函数                            */
/* =========================================== */

/**
 * 页面加载完成后执行的初始化函数
 * 包含目录生成、高亮显示、日历初始化等功能
 */
window.addEventListener('DOMContentLoaded', () => {
    // 动态生成目录
    generateDynamicCatalog();

    // 自动编号图片和表格
    autoNumberFigures();
    autoNumberTables();

    /* =========================================== */
    /* 5. 目录交互逻辑（添加目录动态滑动效果）          */
    /* =========================================== */
    
    // 获取所有目录链接元素
    const catalogLinks = document.querySelectorAll('.catalog-link');
    
    // 获取文章中的所有H2-H5标题元素
    const articleTitles = document.querySelectorAll('.article-content h2, .article-content h3, .article-content h4, .article-content h5');

    // 滚动时高亮当前目录项并确保其在可视区域内
    window.addEventListener('scroll', () => {
        let currentTitle = '';
        let currentCatalogLink = null;
        
        // 遍历所有标题元素，确定当前视口中的标题
        articleTitles.forEach(title => {
            const titleTop = title.offsetTop;
            if (window.scrollY >= titleTop - 100) {
                currentTitle = '#' + title.getAttribute('id');
                currentCatalogLink = document.querySelector(`.catalog-link[href="${currentTitle}"]`);
            }
        });
        
        // 更新目录链接的激活状态
        catalogLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentTitle) {
                link.classList.add('active');
                
                // 滚动目录容器到当前激活的目录项
                if (currentCatalogLink) {
                    const catalogContainer = document.querySelector('.right-catalog');
                    const linkTop = currentCatalogLink.offsetTop;
                    const linkHeight = currentCatalogLink.offsetHeight;
                    const containerHeight = catalogContainer.offsetHeight;
                    const scrollTop = catalogContainer.scrollTop;
                    
                    if (linkTop < scrollTop) {
                        // 如果链接在滚动区域上方，滚动到链接顶部
                        catalogContainer.scrollTop = linkTop;
                    } else if (linkTop + linkHeight > scrollTop + containerHeight) {
                        // 如果链接在滚动区域下方，滚动到链接底部
                        catalogContainer.scrollTop = linkTop + linkHeight - containerHeight;
                    }
                }
            }
        });
    });

    // 点击目录链接时的平滑滚动效果
    catalogLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'  // 平滑滚动效果
                });
            }
        });
    });

    /* =========================================== */
    /* 6. highlight.js初始化                        */
    /* =========================================== */
    
    // 初始化highlight.js代码高亮功能
    setupCodeBlockSwitchers();
    hljs.highlightAll();
    
    // 为代码块添加行号显示
    hljs.initLineNumbersOnLoad({
        singleLine: false  // 单行代码块不显示行号
    });

    /* =========================================== */
    /* 7. 日历组件逻辑                               */
    /* =========================================== */
    
    // 获取日历相关DOM元素
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const yearMonthEl = document.getElementById('yearMonth');
    const calendarDatesEl = document.getElementById('calendarDates');

    // 初始化当前日期对象
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();

    /**
     * 渲染日历函数
     * @param {number} year - 年份
     * @param {number} month - 月份（0-11）
     */
    function renderCalendar(year, month) {
        // 更新年月显示
        yearMonthEl.textContent = `${year}年${month + 1}月`;
        
        // 清空日期容器
        calendarDatesEl.innerHTML = '';

        // 计算当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayWeek = firstDay.getDay();  // 当月第一天是星期几（0=周日）
        const totalDays = lastDay.getDate();     // 当月总天数
        const lastDayOfPrevMonth = new Date(year, month, 0).getDate();  // 上个月最后一天的日期

        // 添加上个月的日期（显示在日历开头部分）
        for (let i = firstDayWeek; i > 0; i--) {
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item other-month';
            dateItem.textContent = lastDayOfPrevMonth - i + 1;
            calendarDatesEl.appendChild(dateItem);
        }

        // 添加当月日期
        const today = new Date();
        const isTodayYear = year === today.getFullYear();
        const isTodayMonth = month === today.getMonth();

        for (let i = 1; i <= totalDays; i++) {
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item';
            dateItem.textContent = i;

            // 如果是今天，添加特殊样式
            if (isTodayYear && isTodayMonth && i === today.getDate()) {
                dateItem.classList.add('today');
            }

            calendarDatesEl.appendChild(dateItem);
        }

        // 添加下个月的日期（填充日历末尾部分）
        const totalCells = firstDayWeek + totalDays;
        const needNextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

        for (let i = 1; i <= needNextMonthDays; i++) {
            const dateItem = document.createElement('div');
            dateItem.className = 'date-item other-month';
            dateItem.textContent = i;
            calendarDatesEl.appendChild(dateItem);
        }
    }

    // 上个月按钮点击事件
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar(currentYear, currentMonth);
    });

    // 下个月按钮点击事件
    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar(currentYear, currentMonth);
    });

    // 初始化日历显示
    renderCalendar(currentYear, currentMonth);

    /* =========================================== */
    /* 8. 回到顶部按钮逻辑                           */
    /* =========================================== */
    
    // 获取回到顶部按钮元素
    const backToTopBtn = document.getElementById('backToTopBtn');
    
    // 滚动显示/隐藏回到顶部按钮
    window.addEventListener('scroll', () => {
        // 当滚动距离超过300px时才显示按钮，否则隐藏
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });
    
    // 点击回到顶部按钮
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'  // 平滑滚动效果
        });
        
        // 点击后立即隐藏按钮
        backToTopBtn.classList.remove('show');
    });
    
    // 初始检查，如果页面已经滚动了一段距离，显示按钮
    if (window.scrollY > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
});