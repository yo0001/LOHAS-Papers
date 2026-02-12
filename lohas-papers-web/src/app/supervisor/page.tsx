"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import Script from "next/script";

const content = {
  ja: {
    title: "監修医について",
    name: "上原 吉敬（うえはら よしあき）",
    role: "LOHAS Papers 監修医 / LOHAS Inc. 代表取締役",
    license: "医師免許",
    licenseNumber: "医籍登録番号: 第611760号",
    exam: "第118回 医師国家試験 合格",
    registeredDate: "医籍登録日: 令和6年（2024年）10月15日",
    issuer: "厚生労働大臣より免許交付",
    affiliation: "所属",
    affiliationDetail: "新潟大学医歯学総合病院 臨床研修医",
    education: "学歴",
    educationDetail: "新潟大学 医学部 医学科 卒業",
    verifyTitle: "医師資格の確認",
    verifyDescription:
      "上原吉敬の医師資格は、厚生労働省「医師等資格確認検索」にて確認できます。",
    verifyLink: "厚生労働省 医師等資格確認検索",
    verifyNote:
      "※ 検索画面で「上原」「吉敬」と入力してください。",
    supervisionTitle: "監修方針",
    supervisionPoints: [
      "AI要約の医学的正確性の確認",
      "エビデンスレベル評価の妥当性チェック",
      "一般ユーザーへの分かりやすさと正確性の両立",
      "最新のガイドライン・エビデンスとの整合性確認",
    ],
    disclaimer:
      "本サービスは医療アドバイスを提供するものではありません。健康上の判断は必ず担当医にご相談ください。",
  },
  en: {
    title: "Medical Supervisor",
    name: "Yoshiaki Uehara, M.D.",
    role: "Medical Supervisor, LOHAS Papers / CEO, LOHAS Inc.",
    license: "Medical License",
    licenseNumber: "Medical Registry No. 611760",
    exam: "Passed the 118th National Medical Practitioners Examination (Japan)",
    registeredDate: "Registered: October 15, 2024",
    issuer: "Licensed by the Minister of Health, Labour and Welfare (Japan)",
    affiliation: "Affiliation",
    affiliationDetail:
      "Clinical Resident, Niigata University Medical and Dental Hospital",
    education: "Education",
    educationDetail:
      "M.D., Faculty of Medicine, Niigata University",
    verifyTitle: "Verify Medical Credentials",
    verifyDescription:
      "Dr. Uehara's medical license can be verified through the official Ministry of Health, Labour and Welfare physician search system.",
    verifyLink: "MHLW Physician Verification (Japanese)",
    verifyNote:
      '* Search using surname "上原" and given name "吉敬".',
    supervisionTitle: "Supervision Policy",
    supervisionPoints: [
      "Verification of medical accuracy in AI-generated summaries",
      "Validation of evidence level assessments",
      "Ensuring clarity and accuracy for general users",
      "Alignment with latest guidelines and evidence",
    ],
    disclaimer:
      "This service does not provide medical advice. Always consult your physician for health-related decisions.",
  },
};

type ContentKey = keyof typeof content;

function getContent(locale: string) {
  if (locale in content) return content[locale as ContentKey];
  return content.en;
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "上原吉敬",
  alternateName: "Yoshiaki Uehara",
  givenName: "吉敬",
  familyName: "上原",
  gender: "Male",
  birthDate: "1987-09-02",
  nationality: { "@type": "Country", name: "Japan" },
  jobTitle: ["Medical Doctor", "CEO"],
  honorificSuffix: "M.D.",
  affiliation: [
    {
      "@type": "Hospital",
      name: "Niigata University Medical and Dental Hospital",
      alternateName: "新潟大学医歯学総合病院",
      url: "https://www.nuh.niigata-u.ac.jp/",
    },
    {
      "@type": "Organization",
      name: "LOHAS Inc.",
      url: "https://lohas-papers.com",
    },
  ],
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Niigata University",
    alternateName: "新潟大学",
    department: "Faculty of Medicine",
  },
  hasCredential: [
    {
      "@type": "MedicalCredential" as string,
      credentialCategory: "Medical License (Japan)",
      recognizedBy: {
        "@type": "GovernmentOrganization",
        name: "Ministry of Health, Labour and Welfare (Japan)",
        alternateName: "厚生労働省",
        url: "https://www.mhlw.go.jp/",
      },
      identifier: "611760",
      dateCreated: "2024-10-15",
      description:
        "第118回医師国家試験合格 / Passed 118th National Medical Practitioners Examination",
    },
  ],
  sameAs: [
    "https://licenseif.mhlw.go.jp/search_isei/",
  ],
  url: "https://lohas-papers.com/supervisor",
};

export default function SupervisorPage() {
  const { locale } = useLanguage();
  const c = getContent(locale);

  return (
    <>
      <Script
        id="person-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <h1 className="text-3xl font-bold text-navy-900 mb-2 font-display">
          {c.title}
        </h1>
        <div className="h-1 w-16 bg-navy-600 rounded mb-8" />

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-navy-100 flex items-center justify-center text-3xl flex-shrink-0">
              🩺
            </div>
            <div>
              <h2 className="text-2xl font-bold text-navy-900">{c.name}</h2>
              <p className="text-navy-600 mt-1">{c.role}</p>
            </div>
          </div>
        </div>

        {/* License */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-8">
          <h3 className="text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            📋 {c.license}
          </h3>
          <div className="space-y-2 text-gray-700">
            <p className="font-semibold text-navy-800">{c.licenseNumber}</p>
            <p>{c.exam}</p>
            <p>{c.registeredDate}</p>
            <p>{c.issuer}</p>
          </div>
        </section>

        {/* Affiliation & Education */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
              🏥 {c.affiliation}
            </h3>
            <p className="text-gray-700">{c.affiliationDetail}</p>
          </section>
          <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
              🎓 {c.education}
            </h3>
            <p className="text-gray-700">{c.educationDetail}</p>
          </section>
        </div>

        {/* Verification */}
        <section className="bg-navy-50 rounded-2xl border border-navy-200 p-8 mb-8">
          <h3 className="text-xl font-bold text-navy-900 mb-3 flex items-center gap-2">
            ✅ {c.verifyTitle}
          </h3>
          <p className="text-gray-700 mb-4">{c.verifyDescription}</p>
          <a
            href="https://licenseif.mhlw.go.jp/search_isei/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-navy-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-800 transition-colors"
          >
            🔍 {c.verifyLink}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-sm text-gray-500 mt-3">{c.verifyNote}</p>
        </section>

        {/* Supervision Policy */}
        <section className="bg-white rounded-2xl shadow-md border border-gray-100 p-8 mb-8">
          <h3 className="text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
            📐 {c.supervisionTitle}
          </h3>
          <ul className="space-y-3">
            {c.supervisionPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-navy-600 mt-0.5">✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Disclaimer */}
        <div className="text-center text-sm text-gray-400 border-t border-gray-100 pt-6">
          {c.disclaimer}
        </div>
      </div>
    </>
  );
}
