import Foundation
import Observation

@Observable
final class LanguageManager {

    enum AppLanguage: String, CaseIterable, Codable, Identifiable {
        case ja = "ja"
        case en = "en"
        case zhHans = "zh-Hans"
        case ko = "ko"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .ja: return "日本語"
            case .en: return "English"
            case .zhHans: return "中文（简体）"
            case .ko: return "한국어"
            }
        }

        // MARK: - SearchView

        var searchPlaceholder: String {
            switch self {
            case .ja: return "知りたいことを入力"
            case .en: return "Search anything"
            case .zhHans: return "输入您想了解的内容"
            case .ko: return "알고 싶은 것을 입력"
            }
        }

        var searchButton: String {
            switch self {
            case .ja: return "検索"
            case .en: return "Search"
            case .zhHans: return "搜索"
            case .ko: return "검색"
            }
        }

        var recentSearches: String {
            switch self {
            case .ja: return "最近の検索"
            case .en: return "Recent Searches"
            case .zhHans: return "最近搜索"
            case .ko: return "최근 검색"
            }
        }

        var trending: String {
            switch self {
            case .ja: return "トレンド"
            case .en: return "Trending"
            case .zhHans: return "热门"
            case .ko: return "트렌딩"
            }
        }

        var clearHistory: String {
            switch self {
            case .ja: return "履歴をクリア"
            case .en: return "Clear History"
            case .zhHans: return "清除历史"
            case .ko: return "기록 삭제"
            }
        }

        // MARK: - ResultsView

        var aiAnswer: String {
            switch self {
            case .ja: return "AIによる総合回答"
            case .en: return "AI Summary"
            case .zhHans: return "AI综合回答"
            case .ko: return "AI 종합 답변"
            }
        }

        func basedOnPapers(_ n: Int) -> String {
            switch self {
            case .ja: return "\(n)件の論文に基づく"
            case .en: return "Based on \(n) papers"
            case .zhHans: return "基于\(n)篇论文"
            case .ko: return "\(n)개 논문 기반"
            }
        }

        var evidenceHigh: String {
            switch self {
            case .ja: return "エビデンス：高"
            case .en: return "Evidence: High"
            case .zhHans: return "证据等级：高"
            case .ko: return "근거 수준: 높음"
            }
        }

        var evidenceModerate: String {
            switch self {
            case .ja: return "エビデンス：中"
            case .en: return "Evidence: Moderate"
            case .zhHans: return "证据等级：中"
            case .ko: return "근거 수준: 보통"
            }
        }

        var evidenceLow: String {
            switch self {
            case .ja: return "エビデンス：低"
            case .en: return "Evidence: Low"
            case .zhHans: return "证据等级：低"
            case .ko: return "근거 수준: 낮음"
            }
        }

        var openAccess: String {
            switch self {
            case .ja: return "オープンアクセス"
            case .en: return "Open Access"
            case .zhHans: return "开放获取"
            case .ko: return "오픈 액세스"
            }
        }

        var citations: String {
            switch self {
            case .ja: return "被引用数"
            case .en: return "Citations"
            case .zhHans: return "引用次数"
            case .ko: return "인용 수"
            }
        }

        var sortRelevance: String {
            switch self {
            case .ja: return "関連度順"
            case .en: return "By Relevance"
            case .zhHans: return "按相关性"
            case .ko: return "관련도순"
            }
        }

        var sortDate: String {
            switch self {
            case .ja: return "新しい順"
            case .en: return "By Date"
            case .zhHans: return "按日期"
            case .ko: return "날짜순"
            }
        }

        var sortCitations: String {
            switch self {
            case .ja: return "被引用数順"
            case .en: return "By Citations"
            case .zhHans: return "按引用量"
            case .ko: return "인용순"
            }
        }

        var loadingSummary: String {
            switch self {
            case .ja: return "要約を生成中..."
            case .en: return "Generating summary..."
            case .zhHans: return "正在生成摘要..."
            case .ko: return "요약 생성 중..."
            }
        }

        var noResults: String {
            switch self {
            case .ja: return "検索結果が見つかりませんでした"
            case .en: return "No results found"
            case .zhHans: return "未找到搜索结果"
            case .ko: return "검색 결과 없음"
            }
        }

        // MARK: - PaperDetailView

        var abstract: String {
            switch self {
            case .ja: return "アブストラクト"
            case .en: return "Abstract"
            case .zhHans: return "摘要"
            case .ko: return "초록"
            }
        }

        var abstractOriginal: String {
            switch self {
            case .ja: return "原文"
            case .en: return "Original"
            case .zhHans: return "原文"
            case .ko: return "원문"
            }
        }

        var abstractTranslated: String {
            switch self {
            case .ja: return "翻訳"
            case .en: return "Translated"
            case .zhHans: return "翻译"
            case .ko: return "번역"
            }
        }

        var keyFindings: String {
            switch self {
            case .ja: return "主な発見"
            case .en: return "Key Findings"
            case .zhHans: return "主要发现"
            case .ko: return "주요 발견"
            }
        }

        var saveToFavorites: String {
            switch self {
            case .ja: return "お気に入りに保存"
            case .en: return "Save to Favorites"
            case .zhHans: return "收藏"
            case .ko: return "즐겨찾기에 저장"
            }
        }

        var share: String {
            switch self {
            case .ja: return "共有"
            case .en: return "Share"
            case .zhHans: return "分享"
            case .ko: return "공유"
            }
        }

        var viewPDF: String {
            switch self {
            case .ja: return "PDFを見る"
            case .en: return "View PDF"
            case .zhHans: return "查看PDF"
            case .ko: return "PDF 보기"
            }
        }

        var viewOnPubMed: String {
            switch self {
            case .ja: return "PubMedで見る"
            case .en: return "View on PubMed"
            case .zhHans: return "在PubMed查看"
            case .ko: return "PubMed에서 보기"
            }
        }

        // MARK: - SettingsView

        var settings: String {
            switch self {
            case .ja: return "設定"
            case .en: return "Settings"
            case .zhHans: return "设置"
            case .ko: return "설정"
            }
        }

        var language: String {
            switch self {
            case .ja: return "表示言語"
            case .en: return "Language"
            case .zhHans: return "显示语言"
            case .ko: return "표시 언어"
            }
        }

        var about: String {
            switch self {
            case .ja: return "このアプリについて"
            case .en: return "About"
            case .zhHans: return "关于"
            case .ko: return "정보"
            }
        }

        var disclaimer: String {
            switch self {
            case .ja: return "免責事項"
            case .en: return "Disclaimer"
            case .zhHans: return "免责声明"
            case .ko: return "면책 조항"
            }
        }

        var disclaimerText: String {
            switch self {
            case .ja: return "このアプリは医療アドバイスを提供するものではありません。健康上の判断は必ず医師にご相談ください。"
            case .en: return "This app does not provide medical advice. Always consult a healthcare professional for health decisions."
            case .zhHans: return "本应用不提供医疗建议。健康相关决定请务必咨询医生。"
            case .ko: return "이 앱은 의료 조언을 제공하지 않습니다. 건강 관련 결정은 반드시 의사와 상담하세요."
            }
        }

        // MARK: - Common

        var errorNetwork: String {
            switch self {
            case .ja: return "ネットワークエラーが発生しました"
            case .en: return "A network error occurred"
            case .zhHans: return "网络错误"
            case .ko: return "네트워크 오류가 발생했습니다"
            }
        }

        var errorGeneric: String {
            switch self {
            case .ja: return "エラーが発生しました"
            case .en: return "An error occurred"
            case .zhHans: return "发生错误"
            case .ko: return "오류가 발생했습니다"
            }
        }

        var retry: String {
            switch self {
            case .ja: return "再試行"
            case .en: return "Retry"
            case .zhHans: return "重试"
            case .ko: return "재시도"
            }
        }

        var cancel: String {
            switch self {
            case .ja: return "キャンセル"
            case .en: return "Cancel"
            case .zhHans: return "取消"
            case .ko: return "취소"
            }
        }

        var done: String {
            switch self {
            case .ja: return "完了"
            case .en: return "Done"
            case .zhHans: return "完成"
            case .ko: return "완료"
            }
        }

        var favorites: String {
            switch self {
            case .ja: return "お気に入り"
            case .en: return "Favorites"
            case .zhHans: return "收藏"
            case .ko: return "즐겨찾기"
            }
        }
    }

    // MARK: - State

    var current: AppLanguage {
        didSet {
            UserDefaults.standard.set(current.rawValue, forKey: "app_language")
        }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: "app_language") ?? "ja"
        self.current = AppLanguage(rawValue: saved) ?? .ja
    }
}
