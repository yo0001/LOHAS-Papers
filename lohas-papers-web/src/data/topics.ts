export interface Topic {
  slug: string;
  query_en: string;
  title_ja: string;
  title_en: string;
  description_ja: string;
  description_en: string;
  category: string;
}

export const TOPIC_CATEGORIES = [
  "cardiology",
  "endocrinology",
  "oncology",
  "neurology",
  "pulmonology",
  "psychiatry",
  "infectious-disease",
  "gastroenterology",
  "nephrology",
  "rheumatology",
] as const;

export const CATEGORY_LABELS: Record<string, { ja: string; en: string }> = {
  cardiology: { ja: "循環器", en: "Cardiology" },
  endocrinology: { ja: "内分泌・代謝", en: "Endocrinology" },
  oncology: { ja: "腫瘍学", en: "Oncology" },
  neurology: { ja: "神経学", en: "Neurology" },
  pulmonology: { ja: "呼吸器", en: "Pulmonology" },
  psychiatry: { ja: "精神科", en: "Psychiatry" },
  "infectious-disease": { ja: "感染症", en: "Infectious Disease" },
  gastroenterology: { ja: "消化器", en: "Gastroenterology" },
  nephrology: { ja: "腎臓", en: "Nephrology" },
  rheumatology: { ja: "リウマチ", en: "Rheumatology" },
};

