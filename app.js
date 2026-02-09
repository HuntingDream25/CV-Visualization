const resumeInput = document.getElementById("resumeInput");
const generateBtn = document.getElementById("generateBtn");
const timeline = document.getElementById("timeline");
const summaryList = document.getElementById("summaryList");
const radar = document.getElementById("radar");
const skillBars = document.getElementById("skillBars");
const suggestion = document.getElementById("suggestion");
const logoWall = document.getElementById("logoWall");

const DEFAULT_INPUT = `Education: 2017-2021 Tsinghua University Computer Science\nWork: 2021-2023 ByteDance Frontend Engineer, led a visualization platform\nSkills: JavaScript, React, D3.js, Data Analysis, Collaboration`;

resumeInput.value = DEFAULT_INPUT;

const KEYWORDS = {
  education: ["教育", "学历", "education"],
  work: ["工作", "经历", "experience"],
  skills: ["技能", "skill"],
};

const pickSection = (line) => {
  const lower = line.toLowerCase();
  if (KEYWORDS.education.some((key) => lower.includes(key))) return "education";
  if (KEYWORDS.work.some((key) => lower.includes(key))) return "work";
  if (KEYWORDS.skills.some((key) => lower.includes(key))) return "skills";
  return null;
};

const parseLines = (text) => {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const result = { education: [], work: [], skills: [] };
  let current = null;

  lines.forEach((line) => {
    const section = pickSection(line);
    if (section) {
      current = section;
      const cleaned = line.replace(/^[^：:]+[：:]/, "").trim();
      if (cleaned) {
        if (section === "skills") {
          result.skills.push(...splitSkills(cleaned));
        } else {
          result[section].push(cleaned);
        }
      }
    } else if (current) {
      if (current === "skills") {
        result.skills.push(...splitSkills(line));
      } else {
        result[current].push(line);
      }
    }
  });

  return result;
};

const splitSkills = (line) =>
  line
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);

const LOGO_DOMAIN_MAP = new Map([
  ["Tsinghua University", "tsinghua.edu.cn"],
  ["Peking University", "pku.edu.cn"],
  ["Fudan University", "fudan.edu.cn"],
  ["Shanghai Jiao Tong University", "sjtu.edu.cn"],
  ["Zhejiang University", "zju.edu.cn"],
  ["ByteDance", "bytedance.com"],
  ["Tencent", "tencent.com"],
  ["Alibaba", "alibaba.com"],
  ["Baidu", "baidu.com"],
  ["Meituan", "meituan.com"],
  ["Huawei", "huawei.com"],
  ["微软", "microsoft.com"],
  ["谷歌", "google.com"],
  ["Google", "google.com"],
  ["Microsoft", "microsoft.com"],
]);

const extractOrgName = (text) => {
  const cleaned = text
    .replace(/(\d{4}\s*[-~—–]\s*\d{4}|\d{4}\s*[-~—–]\s*至今|\d{4})/g, "")
    .replace(/[，,。]/g, " ")
    .trim();
  if (!cleaned) return null;
  const [firstPart] = cleaned.split(/\s+/);
  return firstPart || null;
};

const resolveLogoUrl = (orgName) => {
  if (!orgName) return null;
  const domain = LOGO_DOMAIN_MAP.get(orgName);
  if (domain) return `https://logo.clearbit.com/${domain}`;
  return `https://logo.clearbit.com/${orgName}.com`;
};

const SKILL_SCORE_PATTERNS = [
  /^(?<name>[^():]+)[(（](?<score>\d{1,3})[)）]$/,
  /^(?<name>[^:：]+)[:：](?<score>\d{1,3})$/,
  /^(?<name>.+?)\s+(?<score>\d{1,3})$/,
];

const parseSkillEntry = (entry) => {
  for (const pattern of SKILL_SCORE_PATTERNS) {
    const match = entry.match(pattern);
    if (match?.groups) {
      return {
        name: match.groups.name.trim(),
        score: Number(match.groups.score),
      };
    }
  }
  return { name: entry, score: null };
};

