import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { analysisService, apiKeyService } from '../services/auth.service'
import AnalysisResult from '../components/AnalysisResult'
import toast from 'react-hot-toast'

const STEPS = ['Input', 'Preview', 'Analyze', 'Results']

export default function Analyze() {
  const [step, setStep] = useState(0)
  const [inputMode, setInputMode] = useState('text') 
  const [textContent, setTextContent] = useState('')
  const [file, setFile] = useState(null)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [providers, setProviders] = useState([])
  const [enableCaching, setEnableCaching] = useState(true)
  const [maskPreview, setMaskPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    apiKeyService.getProviders().then(r => {
      setProviders(r.data.providers)
      if (r.data.providers[0]) {
        setProvider(r.data.providers[0].id)
        setModel(r.data.providers[0].models[0])
      }
    }).catch(() => {})
  }, [])

  const onDrop = useCallback((accepted) => {
    if (accepted[0]) { setFile(accepted[0]); setInputMode('file') }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/*': ['.txt', '.log', '.json', '.csv', '.xml', '.out'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  })

  const handlePreview = async () => {
    const content = inputMode === 'text' ? textContent : (file ? await file.text() : '')
    if (!content.trim()) return toast.error('Please provide log content')
    setPreviewLoading(true)
    try {
      const { data } = await analysisService.maskPreview(content)
      setMaskPreview(data.data)
      setStep(1)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!provider) return toast.error('Select a provider')
    setAnalysisLoading(true)
    setStep(2)
    try {
      let res
      if (inputMode === 'file' && file) {
        const fd = new FormData()
        fd.append('logFile', file)
        fd.append('provider', provider)
        fd.append('model', model)
        fd.append('enableCaching', enableCaching)
        res = await analysisService.analyzeFile(fd)
      } else {
        res = await analysisService.analyzeText({
          content: textContent,
          provider, model, enableCaching
        })
      }
      setResult(res.data.data)
      setStep(3)
      toast.success(res.data.data.cacheHit ? '⚡ Retrieved from cache' : '✓ Analysis complete')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Analysis failed')
      setStep(1)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const reset = () => {
    setStep(0); setResult(null); setMaskPreview(null)
    setTextContent(''); setFile(null); setInputMode('text')
  }

  const selectedProvider = providers.find(p => p.id === provider)

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="section-label">Analysis</div>
        <h1 className="page-title">Log Analyzer</h1>
        <p className="page-subtitle">Upload a log file or paste text — AI will analyze, mask, and diagnose</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: i <= step ? 'var(--cyan)' : 'var(--bg-elevated)',
                border: `2px solid ${i <= step ? 'var(--cyan)' : 'var(--border-bright)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i <= step ? 'var(--bg-base)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 700,
                boxShadow: i === step ? '0 0 12px var(--cyan-glow-strong)' : 'none',
                transition: 'all 0.3s',
                flexShrink: 0,
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, color: i === step ? 'var(--cyan)' : 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? 'var(--cyan)' : 'var(--border)', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Input */}
      {step === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div className="card">
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['text', 'file'].map(m => (
                <button key={m} onClick={() => setInputMode(m)} className="btn" style={{
                  background: inputMode === m ? 'var(--cyan-glow)' : 'transparent',
                  color: inputMode === m ? 'var(--cyan)' : 'var(--text-muted)',
                  border: `1px solid ${inputMode === m ? 'var(--cyan)' : 'var(--border)'}`,
                  textTransform: 'capitalize'
                }}>
                  {m === 'text' ? '⌨ Paste Text' : '📁 Upload File'}
                </button>
              ))}
            </div>

            {inputMode === 'text' ? (
              <>
                <label className="form-label">Log Content</label>
                <textarea
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder={`Paste your log content here...`}
                  style={{ minHeight: 320, resize: 'vertical', lineHeight: 1.7, fontSize: 12 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  <span>{textContent.length} chars</span>
                  <span>{textContent.split('\n').length} lines</span>
                </div>
              </>
            ) : (
              <>
                <div {...getRootProps()} style={{
                  border: `2px dashed ${isDragActive ? 'var(--cyan)' : file ? 'var(--green)' : 'var(--border-bright)'}`,
                  borderRadius: 12,
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragActive ? 'var(--cyan-glow)' : file ? 'rgba(0,255,136,0.03)' : 'var(--bg-elevated)',
                  transition: 'all 0.2s',
                }}>
                  <input {...getInputProps()} />
                  <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.6 }}>
                    {file ? '✓' : isDragActive ? '↓' : '↑'}
                  </div>
                  {file ? (
                    <div>
                      <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>{file.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ color: 'var(--text-primary)', marginBottom: 6 }}>
                        {isDragActive ? 'Drop file here' : 'Drag & drop or click to select'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>.txt, .log, .json, .csv up to 10MB</div>
                    </div>
                  )}
                </div>
                {file && (
                  <button onClick={() => setFile(null)} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
                    ✕ Remove file
                  </button>
                )}
              </>
            )}
          </div>

          {/* Settings panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="section-label" style={{ marginBottom: 16 }}>AI Settings</div>

              <div className="form-group">
                <label className="form-label">Provider</label>
                <select value={provider} onChange={e => {
                  setProvider(e.target.value)
                  const p = providers.find(x => x.id === e.target.value)
                  if (p) setModel(p.models[0])
                }}>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Model</label>
                <select value={model} onChange={e => setModel(e.target.value)}>
                  {selectedProvider?.models?.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}> Enable Caching</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Reuse results for identical logs</div>
                </div>
                <button onClick={() => setEnableCaching(p => !p)} style={{
                  width: 44, height: 24, borderRadius: 12,
                  background: enableCaching ? 'var(--cyan)' : 'var(--border-bright)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 3, left: enableCaching ? 22 : 3,
                    width: 18, height: 18, borderRadius: 9,
                    background: enableCaching ? 'var(--bg-base)' : 'var(--text-muted)',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>



            <button
              onClick={handlePreview}
              className="btn btn-primary"
              style={{ justifyContent: 'center', padding: '14px' }}
              disabled={previewLoading || (!textContent.trim() && !file)}
            >
              {previewLoading
                ? <><span className="loading-spinner" /> Scanning...</>
                : '→ Preview Masking'
              }
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Mask Preview */}
      {step === 1 && maskPreview && (
        <div className="animate-fade">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div className="section-label">Security Scan</div>
                  <h3 style={{ fontFamily: 'var(--font-display)' }}>Masked Preview</h3>
                </div>
                {maskPreview.totalMasked > 0
                  ? <span className="badge badge-amber">⚠ {maskPreview.totalMasked} items masked</span>
                  : <span className="badge badge-green">✓ No sensitive data found</span>
                }
              </div>
              <div className="code-block">{maskPreview.maskedContent}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <div className="section-label" style={{ marginBottom: 12 }}>Masking Report</div>
                {Object.entries(maskPreview.maskingSummary || {}).length > 0 ? (
                  Object.entries(maskPreview.maskingSummary).map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--amber)', fontSize: 11 }}>[{type}]</span>
                      <span style={{ color: 'var(--text-secondary)' }}>×{count}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No sensitive data detected</p>
                )}
              </div>

              <div className="card">
                <div className="section-label" style={{ marginBottom: 12 }}>Error Detection</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total errors</span>
                    <span style={{ color: 'var(--red)', fontWeight: 600 }}>{maskPreview.totalErrors}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Repeated</span>
                    <span style={{ color: 'var(--amber)' }}>{maskPreview.repeatedCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Unique</span>
                    <span style={{ color: 'var(--cyan)' }}>{maskPreview.nonRepeatedCount}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={handleAnalyze} className="btn btn-primary" style={{ justifyContent: 'center', padding: '14px' }}>
                  ⬡ Run AI Analysis
                </button>
                <button onClick={() => setStep(0)} className="btn btn-ghost" style={{ justifyContent: 'center' }}>
                  ← Edit Input
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Loading */}
      {step === 2 && (
        <div className="flex-center animate-fade" style={{ flexDirection: 'column', height: '50vh', gap: 20 }}>
          <div className="loading-spinner" style={{ width: 48, height: 48, borderWidth: 3 }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 8 }}>
              Analyzing with {provider.toUpperCase()}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sending masked log to AI for diagnosis...</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Masking', 'Extracting', 'Analyzing', 'Saving'].map((l, i) => (
              <span key={l} className="badge badge-cyan" style={{ animationDelay: `${i * 0.2}s`, animation: 'pulse 1.5s ease infinite' }}>{l}</span>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 10 }}>
            <button onClick={reset} className="btn btn-outline">⬡ New Analysis</button>
          </div>
          <AnalysisResult result={result} />
        </div>
      )}
    </div>
  )
}