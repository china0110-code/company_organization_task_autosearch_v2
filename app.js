// =============================================
// 粒度設定
// =============================================
const levelConfig = {
  honbu: {
    label: '本部レベル',
    count: '5〜8件',
    detail: '部門をまたぐ大きな業務領域・機能の単位で列挙してください。個々の作業ではなく「何をする組織か」という視点での機能分類です。'
  },
  buka: {
    label: '部課レベル',
    count: '10〜18件',
    detail: '具体的な業務プロセス・フロー単位で列挙してください。担当者が日常的に行う業務の塊レベルです。'
  },
  tanto: {
    label: '担当レベル',
    count: '20〜30件',
    detail: '個々の作業・タスク単位で細かく列挙してください。担当者が1日の中でこなす具体的な操作・手順レベルです。'
  }
};

// 現在の分析結果を保持
let currentResult = null;

// =============================================
// ユーティリティ
// =============================================
function getSelectedLevel() {
  return document.querySelector('input[name="granularity"]:checked').value;
}

function getScoreColor(score) {
  if (score >= 75) return '#1D9E75';
  if (score >= 50) return '#BA7517';
  if (score >= 25) return '#D85A30';
  return '#888';
}

function getScoreLabel(score) {
  if (score >= 75) return { text: '高',    bg: '#e8f8f2', color: '#1D9E75' };
  if (score >= 50) return { text: '中',    bg: '#fef6e8', color: '#BA7517' };
  if (score >= 25) return { text: '低',    bg: '#fdf0ee', color: '#D85A30' };
  return              { text: '限定的', bg: '#f5f5f5',  color: '#888'    };
}

// =============================================
// ステップ1：プロンプト生成
// =============================================
function generatePrompt() {
  const company = document.getElementById('company').value.trim();
  const dept    = document.getElementById('dept').value.trim();
  if (!company || !dept) {
    alert('企業名・業種と部署名を両方入力してください。');
    return;
  }
  const cfg = levelConfig[getSelectedLevel()];
  const prompt = `以下の企業・部署で行われていると想定される業務を列挙し、各業務へのAI導入効果スコアを算出してください。

企業・業種: ${company}
部署名: ${dept}
洗い出し粒度: ${cfg.label}（${cfg.count}程度）

粒度の指示: ${cfg.detail}

以下のJSON形式のみで回答してください。前置きや説明は不要です。

{"tasks":[{"category":"業務カテゴリ名","name":"具体的な業務名","detail":"業務の簡単な説明（30字以内）","score":整数0〜100,"reason":"スコアの根拠（30字以内）"}]}

スコア基準：
- 90-100点：完全自動化可能
- 70-89点：大部分をAI代替可能
- 50-69点：AI支援で効率化
- 30-49点：補助的なAI活用
- 0-29点：AI効果が限定的

業務は${cfg.count}程度、網羅的に列挙してください。`;

  document.getElementById('prompt-textarea').value = prompt;
  document.getElementById('prompt-box').classList.add('visible');
  document.getElementById('copy-success').style.display = 'none';
}

function copyPrompt() {
  const ta = document.getElementById('prompt-textarea');
  ta.select();
  ta.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    const msg = document.getElementById('copy-success');
    msg.style.display = 'inline';
    setTimeout(() => { msg.style.display = 'none'; }, 2000);
  } catch (e) {
    alert('コピーに失敗しました。テキストを手動で選択してコピーしてください。');
  }
}

function clearStep1() {
  document.getElementById('company').value = '';
  document.getElementById('dept').value = '';
  document.getElementById('prompt-textarea').value = '';
  document.getElementById('prompt-box').classList.remove('visible');
}

