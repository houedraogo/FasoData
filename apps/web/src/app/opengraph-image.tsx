import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FasoData - donnees fiables sur le Burkina Faso";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f8fafc",
          color: "#111827",
          fontFamily: "Inter, Arial, sans-serif",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            borderRadius: 28,
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            boxShadow: "0 28px 80px rgba(15, 23, 42, 0.16)",
          }}
        >
          <div
            style={{
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 34px",
              background: "#17283c",
              color: "#ffffff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#ef4b2b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: 22,
                }}
              >
                F
              </div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>FasoData</div>
            </div>
            <div style={{ fontSize: 22, color: "#d1d5db" }}>Prix alimentaires · Cartes · Datasets · API</div>
          </div>

          <div style={{ display: "flex", flex: 1 }}>
            <div
              style={{
                width: "47%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "0 44px",
              }}
            >
              <div style={{ fontSize: 24, color: "#ef4b2b", fontWeight: 800, marginBottom: 18 }}>
                Donnees fiables sur le Burkina Faso
              </div>
              <div style={{ fontSize: 55, lineHeight: 1.04, fontWeight: 900, letterSpacing: -1 }}>
                Explorer, comparer et decider avec des donnees ouvertes.
              </div>
              <div style={{ fontSize: 24, lineHeight: 1.35, color: "#64748b", marginTop: 22 }}>
                Pour chercheurs, ONG, entreprises, universites et institutions publiques.
              </div>
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 18,
                padding: "42px 44px 42px 10px",
              }}
            >
              {[
                ["Prix du mil", "438 FCFA/kg", "+12%", "#ef4b2b"],
                ["Datasets publics", "1 200+", "API active", "#16a34a"],
                ["Regions couvertes", "13", "Cartes SIG", "#2563eb"],
              ].map(([label, value, chip, color]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "24px 26px",
                    borderRadius: 20,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ color: "#64748b", fontSize: 21, fontWeight: 700 }}>{label}</div>
                    <div style={{ color: "#111827", fontSize: 38, fontWeight: 900 }}>{value}</div>
                  </div>
                  <div
                    style={{
                      color,
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 999,
                      padding: "10px 16px",
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {chip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
