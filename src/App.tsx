import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

function App() {
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [timeSignature, setTimeSignature] = useState('4/4')
  const intervalRef = useRef<number | null>(null)
  const audioPoolRef = useRef<HTMLAudioElement[]>([])
  const audioIndexRef = useRef(0)

  // Generate stable IDs for EQ bars to avoid array index keys
  const eqBarIds = useRef(Array.from({ length: 15 }, (_, i) => `eq-bar-${Math.random().toString(36).substr(2, 9)}-${i}`))

  // Generate stable IDs for beat indicators
  const beatIndicatorIds = useRef<{ [key: string]: string[] }>({})

  const getBeatsIndicatorIds = (signature: string, count: number) => {
    if (!beatIndicatorIds.current[signature] || beatIndicatorIds.current[signature].length !== count) {
      beatIndicatorIds.current[signature] = Array.from({ length: count }, (_, i) => `beat-${signature}-${Math.random().toString(36).substr(2, 9)}-${i}`)
    }
    return beatIndicatorIds.current[signature]
  }

  // Calculate interval from BPM
  const interval = (60 / bpm) * 1000

  // Get beats per measure from time signature
  const getBeatsPerMeasure = (sig: string) => {
    const signatures: { [key: string]: number } = {
      '2/4': 2, '3/4': 3, '4/4': 4, '5/4': 5, '6/8': 6, '7/8': 7, '9/8': 9, '12/8': 12
    }
    return signatures[sig] || 4
  }

  const beatsPerMeasure = getBeatsPerMeasure(timeSignature)

  // Initialize audio pool - 10 instances for better high BPM support
  useEffect(() => {
    audioPoolRef.current = Array(10).fill(null).map(() => {
      const audio = new Audio('/sound-a-woman-enjoys-coitus (mp3cut.net) (1).mp3')
      audio.volume = 1.0
      audio.preload = 'auto'  // Preload audio for instant playback
      return audio
    })
  }, [])

  // Advanced audio pool - finds truly free instance or least recently used
  const playSound = useCallback(() => {
    // Find a free audio instance (not currently playing)
    let freeAudio = audioPoolRef.current.find(audio =>
      audio.paused || audio.ended || audio.currentTime === 0
    )

    // If no free instance, use the current index (least recently used)
    if (!freeAudio) {
      freeAudio = audioPoolRef.current[audioIndexRef.current]
    }

    if (freeAudio) {
      // Only reset if audio is not currently playing or has ended
      if (freeAudio.paused || freeAudio.ended) {
        freeAudio.currentTime = 0
      }

      // Create a new promise to handle play() properly
      const playPromise = freeAudio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Handle any play() failures silently
        })
      }

      // Rotate to next audio instance
      audioIndexRef.current = (audioIndexRef.current + 1) % audioPoolRef.current.length
    }
  }, [])

  // Start/stop metronome
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setBeat((prev) => (prev + 1) % beatsPerMeasure)
        playSound()
      }, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, interval, playSound, beatsPerMeasure])

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      setBeat(0)
    }
  }

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(Number(e.target.value))
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleTimeSignatureChange = (newSignature: string) => {
    setTimeSignature(newSignature)
    setBeat(0) // Reset beat when changing signature
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <h2 className={`text-lg font-medium ${
              isDarkMode ? 'text-white/70' : 'text-gray-600'
            }`}>
              Time Signature
            </h2>
            <select
              value={timeSignature}
              onChange={(e) => handleTimeSignatureChange(e.target.value)}
              className={`px-4 py-2 rounded-lg text-xl font-bold border-none outline-none transition-all duration-300 ${
                isDarkMode
                  ? 'bg-white/10 text-white backdrop-blur-md hover:bg-white/15'
                  : 'bg-black/10 text-gray-800 backdrop-blur-md hover:bg-black/15'
              }`}
            >
              <option value="2/4">2/4</option>
              <option value="3/4">3/4</option>
              <option value="4/4">4/4</option>
              <option value="5/4">5/4</option>
              <option value="6/8">6/8</option>
              <option value="7/8">7/8</option>
              <option value="9/8">9/8</option>
              <option value="12/8">12/8</option>
            </select>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-full transition-all duration-300 ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-black/10 hover:bg-black/20 text-gray-800'
            } backdrop-blur-md`}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          {/* EQ Visualizer */}
          <div className="flex justify-center mb-12">
            <div className="flex items-end gap-1 h-32 px-8">
{eqBarIds.current.map((barId, index) => {
                // Spectrum colors - frequency-based like real audio visualizer
                const getSpectrumColor = (barIndex: number, intensity: number) => {
                  const normalizedIndex = barIndex / 14 // 0 to 1
                  const hue = 220 + normalizedIndex * 100 // Blue to Pink spectrum
                  const saturation = 70 + intensity * 30
                  const lightness = isDarkMode ? 45 + intensity * 15 : 55 + intensity * 10
                  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
                }

                if (!isPlaying) {
                  // Static state with spectrum colors
                  const staticHeight = 12 + Math.sin(index * 0.5) * 8
                  const staticIntensity = 0.3
                  return (
                    <div
                      key={barId}
                      className="w-2 transition-all duration-700 rounded-t-sm"
                      style={{
                        height: `${staticHeight}%`,
                        backgroundColor: getSpectrumColor(index, staticIntensity),
                        opacity: 0.6,
                        filter: 'saturate(0.8)'
                      }}
                    />
                  )
                }

                // Wave animation - flows across bars naturally
                const time = Date.now() / 1000
                const waveSpeed = 2.5 // How fast the wave travels
                const waveLength = 6 // How wide the wave is

                // Main traveling wave
                const travelingWave = Math.sin((time * waveSpeed - index * 0.8) * Math.PI / waveLength)

                // Secondary wave for complexity
                const secondaryWave = Math.sin((time * waveSpeed * 1.3 + index * 0.6) * Math.PI / (waveLength * 1.5)) * 0.5

                // Beat synchronization - gentle pulse
                const beatSync = Math.sin(time * (bpm / 60) * Math.PI) * 0.3

                // Smooth wave combination
                const waveHeight = (travelingWave + secondaryWave + beatSync) * 0.5 + 0.5 // Normalize to 0-1

                // Base height curve (like real frequency spectrum)
                const baseHeight = 15 + Math.sin(index * 0.3) * 10 + index * 1.5

                // Final height with wave influence
                const finalHeight = baseHeight + waveHeight * 45

                // Intensity for color and effects
                const intensity = 0.4 + waveHeight * 0.8

                return (
                  <div
                    key={barId}
                    className="w-2 transition-all duration-100 rounded-t-sm"
                    style={{
                      height: `${Math.min(Math.max(finalHeight, 8), 88)}%`,
                      backgroundColor: getSpectrumColor(index, intensity),
                      opacity: 0.85 + intensity * 0.15,
                      filter: `brightness(${0.9 + intensity * 0.4}) saturate(${1 + intensity * 0.5})`,
                      boxShadow: intensity > 0.7 ? `0 0 ${intensity * 8}px ${getSpectrumColor(index, intensity)}40` : 'none'
                    }}
                  />
                )
              })}
            </div>
          </div>

          {/* BPM Display */}
          <div className="text-center mb-8">
            <div className={`text-6xl font-bold mb-2 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              {bpm}
            </div>
            <div className={`text-lg opacity-70 ${
              isDarkMode ? 'text-white' : 'text-gray-600'
            }`}>
              BPM
            </div>
          </div>

          {/* BPM Slider */}
          <div className="mb-8">
            <input
              type="range"
              min="40"
              max="200"
              value={bpm}
              onChange={handleBpmChange}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-sm opacity-60 mt-2">
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>40</span>
              <span className={isDarkMode ? 'text-white' : 'text-gray-600'}>200</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center mb-8">
            <button
              onClick={togglePlay}
              className={`px-12 py-4 rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl ${
                isPlaying
                  ? `bg-gradient-to-r ${isDarkMode
                      ? 'from-red-500 via-pink-500 to-purple-500 hover:from-red-400 hover:via-pink-400 hover:to-purple-400'
                      : 'from-pink-500 via-red-500 to-orange-500 hover:from-pink-400 hover:via-red-400 hover:to-orange-400'
                    } text-white`
                  : `bg-gradient-to-r ${isDarkMode
                      ? 'from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:via-emerald-400 hover:to-teal-400'
                      : 'from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:via-green-400 hover:to-teal-400'
                    } text-white`
              } backdrop-blur-sm border border-white/20`}
              style={{
                background: isPlaying
                  ? isDarkMode
                    ? 'linear-gradient(45deg, #ef4444, #ec4899, #a855f7)'
                    : 'linear-gradient(45deg, #ec4899, #ef4444, #f97316)'
                  : isDarkMode
                    ? 'linear-gradient(45deg, #10b981, #059669, #0d9488)'
                    : 'linear-gradient(45deg, #059669, #10b981, #0d9488)',
                boxShadow: `0 8px 32px ${isPlaying ? 'rgba(236, 72, 153, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
              }}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
          </div>



          {/* Beat Indicators */}
          <div className="flex justify-center gap-2">
            {getBeatsIndicatorIds(timeSignature, beatsPerMeasure).map((beatId, index) => (
              <div
                key={beatId}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  isPlaying && beat === index
                    ? `bg-gradient-to-r ${isDarkMode ? 'from-yellow-400 to-orange-400' : 'from-orange-400 to-yellow-400'}`
                    : `${isDarkMode ? 'bg-white/30' : 'bg-black/30'}`
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
