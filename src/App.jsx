import { useState, useRef, useEffect } from 'react'

const MAX_DIMENSION = 1024
const JPEG_QUALITY = 0.8

const SAMPLES = [
  {
    image: '/samples/bus.jpg',
    haiku: '9:30 a.m.—\nfingers tap against the rail,\ntraffic stands still',
    context: 'from a morning bus ride',
  },
  {
    image: '/samples/boats.jpg',
    haiku: 'empty boats\na child\'s sandal half buried—\nincoming tide',
    context: 'from a beach in Karnataka',
  },
  {
    image: '/samples/wine.jpg',
    haiku: 'Flickering glow rests\non the tender, open palm—\na sip of hush.',
    context: 'from a quiet evening',
  },
]

const SHOWCASE_INTERVAL_MS = 5000
const SHOWCASE_FADE_MS = 800

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        let { width, height } = img

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else if (height >= width && height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      }

      img.onerror = () => reject(new Error('Could not read that image.'))
      img.src = e.target.result
    }

    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

export default function App() {
  const fileRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const [image, setImage] = useState(null)
  const [haiku, setHaiku] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState('observing')
  const [error, setError] = useState(null)

  const [sampleIndex, setSampleIndex] = useState(0)
  const [sampleVisible, setSampleVisible] = useState(true)

  useEffect(() => {
    SAMPLES.forEach((sample) => {
      const preload = new Image()
      preload.src = sample.image
    })
  }, [])

  useEffect(() => {
    if (image) return undefined

    let fadeTimer

    const interval = setInterval(() => {
      setSampleVisible(false)
      fadeTimer = setTimeout(() => {
        setSampleIndex((i) => (i + 1) % SAMPLES.length)
        setSampleVisible(true)
      }, SHOWCASE_FADE_MS)
    }, SHOWCASE_INTERVAL_MS)

    return () => {
      clearInterval(interval)
      clearTimeout(fadeTimer)
    }
  }, [image])

  const currentSample = SAMPLES[sampleIndex]

  async function generateHaiku(imageDataUrl) {
    setError(null)
    setHaiku(null)
    setLoading(true)
    setLoadingStage('observing')

    const stageTimer = setTimeout(() => setLoadingStage('writing'), 5000)

    try {
      const base64 = imageDataUrl.split(',')[1]
      const res = await fetch('/api/haiku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status})`)
      }

      setHaiku(data.haiku)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      clearTimeout(stageTimer)
      setLoading(false)
    }
  }

  function handleUpload(imageDataUrl) {
    setImage(imageDataUrl)
    setHaiku(null)
    setError(null)
    generateHaiku(imageDataUrl)
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    compressImage(file).then(handleUpload).catch((err) => console.error(err.message))
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleRemoveImage() {
    setImage(null)
    setHaiku(null)
    setError(null)
  }

  function handleNewImage() {
    setHaiku(null)
    setError(null)
    fileRef.current.click()
  }


  return (
    <div className="h-screen overflow-hidden text-[#2c1810] font-sans">
      <main className="h-full flex flex-col max-w-3xl mx-auto px-6">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <header className="flex-shrink-0 text-center py-4">
          <h1 className="font-serif text-[44px] tracking-tight text-[#1a0f08]">Poet's Eye</h1>
          <p className="text-[13px] tracking-[0.2em] text-[#8b7355] mt-2 uppercase">drop a photo, receive a poem</p>
          <div className="w-16 h-px bg-[#c4b69c] mx-auto mt-3" />
        </header>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-stretch">
          <div className="w-full sm:w-1/2 min-h-0">
            {!image ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileRef.current.click()
                  }
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`cursor-pointer w-full h-full max-h-full flex items-center justify-center rounded-lg overflow-hidden ${dragOver ? 'ring-2 ring-[#5c4033]/40' : ''}`}
              >
                <img
                  src={currentSample.image}
                  alt=""
                  className={`
                    max-w-full max-h-full object-contain rounded-lg
                    transition-opacity ease-in-out
                    ${sampleVisible ? 'opacity-100' : 'opacity-0'}
                  `}
                  style={{ transitionDuration: `${SHOWCASE_FADE_MS}ms` }}
                />
              </div>
            ) : (
              <div className="relative animate-fade-in h-full">
                <div className="w-full h-full max-h-full flex items-center justify-center rounded-lg overflow-hidden">
                  <img
                    src={image}
                    alt="Upload preview"
                    className={`
                      max-w-full max-h-full object-contain rounded-lg
                      transition-opacity duration-300
                      ${loading ? 'opacity-80' : 'opacity-100'}
                    `}
                  />
                </div>
                {!loading && !haiku && (
                  <button
                    onClick={handleRemoveImage}
                    aria-label="Remove image"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#f5f0e6]/80 hover:bg-[#f5f0e6] text-[#5c4033] flex items-center justify-center text-base leading-none transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-full sm:w-1/2 flex flex-col justify-center min-h-0">
            {!image && (
              <div
                className="transition-opacity ease-in-out"
                style={{ opacity: sampleVisible ? 1 : 0, transitionDuration: `${SHOWCASE_FADE_MS}ms` }}
              >
                <p className="font-serif text-[22px] leading-[2] text-left text-[#1a0f08] whitespace-pre-line">
                  {currentSample.haiku}
                </p>
                <p className="mt-1 text-left text-xs italic text-[#8b7355]">
                  {currentSample.context}
                </p>
              </div>
            )}

            {loading && (
              <p className="text-sm text-[#9c6644] animate-text-pulse">
                {loadingStage === 'observing' ? 'observing...' : 'writing...'}
              </p>
            )}

            {haiku && !loading && (
              <p className="animate-fade-in font-serif text-[22px] leading-[2] text-left text-[#1a0f08] whitespace-pre-line">
                {haiku}
              </p>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 py-3 flex flex-col items-center gap-2">
          {!image && (
            <button
              onClick={() => fileRef.current.click()}
              className="px-8 py-2.5 rounded-md bg-[#3d2b1f] text-white text-sm font-normal hover:bg-[#2c1810] transition-colors"
            >
              try your own
            </button>
          )}

          {image && !loading && (error || haiku) && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => generateHaiku(image)}
                className="px-6 py-2 rounded-md bg-[#3d2b1f] text-white text-sm font-normal hover:bg-[#2c1810] transition-colors"
              >
                try again
              </button>
              <button
                onClick={handleNewImage}
                className="px-6 py-2 rounded-md bg-[#3d2b1f] text-white text-sm font-normal hover:bg-[#2c1810] transition-colors"
              >
                new image
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-center text-[#8b3a2a]">{error}</p>
          )}
        </div>

        <footer className="flex-shrink-0 text-center text-[10px] text-[#b5a48a] pb-3">
          poet's eye
        </footer>
      </main>
    </div>
  )
}
