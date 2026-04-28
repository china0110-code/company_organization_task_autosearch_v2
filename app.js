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

// 10軸の定義
const AXES = [
  { key: 'repeatability',   label: '繰り返し性',             desc: '毎回同じ手順・ルールで実行できるか' },
  { key: 'data_readiness',  label: 'データ整備度',           desc: 'データが定型・デジタルで揃っており取得しやすいか' },
  { key: 'judgment',        label: '判断の複雑さ',           desc: 'ルール外の例外判断や裁量が少ないか' },
  { key: 'communication',   label: '対人依存度',             desc: '外部の人との対話・交渉・関係構築が不要か' },
  { key: 'recovery_cost',   label: 'ミスのリカバリコスト',   desc: 'ミス発生時の修正・影響対応が軽微か' },
  { key: 'frequency',       label: '年間作業頻度',           desc: '年間の発生回数が多いか（多いほど自動化効果大）' },
  { key: 'volume',          label: '作業ボリューム',         desc: '1回あたりの作業時間・工数が大きいか' },
  { key: 'tacit_knowledge', label: '属人性の低さ',           desc: '特定担当者のスキル・経験・勘への依存が低いか' },
  { key: 'verifiability',   label: '出力の検証しやすさ',     desc: 'AIの出力結果を人間が確認・修正しやすいか' },
  { key: 'compliance',      label: 'コンプライアンスリスク', desc: 'AIが実行しても法的・規制上の問題が少ないか' },
];

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

function getAxisVal(t, i) {
  if (!t.axes) return '-';
  const key = `axis${i+1}_${AXES[i].key}`;
  return t.axes[key] ?? '-';
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

  const axesPrompt = AXES.map((a, i) =>
    `  - axis${i+1}_${a.key}（${a.label}）: 0〜10の整数。${a.desc}`
  ).join('\n');

  const prompt = `あなたは業務分析の専門家です。以下の企業・部署で行われていると想定される業務を列挙し、各業務のAI導入効果を10の評価軸でそれぞれ0〜10点で採点し、合計点（0〜100点）を算出してください。

企業・業種: ${company}
部署名: ${dept}
洗い出し粒度: ${cfg.label}（${cfg.count}程度）

粒度の指示: ${cfg.detail}

【評価軸（各0〜10点、合計100点満点）】
${axesPrompt}

採点基準：各軸10点＝AI導入に非常に有利、0点＝AI導入に非常に不利

以下のJSON形式のみで回答してください。前置きや説明は不要です。

{"tasks":[{
  "category":"業務カテゴリ名",
  "name":"具体的な業務名",
  "detail":"業務の簡単な説明（30字以内）",
  "axes":{
    "axis1_repeatability":整数0〜10,
    "axis2_data_readiness":整数0〜10,
    "axis3_judgment":整数0〜10,
    "axis4_communication":整数0〜10,
    "axis5_recovery_cost":整数0〜10,
    "axis6_frequency":整数0〜10,
    "axis7_volume":整数0〜10,
    "axis8_tacit_knowledge":整数0〜10,
    "axis9_verifiability":整数0〜10,
    "axis10_compliance":整数0〜10
  },
  "score":各軸の合計点（0〜100の整数）
}]}

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

  const tasks = parsed.tasks.map(t => {
    if (!t.score && t.axes) {
      t.score = Object.values(t.axes).reduce((s, v) => s + v, 0);
    }
    return t;
  });

  const company    = document.getElementById('company').value || '（企業名未入力）';
  const dept       = document.getElementById('dept').value    || '（部署名未入力）';
  const cfg        = levelConfig[getSelectedLevel()];
  const avg        = Math.round(tasks.reduce((s, t) => s + t.score, 0) / tasks.length);
  const high       = tasks.filter(t => t.score >= 70).length;
  const categories = [...new Set(tasks.map(t => t.category))].length;

  currentResult = { tasks, company, dept, cfg, avg, high, categories };

  const sorted = [...tasks].sort((a, b) => b.score - a.score);

  const rows = sorted.map(t => {
    const lbl   = getScoreLabel(t.score);
    const color = getScoreColor(t.score);
    const axesHtml = AXES.map((a, i) => {
      const val = getAxisVal(t, i);
      return `<span class="axis-chip" title="${a.desc}">${a.label}：${val}</span>`;
    }).join('');

    return `
      <tr>
        <td>
          <div class="task-name">${t.name}</div>
          <div class="task-cat">${t.category}</div>
        </td>
        <td>
          <div class="task-detail">${t.detail}</div>
          <div class="axes-wrap">${axesHtml}</div>
        </td>
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
          <th>概要 ／ 評価軸内訳</th>
          <th>AI導入効果</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.getElementById('export-bar').classList.add('visible');
}