export const TOPICS: Topic[] = [
  // Cardiology
  {
    slug: "heart-failure-treatment",
    query_en: "heart failure treatment 2024 2025",
    title_ja: "心不全の最新治療",
    title_en: "Latest Heart Failure Treatment",
    description_ja: "心不全の薬物療法・デバイス治療に関する最新エビデンスをAIが要約",
    description_en: "AI-summarized latest evidence on heart failure pharmacotherapy and device therapy",
    category: "cardiology",
  },
  {
    slug: "atrial-fibrillation-management",
    query_en: "atrial fibrillation management anticoagulation",
    title_ja: "心房細動の管理と抗凝固療法",
    title_en: "Atrial Fibrillation Management",
    description_ja: "心房細動の最新ガイドラインと抗凝固療法のエビデンス",
    description_en: "Latest guidelines and evidence on atrial fibrillation and anticoagulation",
    category: "cardiology",
  },
  {
    slug: "hypertension-guidelines",
    query_en: "hypertension treatment guidelines 2024",
    title_ja: "高血圧治療ガイドライン",
    title_en: "Hypertension Treatment Guidelines",
    description_ja: "高血圧治療の最新ガイドラインと降圧薬選択のエビデンス",
    description_en: "Latest hypertension treatment guidelines and evidence for antihypertensive selection",
    category: "cardiology",
  },

  // Endocrinology
  {
    slug: "diabetes-treatment",
    query_en: "type 2 diabetes treatment GLP-1 SGLT2",
    title_ja: "2型糖尿病の最新治療",
    title_en: "Type 2 Diabetes Treatment",
    description_ja: "GLP-1受容体作動薬・SGLT2阻害薬を含む糖尿病治療の最新エビデンス",
    description_en: "Latest evidence on diabetes treatment including GLP-1 and SGLT2 inhibitors",
    category: "endocrinology",
  },
  {
    slug: "obesity-pharmacotherapy",
    query_en: "obesity pharmacotherapy semaglutide tirzepatide",
    title_ja: "肥満症の薬物療法",
    title_en: "Obesity Pharmacotherapy",
    description_ja: "セマグルチド・チルゼパチドなど肥満症治療薬の最新知見",
    description_en: "Latest findings on obesity medications including semaglutide and tirzepatide",
    category: "endocrinology",
  },
  {
    slug: "thyroid-disorders",
    query_en: "thyroid disorders diagnosis treatment",
    title_ja: "甲状腺疾患の診断と治療",
    title_en: "Thyroid Disorders",
    description_ja: "甲状腺機能異常の診断・治療に関する最新エビデンス",
    description_en: "Latest evidence on diagnosis and treatment of thyroid disorders",
    category: "endocrinology",
  },

  // Oncology
  {
    slug: "immunotherapy-cancer",
    query_en: "cancer immunotherapy checkpoint inhibitor",
    title_ja: "がん免疫療法",
    title_en: "Cancer Immunotherapy",
    description_ja: "免疫チェックポイント阻害薬を中心としたがん免疫療法の最前線",
    description_en: "Frontline cancer immunotherapy focused on immune checkpoint inhibitors",
    category: "oncology",
  },
  {
    slug: "lung-cancer-treatment",
    query_en: "lung cancer targeted therapy immunotherapy",
    title_ja: "肺がんの分子標的・免疫療法",
    title_en: "Lung Cancer Treatment",
    description_ja: "肺がんにおける分子標的薬と免疫療法の最新エビデンス",
    description_en: "Latest evidence on targeted therapy and immunotherapy in lung cancer",
    category: "oncology",
  },
  {
    slug: "breast-cancer-screening",
    query_en: "breast cancer screening early detection",
    title_ja: "乳がんスクリーニング",
    title_en: "Breast Cancer Screening",
    description_ja: "乳がん検診・早期発見に関する最新のガイドラインとエビデンス",
    description_en: "Latest guidelines and evidence on breast cancer screening and early detection",
    category: "oncology",
  },

  // Neurology
  {
    slug: "alzheimer-disease-treatment",
    query_en: "Alzheimer disease treatment amyloid antibody",
    title_ja: "アルツハイマー病の治療",
    title_en: "Alzheimer's Disease Treatment",
    description_ja: "アミロイド抗体療法を含むアルツハイマー病治療の最新動向",
    description_en: "Latest developments in Alzheimer's treatment including amyloid antibody therapy",
    category: "neurology",
  },
  {
    slug: "stroke-prevention",
    query_en: "stroke prevention management acute",
    title_ja: "脳卒中の予防と急性期管理",
    title_en: "Stroke Prevention & Management",
    description_ja: "脳卒中の一次予防・二次予防と急性期治療のエビデンス",
    description_en: "Evidence on primary/secondary stroke prevention and acute management",
    category: "neurology",
  },
  {
    slug: "migraine-treatment",
    query_en: "migraine treatment CGRP prevention",
    title_ja: "片頭痛の最新治療",
    title_en: "Migraine Treatment",
    description_ja: "CGRP関連薬を含む片頭痛治療の最新エビデンス",
    description_en: "Latest evidence on migraine treatment including CGRP-related medications",
    category: "neurology",
  },

  // Pulmonology
  {
    slug: "copd-management",
    query_en: "COPD management treatment exacerbation",
    title_ja: "COPDの管理と治療",
    title_en: "COPD Management",
    description_ja: "COPD（慢性閉塞性肺疾患）の最新治療ガイドラインと増悪予防",
    description_en: "Latest COPD treatment guidelines and exacerbation prevention",
    category: "pulmonology",
  },
  {
    slug: "asthma-biologics",
    query_en: "asthma biologic therapy severe",
    title_ja: "重症喘息の生物学的製剤",
    title_en: "Asthma Biologics",
    description_ja: "重症喘息に対する生物学的製剤の最新エビデンスと使い分け",
    description_en: "Latest evidence on biologics for severe asthma and their selection",
    category: "pulmonology",
  },
  {
    slug: "sleep-apnea",
    query_en: "obstructive sleep apnea treatment CPAP",
    title_ja: "睡眠時無呼吸症候群",
    title_en: "Sleep Apnea Treatment",
    description_ja: "閉塞性睡眠時無呼吸症候群の診断・CPAP治療の最新知見",
    description_en: "Latest findings on OSA diagnosis and CPAP treatment",
    category: "pulmonology",
  },

  // Psychiatry
  {
    slug: "depression-treatment",
    query_en: "major depression treatment antidepressant",
    title_ja: "うつ病の治療",
    title_en: "Depression Treatment",
    description_ja: "うつ病の薬物療法・心理療法の最新エビデンスとガイドライン",
    description_en: "Latest evidence and guidelines on depression pharmacotherapy and psychotherapy",
    category: "psychiatry",
  },
  {
    slug: "adhd-management",
    query_en: "ADHD treatment adult management",
    title_ja: "ADHDの治療と管理",
    title_en: "ADHD Management",
    description_ja: "成人ADHDの診断・薬物療法・非薬物療法の最新エビデンス",
    description_en: "Latest evidence on adult ADHD diagnosis and pharmacological/non-pharmacological treatment",
    category: "psychiatry",
  },
  {
    slug: "bipolar-disorder",
    query_en: "bipolar disorder treatment mood stabilizer",
    title_ja: "双極性障害の治療",
    title_en: "Bipolar Disorder Treatment",
    description_ja: "双極性障害の気分安定薬・最新治療アプローチ",
    description_en: "Mood stabilizers and latest treatment approaches for bipolar disorder",
    category: "psychiatry",
  },

  // Infectious Disease
  {
    slug: "antimicrobial-resistance",
    query_en: "antimicrobial resistance stewardship",
    title_ja: "薬剤耐性と抗菌薬適正使用",
    title_en: "Antimicrobial Resistance",
    description_ja: "薬剤耐性菌の現状と抗菌薬スチュワードシップの最新動向",
    description_en: "Current status of AMR and latest trends in antimicrobial stewardship",
    category: "infectious-disease",
  },
  {
    slug: "covid-long-term",
    query_en: "long COVID post-acute sequelae treatment",
    title_ja: "Long COVIDと後遺症",
    title_en: "Long COVID & Post-Acute Sequelae",
    description_ja: "COVID-19後遺症（Long COVID）の病態・治療に関する最新研究",
    description_en: "Latest research on Long COVID pathophysiology and treatment",
    category: "infectious-disease",
  },

  // Gastroenterology
  {
    slug: "inflammatory-bowel-disease",
    query_en: "inflammatory bowel disease treatment biologic",
    title_ja: "炎症性腸疾患の治療",
    title_en: "Inflammatory Bowel Disease",
    description_ja: "クローン病・潰瘍性大腸炎の生物学的製剤を含む最新治療",
    description_en: "Latest treatments for Crohn's disease and ulcerative colitis including biologics",
    category: "gastroenterology",
  },
  {
    slug: "liver-disease-nafld",
    query_en: "NAFLD MASLD treatment fatty liver",
    title_ja: "脂肪性肝疾患（MASLD）",
    title_en: "Fatty Liver Disease (MASLD)",
    description_ja: "NAFLD/MASLDの診断・治療に関する最新エビデンス",
    description_en: "Latest evidence on NAFLD/MASLD diagnosis and treatment",
    category: "gastroenterology",
  },

  // Nephrology
  {
    slug: "chronic-kidney-disease",
    query_en: "chronic kidney disease treatment progression",
    title_ja: "慢性腎臓病の進行抑制",
    title_en: "Chronic Kidney Disease",
    description_ja: "CKDの進行抑制と腎保護療法の最新エビデンス",
    description_en: "Latest evidence on CKD progression prevention and renoprotective therapy",
    category: "nephrology",
  },

  // Rheumatology
  {
    slug: "rheumatoid-arthritis",
    query_en: "rheumatoid arthritis treatment JAK inhibitor biologic",
    title_ja: "関節リウマチの治療",
    title_en: "Rheumatoid Arthritis Treatment",
    description_ja: "JAK阻害薬・生物学的製剤を含む関節リウマチ治療の最新動向",
    description_en: "Latest developments in RA treatment including JAK inhibitors and biologics",
    category: "rheumatology",
  },
];

export function getTopicBySlug(slug: string): Topic | undefined {
  return TOPICS.find((t) => t.slug === slug);
}

export function getTopicsByCategory(category: string): Topic[] {
  return TOPICS.filter((t) => t.category === category);
}

export function getRelatedTopics(slug: string, limit = 4): Topic[] {
  const topic = getTopicBySlug(slug);
  if (!topic) return [];
  const sameCategory = TOPICS.filter(
    (t) => t.category === topic.category && t.slug !== slug,
  );
  const others = TOPICS.filter(
    (t) => t.category !== topic.category && t.slug !== slug,
  );
  return [...sameCategory, ...others].slice(0, limit);
}
