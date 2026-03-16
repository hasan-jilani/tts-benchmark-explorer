import { useState, useEffect } from 'react'
import { supabase } from './supabase'

// Fetch all rows from a table, paginating past the 1000-row default limit
async function fetchAll(query) {
  const PAGE_SIZE = 1000
  let allRows = []
  let offset = 0
  let done = false

  while (!done) {
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1)
    if (error) throw error
    allRows = allRows.concat(data)
    if (data.length < PAGE_SIZE) done = true
    else offset += PAGE_SIZE
  }

  return allRows
}

export function useLatencyData() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchAll(
          supabase
            .from('latency_results')
            .select('provider, prompt_id, category, text_length, iteration, is_warmup, ttfa_ms, rtf, total_time_ms, audio_duration_ms, total_bytes, error')
            .is('error', null)
            .gt('total_bytes', 0)
            .order('provider')
        )
        setData(rows)
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading, error }
}

export function useWerData() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchAll(
          supabase
            .from('wer_results')
            .select('provider, prompt_id, category, subcategory, iteration, original, transcript, match, word_accuracy, severity, mismatched_words, notes, audio_url')
            .is('error', null)
            .order('provider')
        )
        setData(rows)
      } catch (e) {
        setError(e.message)
      }
      setLoading(false)
    }
    load()
  }, [])

  return { data, loading, error }
}
