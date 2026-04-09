export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#4f5f2f",
        borderTop: "1px solid #3e4b24",
        color: "white",
        padding: "1.2rem 0",
        textAlign: "center",
      }}
    >
      <div className="container">
        <p style={{ margin: 0 }}>
          Academia Guatemalteca de Estudios Numismáticos y Notafílicos
        </p>

        <p style={{ margin: 0, fontStyle: "italic" }}>
          Scientia, Traditio et Memoria
        </p>

        <p style={{ margin: 0 }}>
          agenn.502@gmail.com
        </p>

        <p style={{ margin: 0 }}>
          Guatemala, Centro América.
        </p>

        {/* 🇬🇹 Bandera */}
        <div style={{ marginTop: "6px" }}>
          <img
            src="https://flagcdn.com/w80/gt.png"
            alt="Bandera de Guatemala"
            style={{
              width: "60px",
              borderRadius: "3px",
              boxShadow: "0 0 8px rgba(255,255,255,0.7)",
            }}
          />
        </div>
      </div>
    </footer>
  );
}