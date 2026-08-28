export function SocialCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background:
          "radial-gradient(circle at 18% 10%, #f5c45133, transparent 38%), radial-gradient(circle at 84% 84%, #ff4d8d44, transparent 42%), #0c0a14",
        color: "white",
        padding: "72px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <span style={{ fontSize: 24, letterSpacing: 8, color: "#ff4d8d" }}>18+</span>
        <span style={{ fontSize: 24, letterSpacing: 5, color: "#aaa4b5" }}>
          PAID RANK
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: 4 }}>NIGHTSTRIP</div>
        <div style={{ fontSize: 38, color: "#c8c3d2", marginTop: 16 }}>
          The paid-rank ad board
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, fontSize: 27, fontWeight: 700 }}>
        <span style={{ color: "#f5c451" }}>CASINO ROW</span>
        <span style={{ color: "#625d6c" }}>×</span>
        <span style={{ color: "#ff4d8d" }}>RED DISTRICT</span>
      </div>
    </div>
  );
}
