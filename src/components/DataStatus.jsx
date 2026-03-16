export default function DataStatus({ latency, wer }) {
  return (
    <div className="p-6 rounded-lg" style={{ background: 'var(--bg-dark)' }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Data Connection
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <StatusCard
          label="Latency Results"
          loading={latency.loading}
          error={latency.error}
          count={latency.data.length}
        />
        <StatusCard
          label="WER Results"
          loading={wer.loading}
          error={wer.error}
          count={wer.data.length}
        />
      </div>
    </div>
  )
}

function StatusCard({ label, loading, error, count }) {
  return (
    <div className="p-4 rounded" style={{ background: 'var(--bg-medium-dark)' }}>
      <div className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      {loading ? (
        <div style={{ color: 'var(--text-disabled)' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: 'var(--color-error)' }}>{error}</div>
      ) : (
        <div className="text-2xl font-bold" style={{ color: 'var(--dg-green)' }}>
          {count.toLocaleString()} rows
        </div>
      )}
    </div>
  )
}