const clampScore = (score) => Math.max(30, Math.min(100, score));

const countMatches = (text, terms) =>
  terms.reduce((acc, term) => acc + (text.includes(term) ? 1 : 0), 0);

const estimateSkillScore = (skill, context) => {
  const lowerContext = context.toLowerCase();
  const lowerSkill = skill.toLowerCase();
  const base = 52;
  const mentionBoost = lowerContext.includes(lowerSkill) ? 10 : 0;
  const proficiencyBoost =
    countMatches(context, ["精通", "熟练", "expert", "advanced"]) * 8 +
    countMatches(context, ["熟悉", "掌握", "proficient", "intermediate"]) * 5 +
    countMatches(context, ["了解", "basic", "entry"]) * 2;
  const leadershipBoost = countMatches(context, ["负责人", "主导", "lead", "owner"]) * 4;
  const yearMatch = context.match(/(\d+)\s*年/);
  const yearBoost = yearMatch ? Math.min(Number(yearMatch[1]) * 2, 12) : 0;

  return clampScore(base + mentionBoost + proficiencyBoost + leadershipBoost + yearBoost);
};

const buildTimelineItem = (text, type) => {
  const match = text.match(/(\d{4}\s*[-~—–]\s*\d{4}|\d{4}\s*[-~—–]\s*至今|\d{4})/);
  const period = match ? match[0].replace(/\s+/g, " ") : "Unknown period";
  const detail = match ? text.replace(match[0], "").trim() : text;
  const titlePrefix = type === "education" ? "Education" : "Work";

  return {
    period,
    title: detail || `${titlePrefix}经历`,
    type,
  };
};

const buildSkillScores = (skills, contextText) => {
  const entries = skills.map((skill) => parseSkillEntry(skill));
  const uniqueMap = new Map();
  entries.forEach((entry) => {
    if (!uniqueMap.has(entry.name)) {
      uniqueMap.set(entry.name, entry);
    }
  });

  const uniqueEntries = Array.from(uniqueMap.values()).slice(0, 6);
  return uniqueEntries.map((entry) => ({
    name: entry.name,
    score: clampScore(
      entry.score ?? estimateSkillScore(entry.name, contextText)
    ),
  }));
};

const renderTimeline = (data) => {
  timeline.innerHTML = "";
  const items = [
    ...data.education.map((item) => buildTimelineItem(item, "education")),
    ...data.work.map((item) => buildTimelineItem(item, "work")),
  ];

  if (!items.length) {
    timeline.innerHTML = '<p class="subtitle">No timeline data yet.</p>';
    return;
  }

  items.forEach((item) => {
    const block = document.createElement("div");
    block.className = "timeline-item";
    block.innerHTML = `
      <span>${item.period}</span>
      <strong>${item.title}</strong>
    `;
    timeline.appendChild(block);
  });
};

const renderSummary = (data) => {
  summaryList.innerHTML = "";
  const points = [];

  if (data.education.length) {
    points.push(`Education entries: ${data.education.length}. Highlight: ${data.education[0]}`);
  }
  if (data.work.length) {
    points.push(`Work entries: ${data.work.length}. Latest: ${data.work[0]}`);
  }
  if (data.skills.length) {
    points.push(`Skills detected: ${data.skills.length}. Focus: ${data.skills.slice(0, 3).join(", ")}`);
  }

  if (!points.length) {
    points.push("Add education, work, and skills to generate highlights.");
  }

  points.forEach((point) => {
    const li = document.createElement("li");
    li.textContent = point;
    summaryList.appendChild(li);
  });
};