function clearStep2() {
  document.getElementById('paste-area').value = '';
  document.getElementById('output').innerHTML = '';
  document.getElementById('export-bar').classList.remove('visible');
  currentResult = null;
}

// =============================================
// PDF出力（A4横・3列構成でレイアウト崩れを防止）
// =============================================
function exportPDF() {
  if (!currentResult) return;
  const { tasks, company, dept, cfg, avg, high, categories } = currentResult;
  const sorted = [...tasks].sort((a, b) => b.score - a.score);
  const now = new Date().toLocaleDateString('ja-JP');

  // 軸スコアを「軸名：点」の箇条書きテキストにまとめて1セルに収める
  const rows = sorted.map(t => {
    const lbl = getScoreLabel(t.score);
    const axesText = AXES.map((a, i) => {
      const val = getAxisVal(t, i);
      return `${a.label}：${val}点`;
    }).join('<br>');

    return `<tr>
      <td>
        <div style="font-weight:600">${t.name}</div>
        <div style="font-size:9px;color:#888;margin-top:2px">${t.category}</div>
        <div style="font-size:9px;color:#555;margin-top:3px">${t.detail}</div>
      </td>
      <td style="font-size:9px;line-height:1.7;color:#444">${axesText}</td>
      <td style="text-align:center;font-weight:700;font-size:13px;color:${getScoreColor(t.score)};vertical-align:middle">
        ${t.score}点<br>
        <span style="font-size:9px;font-weight:500;padding:1px 6px;border-radius:8px;background:${lbl.bg};color:${lbl.color}">${lbl.text}</span>
      </td>
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
      <thead>
        <tr>
          <th style="width:28%">業務名 ／ 概要</th>
          <th style="width:52%">評価軸スコア内訳（各0〜10点）</th>
          <th style="width:20%">AI導入効果<br>（合計/100点）</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="print-axes-legend">
      <strong>【評価軸の説明】</strong><br>
      ${AXES.map((a, i) => `${i+1}. ${a.label}：${a.desc}`).join('　／　')}
    </div>`;

  window.print();
}

// =============================================
// Excel出力
// =============================================
function exportExcel() {
  if (!currentResult) return;
  const { tasks, company, dept, cfg, avg, high, categories } = currentResult;
  const sorted = [...tasks].sort((a, b) => b.score - a.score);
  const now = new Date().toLocaleDateString('ja-JP');

  const summaryData = [
    ['AI導入効果分析レポート'],
    [],
    ['企業名・業種', company],
    ['部署名',       dept],
    ['粒度',         cfg.label],
    ['出力日',       now],
    [],
    ['業務数',               tasks.length],
    ['平均スコア',           avg + '点'],
    ['高効果業務（70点以上）', high + '件'],
    ['カテゴリ数',           categories],
    [],
    ['【評価軸の説明】'],
    ...AXES.map((a, i) => [`${i+1}. ${a.label}`, a.desc]),
  ];

  const axesHeaders = AXES.map(a => a.label);
  const detailHeader = ['業務名', 'カテゴリ', '概要', ...axesHeaders, '合計スコア（/100）', '評価'];
  const detailRows = sorted.map(t => {
    const axesVals = AXES.map((a, i) => getAxisVal(t, i));
    return [
      t.name,
      t.category,
      t.detail,
      ...axesVals,
      t.score,
      getScoreLabel(t.score).text
    ];
  });

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'サマリー');

  const wsDetail = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows]);
  wsDetail['!cols'] = [
    { wch: 24 }, { wch: 16 }, { wch: 28 },
    ...AXES.map(() => ({ wch: 14 })),
    { wch: 18 }, { wch: 10 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, '業務一覧');

  const filename = `AI導入効果分析_${dept}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
