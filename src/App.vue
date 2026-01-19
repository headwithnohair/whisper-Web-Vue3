<script setup lang="ts">
import {pipeline,env, AutomaticSpeechRecognitionPipeline, WhisperTextStreamer, WhisperTokenizer} from "@huggingface/transformers";
import { onBeforeUnmount, onMounted,reactive,ref } from "vue";
import AudioChoose from "./compoment/ui/AudioChoose.vue";
import AudioPlayer from "./compoment/ui/AudioPlayer.vue";
// const worker = new Worker(
//   new URL('./worker/worker-pool.js', import.meta.url)
//   , { type: 'module' }
// );
const worker = new Worker( new URL('./worker/simpleWorker.js',import.meta.url),{ type: 'module' });
worker.addEventListener('message',(e)=>console.log(e.data))
const test =()=>{
  console.log('llll')
  worker.postMessage({action:"init",module:'modelFileLoad',payload:payload})
  
}

  worker.onmessage = (e) => {
    console.log("Message received from worker0", e.data);
  };
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
  on_chunk_start:on_chunk_start,
  on_chunk_end:on_chunk_end,
  callback_function:callback_function,

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
const changUrl=(newUrl:string)=>{
  audioUrl.value=newUrl;
}

function on_chunk_start(timestamps:number){

          console.log('start',timestamps);
            const item =chunks_to_process[windowIdx];
              if(!item)
{
  chunks_to_process.push({
          timestamp:[timestamps],
          tokens: [],
          finalised: false,
        });
}
}

function on_chunk_end(timestamp:number){
  console.log('end',timestamp);

  const item =chunks_to_process[windowIdx];
  if(item)
{
  item.finalised=true
}
}
function callback_function(tokenText:string){
// console.log('callback_function',tokenText)

  let item=chunks_to_process[windowIdx] ;
    // console.log(item,windowIdx,chunks_to_process)
    if(item)
{ item.tokens.push(tokenText)
  if(item.finalised)
  {    
    windowIdx++; 
  }
}else{
  chunks_to_process.push({
     timestamp:[],
            tokens: [tokenText],
            finalised: false,
  })
}
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
      <t-row v-for="item in chunks_to_process">
        <t-col> {{ item.timestamp }}</t-col>        <t-col> {{ item.tokens.join('') }}</t-col>
      </t-row>
  </div>


</template>

<style scoped>



</style>
