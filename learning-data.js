/* 智慧学习 V0.1：合成教学安排。源题只保存原 Store recordId，不另建成长事实。 */
(function (global) {
  'use strict';
  const cycle = { start: '2026-11-02', end: '2026-11-08', label: '11月2日—11月8日' };
  const timeSteps = [
    { id: 'import', label: '资料导入' }, { id: 'review', label: '资料复核' },
    { id: 'teaching', label: '讲评准备' }, { id: 'support', label: '个别支持' },
    { id: 'communication', label: '家校沟通' }, { id: 'paper', label: '纸笔回填' }
  ];
  function createCase(student) {
    const senior = student.stage === 'senior';
    return {
      id: 'learning-' + student.id + '-20261102', studentId: student.id, stage: student.stage,
      campus: student.campus, version: 1, updatedAt: '2026-11-05T09:00:00+08:00',
      goals: senior ? ['先判断参数条件，再说明解题路径的适用范围。', '换一道题，试着独立完成分类讨论。'] : ['区分情境中的起始量和变化率，并说出理由。', '换一个情境，先解释数量关系，再写表达式。'],
      source: { recordId: student.id + '-h2', confirmed: false, teacherNote: '' },
      correction: { text: '', status: 'draft', shareFamily: false, feedback: '' },
      teaching: { topic: senior ? '先检查条件，再比较解题路径' : '从情境理解起始量与变化率', method: '独立解释—同伴讨论—再次表达', note: '', status: 'draft' },
      support: null,
      retry: {
        question: senior ? '已知 g(x)=x³−3x²+kx。按参数 k 讨论函数的单调区间，并说明为什么先判断 k 与 3 的大小。' : '某研学活动租用器材，固定服务费 12 元，每小时 6 元。设使用 x 小时，总费用为 y 元。写出 y 与 x 的关系式，并解释图像与纵轴交点的实际意义。',
        answerKey: senior ? 'g′(x)=3(x−1)²+k−3。k≥3 时在 R 上单调递增；k<3 时，令 r=√(1−k/3)，在 (−∞,1−r)、(1+r,+∞) 上递增，在 (1−r,1+r) 上递减。先判断 k 与 3 的大小，才能判断驻点与导数符号。' : 'y=6x+12；图像与纵轴交点为 (0,12)，表示固定服务费 12 元；6 表示每小时费用。实际情境取 x≥0。',
        answer: '', explanation: '', status: 'pending', outcome: null, feedback: '',
        reviewDate: '2026-11-08', estimatedMinutes: senior ? 12 : 10
      },
      workload: [
        { id: 'math-homework', subject: '数学', title: senior ? '参数条件与解题路径练习' : '情境中的数量关系练习', minutes: senior ? 25 : 18, due: '2026-11-06', kind: 'homework', note: '教学安排示例，非实际测得耗时。' },
        { id: 'chinese-homework', subject: '语文', title: '阅读与表达修改', minutes: senior ? 22 : 20, due: '2026-11-06', kind: 'homework', note: '教学安排示例，可结合学生实际节奏调整。' },
        { id: 'english-homework', subject: '英语', title: '阅读后的简短表达', minutes: senior ? 20 : 15, due: '2026-11-06', kind: 'homework', note: '教学安排示例，避免同一天任务过于集中。' },
        { id: 'science-homework', subject: '物理', title: senior ? '实验结果与误差解释' : '观察现象并解释原因', minutes: senior ? 25 : 15, due: '2026-11-07', kind: 'homework', note: '教学安排示例，不新增统一考试。' },
        { id: 'math-review', subject: '数学', title: '换一个情境独立试一试', minutes: senior ? 12 : 10, due: '2026-11-08', kind: 'review', note: '先独立尝试，再与老师复看。' }
      ],
      helpRequests: [],
      schoolAction: '老师听取一次完整解释，再用新情境了解能否独立运用。',
      familyAction: '请听孩子讲一次思路，留出自主安排和休息的时间；遇到困难可以告诉老师。',
      studentAction: senior ? '先写参数范围，再选择方法，完成后解释为什么这样分类。' : '先说起始量，再说怎样变化，写完后回到情境检查。',
      publication: { status: 'draft', version: 1, publishedAt: null },
      snapshots: [], history: []
    };
  }
  function roster() {
    if (!global.Store) return [];
    return ['junior', 'senior'].flatMap(stage => global.Store.view({ role: 'teacher', stage, teacherKind: 'head' }).students || []);
  }
  function createInitialState() {
    const students = roster(), teacherWork = {};
    students.forEach(student => {
      const key = classKey(student);
      if (!teacherWork[key]) teacherWork[key] = { key, stage: student.stage, campus: student.campus, className: student.className, recordedAt: null, items: timeSteps.map(item => ({ id: item.id, label: item.label, minutes: 0 })) };
    });
    return { schemaVersion: 1, revision: 0, updatedAt: '2026-11-05T09:00:00+08:00', cases: Object.fromEntries(students.map(student => [student.id, createCase(student)])), teacherWork, audit: [] };
  }
  function classKey(student) { return [student.stage, student.campus, student.className].join('|'); }
  global.LearningData = { cycle, timeSteps, classKey, createCase, roster, createInitialState };
})(typeof window !== 'undefined' ? window : globalThis);
