import { useCallback } from 'preact/hooks'

export default function FileInput({ id, label, onSelect, accept, multiple = false }) {
  const handleChange = useCallback((e) => {
    const files = Array.from(e.currentTarget.files || [])
    onSelect?.(files)
  }, [onSelect])

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      {label && (
        <label htmlFor={id} style={{ marginRight: '0.5rem' }}>
          {label}
        </label>
      )}
      <input id={id} type="file" accept={accept} onChange={handleChange} multiple={multiple} />
    </div>
  )
}
