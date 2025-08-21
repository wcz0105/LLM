# -*- coding: utf-8 -*-
import os
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['STRATEGY_FOLDER'] = 'strategies'

# 确保策略文件夹存在
if not os.path.exists(app.config['STRATEGY_FOLDER']):
    os.makedirs(app.config['STRATEGY_FOLDER'])

# 初始化DeepSeek客户端
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY", "sk-78a909365b9c4f4d962cd0aa61464607"),
    base_url="https://api.deepseek.com"
)

# 存储生成历史
history_store = {}


def get_session_history():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

    session_id = session['session_id']
    if session_id not in history_store:
        history_store[session_id] = []

    return history_store[session_id]


# 根据论文框架设计的提示生成函数
def generate_ui_component(strategy, user_description):
    """
    根据论文框架生成UI组件
    策略包含三个维度: 抽象级别, 角色, 格式
    """
    # 构建系统提示
    system_prompt = (
        f"你是一个{strategy['role']}，负责根据用户需求生成UI组件原型。"
        f"生成要求:\n"
        f"- 抽象级别: {strategy['abstraction_level']}\n"
        f"- 输出格式: {strategy['format']}\n"
        f"- 其他要求: {strategy.get('additional_requirements', '')}\n\n"
        f"请严格按照指定格式生成UI组件代码。"
    )

    # 构建用户提示
    user_prompt = f"{strategy['prompt_prefix']}{user_description}"

    # 调用DeepSeek API
    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=2000,
        temperature=0.5,
        stream=False
    )

    # 提取生成的代码
    generated_code = response.choices[0].message.content.strip()

    # 清理可能的代码块标记
    if generated_code.startswith("```html"):
        generated_code = generated_code[7:]
    if generated_code.endswith("```"):
        generated_code = generated_code[:-3]

    return generated_code


@app.route('/')
def index():
    # 加载默认策略
    default_strategies = []
    for filename in os.listdir(app.config['STRATEGY_FOLDER']):
        if filename.endswith('.json'):
            filepath = os.path.join(app.config['STRATEGY_FOLDER'], filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    strategy = json.load(f)
                    strategy['filename'] = filename
                    default_strategies.append(strategy)
            except Exception as e:
                print(f"加载策略文件 {filename} 时出错: {str(e)}")

    return render_template('index.html', strategies=default_strategies)


@app.route('/generate', methods=['POST'])
def generate_component():
    try:
        data = request.json
        strategy = data.get('strategy', {})
        user_description = data.get('description', '')

        if not user_description:
            return jsonify({"error": "描述不能为空"}), 400

        # 生成组件
        generated_html = generate_ui_component(strategy, user_description)

        # 保存到历史记录
        history = get_session_history()
        history_entry = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "description": user_description,
            "strategy": strategy.get('name', '自定义策略'),
            "html": generated_html
        }
        history.append(history_entry)

        # 只保留最近10条历史记录
        if len(history) > 10:
            history.pop(0)

        return jsonify({
            "html": generated_html,
            "history_id": history_entry["id"]
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/strategies', methods=['GET'])
def list_strategies():
    strategies = []
    for filename in os.listdir(app.config['STRATEGY_FOLDER']):
        if filename.endswith('.json'):
            filepath = os.path.join(app.config['STRATEGY_FOLDER'], filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    strategy = json.load(f)
                    strategy['filename'] = filename
                    strategies.append(strategy)
            except Exception as e:
                print(f"加载策略文件 {filename} 时出错: {str(e)}")

    return jsonify(strategies)


@app.route('/strategies/save', methods=['POST'])
def save_strategy():
    try:
        strategy = request.json
        if not strategy.get('name'):
            return jsonify({"error": "策略名称不能为空"}), 400

        # 生成文件名
        filename = f"{strategy['name'].replace(' ', '_').lower()}.json"
        filepath = os.path.join(app.config['STRATEGY_FOLDER'], filename)

        # 保存策略
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(strategy, f, indent=2, ensure_ascii=False)

        return jsonify({"success": True, "filename": filename})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/strategies/<filename>', methods=['GET'])
def get_strategy(filename):
    try:
        filepath = os.path.join(app.config['STRATEGY_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({"error": "策略文件不存在"}), 404

        with open(filepath, 'r', encoding='utf-8') as f:
            strategy = json.load(f)

        return jsonify(strategy)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/history', methods=['GET'])
def get_history():
    try:
        history = get_session_history()
        simplified_history = [
            {
                "id": entry["id"],
                "timestamp": entry["timestamp"],
                "description": entry["description"],
                "strategy": entry["strategy"]
            }
            for entry in history
        ]
        return jsonify(simplified_history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/history/<history_id>', methods=['GET'])
def get_history_item(history_id):
    try:
        history = get_session_history()
        for entry in history:
            if entry["id"] == history_id:
                return jsonify({
                    "html": entry["html"],
                    "description": entry["description"],
                    "strategy": entry["strategy"]
                })
        return jsonify({"error": "未找到历史记录"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/strategy-editor')
def strategy_editor():
    return render_template('strategy_editor.html')


@app.route('/result-view')
def result_view():
    return render_template('result_view.html')


if __name__ == '__main__':
    app.run(debug=True)