// =============================================
// ステップ2：JSON → 表レンダリング
// =============================================
function renderFromPaste() {
  const raw = document.getElementById('paste-area').value.trim();
  if (!raw) { alert('JSONを貼り付けてください。'); return; }

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    document.getElementById('output').innerHTML =
      '<div class="error-msg">JSONの形式が正しくありません。Claudeの回答をそのまま貼り付けてください。</div>';
    return;
  }

  const tasks      = parsed.tasks;
  const company    = document.getElementById('company').value || '（企業名未入力）';
  const dept       = document.getElementById('dept').value    || '（部署名未入力）';
  const level      = getSelectedLevel();
  const cfg        = levelConfig[level];
  const avg        = Math.round(tasks.reduce((s, t) => s + t.score, 0) / tasks.length);
  const high       = tasks.filter(t => t.score >= 70).length;
  const categories = [...new Set(tasks.map(t => t.category))].length;

  // 結果をグローバルに保持（エクスポート用）
  currentResult = { tasks, company, dept, cfg, avg, high, categories };

  const sorted = [...tasks].sort((a, b) => b.score - a.score);

  const rows = sorted.map(t => {
    const lbl   = getScoreLabel(t.score);
    const color = getScoreColor(t.score);
    return `
      <tr>
        <td>
          <div class="task-name">${t.name}</div>
          <div class="task-cat">${t.category}</div>
        </td>
        <td><div class="task-detail">${t.detail}</div></td>
        <td><div class="task-detail">${t.reason}</div></td>
        <td>
          <div class="score-wrap">
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="score-num" style="color:${color}">${t.score}点</span>
              <span class="tag" style="background:${lbl.bg};color:${lbl.color}">${lbl.text}</span>
            </div>
            <div class="score-bar-bg">
              <div class="score-bar" style="width:${t.score}%;background:${color}"></div>
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('output').innerHTML = `
    <div class="result-header">
      <strong>${company}</strong> ／ <strong>${dept}</strong> の分析結果
      <span class="level-badge">${cfg.label}</span>
    </div>
    <div class="summary-bar">
      <div class="summary-chip">業務数：<span>${tasks.length}件</span></div>
      <div class="summary-chip">平均スコア：<span>${avg}点</span></div>
      <div class="summary-chip">高効果業務（70点以上）：<span>${high}件</span></div>
      <div class="summary-chip">カテゴリ数：<span>${categories}</span></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>業務名</th>
          <th>概要</th>
          <th>スコア根拠</th>
          <th>AI導入効果</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  // エクスポートバーを表示
  document.getElementById('export-bar').classList.add('visible');
}

function clearStep2() {
  document.getElementById('paste-area').value = '';
  document.getElementById('output').innerHTML = '';
  document.getElementById('export-bar').classList.remove('visible');
  currentResult = null;
}

// =============================================
// PDF出力
// =============================================
function exportPDF() {
  if (!currentResult) return;
  const { tasks, company, dept, cfg, avg, high, categories } = currentResult;
  const sorted = [...tasks].sort((a, b) => b.score - a.score);
  const now = new Date().toLocaleDateString('ja-JP');

  const rows = sorted.map(t => {
    const lbl = getScoreLabel(t.score);
    return `<tr>
      <td>${t.name}<br><span style="font-size:10px;color:#888">${t.category}</span></td>
      <td>${t.detail}</td>
      <td>${t.reason}</td>
      <td class="score-cell" style="color:${getScoreColor(t.score)};text-align:center;">${t.score}点（${lbl.text}）</td>
    </tr>`;
  }).join('');

  document.getElementById('print-area').innerHTML = `
    <h2>AI導入効果分析レポート</h2>
    <div class="print-meta">${company} ／ ${dept}　｜　粒度：${cfg.label}　｜　出力日：${now}</div>
    <div class="print-summary">
      <span class="print-chip">業務数：${tasks.length}件</span>
      <span class="print-chip">平均スコア：${avg}点</span>
      <span class="print-chip">高効果業務（70点以上）：${high}件</span>
      <span class="print-chip">カテゴリ数：${categories}</span>
    </div>
    <table>
      <thead><tr><th>業務名</th><th>概要</th><th>スコア根拠</th><th>AI導入効果</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  window.print();
}

// =============================================
// Excel出力
// =============================================
function exportExcel() {
  if (!currentResult) return;
  const { tasks, company, dept, cfg, avg, high } = currentResult;
  const sorted = [...tasks].sort((a, b) => b.score - a.score);

  // サマリーシート
  const summaryData = [
    ['AI導入効果分析レポート'],
    [],
    ['企業名・業種', company],
    ['部署名',       dept],
    ['粒度',         cfg.label],
    ['出力日',       new Date().toLocaleDateString('ja-JP')],
    [],
    ['業務数',           tasks.length],
    ['平均スコア',       avg + '点'],
    ['高効果業務（70点以上）', high + '件'],
  ];

  // 業務一覧シート
  const detailData = [
    ['業務名', 'カテゴリ', '概要', 'スコア根拠', 'AI導入効果スコア', '評価'],
    ...sorted.map(t => [
      t.name,
      t.category,
      t.detail,
      t.reason,
      t.score,
      getScoreLabel(t.score).text
    ])
  ];

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 24 }, { wch: 36 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'サマリー');

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 16 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, '業務一覧');

  const filename = `AI導入効果分析_${dept}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
