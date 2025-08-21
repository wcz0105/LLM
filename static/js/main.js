// DOM元素
const strategySelect = document.getElementById('strategy-select');
const strategyName = document.getElementById('strategy-name');
const abstractionLevel = document.getElementById('abstraction-level');
const role = document.getElementById('role');
const format = document.getElementById('format');
const additionalRequirements = document.getElementById('additional-requirements');
const descriptionInput = document.getElementById('description');
const generateBtn = document.getElementById('generate-btn');
const previewBtn = document.getElementById('preview-btn');
const historyBtn = document.getElementById('history-btn');
const newStrategyBtn = document.getElementById('new-strategy-btn');
const editStrategyBtn = document.getElementById('edit-strategy-btn');
const componentPreview = document.getElementById('component-preview');

// 当前选中的策略
let currentStrategy = null;

// 初始化
async function init() {
    // 加载策略列表
    await loadStrategies();

    // 事件监听
    strategySelect.addEventListener('change', handleStrategySelect);
    generateBtn.addEventListener('click', generateComponent);
    previewBtn.addEventListener('click', previewComponent);
    historyBtn.addEventListener('click', viewHistory);
    newStrategyBtn.addEventListener('click', createNewStrategy);
    editStrategyBtn.addEventListener('click', editCurrentStrategy);

    // 禁用预览按钮
    previewBtn.disabled = true;
}

// 加载策略列表
async function loadStrategies() {
    try {
        const response = await fetch('/strategies');
        const strategies = await response.json();

        // 清空下拉菜单
        strategySelect.innerHTML = '<option value="">加载策略...</option>';

        // 添加策略选项
        strategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.filename;
            option.textContent = strategy.name;
            strategySelect.appendChild(option);
        });
    } catch (error) {
        console.error('加载策略失败:', error);
        alert('加载策略失败，请检查网络连接');
    }
}

// 处理策略选择
async function handleStrategySelect(event) {
    const filename = event.target.value;
    if (!filename) {
        currentStrategy = null;
        clearStrategyDetails();
        return;
    }

    try {
        const response = await fetch(`/strategies/${filename}`);
        currentStrategy = await response.json();

        // 显示策略详情
        strategyName.textContent = currentStrategy.name;
        abstractionLevel.textContent = currentStrategy.abstraction_level;
        role.textContent = currentStrategy.role;
        format.textContent = currentStrategy.format;
        additionalRequirements.textContent = currentStrategy.additional_requirements || '无';
    } catch (error) {
        console.error('加载策略详情失败:', error);
        alert('加载策略详情失败');
    }
}

// 清空策略详情
function clearStrategyDetails() {
    strategyName.textContent = '未选择策略';
    abstractionLevel.textContent = '-';
    role.textContent = '-';
    format.textContent = '-';
    additionalRequirements.textContent = '-';
}

// 生成组件
async function generateComponent() {
    const description = descriptionInput.value.trim();
    if (!description) {
        alert('请输入组件描述');
        return;
    }

    if (!currentStrategy) {
        alert('请先选择提示策略');
        return;
    }

    // 显示加载状态
    componentPreview.innerHTML = '<div class="loading">生成中...</div>';

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                strategy: currentStrategy,
                description: description
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        // 渲染生成的组件
        renderComponent(data.html);
        previewBtn.disabled = false;
    } catch (error) {
        console.error('生成失败:', error);
        componentPreview.innerHTML = `<div class="error">错误: ${error.message}</div>`;
    }
}

// 渲染组件
function renderComponent(html) {
    componentPreview.innerHTML = html;

    // 执行内联脚本
    const scripts = componentPreview.getElementsByTagName('script');
    for (let script of scripts) {
        try {
            // 创建新脚本并执行
            const newScript = document.createElement('script');
            newScript.text = script.text;
            document.body.appendChild(newScript).parentNode.removeChild(newScript);
        } catch (e) {
            console.error('执行脚本时出错:', e);
        }
    }
}

// 预览组件
function previewComponent() {
    if (!componentPreview.innerHTML || componentPreview.innerHTML.includes('empty-state')) {
        alert('没有可预览的组件');
        return;
    }

    const previewWindow = window.open('', '_blank');
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>组件预览</title>
            <link rel="stylesheet" href="/static/css/components.css">
            <style>
                body { 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    min-height: 100vh; 
                    margin: 0; 
                    padding: 20px;
                    background-color: #f5f7fa;
                }
                .component-container {
                    width: 100%;
                    max-width: 600px;
                }
            </style>
        </head>
        <body>
            <div class="component-container">
                ${componentPreview.innerHTML}
            </div>
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// 查看历史记录
async function viewHistory() {
    try {
        const response = await fetch('/history');
        const history = await response.json();

        if (history.length === 0) {
            alert('暂无历史记录');
            return;
        }

        // 创建历史记录列表
        let historyHTML = '<ul>';
        history.forEach(item => {
            historyHTML += `
                <li>
                    <strong>${new Date(item.timestamp).toLocaleString()}</strong>
                    <p>${item.description}</p>
                    <p>策略: ${item.strategy}</p>
                    <button class="view-history-item" data-id="${item.id}">查看</button>
                </li>
            `;
        });
        historyHTML += '</ul>';

        // 显示历史记录
        componentPreview.innerHTML = `
            <div class="history-container">
                <h3>生成历史</h3>
                ${historyHTML}
                <button id="close-history">关闭</button>
            </div>
        `;

        // 添加事件监听
        document.querySelectorAll('.view-history-item').forEach(button => {
            button.addEventListener('click', async () => {
                const historyId = button.getAttribute('data-id');
                window.location.href = `/result-view?history_id=${historyId}`;
            });
        });

        document.getElementById('close-history').addEventListener('click', () => {
            componentPreview.innerHTML = '<div class="empty-state">生成的组件将显示在这里</div>';
            previewBtn.disabled = true;
        });

    } catch (error) {
        console.error('加载历史记录失败:', error);
        alert('加载历史记录失败');
    }
}

// 创建新策略
function createNewStrategy() {
    window.location.href = '/strategy-editor';
}

// 编辑当前策略
function editCurrentStrategy() {
    if (!currentStrategy) {
        alert('请先选择一个策略');
        return;
    }

    window.location.href = `/strategy-editor?filename=${currentStrategy.filename}`;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);