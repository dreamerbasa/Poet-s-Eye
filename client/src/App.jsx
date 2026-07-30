import { useState, useRef } from 'react'

const characters = [
  { id: 'spiderman', name: 'Spider-Man', icon: '🕷️', available: true },
  { id: 'wizard', name: 'Wizard', icon: '🧙', available: false },
  { id: 'detective', name: 'Detective', icon: '🔍', available: false },
]

function GradientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-60 blur-[120px] animate-blob1 -top-20 -left-20 bg-[#2e1065]" />
      <div className="absolute w-[450px] h-[450px] rounded-full opacity-60 blur-[120px] animate-blob2 top-1/3 -right-20 bg-[#1e3a5f]" />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-60 blur-[120px] animate-blob3 -bottom-20 left-1/3 bg-[#134e4a]" />
    </div>
  )
}

function CharacterSelector({ selected, onSelect }) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {characters.map((char) => (
        <button
          key={char.id}
          onClick={() => char.available && onSelect(char.id)}
          disabled={!char.available}
          className={`
            relative flex flex-col items-center gap-2 px-5 py-4 rounded-xl border transition-all duration-300 min-w-[100px]
            ${char.available
              ? selected === char.id
                ? 'border-purple-500/70 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8 cursor-pointer'
              : 'border-white/5 bg-white/[0.02] cursor-not-allowed opacity-40'
            }
          `}
        >
          <span className="text-2xl">{char.icon}</span>
          <span className={`text-xs font-medium ${char.available ? 'text-white/80' : 'text-white/30'}`}>
            {char.available ? char.name : 'coming soon'}
          </span>
        </button>
      ))}
    </div>
  )
}

function ImageUpload({ image, onUpload, onRemove }) {
  const fileRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file) {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => onUpload(e.target.result)
      reader.readAsDataURL(file)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  if (image) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
        <img src={image} alt="Upload preview" className="w-full max-h-64 object-contain" />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 border border-white/20 text-white/80 hover:text-white hover:bg-black/80 flex items-center justify-center transition-colors text-sm"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <button
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          w-full py-10 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
          flex flex-col items-center gap-3
          ${dragOver
            ? 'border-purple-400/60 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
            : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]'
          }
        `}
      >
        <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-sm text-white/40">drag & drop or click to upload</span>
      </button>
    </>
  )
}

function ResponseArea({ response }) {
  const [copied, setCopied] = useState(false)

  if (!response) return null

  function handleCopy() {
    navigator.clipboard.writeText(response.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ text: response.text })
    } else {
      handleCopy()
    }
  }

  return (
    <div className="animate-fade-in">
      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-purple-400/80 bg-purple-500/10 px-3 py-1 rounded-full mb-3">
        {response.character}
      </span>
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <p className="text-white/90 text-base leading-relaxed text-left">
          {response.text}
        </p>
      </div>
      <div className="flex gap-2 justify-end mt-3">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          {copied ? 'copied!' : 'copy'}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          share
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState('spiderman')
  const [image, setImage] = useState(null)
  const [response, setResponse] = useState(null)

  function handleGenerate() {
    setResponse({
      character: characters.find((c) => c.id === selectedCharacter)?.name,
      text: '"Okay okay okay — so you\'re just out here living your life like you DON\'T have a masked vigilante judging your photo? Bold. Respect. But also… is that a pigeon in the background or am I trippin? Either way — my spider-sense says this pic goes hard. 8/10, would web-sling past again."',
    })
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white font-sans">
      <GradientBackground />

      <main className="relative z-10 max-w-md mx-auto px-5 py-12 flex flex-col gap-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            WhatWouldTheySay
          </h1>
          <p className="text-sm text-white/40 mt-2">
            drop a pic. pick a character. get a reaction.
          </p>
        </div>

        {/* Character Selector */}
        <section>
          <CharacterSelector selected={selectedCharacter} onSelect={setSelectedCharacter} />
        </section>

        {/* Image Upload */}
        <section>
          <ImageUpload
            image={image}
            onUpload={setImage}
            onRemove={() => { setImage(null); setResponse(null) }}
          />
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!image}
          className={`
            w-full py-3.5 rounded-xl text-base font-semibold transition-all duration-300
            ${image
              ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-[0.98]'
              : 'bg-white/8 text-white/20 cursor-not-allowed'
            }
          `}
        >
          let em speak
        </button>

        {/* Response */}
        <ResponseArea response={response} />
      </main>
    </div>
  )
}
