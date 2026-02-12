import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const title = searchParams.get("title") || "";
  const type = searchParams.get("type") || "search"; // "search" | "topic"

  const displayText = title || query;
  const isSearch = type === "search";

  const subtitle = isSearch
    ? "AI Paper Search Results"
    : "Medical Research Topic";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #111 0%, #1a1a2e 40%, #16213e 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glass card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            borderRadius: "32px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.06)",
            maxWidth: "1000px",
            width: "85%",
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: "white",
                fontWeight: 700,
              }}
            >
              L
            </div>
            <span
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                letterSpacing: "-0.5px",
              }}
            >
              LOHAS Papers
            </span>
          </div>

          {/* Query text */}
          {displayText && (
            <div
              style={{
                fontSize: displayText.length > 30 ? "36px" : "48px",
                fontWeight: 800,
                color: "white",
                textAlign: "center",
                lineHeight: 1.3,
                maxWidth: "800px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {isSearch ? `"${displayText}"` : displayText}
            </div>
          )}

          {/* Subtitle */}
          <div
            style={{
              fontSize: "20px",
              color: "rgba(255,255,255,0.5)",
              marginTop: "20px",
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            display: "flex",
            gap: "24px",
            color: "rgba(255,255,255,0.3)",
            fontSize: "16px",
          }}
        >
          <span>PubMed + Semantic Scholar</span>
          <span>|</span>
          <span>8 Languages</span>
          <span>|</span>
          <span>AI Summarization</span>
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
      },
    },
  );
}
