/* 厚外成长 · 只含合成演示资料。正式接入须使用服务端身份与授权。 */
(function (global) {
  'use strict';
  const dimensions = ['品德好', '学习好', '身心好', '气质好', '劳动好', '特长好'];
  const students = [
    { id: 'j1', name: '林予安', initial: '予', stage: 'junior', grade: '八年级', className: '八年级 2 班', campus: '香江路校区', focus: '把订正变成自己的方法', teacher: '沈知夏老师' },
    { id: 'j2', name: '许知行', initial: '知', stage: 'junior', grade: '八年级', className: '八年级 2 班', campus: '香江路校区', focus: '试着把思路说完整', teacher: '沈知夏老师' },
    { id: 'j3', name: '赵明溪', initial: '溪', stage: 'junior', grade: '八年级', className: '八年级 1 班', campus: '兴国路校区', focus: '每周留下一次自主复盘', teacher: '沈知夏老师' },
    { id: 's1', name: '陈书言', initial: '言', stage: 'senior', grade: '高二', className: '高二 3 班', campus: '兴国路校区', focus: '让解题路径可以被解释', teacher: '沈知夏老师' },
    { id: 's2', name: '周亦南', initial: '南', stage: 'senior', grade: '高二', className: '高二 3 班', campus: '兴国路校区', focus: '平衡学科投入与恢复时间', teacher: '沈知夏老师' },
    { id: 's3', name: '叶青禾', initial: '禾', stage: 'senior', grade: '高二', className: '高二 1 班', campus: '香江路校区', focus: '用作品检验发展兴趣', teacher: '沈知夏老师' }
  ];
  function record(id, studentId, values) {
    return Object.assign({ id, studentId, sourceId: id.toUpperCase(), source: '讯飞智慧作业（模拟）', type: 'homework', subject: '数学', date: '2026-10-28', title: '本周数学作业', knowledge: '一次函数图像与情境', question: '某水箱开始有水 20 升，每分钟均匀注水 3 升。写出水箱内水量 y 与时间 x 的关系式，并说明图像与纵轴交点的意义。', answer: 'y = 3x + 20；交点 (0,20) 表示开始时已有 20 升水。', studentAnswer: 'y = 3x；交点表示每分钟注水 3 升。', errorReason: '尚未区分起始量与变化率，需要结合情境再次解释。', score: 7, maxScore: 10, status: '待巩固', published: true }, values);
  }
  function recordsFor(student) {
    const senior = student.stage === 'senior';
    const base = senior ? { knowledge: '导数与函数单调性', question: '已知 f(x) = x³ − 3ax。分类讨论参数 a，求函数的单调区间，并解释分类的依据。', answer: 'f′(x)=3(x²−a)。a≤0 时在 R 上单调递增；a>0 时按 ±√a 划分增减区间。', studentAnswer: '令 f′(x)=0 得 x=±√a，再列符号表；没有先判断 a 是否大于 0。', errorReason: '计算基本完成，解题路径遗漏参数条件，需先说明分类依据。' } : {};
    return [
      record(student.id + '-h1', student.id, Object.assign({}, base, { date: '2026-10-20', title: senior ? '参数条件与导数符号' : '从情境理解一次函数', score: senior ? 6 : 6 })),
      record(student.id + '-h2', student.id, Object.assign({}, base, { date: '2026-10-26', title: senior ? '解题路径第二次检查' : '图像中的起点与变化率', score: senior ? 7 : 7 })),
      record(student.id + '-h3', student.id, Object.assign({}, base, { date: '2026-10-29', title: senior ? '分类讨论与路径修订' : '用自己的话解释图像', score: senior ? 9 : 9, status: '有进步', studentAnswer: senior ? '先分 a≤0 与 a>0，再判断导数符号；每一段都写出条件。' : 'y=3x+20，20 是开始的水量，3 是每分钟增加的量。' })),
      record(student.id + '-e1', student.id, Object.assign({}, base, { source: '校内考试系统（模拟）', type: 'exam', date: '2026-10-12', title: senior ? '高二数学阶段练习一' : '八年级数学阶段练习一', score: senior ? 76 : 72, maxScore: 100, status: '教师已解读' })),
      record(student.id + '-e2', student.id, Object.assign({}, base, { source: '校内考试系统（模拟）', type: 'exam', date: '2026-10-27', title: senior ? '高二数学阶段练习二' : '八年级数学阶段练习二', score: senior ? 83 : 81, maxScore: 100, status: '教师已解读' })),
      record(student.id + '-other', student.id, { source: '教师观察（模拟）', subject: senior ? '物理' : '语文', title: senior ? '实验报告：误差的解释' : '说明文二稿：解释更清楚了', knowledge: senior ? '实验误差与证据表达' : '说明顺序与材料组织', question: senior ? '比较两次实验测量，说明误差可能来自哪里。' : '修改校园植物介绍，让读者知道观察依据。', answer: '结合具体材料说明判断依据。', studentAnswer: '补充了观察记录，并重新组织表达。', errorReason: '需要继续练习让结论有具体依据。', score: 8, maxScore: 10, status: '教师已反馈', date: '2026-10-29', published: false })
    ];
  }
  function createInitialState() {
    const allRecords = students.flatMap(recordsFor);
    const growth = students.flatMap(s => {
      const senior = s.stage === 'senior';
      return [
        { id: s.id + '-g1', studentId: s.id, title: senior ? '把“会算”推进到“会解释”' : '订正之后，试着讲给同伴听', dimension: '学习好', category: '学习好', date: '2026-10-29', description: senior ? '修改导数题解法，先写参数范围，再写符号表，并比较两条解题路径。' : '把水箱问题画成图，区分“原来有多少”和“每分钟增加多少”。', before: senior ? '直接求驻点，没有先检查参数条件。' : '把起始量和变化率混在一起。', after: senior ? '能解释为什么分类，也能说明每种条件下的适用区间。' : '先画出起点，再解释图像为什么向上走。', role: '整理思路并讲解', feedback: senior ? '解法更完整了，下次试着比较图像法与符号表法的边界。' : '这次开始主动解释解题思路，继续保留画图的方法。', status: 'confirmed', published: true, authoredBy: 'teacher', shareFamily: true },
        { id: s.id + '-g2', studentId: s.id, title: senior ? '社区步道调查：让建议有依据' : '校园劳动：照料一小片花圃', dimension: senior ? '品德好' : '劳动好', category: senior ? '社会实践' : '劳动实践', date: '2026-10-24', description: senior ? '与同伴采访使用者，记录步道夜间照明情况，形成改进建议。' : '和小组一起记录土壤湿度，安排浇水，并照顾临时缺席同学的任务。', before: senior ? '只有“增加路灯”的想法。' : '按固定次数浇水，没有观察土壤。', after: senior ? '建议中写出调查时段、观察位置与可行改进。' : '根据土壤状态调整照料方式。', role: senior ? '整理访谈与观察记录' : '负责观察和轮值协调', feedback: '能把自己的任务和小组的需要联系起来。', status: 'confirmed', published: true, authoredBy: 'teacher', shareFamily: true },
        { id: s.id + '-g3', studentId: s.id, title: senior ? '我的学科投入地图' : '运动之后，我更能进入学习', dimension: senior ? '特长好' : '身心好', category: senior ? '发展探索' : '运动', date: '2026-10-30', description: senior ? '比较数学建模与物理实验的投入体验，准备选择一次兴趣实践。' : '连续两周尝试课后慢跑，记录进入晚间阅读时的感受。', before: '先试着观察自己的状态。', after: '准备和老师交流下一步安排。', role: '自主尝试与记录', feedback: '等待教师结合实际表现确认。', status: 'pending', published: false, authoredBy: 'student', shareFamily: false }
      ];
    });
    return {
      schemaVersion: 1, revision: 0, updatedAt: '2026-10-30T08:00:00+08:00', students: JSON.parse(JSON.stringify(students)), records: allRecords,
      supports: students.map(s => ({ id: s.id + '-support', studentId: s.id, title: s.stage === 'senior' ? '让分类讨论的第一步更稳定' : '从图像读懂起始量', method: s.stage === 'senior' ? '面批时比较两种解题路径，先说条件再计算。' : '用一张情境卡练习“起点—变化—解释”。', owner: '沈知夏老师', due: '2026-11-03', status: 'planned', progress: '已发现重复表现，等待一次针对练习后的反馈。', origin: 'learning', subject: '数学', note: '结合题目进一步了解思路，不把一次表现当成固定能力。' })),
      reports: students.map(s => ({ id: s.id + '-report', studentId: s.id, status: 'draft', subject: '综合', summary: s.stage === 'senior' ? '这周开始主动检查参数条件，解题路径比前一次完整。下一步继续比较方法的适用条件。' : '这周能用图像解释起始量，订正时也开始说出自己的思路。还需要在新情境中再练一次。', schoolAction: '数学老师已安排一次面批，下周二用一道新情境题复看。', familyAction: s.stage === 'senior' ? '听孩子解释一次方法选择，帮助留出自主安排与休息的时间。' : '周末请孩子用自己的话讲一道题，听完再问“你是怎样想到的”。', studentAction: s.stage === 'senior' ? '先写适用条件，再比较两条解题路径。' : '先画起点，再说变化，最后检查是否符合情境。', date: '2026-10-30', generatedBy: '模拟系统草稿', confirmedAt: null, publishedAt: null })),
      reflections: [
        { id: 'j1-private', studentId: 'j1', text: '我想先试试周末自己安排订正时间，暂时只写给自己。', status: 'draft', shareFamily: false, teacher: '沈知夏老师（数学）' },
        { id: 'j1-submitted', studentId: 'j1', text: '我先画出水箱开始的水量，再标每分钟增加的量，比只背公式容易理解。下次会先解释再计算。', status: 'submitted', shareFamily: true, teacher: '沈知夏老师（数学）' },
        { id: 's1-private', studentId: 's1', text: '我想调整自己的物理与数学投入，先观察一周再决定。', status: 'draft', shareFamily: false, teacher: '沈知夏老师（数学）' },
        { id: 's1-submitted', studentId: 's1', text: '原来我先解方程再看条件，现在先分 a≤0 和 a>0，再用导数符号判断。我还想试试用图像解释分类的必要。', status: 'submitted', shareFamily: true, teacher: '沈知夏老师（数学）' }
      ],
      growth,
      classrooms: {
        junior: { phase: 'prepare', first: null, second: null, question: '水箱原有 20 升水，每分钟增加 3 升。哪一项能正确解释 y = 3x + 20？', options: ['20 表示每分钟增加的量', '20 表示起始量，3 表示变化率', '3 表示开始时的水量', 'x 是水箱的总容量'], answer: 1, knowledge: '一次函数图像与情境', notes: '先独立作答，再用图像向同伴解释；再次作答后收一张出口卡。', exitSubmitted: false },
        senior: { phase: 'prepare', first: null, second: null, question: 'f(x)=x³−3ax，判断单调性之前，为什么要先讨论参数 a？', options: ['只要解 f′(x)=0 就够了', '驻点是否存在取决于 a 的范围', '所有 a 都有两个驻点', '函数与参数没有关系'], answer: 1, knowledge: '导数与函数单调性', notes: '先检查条件，再比较符号表与图像两条路径；讨论方法的适用范围。', exitSubmitted: false }
      },
      professional: [
        { id: 'p-j1', studentId: 'j1', stage: 'junior', title: '适应与作息：一次支持性会谈', studentName: '林予安', summary: '合成案例：学生主动提到近期节奏变化，希望一起调整晚间安排。先了解情境，再协商小步行动。', observations: ['模拟量表：近期压力体验 6 / 10，仅供专业研判。', '模拟原始反馈：晚间任务挤在一起时，容易推迟休息。', '模拟咨询记录：学生同意由班主任协助梳理一周安排，不向普通成长页传递原始记录。'], status: '待研判' },
        { id: 'p-s1', studentId: 's1', stage: 'senior', title: '学科投入与恢复时间：支持会谈', studentName: '陈书言', summary: '合成案例：学生希望在学科投入、自主选择与恢复时间之间找到更可持续的安排。', observations: ['模拟量表：近期压力体验 5 / 10，仅供专业研判。', '模拟原始反馈：集中练习后需要更明确的休息边界。', '模拟咨询记录：已讨论可行的时间安排，希望班主任提供一次选择空间。'], status: '待研判' }
      ],
      research: students.filter(s => ['j1', 'j3', 's1', 's3'].includes(s.id)).map(s => ({ id: 'r-' + s.id, stage: s.stage, campus: s.campus, title: s.stage === 'senior' ? '先讲条件，再比较解题路径' : '从“对答案”走向“解释图像”', question: s.stage === 'senior' ? '学生能计算导数，为何仍遗漏参数条件？' : '学生订正正确后，为何换一种情境仍会混淆起始量？', method: s.stage === 'senior' ? '增加条件检查卡，让学生并列比较符号表与图像法。' : '先收集独立解释，再同伴讨论，最后用新情境复看。', conditions: '同一任课教师、相邻教学周；题目难度与学生参与情况需一并参考。', coverage: ['j1', 's1'].includes(s.id) ? 36 : 32, before: s.stage === 'senior' ? 42 : 50, after: s.stage === 'senior' ? 75 : 81, status: '观察中', reviewDate: '2026-11-06', resource: '条件检查卡 · 课堂出口卡（模拟资源）', subject: '数学' })),
      sources: ['junior', 'senior'].flatMap(stage => [
        { id: 'iflytek', stage, name: '讯飞作业反馈', status: 'synced', lastSync: '2026-10-30 08:10', count: allRecords.filter(r => r.type === 'homework' && r.subject === '数学' && r.studentId.startsWith(stage === 'junior' ? 'j' : 's')).length },
        { id: 'exam', stage, name: '考试分析', status: 'synced', lastSync: '2026-10-30 08:12', count: 6 },
        { id: 'growth', stage, name: '成长记录', status: 'synced', lastSync: '2026-10-30 08:15', count: 9 },
        { id: 'psychology', stage, name: '专业支持协作', status: 'synced', lastSync: '2026-10-30 08:16', count: 1 }
      ]),
      goals: { j1: '遇到新情境时，先画图再解释起始量。', s1: '每次解题先说明适用条件，再选择方法。' },
      preferences: { motion: true, sound: false },
      workloads: students.map(s => ({ studentId: s.id, before: s.stage === 'senior' ? 26 : 24, after: s.stage === 'senior' ? 18 : 16 })),
      audit: [], importKeys: []
    };
  }
  global.DemoData = { createInitialState, dimensions, version: 1 };
})(typeof window !== 'undefined' ? window : globalThis);
