<script setup lang="ts">
import { onBeforeUnmount, onMounted,reactive,ref } from "vue";
import AudioChoose from "./compoment/ui/AudioChoose.vue";
import AudioPlayer from "./compoment/ui/AudioPlayer.vue";

const float32Array = ref<Float32Array>(new Float32Array());
const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;
const worker = new Worker( new URL('./worker/simpleWorker.ts',import.meta.url),{ type: 'module' });
const audioUrl = ref<string>("");
const payload ={
 task:'automatic-speech-recognition',
  model:"Xenova/whisper-tiny",
  config:{
  dtype: 'auto' ,
  // local_files_only: true,
  device:"webgpu",
  }
}
interface pp{
    timestamp: number[];
    tokens: string[];
    finalised: boolean;
}
const chunks_to_process =reactive<pp[]>([]);
const catchWorkerMessage=(e:any):void=>{
  const data=e.data;
  switch (data.status){
    case "progress":
           console.log(data);
      // console.log(data.progress);
      break;
    case 'ready':
      console.log("init ok");
      break;
    case '101':
      console.log(data.message);
      break;
    case '102':
      console.log(data.message);
      break;
  }
}


const loadModel =()=>{
  worker.postMessage({action:"init",payload:payload})
}
const generate =()=>{
  const pp={ 
    float32Array:float32Array.value,
    language:'en'}
  worker.postMessage({action:"generate",payload:pp})
}
const streamlyGenerate =()=>{
  const pp={ 
    float32Array:float32Array.value,
    language:'en'}
  worker.postMessage({action:"generate",payload:pp})
}

const changUrl=async (newUrl:string)=>{
  audioUrl.value=newUrl;
  // 获取音频 转化为float32Array
  const response = await fetch(newUrl);
  const arrayBuffer = await response.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);
  const resampled = await resampleAudioBuffer(decoded, 16000);
  // const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  float32Array.value= resampled.getChannelData(0); 
  console.log(float32Array.value);
}

async function resampleAudioBuffer(audioBuffer: AudioBuffer,targetSampleRate: number): Promise<AudioBuffer> {
  const { sampleRate, length, numberOfChannels } = audioBuffer;

  // 如果已经是目标采样率，直接返回
  if (sampleRate === targetSampleRate) {
    return audioBuffer;
  }

  // 计算新长度（四舍五入）
  const newLength = Math.round((length * targetSampleRate) / sampleRate);

  // 创建 OfflineAudioContext（注意：部分旧浏览器需加前缀）
  const offlineCtx = new (window.OfflineAudioContext ||
    (window as any).webkitOfflineAudioContext)(
    numberOfChannels,
    newLength,
    targetSampleRate
  );

  // 创建源并连接
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  // 渲染并返回结果
  const resampledBuffer = await offlineCtx.startRendering();
  return resampledBuffer;
}

onMounted(async()=>{
worker.addEventListener('message',catchWorkerMessage)
worker.addEventListener('messageerror',(e)=>console.log(e.data))
worker.addEventListener('error', (e) => {
  console.error('Worker error:', e);
  console.error('Error message:', e.message);
});

})

onBeforeUnmount(()=>{
  URL.revokeObjectURL( audioUrl.value);
  worker.terminate();
  console.log('worker terminate')
})
</script>
<template>
  <div class="center">
    <div>
      <p class="title">Whisper-Web-Vue3</p>
 
    </div>
     
    <audio-choose :audio-url="audioUrl" @changeUrl="changUrl">
    </audio-choose>
    <audio-player :audio-url="audioUrl">
    </audio-player>
   
      <div class="button_list">
      <t-button @click="loadModel">
      Load model 加载模型
      </t-button>

      <t-button @click="generate">
        strat generate 开始转录
      </t-button>

      <t-button @click="streamlyGenerate">
        streamlyGenerate 流式转录
      </t-button>
      <t-button @click="">
        ⚙
      </t-button>
      </div>

        <t-progress :percentage="50" />
      <t-row v-for="item in chunks_to_process">
        <t-col> {{ item.timestamp }}</t-col>        
        <t-col> {{ item.tokens.join('') }}</t-col>
      </t-row>
  </div>
</template>

<style scoped>
.center{
  text-align: center;
}
.title{
  margin-top: 10vh;
  font-size: 10vh;
  padding:10vh ;
}
.button_list{
  padding: 5px 0px;
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap; /* 可选：允许换行 */
}

</style>
