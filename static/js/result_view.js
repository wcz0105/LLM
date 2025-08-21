// DOM元素
const componentDescription = document.getElementById('component-description');
const strategyUsed = document.getElementById('strategy-used');
const componentPreview = document.getElementById('component-preview');
const backBtn = document.getElementById('back-btn');

// 初始化
async function init() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const historyId = urlParams.get('history_id');

    if (!historyId) {
        alert('未指定历史记录ID');
        window.location.href = '/';
        return;
    }

    // 加载历史记录项
    await loadHistoryItem(historyId);

    // 事件监听
    backBtn.addEventListener('click', () => {
        window.location.href = '/';
    });
}

// 加载历史记录项
async function loadHistoryItem(historyId) {
    try {
        const response = await fetch(`/history/${historyId}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // 显示描述和策略
        componentDescription.textContent = data.description;
        strategyUsed.textContent = data.strategy;

        // 渲染组件
        componentPreview.innerHTML = data.html;

        // 执行内联脚本
        const scripts = componentPreview.getElementsByTagName('script');
        for (let script of scripts) {
            try {
                const newScript = document.createElement('script');
                newScript.text = script.text;
                document.body.appendChild(newScript).parentNode.removeChild(newScript);
            } catch (e) {
                console.error('执行脚本时出错:', e);
            }
        }

    } catch (error) {
        console.error('加载历史记录失败:', error);
        componentPreview.innerHTML = `<div class="error">错误: ${error.message}</div>`;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);