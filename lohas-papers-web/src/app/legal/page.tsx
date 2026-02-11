export default function LegalPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">特定商取引法に基づく表記</h1>

      <table className="w-full text-sm border-collapse">
        <tbody>
          {[
            ["販売業者", "上原 吉敬"],
            ["運営統括責任者", "上原 吉敬"],
            ["所在地", "〒951-8520 新潟県新潟市中央区旭町通一番町754番地（新潟大学医歯学総合病院内）"],
            ["連絡先", "yoppi.ue@gmail.com（お問い合わせはメールにてお願いいたします）"],
            ["販売URL", "https://lohas-papers-web.vercel.app"],
            ["販売価格", "各サービスの購入ページに表示された価格（税込）"],
            [
              "商品代金以外の費用",
              "インターネット接続に必要な通信費はお客様のご負担となります",
            ],
            ["支払方法", "クレジットカード（Stripe経由）"],
            ["支払時期", "クレジットカード決済：ご注文時に即時決済"],
            [
              "商品の引渡時期",
              "クレジット購入：決済完了後、即時にアカウントへクレジットが付与されます",
            ],
            [
              "返品・キャンセル",
              "デジタルコンテンツの性質上、購入後の返品・返金には原則として応じかねます。サービスの不具合による場合はお問い合わせください。",
            ],
            [
              "サブスクリプションの解約",
              "マイアカウントページからいつでも解約可能です。解約後も現在の請求期間終了まではサービスをご利用いただけます。",
            ],
            [
              "動作環境",
              "最新のWebブラウザ（Chrome, Safari, Firefox, Edge）。インターネット接続が必要です。",
            ],
          ].map(([label, value]) => (
            <tr key={label} className="border-b border-gray-200">
              <th className="py-3 pr-4 text-left font-medium text-gray-700 align-top whitespace-nowrap w-40">
                {label}
              </th>
              <td className="py-3 text-gray-600">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-semibold text-gray-900">サービス概要</h2>
        <p>
          LOHAS Papers は、AI を活用した学術論文検索・多言語要約サービスです。
          PubMed および Semantic Scholar から論文を横断検索し、
          Claude AI による要約・翻訳を8言語・3難易度で提供します。
        </p>
        <p>
          クレジット制の従量課金モデルを採用しており、検索（1クレジット）、
          論文詳細（0.3クレジット）、全文翻訳（3クレジット）でご利用いただけます。
        </p>
      </div>

      <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-semibold text-gray-900">プライバシーポリシー</h2>
        <p>
          当サービスでは、Google OAuth
          を通じてメールアドレス、表示名、プロフィール画像を取得します。
          これらの情報はサービスの提供およびアカウント管理の目的にのみ使用し、
          第三者への提供は法令に基づく場合を除き行いません。
        </p>
        <p>
          決済情報は Stripe が安全に管理しており、
          当サービスのサーバーにクレジットカード情報が保存されることはありません。
        </p>
      </div>
    </div>
  );
}
