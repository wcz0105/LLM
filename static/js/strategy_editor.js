// DOM元素
const strategyNameInput = document.getElementById('strategy-name');
const abstractionLevelSelect = document.getElementById('abstraction-level');
const roleInput = document.getElementById('role');
const formatTextarea = document.getElementById('format');
const promptPrefixTextarea = document.getElementById('prompt-prefix');
const additionalRequirementsTextarea = document.getElementById('additional-requirements');
const saveStrategyBtn = document.getElementById('save-strategy-btn');
const cancelBtn = document.getElementById('cancel-btn');

// 初始化
function init() {
    // 检查URL参数，查看是否在编辑现有策略
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('filename');

    if (filename) {
        loadStrategy(filename);
    }

    // 事件监听
    saveStrategyBtn.addEventListener('click', saveStrategy);
    cancelBtn.addEventListener('click', () => {
        window.location.href = '/';
    });
}

// 加载策略
async function loadStrategy(filename) {
    try {
        const response = await fetch(`/strategies/${filename}`);
        const strategy = await response.json();

        // 填充表单
        strategyNameInput.value = strategy.name || '';
        abstractionLevelSelect.value = strategy.abstraction_level || '';
        roleInput.value = strategy.role || '';
        formatTextarea.value = strategy.format || '';
        promptPrefixTextarea.value = strategy.prompt_prefix || '';
        additionalRequirementsTextarea.value = strategy.additional_requirements || '';

    } catch (error) {
        console.error('加载策略失败:', error);
        alert('加载策略失败');
    }
}

// 保存策略
async function saveStrategy() {
    const strategy = {
        name: strategyNameInput.value,
        abstraction_level: abstractionLevelSelect.value,
        role: roleInput.value,
        format: formatTextarea.value,
        prompt_prefix: promptPrefixTextarea.value,
        additional_requirements: additionalRequirementsTextarea.value
    };

    if (!strategy.name) {
        alert('策略名称不能为空');
        return;
    }

    try {
        const response = await fetch('/strategies/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(strategy)
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        alert('策略保存成功');
        window.location.href = '/';

    } catch (error) {
        console.error('保存策略失败:', error);
        alert('保存策略失败: ' + error.message);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);