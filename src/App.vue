<script setup lang="ts">
import {pipeline,env, AutomaticSpeechRecognitionPipeline, WhisperTextStreamer, WhisperTokenizer} from "@huggingface/transformers";
import { onBeforeUnmount, onMounted,reactive,ref } from "vue";
import AudioChoose from "./compoment/ui/AudioChoose.vue";
import AudioPlayer from "./compoment/ui/AudioPlayer.vue";

const float32Array = ref<Float32Array>(new Float32Array());
  const WHISPER_SAMPLING_RATE = 16_000;
const MAX_AUDIO_LENGTH = 30; // seconds
const MAX_SAMPLES = WHISPER_SAMPLING_RATE * MAX_AUDIO_LENGTH;
const worker = new Worker( new URL('./worker/simpleWorker.ts',import.meta.url),{ type: 'module' });
worker.addEventListener('message',(e)=>console.log(e.data))
worker.addEventListener('messageerror',(e)=>console.log(e.data))
worker.addEventListener('error', (e) => {
  console.error('Worker error:', e);
  console.error('Error message:', e.message);
  console.error('Error filename:', e.filename);
  console.error('Error lineno:', e.lineno);
});
const test =()=>{
  worker.postMessage({action:"init",module:'modelFileLoad',payload:payload})
}
const workertest =()=>{
  const pp={ task:float32Array.value,
  model:"Xenova/whisper-tiny",
  config:{}}
  worker.postMessage({action:"generate",module:'modelFileLoad',payload:pp})
}

const transcriber =ref<AutomaticSpeechRecognitionPipeline |null>(null);

const payload ={
 task:'automatic-speech-recognition',
  model:"Xenova/whisper-tiny",
  config:{
  dtype: 'auto' ,
  // local_files_only: true,
  // progress_callback: (data: any) => console.log(data),
  device:"webgpu",
  }
}

let windowIdx = 0;
const audioUrl = ref<string>("");
  interface pp{
    timestamp: number[];
    tokens: string[];
    finalised: boolean;
}
const chunks_to_process =reactive<pp[]>([]);
const initModel =async ()=>{
  env.allowRemoteModels=true;
  env.allowLocalModels =false;
  env.localModelPath='/model';
  try{
  if(!transcriber.value){
transcriber.value = await pipeline(
  'automatic-speech-recognition',
  "Xenova/whisper-tiny",
  {
  dtype: 'auto' ,
  // local_files_only: true,
  // progress_callback: (data: any) => console.log(data),
  device:"webgpu",
  
  }) as unknown as AutomaticSpeechRecognitionPipeline;
console.log("ok");

  }else{
  console.log('p')
  } 
  }catch(e){
    console.log(e);
  }
}

/**
 *
 */
const textStreamer = async (transcriber:AutomaticSpeechRecognitionPipeline)=>{
  chunks_to_process.splice(0);
  windowIdx=0
  console.log(chunks_to_process)
const tokenizer = transcriber.tokenizer as  WhisperTokenizer;
const stem1 =new WhisperTextStreamer(tokenizer,{  
  skip_prompt: true,
  time_precision:0.02,
  // on_chunk_start:on_chunk_start,
  // on_chunk_end:on_chunk_end,
  // callback_function:callback_function,

});
  const result = await transcriber(audioUrl.value, { 
  max_new_tokens: 512,
  do_sample: false, 
  chunk_length_s: 30,        // 每块 30 秒   25 
  stride_length_s: 5,        // 重叠 5 秒（减少边界效应）
  language: 'en',            // 显式指定语言（见第 3 条）
  return_timestamps:true,
  streamer:stem1,
  // force_full_sequences:true,
 });
 console.log(result);
 console.log('end');
};
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
async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Promise<AudioBuffer> {
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


const startTrans =async (transcriber:AutomaticSpeechRecognitionPipeline)=>{
 console.log('======');
  const output = await transcriber(audioUrl.value,{
    language:'ja',
    top_k: 0,
    do_sample: false,
    // Sliding window
    chunk_length_s: 30,        // 每块 30 秒
    stride_length_s: 5,        // 重叠 5 秒（减少边界效应）
    // Return timestamps
    return_timestamps: true,
    force_full_sequences: false,
    // Callback functions
  })
  console.log(output);
}
onMounted(async()=>{
})

onBeforeUnmount(()=>{
  URL.revokeObjectURL( audioUrl.value);
})
</script>
<template>
  <div>
    <audio-choose :audio-url="audioUrl" @changeUrl="changUrl">
    </audio-choose>
    <audio-player :audio-url="audioUrl">
    </audio-player>
      <t-button @click="initModel">
       模型初始化
      </t-button>
      <t-button @click="startTrans(transcriber as AutomaticSpeechRecognitionPipeline )" :disable='transcriber===null'>
       执行模型
      </t-button>
      <t-button @click="textStreamer(transcriber as AutomaticSpeechRecognitionPipeline )" :disable='transcriber===null'>
       流式执行模型
      </t-button>
      worker
           <t-button @click="test">
       test worker
      </t-button>
              <t-button @click="workertest">
        worker
      </t-button>
      <t-row v-for="item in chunks_to_process">
        <t-col> {{ item.timestamp }}</t-col>        
        <t-col> {{ item.tokens.join('') }}</t-col>
      </t-row>
  </div>


</template>

<style scoped>



</style>
