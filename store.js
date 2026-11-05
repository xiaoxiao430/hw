/* 本地合成数据演示层。view 用于角色投影；生产环境仍须服务端鉴权。 */
(function (global) {
  'use strict';
  const KEY = 'houwai-secondary-demo-v1';
  const CHANNEL = 'houwai-secondary-demo-sync-v1';
  const roles = ['student', 'parent', 'teacher', 'classroom', 'manager', 'counselor'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clean = (value, max = 2000) => String(value == null ? '' : value).trim().slice(0, max);
  const validDate = value => { if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false; const date = new Date(value + 'T12:00:00Z'); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value; };
  const listeners = new Set();
  const instanceId = 'tab-' + Math.random().toString(36).slice(2);
  let storageAvailable = true;
  let persistenceWarning = '';
  let channel = null;
  let state = global.DemoData.createInitialState();
  function validState(value) { return value && value.schemaVersion === 1 && ['students', 'records', 'supports', 'reports', 'reflections', 'growth', 'professional', 'research', 'sources', 'workloads', 'audit', 'importKeys'].every(key => Array.isArray(value[key])) && value.classrooms && value.classrooms.junior && value.classrooms.senior && value.goals && value.preferences; }
  function readStored() {
    try {
      const raw = global.localStorage.getItem(KEY);
      if (!raw) return null;
      let parsed;
      try { parsed = JSON.parse(raw); } catch (error) { persistenceWarning = '本地资料无法读取，已恢复合成样本；可以使用“重置演示”重新保存。'; return null; }
      if (validState(parsed)) return parsed;
      persistenceWarning = '本地资料版本不兼容，已载入新的合成样本。';
    } catch (error) {
      storageAvailable = false;
      persistenceWarning = '浏览器本地存储不可用，正在使用内存；关闭页面后本次修改不会保留。';
    }
    return null;
  }
  state = readStored() || state;
  function notify() { listeners.forEach(fn => { try { fn(); } catch (error) { /* 单个订阅异常不影响存储。 */ } }); }
  function persist() {
    state.updatedAt = new Date().toISOString();
    state.revision = (Number(state.revision) || 0) + 1;
    state.writer = instanceId;
    try { global.localStorage.setItem(KEY, JSON.stringify(state)); storageAvailable = true; }
    catch (error) { storageAvailable = false; persistenceWarning = '浏览器本地存储不可用，正在使用内存；关闭页面后本次修改不会保留。'; }
    if (channel) { try { channel.postMessage({ key: KEY, state, sender: instanceId }); } catch (error) { /* storage 事件仍可同步。 */ } }
    notify();
  }
  function accept(next) {
    if (!validState(next) || next.writer === instanceId) return;
    if (Number(next.revision) < Number(state.revision)) return;
    if (Number(next.revision) === Number(state.revision) && String(next.updatedAt) < String(state.updatedAt)) return;
    state = clone(next);
    notify();
  }
  if (global.addEventListener) global.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    try { if (event.newValue) accept(JSON.parse(event.newValue)); } catch (error) { persistenceWarning = '跨页面同步资料无法读取，请重置合成样本后再试。'; notify(); }
  });
  try { if (global.BroadcastChannel) { channel = new global.BroadcastChannel(CHANNEL); channel.onmessage = event => { if (event.data && event.data.sender !== instanceId) accept(event.data.state); }; } } catch (error) { channel = null; }
  function normalize(ctx) {
    const input = ctx || {};
    return { role: roles.includes(input.role) ? input.role : 'student', stage: input.stage === 'senior' ? 'senior' : 'junior', teacherKind: input.teacherKind === 'subject' ? 'subject' : 'head', campus: ['香江路校区', '兴国路校区'].includes(input.campus) ? input.campus : 'all', studentId: input.studentId };
  }
  const teachingCampus = ctx => ctx.stage === 'senior' ? '兴国路校区' : '香江路校区';
  const selfId = ctx => ctx.stage === 'senior' ? 's1' : 'j1';
  const isTeacher = ctx => ctx.role === 'teacher';
  function scopeStudents(ctx) {
    let list = state.students.filter(s => s.stage === ctx.stage);
    if (['student', 'parent', 'counselor'].includes(ctx.role)) return list.filter(s => s.id === selfId(ctx));
    if (ctx.role === 'teacher' || ctx.role === 'classroom') list = list.filter(s => s.campus === teachingCampus(ctx));
    if (ctx.role === 'manager' && ctx.campus !== 'all') list = list.filter(s => s.campus === ctx.campus);
    return list;
  }
  function idsFor(ctx) { return new Set(scopeStudents(ctx).map(s => s.id)); }
  function selected(ctx) { const list = scopeStudents(ctx); return list.find(s => s.id === ctx.studentId) || list.find(s => s.id === selfId(ctx)) || list[0] || null; }
  function visibleSupport(s, ctx) { return idsFor(ctx).has(s.studentId) && (s.origin !== 'professional' || (ctx.role === 'counselor' || (isTeacher(ctx) && ctx.teacherKind === 'head'))) && (ctx.teacherKind !== 'subject' || ctx.role !== 'teacher' || (s.origin === 'learning' && (!s.subject || s.subject === '数学'))); }
  function metrics(ctx) {
    const cohort = scopeStudents(ctx), ids = new Set(cohort.map(s => s.id));
    const academic = state.records.filter(r => ids.has(r.studentId) && (ctx.role !== 'parent' || r.published) && (ctx.teacherKind !== 'subject' || ctx.role !== 'teacher' || r.subject === '数学'));
    const supports = state.supports.filter(s => ids.has(s.studentId) && s.origin === 'learning');
    const growth = state.growth.filter(g => ids.has(g.studentId) && g.status === 'confirmed' && (ctx.role !== 'parent' || g.published));
    const work = state.workloads.filter(w => ids.has(w.studentId));
    const measured = state.research.filter(r => r.stage === ctx.stage && (ctx.role !== 'manager' || ctx.campus === 'all' || r.campus === ctx.campus));
    return { students: cohort.length, openSupports: supports.filter(s => s.status !== 'closed').length, closedSupports: supports.filter(s => s.status === 'closed').length, publishedReports: state.reports.filter(r => ids.has(r.studentId) && r.status === 'published').length, growthCount: growth.length, coverage: cohort.length ? Math.round(new Set(academic.map(r => r.studentId)).size / cohort.length * 100) : 0, teacherMinutesBefore: work.length ? Math.round(work.reduce((a, w) => a + w.before, 0) / work.length) : 0, teacherMinutesAfter: work.length ? Math.round(work.reduce((a, w) => a + w.after, 0) / work.length) : 0, knowledgeBefore: measured.length ? Math.round(measured.reduce((a, r) => a + r.before * r.coverage, 0) / measured.reduce((a, r) => a + r.coverage, 0)) : 0, knowledgeAfter: measured.length ? Math.round(measured.reduce((a, r) => a + r.after * r.coverage, 0) / measured.reduce((a, r) => a + r.coverage, 0)) : 0, studentWorkCount: growth.filter(g => g.before && g.after).length, growthByDimension: Object.fromEntries(global.DemoData.dimensions.map(d => [d, growth.filter(g => g.dimension === d).length])), coverageLabel: cohort.length + ' 位合成学生', sampleNote: '合成样本，仅用于验证流程；课堂观察采用独立的班级模拟样本，不用于效果归因。', professionalOpen: state.supports.filter(s => ids.has(s.studentId) && s.origin === 'professional' && s.status !== 'closed').length, professionalClosed: state.supports.filter(s => ids.has(s.studentId) && s.origin === 'professional' && s.status === 'closed').length };
  }
  function view(context) {
    const ctx = normalize(context), student = selected(ctx), ids = idsFor(ctx);
    let records = state.records.filter(r => ids.has(r.studentId)), supports = state.supports.filter(s => visibleSupport(s, ctx)), reports = state.reports.filter(r => ids.has(r.studentId)), reflections = state.reflections.filter(r => ids.has(r.studentId)), growth = state.growth.filter(g => ids.has(g.studentId));
    if (ctx.role === 'student') { reports = reports.filter(r => r.status === 'published'); growth = growth.filter(g => g.status === 'confirmed' || g.authoredBy === 'student'); }
    if (ctx.role === 'parent') { records = records.filter(r => r.published); reports = reports.filter(r => r.status === 'published'); reflections = []; growth = growth.filter(g => g.status === 'confirmed' && g.published); }
    if (isTeacher(ctx)) {
      reflections = reflections.filter(r => r.status !== 'draft' && (ctx.teacherKind !== 'subject' || r.teacher.includes('数学')));
      if (ctx.teacherKind === 'subject') { records = records.filter(r => r.subject === '数学'); growth = growth.filter(g => g.dimension === '学习好'); reports = reports.filter(r => r.subject === '数学'); }
    }
    if (['manager', 'classroom', 'counselor'].includes(ctx.role)) { records = []; reports = []; reflections = []; growth = []; supports = ctx.role === 'counselor' ? supports.filter(s => s.origin === 'professional') : []; }
    const sources = ['teacher', 'manager'].includes(ctx.role) ? state.sources.filter(s => s.stage === ctx.stage && (ctx.role !== 'teacher' || ctx.teacherKind !== 'subject' || ['iflytek', 'exam'].includes(s.id))).map(s => {
      const safe = Object.assign({}, s);
      if (s.id === 'iflytek') safe.count = state.records.filter(r => ids.has(r.studentId) && r.type === 'homework' && r.subject === '数学').length;
      if (s.id === 'exam') safe.count = state.records.filter(r => ids.has(r.studentId) && r.type === 'exam').length;
      if (s.id === 'growth') safe.count = state.growth.filter(g => ids.has(g.studentId)).length;
      if (s.id === 'psychology') { safe.count = state.supports.filter(g => ids.has(g.studentId) && g.origin === 'professional').length; safe.name = '专业支持协作（仅汇总）'; }
      return safe;
    }) : [];
    const summary = metrics(ctx);
    if (!['manager', 'counselor'].includes(ctx.role) && !(ctx.role === 'teacher' && ctx.teacherKind === 'head')) { summary.professionalOpen = 0; summary.professionalClosed = 0; }
    return clone({ student: ['manager', 'classroom'].includes(ctx.role) ? null : student, students: ['manager', 'classroom'].includes(ctx.role) ? [] : scopeStudents(ctx), records, supports, reports, reflections, growth, classroom: ['teacher', 'classroom'].includes(ctx.role) ? state.classrooms[ctx.stage] : null, professional: ctx.role === 'counselor' ? state.professional.find(p => p.stage === ctx.stage && p.studentId === selfId(ctx)) || null : null, research: ['teacher', 'manager'].includes(ctx.role) ? state.research.filter(r => r.stage === ctx.stage && (ctx.role !== 'teacher' || r.campus === teachingCampus(ctx)) && (ctx.role !== 'manager' || ctx.campus === 'all' || r.campus === ctx.campus)) : [], sources, metrics: summary, goal: ['student', 'parent'].includes(ctx.role) ? state.goals[selfId(ctx)] || '' : '', preferences: state.preferences, persistence: { available: storageAvailable, warning: persistenceWarning }, dimensions: global.DemoData.dimensions });
  }
  function result(ok, message) { return { ok, message }; }
  function fail(message) { return result(false, message); }
  function commit(action, message) { state.audit.push({ action, date: new Date().toISOString() }); state.audit = state.audit.slice(-100); persist(); return result(true, message + (!storageAvailable ? '（当前使用内存保存）' : '')); }
  function requireTeacher(ctx, headOnly) { return isTeacher(ctx) && (!headOnly || ctx.teacherKind === 'head'); }
  function findOwned(list, id, ctx) { return list.find(item => item.id === id && idsFor(ctx).has(item.studentId)); }
  function newId(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function currentStudentId(payload, ctx) { return payload.studentId || (selected(ctx) && selected(ctx).id); }
  function sourceKey(r) { return [r.source, r.sourceId, r.type, r.studentId].join('|'); }
  /** 预留适配接口。rows 为作业/考试记录；options.studentMap 将外部学生编号映射到本地编号。
   * 批次原子校验：任一无效行则整批拒绝；来源+来源编号+类型+学生复合去重。
   * 输入的 id / published / status 均不接受，所有导入项回到“原始数据待解读”。
   */
  function normalizeRecords(rows, context, options) {
    const ctx = normalize(context), errors = [], normalized = [];
    if (!context || context.role !== 'teacher' || ctx.teacherKind !== 'head') return { ok: false, records: [], errors: ['请由班主任执行数据适配导入。'] };
    if (!Array.isArray(rows) || !rows.length || rows.length > 500) return { ok: false, records: [], errors: ['每批请提供 1—500 条作业或考试记录。'] };
    const ids = idsFor(ctx), mapping = options && options.studentMap || {};
    rows.forEach((row, index) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) { errors.push('第 ' + (index + 1) + ' 行不是有效记录。'); return; }
      const studentId = clean(row.studentId || mapping[row.externalStudentId], 80);
      const required = ['sourceId', 'source', 'type', 'subject', 'date', 'title', 'knowledge', 'question'];
      const missing = required.filter(k => !clean(row[k]));
      if (missing.length) { errors.push('第 ' + (index + 1) + ' 行缺少：' + missing.join('、') + '。'); return; }
      if (!ids.has(studentId)) { errors.push('第 ' + (index + 1) + ' 行学生编号未映射或超出授权学段、班级。'); return; }
      if (!['homework', 'exam'].includes(row.type) || !validDate(row.date)) { errors.push('第 ' + (index + 1) + ' 行类型或日期无效。'); return; }
      const score = Number(row.score), maxScore = Number(row.maxScore);
      if (row.score == null || row.score === '' || !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) { errors.push('第 ' + (index + 1) + ' 行分数或满分无效。'); return; }
      const record = { studentId, sourceId: clean(row.sourceId, 160), source: clean(row.source, 160), type: row.type, subject: clean(row.subject, 60), date: row.date, title: clean(row.title, 200), knowledge: clean(row.knowledge, 300), question: clean(row.question, 5000), answer: clean(row.answer, 5000), studentAnswer: clean(row.studentAnswer, 5000), errorReason: clean(row.errorReason, 2000), score, maxScore, status: '原始数据 · 待教师解读', published: false };
      let hash = 2166136261; for (const letter of sourceKey(record)) { hash ^= letter.charCodeAt(0); hash = Math.imul(hash, 16777619); }
      record.id = 'adapter-' + (hash >>> 0).toString(36); normalized.push(record);
    });
    return { ok: errors.length === 0, records: errors.length ? [] : normalized, errors };
  }
  function importRecords(rows, context, options) {
    const normalized = normalizeRecords(rows, context, options);
    if (!normalized.ok) return { ok: false, message: normalized.errors.join(' '), added: 0, duplicates: 0, errors: normalized.errors };
    if (storageAvailable) { const stored = readStored(); if (stored && Number(stored.revision) > Number(state.revision)) state = stored; }
    const keys = new Set(state.records.map(sourceKey)), fresh = [];
    normalized.records.forEach(record => { const key = sourceKey(record); if (!keys.has(key)) { keys.add(key); fresh.push(record); } });
    const duplicates = normalized.records.length - fresh.length;
    if (!fresh.length) return { ok: true, message: '相同来源编号已导入，跳过 ' + duplicates + ' 条重复记录。', added: 0, duplicates, errors: [] };
    state.records.unshift(...fresh); state.importKeys.push(...fresh.map(sourceKey));
    const committed = commit('importRecords', '已适配导入 ' + fresh.length + ' 条合成记录，跳过 ' + duplicates + ' 条重复；等待教师解读。');
    return Object.assign(committed, { added: fresh.length, duplicates, errors: [] });
  }
  function act(name, payload, context) {
    const p = payload || {}, ctx = normalize(context);
    if (!context || !roles.includes(context.role)) return fail('请先选择一个有效角色。');
    // 合并其它标签页已经提交的最新快照，避免顺序操作覆盖。
    if (storageAvailable) { const stored = readStored(); if (stored && Number(stored.revision) > Number(state.revision)) state = stored; }
    const studentId = currentStudentId(p, ctx), allowed = idsFor(ctx).has(studentId);
    const classroom = state.classrooms[ctx.stage];
    if (name === 'createSupport') {
      if (!requireTeacher(ctx) || !allowed) return fail('当前角色无法为这位学生安排支持。');
      if (!clean(p.title) || !clean(p.method) || !clean(p.owner) || !validDate(p.due)) return fail('请填写支持内容、方式、跟进人和有效的复看日期。');
      state.supports.unshift({ id: newId('support'), studentId, title: clean(p.title, 120), method: clean(p.method), owner: clean(p.owner, 60), due: p.due, status: 'planned', progress: '已安排，等待实际跟进。', origin: 'learning', subject: '数学', note: clean(p.note) });
      return commit(name, '支持已安排，下一次复看有了明确的跟进人。');
    }
    if (['followup', 'closeSupport'].includes(name)) {
      const item = findOwned(state.supports, p.id, ctx);
      if (!item || !(requireTeacher(ctx) || ctx.role === 'counselor') || !visibleSupport(item, ctx) || (ctx.role === 'counselor' && item.origin !== 'professional')) return fail('当前角色无法更新这条支持事项。');
      if (name === 'closeSupport') { if (item.status === 'closed') return result(true, '这条支持已经完成。'); item.status = 'closed'; item.progress = '本次支持已完成，后续仍可继续观察。'; }
      else { if (!['improving', 'continued'].includes(p.outcome)) return fail('请选择“有改善”或“继续支持”。'); if (item.status === 'closed') return fail('这条支持已经完成，请为新的需要另建支持。'); item.status = p.outcome; item.progress = clean(p.note) || (p.outcome === 'improving' ? '新情境中已有改善，继续观察能否稳定运用。' : '新情境中仍需支持，将调整方式后再次复看。'); }
      return commit(name, name === 'closeSupport' ? '支持已完成，变化留在跟进记录里。' : '后续反馈已记录。');
    }
    if (name === 'draftReport') {
      if (!requireTeacher(ctx) || !allowed) return fail('当前角色无法整理这位学生的反馈。');
      const subject = ctx.teacherKind === 'subject' ? '数学' : '综合';
      let report = state.reports.find(r => r.studentId === studentId && r.subject === subject && r.status === 'draft');
      if (report) return result(true, '已有模拟草稿，请先查看并修改。');
      const old = state.reports.filter(r => r.studentId === studentId && r.subject === subject).at(-1);
      const base = state.reports.find(r => r.studentId === studentId);
      report = Object.assign({}, old || base, { id: newId('report'), studentId, subject, status: 'draft', date: '2026-10-30', confirmedAt: null, publishedAt: null, generatedBy: '模拟系统草稿' });
      if (subject === '数学') { report.summary = ctx.stage === 'senior' ? '数学学习中开始检查参数条件，仍需在新情境中验证。' : '数学订正中开始区分起点与变化率，仍需在新情境中验证。'; report.schoolAction = '数学老师将安排一次面批和一道迁移练习。'; }
      state.reports.unshift(report); return commit(name, '模拟反馈草稿已整理，请教师核实并修改。');
    }
    if (['saveReport', 'confirmReport', 'publishReport'].includes(name)) {
      const item = findOwned(state.reports, p.id, ctx);
      if (!requireTeacher(ctx) || !item || (ctx.teacherKind === 'subject' && item.subject !== '数学')) return fail('当前角色无法处理这份反馈。');
      if (name === 'saveReport') {
        if (item.status === 'published') return fail('已发布反馈保留原版本，请整理新一份草稿。');
        const fields = ['summary', 'schoolAction', 'familyAction', 'studentAction'];
        if (fields.some(k => !clean(p[k]))) return fail('请补全近期变化、学校行动、家庭配合和学生下一步。');
        fields.forEach(k => { item[k] = clean(p[k]); }); item.status = 'draft'; item.confirmedAt = null;
        return commit(name, '修改已保存，内容仍待教师确认。');
      }
      if (name === 'confirmReport') { if (item.status === 'published') return fail('这份反馈已经发布。'); if (!item.summary || !item.schoolAction || !item.familyAction || !item.studentAction) return fail('请先补全反馈内容。'); item.status = 'confirmed'; item.confirmedAt = new Date().toISOString(); return commit(name, '教师已确认，可继续发布给家庭。'); }
      if (item.status === 'published') return result(true, '这份反馈已发布，无需重复操作。');
      if (item.status !== 'confirmed') return fail('反馈需要先由教师确认，才能发布给家庭。');
      item.status = 'published'; item.publishedAt = new Date().toISOString();
      state.records.filter(r => r.studentId === item.studentId && (item.subject === '综合' || r.subject === item.subject)).forEach(r => { r.published = true; });
      return commit(name, '反馈已发布，家长与学生现在可以查看。');
    }
    if (name === 'saveReflection') {
      if (ctx.role !== 'student') return fail('学习复盘由学生本人填写。');
      if (!clean(p.text, 3000)) return fail('先写一点自己的观察或下一次尝试。');
      let item = p.id && state.reflections.find(r => r.id === p.id && r.studentId === selfId(ctx));
      if (p.id && !item) return fail('找不到本人这份复盘。');
      if (item && item.status === 'confirmed') return fail('已经确认的复盘保留原稿，可以新写一份。');
      if (!item) { item = { id: newId('reflection'), studentId: selfId(ctx), teacher: '沈知夏老师（数学）' }; state.reflections.unshift(item); }
      item.text = clean(p.text, 3000); item.status = p.submit ? 'submitted' : 'draft'; item.shareFamily = Boolean(p.shareFamily);
      return commit(name, p.submit ? '已提交给沈知夏老师（数学）；家庭分享仍需教师确认。' : '草稿已保存，仅你自己可见。');
    }
    if (name === 'confirmReflection') {
      const item = findOwned(state.reflections, p.id, ctx);
      if (!requireTeacher(ctx) || !item || item.status === 'draft' || (ctx.teacherKind === 'subject' && !item.teacher.includes('数学'))) return fail('当前只能确认提交给你的复盘。');
      if (item.status === 'confirmed') return result(true, '这份复盘已经确认。');
      item.status = 'confirmed';
      const growthId = 'reflection-growth-' + item.id;
      if (!state.growth.some(g => g.id === growthId)) state.growth.unshift({ id: growthId, studentId: item.studentId, title: '学习复盘：下一次怎样尝试', dimension: '学习好', category: '学习复盘', date: '2026-10-30', description: item.text, before: '保留这一次的真实思考。', after: '在下一次学习中检验自己的方法。', role: '自主复盘', feedback: '教师已了解，等待成长记录复核。', status: 'pending', published: false, authoredBy: 'student', shareFamily: item.shareFamily, reflectionId: item.id });
      return commit(name, '复盘已确认，相关成长记录等待复核后再进入家庭视图。');
    }
    if (name === 'addGrowth') {
      if (!['student', 'teacher'].includes(ctx.role) || (ctx.role === 'teacher' && !allowed)) return fail('当前角色无法提交这条成长记录。');
      if (!clean(p.title, 120) || !clean(p.description, 3000)) return fail('请写出这次经历的标题和实际表现。');
      const dimension = global.DemoData.dimensions.includes(p.dimension) ? p.dimension : global.DemoData.dimensions.includes(p.category) ? p.category : '学习好';
      if (ctx.role === 'teacher' && ctx.teacherKind === 'subject' && dimension !== '学习好') return fail('科任教师可提交本学科的学习成长记录。');
      state.growth.unshift({ id: newId('growth'), studentId: ctx.role === 'student' ? selfId(ctx) : studentId, title: clean(p.title, 120), dimension, category: clean(p.category, 60) || dimension, date: '2026-10-30', description: clean(p.description, 3000), before: clean(p.before) || '我准备尝试的目标。', after: clean(p.after) || '保留实际行动，之后再看变化。', role: clean(p.role, 200) || '自主参与', feedback: clean(p.feedback) || '等待教师结合实际表现确认。', status: 'pending', published: false, authoredBy: ctx.role, shareFamily: Boolean(p.shareFamily) });
      return commit(name, '成长记录已提交，等待教师复核。');
    }
    if (name === 'confirmGrowth') {
      const item = findOwned(state.growth, p.id, ctx);
      if (!requireTeacher(ctx) || !item || (ctx.teacherKind === 'subject' && item.dimension !== '学习好')) return fail('当前角色无法复核这条成长记录。');
      if (item.status === 'confirmed') return result(true, '这条记录已经确认。');
      item.status = 'confirmed'; item.published = Boolean(item.shareFamily);
      item.feedback = clean(p.feedback) || '教师已结合这次实际表现确认；继续留意下一次的尝试。';
      return commit(name, item.published ? '成长记录已确认，家庭现在可以查看。' : '成长记录已确认，按学生选择保留在师生之间。');
    }
    if (name === 'importDemo') {
      if (!requireTeacher(ctx, true) || !['homework', 'exam'].includes(p.kind)) return fail('请由班主任选择作业或考试合成数据导入。');
      const source = state.sources.find(s => s.stage === ctx.stage && s.id === (p.kind === 'homework' ? 'iflytek' : 'exam'));
      if (!source || source.status !== 'synced') return fail(source && source.status === 'failed' ? '模拟同步失败，资料尚未导入。恢复同步后可以安全重试。' : '模拟来源缺失，请先恢复数据来源后再试。');
      const id = selfId(ctx), sourceId = (ctx.stage === 'senior' ? 'S' : 'J') + '-20261030-' + p.kind.toUpperCase() + '-001';
      const incoming = Object.assign({}, state.records.find(r => r.studentId === id && r.type === p.kind && r.subject === '数学'), { id: 'import-' + sourceId, sourceId, source: p.kind === 'homework' ? '讯飞智慧作业（模拟）' : '校内考试系统（模拟）', date: '2026-10-30', title: p.kind === 'homework' ? '新情境迁移练习（模拟导入）' : '迁移检查：阶段练习（模拟导入）', score: p.kind === 'homework' ? 8 : 84, published: false, status: '原始数据 · 待教师解读' });
      const key = sourceKey(incoming);
      if (state.records.some(r => sourceKey(r) === key)) return result(true, '相同来源编号已导入，跳过重复记录，未产生新记录。');
      state.records.unshift(incoming); state.importKeys.push(key); source.lastSync = '2026-10-30 08:30'; source.count += 1;
      return commit(name, '已导入 1 条合成记录，原始数据等待教师解读。');
    }
    if (name === 'setSourceState') {
      if (!requireTeacher(ctx, true) || !['synced', 'missing', 'failed'].includes(p.status)) return fail('当前角色无法修改模拟来源状态。');
      const source = state.sources.find(s => s.stage === ctx.stage && s.id === p.id);
      if (!source) return fail('找不到当前学段的数据来源。'); source.status = p.status;
      return commit(name, p.status === 'synced' ? '模拟来源已恢复，可重试导入。' : p.status === 'failed' ? '已切换到模拟同步失败，原有资料继续保留。' : '已切换到模拟来源缺失，原有资料继续保留。');
    }
    if (['setClassPhase', 'recordClassroom', 'classFollowup', 'classGrowth'].includes(name)) {
      if (!['classroom', 'teacher'].includes(ctx.role)) return fail('课堂操作由教师执行。');
      if (name === 'setClassPhase') {
        if (!['prepare', 'first', 'discuss', 'second', 'exit'].includes(p.phase)) return fail('请选择有效的课堂环节。');
        if (['discuss', 'second', 'exit'].includes(p.phase) && !classroom.first) return fail('先录入一次独立作答，再进入讨论。');
        if (p.phase === 'exit' && !classroom.second) return fail('先录入再次作答，再完成出口反馈。');
        classroom.phase = p.phase; if (p.phase === 'exit') classroom.exitSubmitted = true;
        return commit(name, p.phase === 'exit' ? '出口反馈已收集，后续需要可以继续跟进。' : '已切换课堂环节。');
      }
      if (name === 'recordClassroom') {
        if (!['first', 'second'].includes(p.round)) return fail('请选择第一次或再次作答。');
        if (p.round === 'second' && !classroom.first) return fail('请先录入独立作答。');
        if (classroom[p.round]) return result(true, '这一轮合成结果已经录入，无需重复。');
        classroom[p.round] = ctx.stage === 'senior' ? (p.round === 'first' ? [10, 15, 7, 4] : [3, 27, 4, 2]) : (p.round === 'first' ? [8, 18, 6, 4] : [2, 29, 3, 2]); classroom.phase = p.round;
        return commit(name, '已录入 36 人的合成答题分布，大屏只展示班级汇总。');
      }
      if (!classroom.second) return fail('完成再次作答后，再安排跟进或保留成长记录。');
      const id = selfId(ctx);
      if (name === 'classFollowup') {
        const fixed = 'class-support-' + ctx.stage;
        if (state.supports.some(s => s.id === fixed)) return result(true, '这次课堂跟进已经建立，请到教师工作台查看。');
        state.supports.unshift({ id: fixed, studentId: id, title: ctx.stage === 'senior' ? '课后再谈一次分类依据' : '用新情境再解释一次图像', method: '课后面批，听学生完整解释，再用一道迁移题复看。', owner: '沈知夏老师', due: '2026-11-08', status: 'planned', progress: '来自课堂出口反馈，个人需要只在教师侧查看。', origin: 'learning', subject: '数学', note: '课堂演示的个人关联使用合成样本，未向大屏展示身份。' });
        return commit(name, '课后跟进已建立，教师工作台可以继续处理。');
      }
      const fixed = 'class-growth-' + ctx.stage;
      if (state.growth.some(g => g.id === fixed)) return result(true, '这次课堂成长记录已经提交复核。');
      state.growth.unshift({ id: fixed, studentId: id, title: '从同伴讨论中修订自己的解释', dimension: '学习好', category: '课堂表达', date: '2026-10-30', description: ctx.stage === 'senior' ? '讨论后补充参数条件，并比较解题路径的适用范围。' : '讨论后重新标出图像起点，用自己的话解释变化率。', before: '第一次独立作答时的解释尚不完整。', after: '听取同伴理由后，能够修订自己的解释。', role: '表达、倾听与修订', feedback: '等待任课教师结合课堂表现复核。', status: 'pending', published: false, authoredBy: 'classroom', shareFamily: true });
      return commit(name, '课堂成长已提交复核，确认后才进入家庭成长记录。');
    }
    if (name === 'professionalAction') {
      if (ctx.role !== 'counselor') return fail('请由专业老师研判后创建协作事项。');
      const professional = state.professional.find(r => r.stage === ctx.stage && r.studentId === selfId(ctx));
      const fixed = 'safe-professional-' + ctx.stage;
      if (!professional) return fail('当前学段没有待研判的合成案例。');
      if (state.supports.some(s => s.id === fixed)) return result(true, '安全协作事项已发出，无需重复。');
      state.supports.unshift({ id: fixed, studentId: selfId(ctx), title: '协助梳理一周安排，留出恢复时间', method: '请班主任与学生约一次简短交流，听取学生意愿，共同选择一项可调整的安排。', owner: '沈知夏老师（班主任）', due: '2026-11-04', status: 'planned', progress: '专业老师已研判，等待班主任确认行动。', origin: 'professional', note: '仅传递必要行动；专业原始反馈保留在受限工作入口。' }); professional.status = '协作已建立';
      return commit(name, '必要支持行动已交给班主任，原始专业记录仍保留在受限入口。');
    }
    if (['researchReview', 'researchResource'].includes(name)) {
      if (!['manager', 'teacher'].includes(ctx.role)) return fail('当前角色无法更新教研协作。');
      const item = state.research.find(r => r.id === p.id && r.stage === ctx.stage && (ctx.role !== 'teacher' || r.campus === teachingCampus(ctx)) && (ctx.role !== 'manager' || ctx.campus === 'all' || r.campus === ctx.campus));
      if (!item) return fail('找不到授权范围内的教研案例。');
      if (name === 'researchReview') { if (!validDate(p.date)) return fail('请选择有效的复看日期。'); item.reviewDate = p.date; item.status = '已安排复看'; }
      else { if (!clean(p.resource)) return fail('请记录需要协作的资源或方法。'); item.resource = clean(p.resource); }
      return commit(name, name === 'researchReview' ? '教研复看已安排。' : '资源协作已记录。');
    }
    if (name === 'saveGoal') { if (ctx.role !== 'student') return fail('成长目标由学生本人决定。'); if (!clean(p.text, 300)) return fail('写下一个具体、可尝试的下一步。'); state.goals[selfId(ctx)] = clean(p.text, 300); return commit(name, '下一步已保存，下周回来看看实际发生了什么。'); }
    if (name === 'setPref') { if (typeof p.motion === 'boolean') state.preferences.motion = p.motion; if (typeof p.sound === 'boolean') state.preferences.sound = p.sound; return commit(name, '使用偏好已保存。'); }
    return fail('暂不支持这个操作。');
  }
  global.Store = {
    get: () => clone(state), view, act, importRecords,
    adapters: { normalizeRecords },
    reset() { const revision = Number(state.revision) || 0; state = global.DemoData.createInitialState(); state.revision = revision; persist(); return result(true, '合成样本已恢复，所有角色回到演示起点。'); },
    subscribe(fn) { if (typeof fn !== 'function') return () => {}; listeners.add(fn); return () => listeners.delete(fn); },
    info: () => ({ storageAvailable, warning: persistenceWarning, key: KEY })
  };
})(typeof window !== 'undefined' ? window : globalThis);