const renderRadar = (skills) => {
  radar.innerHTML = "";
  const size = 130;
  const center = { x: size, y: size };
  const radius = 90;
  const axes = skills.length || 5;

  for (let ring = 1; ring <= 4; ring += 1) {
    const r = (radius / 4) * ring;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", center.x);
    circle.setAttribute("cy", center.y);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", ring % 2 === 0 ? "#f3f6ff" : "#ffffff");
    circle.setAttribute("stroke", "#d9e2ff");
    radar.appendChild(circle);
  }

  const points = skills.map((skill, index) => {
    const angle = (Math.PI * 2 * index) / axes - Math.PI / 2;
    const value = (skill.score / 100) * radius;
    return {
      x: center.x + value * Math.cos(angle),
      y: center.y + value * Math.sin(angle),
      labelX: center.x + (radius + 18) * Math.cos(angle),
      labelY: center.y + (radius + 18) * Math.sin(angle),
      label: skill.name,
    };
  });

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute(
    "points",
    points.map((point) => `${point.x},${point.y}`).join(" ")
  );
  polygon.setAttribute("fill", "rgba(47, 91, 255, 0.3)");
  polygon.setAttribute("stroke", "#2f5bff");
  polygon.setAttribute("stroke-width", "2");
  radar.appendChild(polygon);

  points.forEach((point, index) => {
    const axis = document.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("x1", center.x);
    axis.setAttribute("y1", center.y);
    axis.setAttribute("x2", point.x);
    axis.setAttribute("y2", point.y);
    axis.setAttribute("stroke", "#d9e2ff");
    radar.appendChild(axis);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", point.labelX);
    label.setAttribute("y", point.labelY);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "#516080");
    label.textContent = skills[index].name;
    radar.appendChild(label);
  });
};

const renderSkillBars = (skills) => {
  skillBars.innerHTML = "";

  if (!skills.length) {
    skillBars.innerHTML = '<p class="subtitle">No skill data yet.</p>';
    return;
  }

  skills.forEach((skill) => {
    const wrapper = document.createElement("div");
    wrapper.className = "skill-bar";
    wrapper.innerHTML = `
      <span>${skill.name}</span>
      <div class="skill-track">
        <div class="skill-fill" style="width: ${skill.score}%"></div>
      </div>
    `;
    skillBars.appendChild(wrapper);
  });
};

const renderLogoWall = (data) => {
  logoWall.innerHTML = "";
  const orgs = [
    ...data.education.map((item) => ({
      type: "Education",
      name: extractOrgName(item),
    })),
    ...data.work.map((item) => ({
      type: "Work",
      name: extractOrgName(item),
    })),
  ].filter((entry) => entry.name);

  if (!orgs.length) {
    logoWall.innerHTML = '<p class="subtitle">No logos available yet.</p>';
    return;
  }

  orgs.forEach((org) => {
    const card = document.createElement("div");
    card.className = "logo-card";
    const logoUrl = resolveLogoUrl(org.name);
    card.innerHTML = `
      <img src="${logoUrl}" alt="${org.name} logo" loading="lazy" />
      <div>
        <strong>${org.name}</strong>
        <span>${org.type}</span>
      </div>
    `;
    logoWall.appendChild(card);
  });
};

const renderSuggestion = (data) => {
  const suggestions = [];

  if (!data.work.length) {
    suggestions.push("Add more work detail to highlight project impact.");
  }
  if (data.skills.length < 4) {
    suggestions.push("Consider adding more tools or soft skills.");
  }
  if (data.education.length) {
    suggestions.push("Add achievements or focus areas to strengthen education highlights.");
  }

  if (!suggestions.length) {
    suggestions.push("Resume looks complete. Emphasize quantified impact and key tech stack.");
  }

  suggestion.innerHTML = `<p>${suggestions.join(" ")}</p>`;
};

const renderAll = () => {
  const data = parseLines(resumeInput.value);
  renderTimeline(data);
  renderSummary(data);
  const contextText = [
    ...data.education,
    ...data.work,
    resumeInput.value,
  ].join(" ");
  const skillScores = buildSkillScores(data.skills, contextText);
  renderRadar(
    skillScores.length
      ? skillScores
      : buildSkillScores(["Communication(65)", "Collaboration(70)", "Leadership(68)"], contextText)
  );
  renderSkillBars(skillScores);
  renderLogoWall(data);
  renderSuggestion(data);
};

generateBtn.addEventListener("click", renderAll);

renderAll();
