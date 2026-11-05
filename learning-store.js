/* 独立模拟工作流；角色投影仅用于演示，正式权限必须由服务端执行。 */
(function (global) {
  'use strict';
  const KEY = 'houwai-learning-v01', CHANNEL = KEY + '-sync';
  const roles = ['teacher', 'student', 'parent', 'classroom', 'manager', 'counselor'];
  const copy = x => JSON.parse(JSON.stringify(x));
  const text = (x, limit = 2000) => String(x == null ? '' : x).trim().slice(0, limit);
  const validDate = x => { if (!/^\d{4}-\d{2}-\d{2}$/.test(x || '')) return false; const d = new Date(x + 'T12:00:00Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x; };
  const validMinutes = (x, max = 480) => typeof x !== 'boolean' && x !== '' && x != null && Number.isFinite(Number(x)) && Number(x) >= 0 && Number(x) <= max;
  const listeners = new Set(), writer = 'learning-tab-' + Math.random().toString(36).slice(2);
  let channel = null, available = true, warning = '';
  let state = global.LearningData.createInitialState();
  function merge(defaults, saved) {
    if (Array.isArray(defaults)) return Array.isArray(saved) ? copy(saved) : copy(defaults);
    if (!defaults || typeof defaults !== 'object') return saved == null ? defaults : saved;
    const result = copy(defaults);
    Object.keys(defaults).forEach(key => { result[key] = merge(defaults[key], saved && saved[key]); });
    return result;
  }
  function migrate(raw) {
    if (!raw || typeof raw !== 'object' || !raw.cases || typeof raw.cases !== 'object' || Array.isArray(raw.cases)) return null;
    const defaults = global.LearningData.createInitialState(), next = merge(defaults, raw);
    Object.keys(defaults.cases).forEach(id => {
      const baseline = defaults.cases[id], old = raw.cases[id];
      const item = merge(baseline, old);
      // 角色、学生、学段与来源关联从模板恢复，不信任旧快照中的任意身份或题目。
      item.id = baseline.id; item.studentId = id; item.stage = baseline.stage; item.campus = baseline.campus;
      item.source.recordId = baseline.source.recordId;
      item.version = Math.max(1, Number(item.version) || 1);
      if (!['draft', 'submitted', 'reviewed'].includes(item.correction.status)) item.correction.status = 'draft';
      item.correction.shareFamily = item.correction.shareFamily === true;
      if (!['pending', 'draft', 'submitted', 'reviewed'].includes(item.retry.status)) item.retry.status = 'pending';
      item.source.confirmed = item.source.confirmed === true;
      item.history = Array.isArray(item.history) ? item.history.slice(-50) : [];
      item.helpRequests = Array.isArray(item.helpRequests) ? item.helpRequests : [];
      next.cases[id] = item;
    });
    Object.keys(defaults.teacherWork).forEach(key => {
      const template = defaults.teacherWork[key], saved = raw.teacherWork && raw.teacherWork[key];
      next.teacherWork[key] = merge(template, saved);
      next.teacherWork[key].items = template.items.map(item => Object.assign({}, item, saved && Array.isArray(saved.items) && saved.items.find(x => x.id === item.id) || {}));
      next.teacherWork[key].items.forEach(item => { item.minutes = validMinutes(item.minutes) ? Number(item.minutes) : 0; });
      // 早期按学生保存的填报迁移到本班共享一次，不叠加导入或讲评等重复工时。
      if (!saved) {
        const cohort = global.LearningData.roster().filter(s => global.LearningData.classKey(s) === key).map(s => raw.cases[s.id]).filter(Boolean);
        const reported = cohort.find(item => (item.history || []).some(h => h.action === 'recordTeacherTime'));
        if (reported) { next.teacherWork[key].items = template.items.map(item => Object.assign({}, item, (reported.teacherTime || []).find(t => t.id === item.id) || {})); next.teacherWork[key].recordedAt = reported.updatedAt; }
      }
    });
    next.schemaVersion = 1; next.revision = Math.max(0, Number(raw.revision) || 0); next.writer = raw.writer;
    return next;
  }
  function stored() {
    try {
      const value = global.localStorage.getItem(KEY); if (!value) return null;
      let raw; try { raw = JSON.parse(value); } catch (error) { warning = '本地学习任务无法读取，已恢复合成样本；可重置后重新保存。'; return null; }
      const next = migrate(raw);
      if (!next) warning = '本地学习任务格式不兼容，已恢复合成样本。';
      return next;
    } catch (error) { available = false; warning = '浏览器存储不可用，学习任务暂存在内存中；关闭后本次修改不会保留。'; return null; }
  }
  state = stored() || state;
  function notify() { listeners.forEach(fn => { try { fn(); } catch (error) { /* 保持其他订阅可用。 */ } }); }
  function persist() {
    state.revision += 1; state.updatedAt = new Date().toISOString(); state.writer = writer;
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); available = true; }
    catch (error) { available = false; warning = '浏览器存储不可用，学习任务暂存在内存中；关闭后本次修改不会保留。'; }
    if (channel) try { channel.postMessage(copy(state)); } catch (error) { /* storage 仍可同步。 */ }
    notify();
  }
  function accept(raw) {
    const next = migrate(raw);
    if (!next || next.writer === writer || next.revision < state.revision) return;
    if (next.revision === state.revision && String(next.updatedAt) < String(state.updatedAt)) return;
    state = next; notify();
  }
  if (global.addEventListener) global.addEventListener('storage', event => {
    if (event.key !== KEY || !event.newValue) return;
    try { accept(JSON.parse(event.newValue)); } catch (error) { warning = '跨页面学习任务暂未同步，请刷新或重置演示后再试。'; notify(); }
  });
  try { if (global.BroadcastChannel) { channel = new global.BroadcastChannel(CHANNEL); channel.onmessage = event => accept(event.data); } } catch (error) { channel = null; }
  if (global.Store && global.Store.subscribe) global.Store.subscribe(() => notify());
  function context(ctx) {
    if (!ctx || !roles.includes(ctx.role) || !['junior', 'senior'].includes(ctx.stage)) return null;
    return Object.assign({}, ctx, { teacherKind: ctx.teacherKind === 'subject' ? 'subject' : 'head', campus: ['香江路校区', '兴国路校区'].includes(ctx.campus) ? ctx.campus : 'all' });
  }
  function selection(ctx) {
    const base = global.Store.view(ctx);
    if (!['teacher', 'student', 'parent'].includes(ctx.role)) return { base, student: null, item: null };
    const student = base.student;
    // Store 会对无权 studentId 退回本人；教师动作必须严格拒绝此类越界请求。
    const unauthorized = ctx.role === 'teacher' && ctx.studentId && !(base.students || []).some(s => s.id === ctx.studentId);
    const item = !unauthorized && student ? state.cases[student.id] : null;
    if (!item || item.stage !== ctx.stage) return { base, student: null, item: null };
    return { base, student, item };
  }
  function sourceFor(item, base) {
    const raw = (base.records || []).find(r => r.id === item.source.recordId && r.studentId === item.studentId && r.subject === '数学');
    if (!raw) return { recordId: item.source.recordId, confirmed: false, teacherNote: '', missing: true, title: '来源资料暂未找到', errorReason: '资料待补齐，请老师核对来源后再使用。' };
    const source = {};
    ['sourceId', 'source', 'date', 'title', 'subject', 'knowledge', 'question', 'studentAnswer', 'answer', 'errorReason'].forEach(key => { source[key] = raw[key]; });
    return Object.assign(source, { recordId: raw.id, confirmed: Boolean(item.source.confirmed), teacherNote: item.source.teacherNote, missing: false });
  }
  function linkedSupport(item, base) { return item.support ? (base.supports || []).find(s => s.id === item.support.id && s.studentId === item.studentId && s.origin === 'learning') || null : null; }
  function scopedCases(ctx) {
    if (ctx.role === 'teacher') { const ids = new Set((global.Store.view(ctx).students || []).map(s => s.id)); return Object.values(state.cases).filter(x => ids.has(x.studentId)); }
    return Object.values(state.cases).filter(x => x.stage === ctx.stage && (ctx.campus === 'all' || ctx.role !== 'manager' || x.campus === ctx.campus));
  }
  function metrics(ctx) {
    const cases = scopedCases(ctx), aggregate = ['teacher', 'manager'].includes(ctx.role);
    const chosen = ['student', 'parent'].includes(ctx.role) ? selection(ctx).item : null;
    const list = aggregate || ctx.role === 'classroom' ? cases : chosen ? [chosen] : [];
    const roster = global.LearningData.roster(), timeKeys = new Set(list.map(item => { const student = roster.find(s => s.id === item.studentId); return student && global.LearningData.classKey(student); }));
    const reports = aggregate ? [...timeKeys].map(key => state.teacherWork[key]).filter(x => x && x.recordedAt) : [];
    const time = Object.fromEntries(global.LearningData.timeSteps.map(step => [step.id, reports.reduce((n, report) => n + Number((report.items.find(t => t.id === step.id) || {}).minutes || 0), 0)]));
    return { students: list.length, confirmedSources: list.filter(x => x.source.confirmed).length, submittedCorrections: list.filter(x => ['submitted', 'reviewed'].includes(x.correction.status)).length, reviewedRetries: list.filter(x => x.retry.status === 'reviewed').length, independentRetries: list.filter(x => x.retry.status === 'reviewed' && x.retry.outcome === 'independent').length, plannedSupports: list.filter(x => x.support).length, publishedHandbooks: list.filter(x => x.snapshots.length).length, pendingHelp: list.reduce((n, x) => n + x.helpRequests.filter(h => h.status === 'requested').length, 0), teacherMinutes: Object.values(time).reduce((n, m) => n + m, 0), teacherTimeByStep: time, teacherTimeReportedClasses: reports.length, teacherTimeReportedCases: list.filter(item => { const s = roster.find(student => student.id === item.studentId); return s && reports.some(report => report.key === global.LearningData.classKey(s)); }).length, teacherTimeTotalClasses: timeKeys.size, note: '合成流程样本；教师用时按本班本周分环节填报并按班去重。未填报的 0 不代表实测或减负。' };
  }
  function steps(item) {
    return [
      { id: 'set', label: '设定目标与安排', status: item.goals.length ? 'done' : 'ready' },
      { id: 'mark', label: '核对原始反馈', status: item.source.confirmed ? 'done' : item.goals.length ? 'ready' : 'pending' },
      { id: 'correct', label: '订正并说出理由', status: item.correction.status === 'reviewed' ? 'done' : item.source.confirmed ? 'ready' : 'pending' },
      { id: 'teach', label: '讲评与再次表达', status: item.teaching.status === 'saved' ? 'done' : item.source.confirmed ? 'ready' : 'pending' },
      { id: 'support', label: '安排恰当的支持', status: item.support ? 'done' : item.source.confirmed ? 'ready' : 'pending' },
      { id: 'revisit', label: '新情境独立再练', status: item.retry.status === 'reviewed' ? 'done' : item.source.confirmed ? 'ready' : 'pending' }
    ];
  }
  function blank(ctx, allowed, student) {
    return { allowed, student: student || null, cycle: copy(global.LearningData.cycle), caseId: null, version: 0, publishedVersion: 0, generatedAt: null, goals: [], source: null, correction: null, teaching: null, support: null, retry: null, steps: [], workload: [], teacherTime: [], teacherTimeRecordedAt: null, helpRequests: [], progress: [], growth: [], schoolAction: '', familyAction: '', studentAction: '', publication: { status: 'draft', version: 0, publishedAt: null }, persistence: { available, warning }, metrics: ctx && ctx.role !== 'parent' ? metrics(ctx) : {} };
  }
  function redact(itemView, options) {
    const out = copy(itemView), family = options && options.family;
    const sharedCorrection = out.correction && out.correction.status === 'reviewed' && out.correction.shareFamily;
    if (out.correction && (!['submitted', 'reviewed'].includes(out.correction.status) || (family && !sharedCorrection))) { out.correction.text = ''; out.correction.feedback = ''; }
    if (out.retry && (family || !['submitted', 'reviewed'].includes(out.retry.status))) { out.retry.answer = ''; out.retry.explanation = ''; }
    if (family && out.retry) out.retry.answerKey = '';
    if (family && out.retry && out.retry.status !== 'reviewed') { out.retry.outcome = null; out.retry.feedback = ''; }
    if (family) out.progress = (out.progress || []).filter(item => item.kind === 'source' || (item.kind === 'correction' && sharedCorrection) || (item.kind === 'retry' && out.retry && out.retry.status === 'reviewed'));
    if (family) { out.teacherTime = []; out.teacherTimeRecordedAt = null; out.helpRequests = []; out.metrics = {}; }
    return out;
  }
  function currentView(ctx, entry) {
    const item = entry.item, base = entry.base, support = linkedSupport(item, base);
    const v = { allowed: true, student: entry.student, cycle: copy(global.LearningData.cycle), caseId: item.id, version: item.version, publishedVersion: item.snapshots.length ? item.snapshots[item.snapshots.length - 1].version : 0, generatedAt: item.updatedAt, goals: item.goals, source: sourceFor(item, base), correction: item.correction, teaching: item.teaching, support: support ? { id: support.id, title: support.title, method: support.method, owner: support.owner, due: support.due, status: support.status } : null, retry: item.retry, steps: steps(item), workload: item.workload.filter(w => ctx.role !== 'teacher' || ctx.teacherKind !== 'subject' || w.subject === '数学'), teacherTime: [], helpRequests: item.helpRequests, progress: [], growth: (base.growth || []).filter(g => g.studentId === item.studentId && g.status === 'confirmed'), schoolAction: item.schoolAction, familyAction: item.familyAction, studentAction: item.studentAction, publication: item.publication, persistence: { available, warning }, metrics: metrics(ctx) };
    const teacherWork = state.teacherWork[global.LearningData.classKey(entry.student)];
    v.teacherTime = ctx.role === 'teacher' && teacherWork ? teacherWork.items : [];
    v.teacherTimeRecordedAt = ctx.role === 'teacher' && teacherWork ? teacherWork.recordedAt : null;
    v.progress = [
      { kind: 'source', title: '从原来的订正中看到变化', text: ctx.stage === 'senior' ? '开始在计算之前检查参数条件，继续观察能否独立解释分类依据。' : '开始区分起始量与变化率，继续观察换一个情境后能否解释清楚。', date: '2026-10-29' },
      ...(item.correction.status === 'reviewed' ? [{ kind: 'correction', title: '老师已阅读这次解释', text: item.correction.feedback, date: item.updatedAt.slice(0, 10) }] : []),
      ...(item.retry.status === 'reviewed' ? [{ kind: 'retry', title: item.retry.outcome === 'independent' ? '新情境中已能独立运用' : '新情境中还需要一些支持', text: item.retry.feedback, date: item.updatedAt.slice(0, 10) }] : [])
    ];
    if (ctx.role === 'teacher') return redact(v);
    if (ctx.role === 'student' && ['pending', 'draft'].includes(v.retry.status)) v.retry = Object.assign({}, v.retry, { answerKey: '' });
    return copy(v);
  }
  function familyView(ctx, entry) {
    const last = entry.item.snapshots[entry.item.snapshots.length - 1];
    if (!last) return blank(ctx, true, entry.student);
    const v = redact(last.payload, { family: true });
    v.allowed = true; v.student = entry.student; v.persistence = { available, warning };
    return v;
  }
  function view(input) {
    const ctx = context(input);
    if (!ctx || ctx.role === 'counselor') return blank(null, false);
    if (['manager', 'classroom'].includes(ctx.role)) {
      const v = blank(ctx, true); v.metrics = metrics(ctx);
      if (ctx.role === 'classroom') v.goals = [...new Set(scopedCases(ctx).flatMap(item => item.goals))].slice(0, 2);
      return v;
    }
    const entry = selection(ctx);
    if (!entry.item) return blank(null, false);
    return ctx.role === 'parent' ? familyView(ctx, entry) : currentView(ctx, entry);
  }
  function printView(input, options) {
    const ctx = context(input);
    if (!ctx || !['teacher', 'student', 'parent'].includes(ctx.role)) return blank(null, false);
    const entry = selection(ctx);
    if (!entry.item) return blank(null, false);
    if (ctx.role === 'parent' || options && options.audience === 'family') return familyView(ctx, entry);
    const v = redact(currentView(ctx, entry));
    v.teacherTime = []; v.teacherTimeRecordedAt = null; v.helpRequests = []; v.metrics = {};
    if (v.retry) v.retry.answerKey = '';
    return v;
  }
  const fail = message => ({ ok: false, message });
  function dirty(item) {
    const last = item.snapshots[item.snapshots.length - 1];
    if (last && item.version <= last.version) item.version = last.version + 1;
    item.publication = { status: 'draft', version: item.version, publishedAt: last ? last.publishedAt : null };
  }
  function save(item, name, message, contentChange = true) {
    if (contentChange) dirty(item);
    item.updatedAt = new Date().toISOString(); item.history.push({ action: name, date: item.updatedAt }); item.history = item.history.slice(-50);
    state.audit.push({ action: name, caseId: item.id, date: item.updatedAt }); state.audit = state.audit.slice(-100); persist();
    return { ok: true, message: message + (!available ? '（本次暂存在内存中）' : '') };
  }
  function act(name, payload, input) {
    const ctx = context(input), p = payload || {};
    if (!ctx || !['teacher', 'student'].includes(ctx.role)) return fail('当前角色不能修改学习任务。');
    const latest = stored(); if (latest && latest.revision > state.revision) state = latest;
    const entry = selection(ctx), item = entry.item;
    if (!item || (p.studentId && p.studentId !== item.studentId) || (p.caseId && p.caseId !== item.id)) return fail('请在本人或授权班级的学习任务中操作。');
    const teacherActions = ['setPlan', 'confirmSource', 'reviewCorrection', 'saveTeaching', 'assignSupport', 'reviewRetry', 'publishHandbook', 'saveWorkload', 'recordTeacherTime'];
    const studentActions = ['saveCorrection', 'saveRetry', 'askHelp'];
    if ((teacherActions.includes(name) && ctx.role !== 'teacher') || (studentActions.includes(name) && ctx.role !== 'student')) return fail('这一步需要由相应的学生或老师完成。');
    if (teacherActions.includes(name) && ctx.teacherKind === 'subject' && sourceFor(item, entry.base).subject !== '数学') return fail('数学科任只能处理本学科的学习任务。');
    if (name === 'setPlan') {
      if (!Array.isArray(p.goals) || p.goals.length < 1 || p.goals.length > 2 || p.goals.some(x => !text(x, 200))) return fail('请设定 1—2 个具体的本周学习目标。');
      if (!validMinutes(p.minutes, 180) || Number(p.minutes) < 1 || !validDate(p.dueDate) || !validDate(p.reviewDate) || p.reviewDate < p.dueDate) return fail('请填写合理的预计分钟数、完成日期与复看日期。');
      item.goals = p.goals.map(x => text(x, 200)); const task = item.workload.find(x => x.id === 'math-review'); task.minutes = Number(p.minutes); task.due = p.dueDate; item.retry.estimatedMinutes = Number(p.minutes); item.retry.reviewDate = p.reviewDate;
      return save(item, name, '本周目标与安排已保存，家庭保留上一份已发布版本。');
    }
    if (name === 'confirmSource') {
      if (sourceFor(item, entry.base).missing) return fail('来源资料待补齐，请核对原始记录后再确认。');
      if (!text(p.teacherNote)) return fail('请写下核对后的具体判断。');
      item.source.confirmed = true; item.source.teacherNote = text(p.teacherNote);
      return save(item, name, '原始反馈已由教师核对，保留题目与来源关联。');
    }
    if (name === 'saveCorrection') {
      if (!text(p.text, 4000)) return fail('请写出订正和自己的解释，再保存或提交。');
      item.correction = { text: text(p.text, 4000), status: p.submit ? 'submitted' : 'draft', shareFamily: Boolean(p.shareFamily), feedback: '' };
      return save(item, name, p.submit ? '解释已提交给数学老师，家庭分享仍需老师发布。' : '订正草稿已保存，老师和家庭暂时看不到。');
    }
    if (name === 'reviewCorrection') {
      if (!['submitted', 'reviewed'].includes(item.correction.status)) return fail('学生提交解释后，老师才能复核。');
      if (!text(p.feedback)) return fail('请写一句具体反馈，帮助学生理解下一步。');
      item.correction.status = 'reviewed'; item.correction.feedback = text(p.feedback);
      return save(item, name, '订正解释已复核；能否独立迁移还要看下一次再练。');
    }
    if (name === 'saveTeaching') {
      if (!text(p.topic, 300) || !text(p.method, 300) || !text(p.note)) return fail('请补全讲评主题、做法与课堂观察。');
      item.teaching = { topic: text(p.topic, 300), method: text(p.method, 300), note: text(p.note), status: 'saved' };
      return save(item, name, '讲评安排与课堂观察已保存。');
    }
    if (name === 'assignSupport') {
      if (!text(p.title, 150) || !text(p.method) || !text(p.owner, 100) || !validDate(p.due)) return fail('请写明支持内容、方式、跟进老师和复看日期。');
      const existing = linkedSupport(item, entry.base);
      if (existing && existing.status !== 'closed' && p.next !== true) return { ok: true, message: '本轮已有学习支持，可到原支持事项继续跟进。' };
      const before = new Set((entry.base.supports || []).map(s => s.id));
      const created = global.Store.act('createSupport', { studentId: item.studentId, title: text(p.title, 150), method: text(p.method), owner: text(p.owner, 100), due: p.due, note: '关联智慧学习任务 ' + item.id + '；来源记录 ' + item.source.recordId + '。' }, ctx);
      if (!created.ok) return created;
      const linked = (global.Store.view(ctx).supports || []).find(s => !before.has(s.id) && s.studentId === item.studentId && s.origin === 'learning');
      if (!linked) return fail('支持已创建，但关联暂未完成，请刷新后核对原支持列表。');
      item.support = { id: linked.id }; item.helpRequests.filter(h => h.status === 'requested').forEach(h => { h.status = 'arranged'; });
      return save(item, name, '支持已关联到原教师工作台，不另建一份学生档案。');
    }
    if (name === 'saveRetry') {
      if (!text(p.answer, 4000) || (p.submit && !text(p.explanation, 4000))) return fail('请写下新题作答；提交时也请说明这次怎样判断。');
      item.retry.answer = text(p.answer, 4000); item.retry.explanation = text(p.explanation, 4000); item.retry.status = p.submit ? 'submitted' : 'draft'; item.retry.outcome = null; item.retry.feedback = '';
      return save(item, name, p.submit ? '新情境作答已提交，等待老师结合过程复看。' : '再练草稿已保存，尚未提交给老师。');
    }
    if (name === 'reviewRetry') {
      if (!['submitted', 'reviewed'].includes(item.retry.status)) return fail('学生提交新情境作答后，老师才能复看。');
      if (!['independent', 'needs-support'].includes(p.outcome) || !text(p.feedback)) return fail('请选择独立运用或继续支持，并写出具体反馈。');
      const support = linkedSupport(item, entry.base);
      if (support && support.status !== 'closed') {
        const followed = global.Store.act('followup', { id: support.id, outcome: p.outcome === 'independent' ? 'improving' : 'continued', note: text(p.feedback) }, ctx);
        if (!followed.ok) return followed;
      }
      item.retry.status = 'reviewed'; item.retry.outcome = p.outcome; item.retry.feedback = text(p.feedback);
      return save(item, name, p.outcome === 'independent' ? '已记录新情境中的独立运用，订正与再练分别保留。' : '已记录仍需支持的地方，下一次可以调整支持方式。');
    }
    if (name === 'publishHandbook') {
      const source = sourceFor(item, entry.base);
      if (!source.confirmed || source.missing || !item.goals.length) return fail('先核对来源并设定目标，再向家庭发布。');
      if (!text(p.schoolAction) || !text(p.familyAction) || !text(p.studentAction)) return fail('请补全学校、家庭和学生各自的下一步。');
      item.schoolAction = text(p.schoolAction); item.familyAction = text(p.familyAction); item.studentAction = text(p.studentAction);
      const last = item.snapshots[item.snapshots.length - 1];
      if (last && item.version <= last.version) item.version = last.version + 1;
      const now = new Date().toISOString(); item.updatedAt = now; item.publication = { status: 'published', version: item.version, publishedAt: now };
      const payloadView = redact(currentView(ctx, entry), { family: true });
      payloadView.growth = payloadView.growth.filter(g => g.published);
      payloadView.publishedVersion = item.version; payloadView.generatedAt = now;
      item.snapshots.push({ version: item.version, publishedAt: now, payload: payloadView }); item.snapshots = item.snapshots.slice(-20);
      return save(item, name, '第 ' + item.version + ' 版已发布；后续修改保留为新草稿，家庭继续看本版。', false);
    }
    if (name === 'saveWorkload') {
      if (ctx.teacherKind !== 'head') return fail('全科安排由班主任统筹，科任只处理本学科任务。');
      if (!Array.isArray(p.items) || !p.items.length || p.items.some(x => !x || !item.workload.some(w => w.id === x.id) || !validMinutes(x.minutes, 240))) return fail('请使用现有任务，填写 0—240 分钟的预计安排。');
      p.items.forEach(x => { const target = item.workload.find(w => w.id === x.id); target.minutes = Number(x.minutes); target.note = text(x.note, 1000) || '教学安排示例，非实际测得耗时。'; });
      return save(item, name, '全科预计安排已更新，仍是教学安排示例。');
    }
    if (name === 'recordTeacherTime') {
      const report = state.teacherWork[global.LearningData.classKey(entry.student)];
      if (!report || !Array.isArray(p.items) || !p.items.length || p.items.some(x => !x || !report.items.some(t => t.id === x.id) || !validMinutes(x.minutes))) return fail('请按六个环节填写 0—480 分钟的教师用时。');
      p.items.forEach(x => { report.items.find(t => t.id === x.id).minutes = Number(x.minutes); }); report.recordedAt = new Date().toISOString();
      return save(item, name, '教师各环节用时已保存，汇总按当前授权范围计算。', false);
    }
    if (name === 'askHelp') {
      if (!text(p.message, 1000)) return fail('说说卡在哪里，老师才知道怎样支持。');
      item.helpRequests.unshift({ id: 'help-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), message: text(p.message, 1000), status: 'requested', createdAt: new Date().toISOString() });
      return save(item, name, '求助已交给数学老师，老师可以据此安排支持。', false);
    }
    return fail('当前学习任务暂不支持这个操作。');
  }
  global.LearningStore = {
    view, printView, act,
    get: () => copy(state),
    reset() { const revision = state.revision; state = global.LearningData.createInitialState(); state.revision = revision; persist(); return { ok: true, message: '智慧学习合成样本已恢复。' }; },
    subscribe(fn) { if (typeof fn !== 'function') return () => {}; listeners.add(fn); return () => listeners.delete(fn); },
    info: () => ({ key: KEY, available, warning })
  };
})(typeof window !== 'undefined' ? window : globalThis);
