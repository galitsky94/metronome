import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

function App() {
  const [bpm, setBpm] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const intervalRef = useRef<number | null>(null)
  const audioPoolRef = useRef<HTMLAudioElement[]>([])
  const audioIndexRef = useRef(0)

  // Calculate interval from BPM
  const interval = (60 / bpm) * 1000

  // Initialize audio pool - 5 instances for 1.1 second overlaps
  useEffect(() => {
    audioPoolRef.current = Array(5).fill(null).map(() => {
      const audio = new Audio('/sound-a-woman-enjoys-coitus (mp3cut.net).mp3')
      audio.volume = 1.0
      return audio
    })
  }, [])

  // Play sound using audio pool - preserves full 1.1s duration
  const playSound = useCallback(() => {
    const audio = audioPoolRef.current[audioIndexRef.current]
    if (audio) {
      audio.currentTime = 0  // Reset only this instance
      audio.play()

      // Rotate to next audio instance
      audioIndexRef.current = (audioIndexRef.current + 1) % 5
    }
  }, [])

  // Start/stop metronome
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setBeat((prev) => (prev + 1) % 4)
        playSound()
      }, interval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, interval, playSound])

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

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100'
    }`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${
            isDarkMode
              ? 'from-pink-400 to-purple-400'
              : 'from-purple-600 to-pink-600'
          } bg-clip-text text-transparent`}>
            metronome
          </h1>
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
              {Array(15).fill(0).map((_, index) => {
                if (!isPlaying) {
                  // Static state - gentle random heights
                  const staticHeight = 15 + (index % 5) * 3
                  return (
                    <div
                      key={`eq-bar-${index}`}
                      className={`w-2 transition-all duration-500 rounded-t-sm ${
                        isDarkMode
                          ? 'bg-gradient-to-t from-cyan-400 via-blue-500 to-purple-500'
                          : 'bg-gradient-to-t from-cyan-500 via-purple-500 to-pink-500'
                      }`}
                      style={{
                        height: `${staticHeight}%`,
                        filter: 'brightness(0.4) saturate(0.8)',
                        opacity: 0.7
                      }}
                    />
                  )
                }

                // Natural EQ simulation when playing
                const time = Date.now() / 1000 // Convert to seconds
                const barFreq = 0.5 + index * 0.3 // Each bar has different frequency
                const beatPulse = Math.sin(time * (60 / interval) * 1000 * Math.PI / 500) // Sync with BPM
                const naturalWave = Math.sin(time * barFreq + index) * 0.3 // Individual bar movement
                const randomFlutter = Math.sin(time * (2 + index * 0.5)) * 0.15 // Random variation

                // Frequency response simulation (lower frequencies react more to beats)
                const freqResponse = index < 5 ? 0.8 : index < 10 ? 0.6 : 0.4
                const beatInfluence = beatPulse * freqResponse

                // Combine all influences
                const baseHeight = 20 + index * 2 // Base frequency curve
                const dynamicMultiplier = 1 + beatInfluence + naturalWave + randomFlutter
                const finalHeight = Math.max(baseHeight * dynamicMultiplier, 8)

                // Color intensity based on activity
                const intensity = Math.max(0.3, Math.min(1.2, dynamicMultiplier))

                return (
                  <div
                    key={`eq-bar-${index}`}
                    className={`w-2 transition-all duration-75 rounded-t-sm ${
                      isDarkMode
                        ? 'bg-gradient-to-t from-cyan-400 via-blue-500 to-purple-500'
                        : 'bg-gradient-to-t from-cyan-500 via-purple-500 to-pink-500'
                    }`}
                    style={{
                      height: `${Math.min(finalHeight, 85)}%`,
                      filter: `brightness(${intensity}) saturate(${intensity})`,
                      boxShadow: intensity > 1 ? `0 0 ${6 * intensity}px rgba(139, 92, 246, ${0.3 * intensity})` : 'none',
                      opacity: 0.8 + intensity * 0.2
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
              className={`px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                isPlaying
                  ? `bg-gradient-to-r ${isDarkMode ? 'from-red-500 to-pink-500' : 'from-pink-500 to-red-500'} text-white shadow-lg`
                  : `bg-gradient-to-r ${isDarkMode ? 'from-green-500 to-emerald-500' : 'from-emerald-500 to-green-500'} text-white shadow-lg`
              }`}
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>
          </div>



          {/* Beat Indicators */}
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
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
