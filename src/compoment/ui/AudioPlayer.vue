<template>
    <audio ref="audioRef" :src="props.audioUrl" @timeupdate="onTimeUpdate" @loadedmetadata="onLoaded" />
      <input
        type="range"
        v-model="currentTime"
        :max="duration"
        step="0.1"
        @input="seek"
        class="progress"
      />
      <span class="time">
        {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
      </span>
      <t-button @click="togglePlay" aria-label="播放/暂停">
        {{ isPlaying ? '⏸️' : '▶️' }}
      </t-button>

</template>
<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useAudioPlayer } from '../../composables/audio/useAudioPlayer'
import {formatTime} from '../../utils/time'
const props = defineProps({audioUrl:String})
const { audioRef, currentTime, duration, isPlaying, togglePlay, onTimeUpdate, onLoaded, seek } = useAudioPlayer(props.audioUrl||'')
onBeforeUnmount(()=>{
  if (isPlaying.value) {
 togglePlay();
  } 
})

</script>
<style lang="css" scoped>
.progress {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: #e9ecef;
  border-radius: 3px;
  outline: none;
}

.progress::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
}
.time {
  font-size: 14px;
  color: #6c757d;
  min-width: 80px;
  text-align: right;
}
</style>
<script lang="ts">

</script>