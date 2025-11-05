export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>Reo API</h1>
      <p>Backend API server running.</p>
      <p>Available endpoints:</p>
      <ul>
        <li>POST /api/ingest</li>
        <li>GET /api/summary</li>
        <li>GET /api/metrics</li>
        <li>POST /api/domains</li>
        <li>GET /api/domains</li>
      </ul>
    </div>
  )
}
