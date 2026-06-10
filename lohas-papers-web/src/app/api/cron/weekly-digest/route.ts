import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";

// Weekly trending topics in medicine — curated by specialty
const WEEKLY_TOPICS = [
  {
    title: "SGLT2阻害薬の心不全への効果",
    query: "SGLT2 inhibitor heart failure 2026",
    specialty: "循環器内科",
  },
  {
    title: "GLP-1受容体作動薬の体重管理エビデンス",
    query: "GLP-1 receptor agonist weight management",
    specialty: "内分泌代謝",
  },
  {
    title: "抗菌薬適正使用の最新ガイドライン",
    query: "antimicrobial stewardship guidelines 2026",
    specialty: "感染症",
  },
  {
    title: "高齢者の多剤併用見直し戦略",
    query: "polypharmacy deprescribing elderly",
    specialty: "老年医学",
  },
  {
    title: "AI診断支援の臨床試験結果",
    query: "AI clinical decision support trial",
    specialty: "医療AI",
  },
];

function getWeeklyTopic(): (typeof WEEKLY_TOPICS)[number] {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return WEEKLY_TOPICS[weekNumber % WEEKLY_TOPICS.length];
}

function buildEmailHtml(topic: (typeof WEEKLY_TOPICS)[number]): string {
  const searchUrl = `https://lohas-papers.com/results?q=${encodeURIComponent(topic.query)}&lang=ja`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a2e;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">LOHAS Papers</h1>
    <p style="color: #666; font-size: 14px; margin-top: 4px;">Weekly EBM Highlight</p>
  </div>

  <div style="background: linear-gradient(135deg, #f8f9ff, #eef0ff); border-radius: 16px; padding: 28px; margin-bottom: 24px;">
    <p style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">${topic.specialty}</p>
    <h2 style="font-size: 22px; color: #1a1a2e; margin: 0 0 12px 0;">${topic.title}</h2>
    <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
      今週のEBMハイライトです。AIが最新論文を横断検索し、日本語で要約しました。
    </p>
    <a href="${searchUrl}" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px;">
      AIの要約を読む →
    </a>
  </div>

  <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      医師が作った、医師のための論文検索AI<br>
      <a href="https://lohas-papers.com" style="color: #1a1a2e;">lohas-papers.com</a>
    </p>
    <p style="color: #bbb; font-size: 11px; margin-top: 12px;">
      このメールはLOHAS Papersに登録されたアカウントに送信されています。<br>
      配信停止は<a href="https://lohas-papers.com/account" style="color: #999;">アカウント設定</a>から。
    </p>
  </div>
</body>
</html>`.trim();
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel Cron sends this header)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 },
    );
  }

  const resend = new Resend(resendApiKey);
  const admin = createAdminClient();

  // Get all users with email
  const { data: authData, error: authError } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) {
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 },
    );
  }
  const users = authData?.users ?? [];

  const topic = getWeeklyTopic();
  const html = buildEmailHtml(topic);

  let sent = 0;
  let failed = 0;

  // Send emails in batches (Resend free: 100/day, 3000/month)
  for (const user of users) {
    if (!user.email) continue;

    try {
      await resend.emails.send({
        from: "LOHAS Papers <digest@lohas-papers.com>",
        to: user.email,
        subject: `📚 ${topic.title} — 今週のEBMハイライト`,
        html,
      });
      sent++;
    } catch {
      failed++;
    }

    // Respect rate limits
    if (sent % 10 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return NextResponse.json({
    topic: topic.title,
    total_users: users.length,
    sent,
    failed,
  });
}
