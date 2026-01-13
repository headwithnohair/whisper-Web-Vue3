import { ref } from "vue";

export function useAudioPlayer (audioUrl:string){
const currentTime = ref(0)
const duration = ref(0)
const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false);    

function togglePlay() {
  const audio = audioRef.value
  if (!audio) return
  if (isPlaying.value) {
    audio.pause()
  } else {
    audio.play()
  }
  isPlaying.value = !isPlaying.value
}

function onTimeUpdate() {
  if (audioRef.value) {
    currentTime.value = audioRef.value.currentTime
  }
}

function onLoaded() {
  if (audioRef.value) {
    duration.value = audioRef.value.duration
  }
}

function seek(e: Event) {
  const audio = audioRef.value
  if (audio) {
    audio.currentTime = parseFloat((e.target as HTMLInputElement).value)
  }
}



  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    togglePlay,
    onTimeUpdate,
    onLoaded,
    seek
  }

}