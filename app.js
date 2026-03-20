/* ================================================================
   ResumeAI Screen — Full-Featured Gemini-Powered Intelligence Engine
   ================================================================ */
(() => {
  'use strict';

  // ─── State ───────────────────────────────────────────────────────
  const resumes = [];        // { name, text, source }
  let lastResults = null;    // sorted results array
  let lastPoolSummary = '';
  const shortlisted = new Set();
  let sortField = 'rank';
  let sortAsc = true;

  // ─── DOM refs ────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const apiKeyInput = $('api-key-input');
  const toggleKeyBtn = $('toggle-key-btn');
  const jdInput = $('jd-input');
  const candidateName = $('candidate-name');
  const resumeText = $('resume-text');
  const addResumeBtn = $('add-resume-btn');
  const resumeList = $('resume-list');
  const uploadZone = $('upload-zone');
  const pdfUpload = $('pdf-upload');
  const pdfFileInfo = $('pdf-file-info');
  const pdfFileName = $('pdf-file-name');
  const clearPdfBtn = $('clear-pdf-btn');
  const analyzeBtn = $('analyze-btn');
  const analyzeHint = $('analyze-hint');
  const progressSection = $('progress-section');
  const progressTitle = $('progress-title');
  const progressBarFill = $('progress-bar-fill');
  const progressSteps = $('progress-steps');
  const resultsSection = $('results-section');
  const aiSummaryCard = $('ai-summary-card');
  const aiSummaryText = $('ai-summary-text');
  const summaryCards = $('summary-cards');
  const resultsBody = $('results-body');
  const candidateDetails = $('candidate-details');
  const exportCsvBtn = $('export-csv-btn');
  const compareBtn = $('compare-btn');
  const interviewBtn = $('interview-btn');
  const interviewCard = $('interview-card');
  const interviewContent = $('interview-content');
  const comparisonSection = $('comparison-section');
  const comparisonGrid = $('comparison-grid');
  const radarCard = $('radar-card');
  const radarCanvas = $('radar-canvas');
  const radarLegend = $('radar-legend');
  const filterSelect = $('filter-select');
  const skillMatrixCard = $('skill-matrix-card');
  const skillMatrixWrapper = $('skill-matrix-wrapper');
  const toastContainer = $('toast-container');

  let pdfTextContent = '';



  // ═══════════════════════════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════
  function toast(msg, type = 'info', duration = 4000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${msg}</span><button class="toast-close">✕</button>`;
    toastContainer.appendChild(el);
    const close = () => { el.style.animation = 'toastOut 0.3s ease-in forwards'; setTimeout(() => el.remove(), 300); };
    el.querySelector('.toast-close').addEventListener('click', close);
    setTimeout(close, duration);
  }

  // ═══════════════════════════════════════════════════════════════
  //  API KEY (with localStorage)
  // ═══════════════════════════════════════════════════════════════
  const savedKey = localStorage.getItem('ras-api-key') || '';
  if (savedKey) apiKeyInput.value = savedKey;
  toggleKeyBtn.addEventListener('click', () => { apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password'; });
  apiKeyInput.addEventListener('change', () => { localStorage.setItem('ras-api-key', apiKeyInput.value.trim()); });

  // ═══════════════════════════════════════════════════════════════
  //  PDF UPLOAD (batch support)
  // ═══════════════════════════════════════════════════════════════
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  uploadZone.addEventListener('click', () => pdfUpload.click());
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', e => {
    e.preventDefault(); uploadZone.classList.remove('drag-over');
    handlePdfFiles(e.dataTransfer.files);
  });
  pdfUpload.addEventListener('change', e => handlePdfFiles(e.target.files));
  clearPdfBtn.addEventListener('click', clearPdf);

  async function handlePdfFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (files.length === 0) return;

    // Batch mode: multiple PDFs → auto-add each as a candidate
    if (files.length > 1) {
      let added = 0;
      for (const file of files) {
        try {
          const text = await extractPdfText(file);
          const name = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
          resumes.push({ name, text, source: 'pdf' });
          added++;
        } catch (err) {
          toast(`Failed to parse ${file.name}: ${err.message}`, 'error');
        }
      }
      if (added > 0) {
        toast(`Added ${added} candidate${added > 1 ? 's' : ''} from PDFs`, 'success');
        renderResumeList();
        refreshAnalyzeState();
      }
      return;
    }

    // Single PDF → fill the form
    try {
      const file = files[0];
      const text = await extractPdfText(file);
      pdfTextContent = text;
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      pdfFileName.textContent = `📄 ${file.name} (${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''})`;
      pdfFileInfo.classList.remove('hidden');
      uploadZone.classList.add('hidden');
      resumeText.value = pdfTextContent;
      // Auto-fill name from filename if empty
      if (!candidateName.value.trim()) {
        candidateName.value = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
      }
    } catch (err) {
      toast('Failed to parse PDF: ' + err.message, 'error');
    }
  }

  async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text.trim();
  }

  function clearPdf() {
    pdfTextContent = ''; pdfUpload.value = '';
    pdfFileInfo.classList.add('hidden'); uploadZone.classList.remove('hidden');
    resumeText.value = '';
  }

  // ═══════════════════════════════════════════════════════════════
  //  GEMINI API
  // ═══════════════════════════════════════════════════════════════
  const GEMINI_MODEL = 'gemini-2.5-flash';
  async function callGemini(apiKey, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${e?.error?.message || `HTTP ${res.status}`}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');
    return text;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PROMPTS
  // ═══════════════════════════════════════════════════════════════
  function buildAnalysisPrompt(jd, candidates) {
    const blocks = candidates.map((r, i) => `### Candidate ${i + 1}: ${r.name}\n\`\`\`\n${r.text}\n\`\`\``).join('\n\n');
    return `You are an expert HR recruiter. Analyze resumes against the Job Description.

For EACH candidate provide:
1. score (0-100, = sum of category scores, capped at 100)
2. strengths (2-3 short phrases, max 8 words each)
3. gaps (2-3 short phrases, max 8 words each)
4. recommendation: "Strong Fit" (≥75), "Moderate Fit" (≥50), or "Not Fit" (<50)
5. breakdown: skills(max 50), experience(max 20), education(max 15), certifications(max 15)
6. matchedSkills: array of skill keywords from the JD that this candidate matches
7. missingSkills: array of skill keywords from the JD that this candidate lacks

Also provide a "poolSummary": 2-3 sentence executive summary of the candidate pool.

## Job Description
\`\`\`
${jd}
\`\`\`

## Resumes
${blocks}

Respond with JSON:
{
  "poolSummary": "...",
  "candidates": [{
    "name": "...", "score": 82,
    "strengths": ["..."], "gaps": ["..."],
    "recommendation": "Strong Fit",
    "breakdown": { "skills":{"score":40,"max":50}, "experience":{"score":18,"max":20}, "education":{"score":12,"max":15}, "certifications":{"score":12,"max":15} },
    "matchedSkills": ["Python","SQL"], "missingSkills": ["Tableau"]
  }]
}`;
  }

  function buildInterviewPrompt(jd, results) {
    const candidateInfo = results.map(r =>
      `- ${r.name} (Score: ${r.score}, ${r.recommendation})\n  Strengths: ${r.strengths.join(', ')}\n  Gaps: ${r.gaps.join(', ')}`
    ).join('\n');
    return `You are an expert technical interviewer. Based on the job description and screening results, generate 3-4 tailored interview questions for each candidate. Questions should probe their gaps and validate their strengths.

## Job Description
\`\`\`
${jd}
\`\`\`

## Candidates
${candidateInfo}

Respond with JSON:
{ "candidates": [{ "name": "...", "questions": ["Q1", "Q2", "Q3"] }] }`;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════
  const escapeHtml = str => { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; };
  const scoreTier = s => s >= 75 ? 'high' : s >= 50 ? 'mid' : 'low';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function refreshAnalyzeState() {
    const ready = apiKeyInput.value.trim() && jdInput.value.trim() && resumes.length > 0;
    analyzeBtn.disabled = !ready;
    if (ready) analyzeHint.textContent = `${resumes.length} resume${resumes.length > 1 ? 's' : ''} ready — click to analyze with Gemini AI`;
    else {
      const m = [];
      if (!apiKeyInput.value.trim()) m.push('API key');
      if (!jdInput.value.trim()) m.push('job description');
      if (!resumes.length) m.push('at least one resume');
      analyzeHint.textContent = `Add ${m.join(', ')} to begin.`;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  RESUME LIST
  // ═══════════════════════════════════════════════════════════════
  function renderResumeList() {
    resumeList.innerHTML = '';
    resumes.forEach((r, i) => {
      const chip = document.createElement('div');
      chip.className = 'resume-chip';
      chip.innerHTML = `
        <div class="resume-chip-info">
          <div class="resume-chip-avatar">${r.name.charAt(0).toUpperCase()}</div>
          <div>
            <div class="resume-chip-name">${escapeHtml(r.name)}</div>
            <div class="resume-chip-meta">${r.source === 'pdf' ? '📄 PDF' : '📝 Text'} · ${r.text.length.toLocaleString()} chars</div>
          </div>
        </div>
        <button class="btn btn-danger" data-idx="${i}">Remove</button>`;
      chip.querySelector('.btn-danger').addEventListener('click', () => {
        resumes.splice(i, 1); renderResumeList(); refreshAnalyzeState();
      });
      resumeList.appendChild(chip);
    });
  }

  addResumeBtn.addEventListener('click', () => {
    const name = candidateName.value.trim();
    const text = resumeText.value.trim();
    if (!name) { candidateName.focus(); return; }
    if (!text) { resumeText.focus(); return; }
    resumes.push({ name, text, source: pdfTextContent ? 'pdf' : 'text' });
    toast(`Added: ${name}`, 'success', 2000);
    candidateName.value = ''; resumeText.value = '';
    clearPdf(); candidateName.focus();
    renderResumeList(); refreshAnalyzeState();
  });

  apiKeyInput.addEventListener('input', refreshAnalyzeState);
  jdInput.addEventListener('input', refreshAnalyzeState);

  // ═══════════════════════════════════════════════════════════════
  //  PROGRESS
  // ═══════════════════════════════════════════════════════════════
  const PSTEPS = ['Preparing prompt', 'Calling Gemini AI', 'Analyzing resumes', 'Scoring candidates', 'Building results'];
  function showProgress() {
    progressSection.classList.remove('hidden'); resultsSection.classList.add('hidden');
    progressBarFill.style.width = '0%';
    progressSteps.innerHTML = PSTEPS.map((s, i) => `<div class="progress-step" id="ps-${i}"><div class="progress-dot"></div>${s}</div>`).join('');
  }
  function updateProgress(i) {
    progressBarFill.style.width = Math.round(((i + 1) / PSTEPS.length) * 100) + '%';
    progressTitle.textContent = PSTEPS[i] + '…';
    PSTEPS.forEach((_, j) => { const el = $(`ps-${j}`); el.className = 'progress-step' + (j < i ? ' done' : j === i ? ' active' : ''); });
  }
  function hideProgress() { progressSection.classList.add('hidden'); }

  // ═══════════════════════════════════════════════════════════════
  //  ANALYZE
  // ═══════════════════════════════════════════════════════════════
  analyzeBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim(), jd = jdInput.value.trim();
    if (!apiKey || !jd || !resumes.length) return;
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing…';
    showProgress(); shortlisted.clear();

    try {
      updateProgress(0);
      const prompt = buildAnalysisPrompt(jd, resumes);
      updateProgress(1); await sleep(300);
      updateProgress(2);
      const response = await callGemini(apiKey, prompt);
      updateProgress(3); await sleep(200);

      let cleaned = response.trim();
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
      let parsed;
      try { parsed = JSON.parse(cleaned); } catch { throw new Error('Failed to parse Gemini response.\n' + response.slice(0, 300)); }

      lastPoolSummary = parsed.poolSummary || '';
      let results = parsed.candidates || parsed;
      if (!Array.isArray(results) || !results.length) throw new Error('Unexpected response format.');

      results = results.map(r => ({
        name: r.name || 'Unknown',
        score: Math.min(100, Math.max(0, parseInt(r.score, 10) || 0)),
        strengths: Array.isArray(r.strengths) ? r.strengths.slice(0, 3) : ['N/A'],
        gaps: Array.isArray(r.gaps) ? r.gaps.slice(0, 3) : ['N/A'],
        recommendation: ['Strong Fit', 'Moderate Fit', 'Not Fit'].includes(r.recommendation)
          ? r.recommendation : (r.score >= 75 ? 'Strong Fit' : r.score >= 50 ? 'Moderate Fit' : 'Not Fit'),
        breakdown: r.breakdown || { skills: { score: 0, max: 50 }, experience: { score: 0, max: 20 }, education: { score: 0, max: 15 }, certifications: { score: 0, max: 15 } },
        matchedSkills: Array.isArray(r.matchedSkills) ? r.matchedSkills : [],
        missingSkills: Array.isArray(r.missingSkills) ? r.missingSkills : [],
      }));
      results.sort((a, b) => b.score - a.score);

      updateProgress(4); await sleep(300);
      lastResults = results;
      hideProgress();
      renderResults(results, lastPoolSummary);
      toast('Analysis complete!', 'success');

    } catch (err) {
      hideProgress();
      toast(err.message, 'error', 8000);
    } finally {
      analyzeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Re-Analyze';
      analyzeBtn.disabled = false;
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //  ANIMATED COUNTER
  // ═══════════════════════════════════════════════════════════════
  function animateCounter(el, target, duration = 800) {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER RESULTS
  // ═══════════════════════════════════════════════════════════════
  function renderResults(results, poolSummary) {
    resultsSection.classList.remove('hidden');

    // AI Summary
    if (poolSummary) { aiSummaryCard.classList.remove('hidden'); typeText(aiSummaryText, poolSummary, 12); }
    else aiSummaryCard.classList.add('hidden');

    // Show buttons
    if (results.length >= 2) compareBtn.classList.remove('hidden');
    interviewBtn.classList.remove('hidden');
    interviewCard.classList.add('hidden');

    // Summary cards with animated counters
    const strongCount = results.filter(r => r.recommendation === 'Strong Fit').length;
    const moderateCount = results.filter(r => r.recommendation === 'Moderate Fit').length;
    const notCount = results.filter(r => r.recommendation === 'Not Fit').length;

    summaryCards.innerHTML = `
      <div class="summary-card"><div class="summary-card-value purple" id="sc-total">0</div><div class="summary-card-label">Candidates</div></div>
      <div class="summary-card"><div class="summary-card-value green" id="sc-strong">0</div><div class="summary-card-label">Strong Fit</div></div>
      <div class="summary-card"><div class="summary-card-value yellow" id="sc-mod">0</div><div class="summary-card-label">Moderate Fit</div></div>
      <div class="summary-card"><div class="summary-card-value red" id="sc-not">0</div><div class="summary-card-label">Not Fit</div></div>`;
    setTimeout(() => {
      animateCounter($('sc-total'), results.length);
      animateCounter($('sc-strong'), strongCount);
      animateCounter($('sc-mod'), moderateCount);
      animateCounter($('sc-not'), notCount);
    }, 300);

    // Table
    renderTable(results);

    // Skill matrix
    renderSkillMatrix(results);

    // Detail cards
    renderDetailCards(results);

    // Radar
    drawRadarChart(results);

    // Scroll
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ═══════════════════════════════════════════════════════════════
  //  TABLE (with shortlist + filter + sort)
  // ═══════════════════════════════════════════════════════════════
  function renderTable(results) {
    resultsBody.innerHTML = '';
    results.forEach((r, idx) => {
      const tier = scoreTier(r.score);
      const rankClass = idx < 3 ? `rank-${idx + 1}` : '';
      const recClass = r.recommendation === 'Strong Fit' ? 'rec-strong' : r.recommendation === 'Moderate Fit' ? 'rec-moderate' : 'rec-not';
      const recIcon = r.recommendation === 'Strong Fit' ? '✔' : r.recommendation === 'Moderate Fit' ? '◉' : '✗';
      const isStarred = shortlisted.has(r.name);

      const tr = document.createElement('tr');
      tr.dataset.name = r.name;
      tr.dataset.rec = r.recommendation;
      tr.dataset.score = r.score;
      tr.innerHTML = `
        <td class="rank-cell ${rankClass}">#${idx + 1}</td>
        <td class="candidate-cell">${escapeHtml(r.name)}</td>
        <td class="score-cell">
          <div class="score-bar-wrapper">
            <div class="score-bar"><div class="score-bar-fill ${tier}" data-width="${r.score}"></div></div>
            <span class="score-value ${tier}">${r.score}</span>
          </div>
        </td>
        <td><div class="tag-list">${r.strengths.map(s => `<span class="tag tag-strength">${escapeHtml(s)}</span>`).join('')}</div></td>
        <td><div class="tag-list">${r.gaps.map(g => `<span class="tag tag-gap">${escapeHtml(g)}</span>`).join('')}</div></td>
        <td><span class="rec-badge ${recClass}">${recIcon} ${r.recommendation}</span></td>
        <td><button class="btn-star ${isStarred ? 'starred' : ''}" data-name="${escapeHtml(r.name)}" title="Shortlist">★</button></td>`;
      resultsBody.appendChild(tr);
    });

    // Star handlers
    resultsBody.querySelectorAll('.btn-star').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        if (shortlisted.has(name)) { shortlisted.delete(name); btn.classList.remove('starred'); toast(`Removed ${name} from shortlist`, 'info', 2000); }
        else { shortlisted.add(name); btn.classList.add('starred'); toast(`★ Shortlisted: ${name}`, 'success', 2000); }
      });
    });

    // Animate score bars
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-bar-fill[data-width]').forEach(el => { el.style.width = el.dataset.width + '%'; });
    });
  }

  // ── Filter ──
  filterSelect.addEventListener('change', () => {
    const val = filterSelect.value;
    resultsBody.querySelectorAll('tr').forEach(tr => {
      if (val === 'all') tr.classList.remove('row-hidden');
      else if (val === 'shortlisted') tr.classList.toggle('row-hidden', !shortlisted.has(tr.dataset.name));
      else tr.classList.toggle('row-hidden', tr.dataset.rec !== val);
    });
  });

  // ── Sort ──
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      if (!lastResults) return;
      const field = th.dataset.sort;
      if (sortField === field) sortAsc = !sortAsc;
      else { sortField = field; sortAsc = field === 'rank'; }

      const sorted = [...lastResults];
      if (field === 'score') sorted.sort((a, b) => sortAsc ? a.score - b.score : b.score - a.score);
      else sorted.sort((a, b) => sortAsc ? b.score - a.score : a.score - b.score);

      renderTable(sorted);
      // Update header indicator
      document.querySelectorAll('th.sortable').forEach(h => {
        h.textContent = h.dataset.sort === 'rank' ? 'Rank' : 'Score';
      });
      th.textContent = th.textContent + (sortAsc ? ' ▲' : ' ▼');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  SKILL MATCH MATRIX
  // ═══════════════════════════════════════════════════════════════
  function renderSkillMatrix(results) {
    // Collect all skills
    const allSkills = new Set();
    results.forEach(r => {
      (r.matchedSkills || []).forEach(s => allSkills.add(s));
      (r.missingSkills || []).forEach(s => allSkills.add(s));
    });

    if (allSkills.size === 0) { skillMatrixCard.classList.add('hidden'); return; }
    skillMatrixCard.classList.remove('hidden');

    const skills = [...allSkills].sort();
    let html = '<table class="skill-matrix"><thead><tr><th>Skill</th>';
    results.forEach(r => { html += `<th>${escapeHtml(r.name)}</th>`; });
    html += '</tr></thead><tbody>';

    skills.forEach(skill => {
      html += `<tr><td>${escapeHtml(skill)}</td>`;
      results.forEach(r => {
        const matched = (r.matchedSkills || []).map(s => s.toLowerCase()).includes(skill.toLowerCase());
        html += `<td class="${matched ? 'skill-match' : 'skill-missing'}">${matched ? '✔' : '✗'}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    skillMatrixWrapper.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════
  //  DETAIL CARDS
  // ═══════════════════════════════════════════════════════════════
  function renderDetailCards(results) {
    candidateDetails.innerHTML = '';
    results.forEach((r, idx) => {
      const tier = scoreTier(r.score);
      const circ = 2 * Math.PI * 28;
      const offset = circ - (r.score / 100) * circ;
      const card = document.createElement('div');
      card.className = 'detail-card';
      card.style.animationDelay = `${0.1 + idx * 0.12}s`;
      card.innerHTML = `
        <div class="detail-card-header">
          <div class="detail-card-left">
            <div class="detail-avatar">${r.name.charAt(0).toUpperCase()}</div>
            <div><div class="detail-name">${escapeHtml(r.name)}</div><div class="detail-rank">Rank #${idx + 1} · ${r.recommendation}</div></div>
          </div>
          <div class="score-ring-container">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle class="score-ring-bg" cx="36" cy="36" r="28"/>
              <circle class="score-ring-fill ${tier}" cx="36" cy="36" r="28" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" data-target="${offset}"/>
            </svg>
            <div class="score-ring-text ${tier}">${r.score}</div>
          </div>
        </div>
        <div class="detail-sections">
          <div class="detail-sub detail-strengths"><h4>🟢 Key Strengths</h4><ul>${r.strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul></div>
          <div class="detail-sub detail-gaps"><h4>🔴 Key Gaps</h4><ul>${r.gaps.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul></div>
        </div>
        <div class="category-bars">
          ${Object.entries(r.breakdown).map(([cat, v]) => `
            <div class="category-bar-item">
              <div class="category-bar-label"><span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span><span>${v.score}/${v.max}</span></div>
              <div class="category-bar"><div class="category-bar-fill" data-width="${Math.round((v.score / v.max) * 100)}"></div></div>
            </div>`).join('')}
        </div>`;
      candidateDetails.appendChild(card);
    });

    // Animate
    requestAnimationFrame(() => setTimeout(() => {
      document.querySelectorAll('.score-ring-fill[data-target]').forEach(el => { el.style.strokeDashoffset = el.dataset.target; });
      document.querySelectorAll('.category-bar-fill[data-width]').forEach(el => { el.style.width = el.dataset.width + '%'; });
    }, 100));
  }

  // ═══════════════════════════════════════════════════════════════
  //  TYPING ANIMATION
  // ═══════════════════════════════════════════════════════════════
  function typeText(el, text, speed = 15) {
    el.textContent = ''; let i = 0;
    const tick = () => { if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speed); } };
    tick();
  }

  // ═══════════════════════════════════════════════════════════════
  //  RADAR CHART
  // ═══════════════════════════════════════════════════════════════
  const RCOLORS = ['rgba(0,212,255,0.8)', 'rgba(168,85,247,0.8)', 'rgba(236,72,153,0.8)', 'rgba(52,211,153,0.8)', 'rgba(245,158,11,0.8)', 'rgba(99,102,241,0.8)'];
  const RBGS = ['rgba(0,212,255,0.08)', 'rgba(168,85,247,0.08)', 'rgba(236,72,153,0.08)', 'rgba(52,211,153,0.08)', 'rgba(245,158,11,0.08)', 'rgba(99,102,241,0.08)'];

  function drawRadarChart(results) {
    if (!results.length) { radarCard.classList.add('hidden'); return; }
    radarCard.classList.remove('hidden');
    const ctx = radarCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 440;
    radarCanvas.width = size * dpr; radarCanvas.height = size * dpr;
    radarCanvas.style.width = size + 'px'; radarCanvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2, radius = 160;
    const cats = ['Skills', 'Experience', 'Education', 'Certifications'];
    const maxs = [50, 20, 15, 15];
    const n = cats.length, step = (2 * Math.PI) / n, start = -Math.PI / 2;
    ctx.clearRect(0, 0, size, size);

    // Rings + axes
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius / 4) * ring;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const a = start + i * step; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.closePath(); ctx.strokeStyle = 'rgba(100,120,255,0.1)'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < n; i++) {
      const a = start + i * step;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + radius * Math.cos(a), cy + radius * Math.sin(a));
      ctx.strokeStyle = 'rgba(100,120,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      const lr = radius + 24;
      ctx.font = '600 12px Inter, sans-serif'; ctx.fillStyle = '#8892b0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(cats[i], cx + lr * Math.cos(a), cy + lr * Math.sin(a));
    }

    // Polygons
    results.forEach((r, ri) => {
      const vals = [r.breakdown.skills?.score || 0, r.breakdown.experience?.score || 0, r.breakdown.education?.score || 0, r.breakdown.certifications?.score || 0];
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const a = start + i * step; const v = vals[i] / maxs[i]; const x = cx + radius * v * Math.cos(a), y = cy + radius * v * Math.sin(a); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.closePath(); ctx.fillStyle = RBGS[ri % RBGS.length]; ctx.fill();
      ctx.strokeStyle = RCOLORS[ri % RCOLORS.length]; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < n; i++) { const a = start + i * step; const v = vals[i] / maxs[i]; ctx.beginPath(); ctx.arc(cx + radius * v * Math.cos(a), cy + radius * v * Math.sin(a), 4, 0, Math.PI * 2); ctx.fillStyle = RCOLORS[ri % RCOLORS.length]; ctx.fill(); }
    });

    radarLegend.innerHTML = results.map((r, i) =>
      `<div class="radar-legend-item"><div class="radar-legend-dot" style="background:${RCOLORS[i % RCOLORS.length]};box-shadow:0 0 8px ${RCOLORS[i % RCOLORS.length]}"></div>${escapeHtml(r.name)}</div>`
    ).join('');
  }

  // ═══════════════════════════════════════════════════════════════
  //  CSV EXPORT
  // ═══════════════════════════════════════════════════════════════
  exportCsvBtn.addEventListener('click', () => {
    if (!lastResults) return;
    const h = ['Rank', 'Candidate', 'Score', 'Strengths', 'Gaps', 'Recommendation', 'Shortlisted', 'Skills', 'Experience', 'Education', 'Certifications'];
    const rows = lastResults.map((r, i) => [
      i + 1, `"${r.name}"`, r.score, `"${r.strengths.join('; ')}"`, `"${r.gaps.join('; ')}"`,
      r.recommendation, shortlisted.has(r.name) ? 'Yes' : 'No',
      `${r.breakdown.skills?.score || 0}/${r.breakdown.skills?.max || 50}`,
      `${r.breakdown.experience?.score || 0}/${r.breakdown.experience?.max || 20}`,
      `${r.breakdown.education?.score || 0}/${r.breakdown.education?.max || 15}`,
      `${r.breakdown.certifications?.score || 0}/${r.breakdown.certifications?.max || 15}`,
    ]);
    const csv = [h.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'resume_screening_results.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('CSV downloaded!', 'success', 2000);
  });

  // ═══════════════════════════════════════════════════════════════
  //  COMPARISON
  // ═══════════════════════════════════════════════════════════════
  compareBtn.addEventListener('click', () => {
    if (!lastResults || lastResults.length < 2) return;
    const top2 = lastResults.slice(0, 2);
    comparisonSection.classList.remove('hidden');
    comparisonGrid.innerHTML = top2.map((r, idx) => {
      const tier = scoreTier(r.score);
      return `<div class="compare-card" style="animation-delay:${idx * 0.15}s">
        <div class="compare-card-header">
          <div class="compare-rank-badge compare-rank-${idx + 1}">#${idx + 1}</div>
          <span class="compare-name">${escapeHtml(r.name)}</span>
          <span class="compare-score ${tier}" style="margin-left:auto">${r.score}/100</span>
        </div>
        <div class="compare-bars">${Object.entries(r.breakdown).map(([cat, v]) => `
          <div class="compare-bar-item"><div class="compare-bar-label"><span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span><span>${v.score}/${v.max}</span></div>
          <div class="compare-bar"><div class="compare-bar-fill" data-cwidth="${Math.round((v.score / v.max) * 100)}"></div></div></div>`).join('')}</div>
        <div class="compare-tags"><h5>Strengths</h5><div class="tag-list">${r.strengths.map(s => `<span class="tag tag-strength">${escapeHtml(s)}</span>`).join('')}</div></div>
        <div class="compare-tags" style="margin-top:10px"><h5>Gaps</h5><div class="tag-list">${r.gaps.map(g => `<span class="tag tag-gap">${escapeHtml(g)}</span>`).join('')}</div></div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => setTimeout(() => {
      document.querySelectorAll('.compare-bar-fill[data-cwidth]').forEach(el => { el.style.width = el.dataset.cwidth + '%'; });
    }, 200));
    comparisonSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ═══════════════════════════════════════════════════════════════
  //  INTERVIEW QUESTIONS (Gemini call)
  // ═══════════════════════════════════════════════════════════════
  interviewBtn.addEventListener('click', async () => {
    if (!lastResults) return;
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) { toast('Enter your API key first', 'error'); return; }

    interviewBtn.disabled = true;
    interviewBtn.innerHTML = '<span class="spinner"></span> Generating…';

    try {
      const jd = jdInput.value.trim();
      const prompt = buildInterviewPrompt(jd, lastResults);
      const response = await callGemini(apiKey, prompt);

      let cleaned = response.trim();
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleaned);
      const candidates = parsed.candidates || [];

      interviewCard.classList.remove('hidden');
      interviewContent.innerHTML = candidates.map(c => {
        const match = lastResults.find(r => r.name === c.name);
        const recClass = match ? (match.recommendation === 'Strong Fit' ? 'rec-strong' : match.recommendation === 'Moderate Fit' ? 'rec-moderate' : 'rec-not') : '';
        return `<div class="interview-candidate">
          <h4>${escapeHtml(c.name)} ${match ? `<span class="rec-badge ${recClass}">${match.recommendation}</span>` : ''}</h4>
          <ol>${(c.questions || []).map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ol>
        </div>`;
      }).join('');

      toast('Interview questions generated!', 'success');
      interviewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      toast('Failed to generate questions: ' + err.message, 'error', 6000);
    } finally {
      interviewBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon" width="18" height="18"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Generate Interview Questions';
      interviewBtn.disabled = false;
    }
  });

  // ═══════════════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════════════
  refreshAnalyzeState();
})();
