<script setup lang="ts">
import {pipeline,env, AutomaticSpeechRecognitionPipeline, TextStreamer, PreTrainedTokenizer, AutoTokenizer, WhisperTextStreamer, WhisperTokenizer} from "@huggingface/transformers";
import { onBeforeUnmount, onMounted,reactive,ref } from "vue";
import AudioChoose from "./compoment/ui/AudioChoose.vue";
import AudioPlayer from "./compoment/ui/AudioPlayer.vue";
const transcriber =ref<AutomaticSpeechRecognitionPipeline |null>(null);
const audioUrl = ref<string>("");
  interface pp{
    timestamp: number[];
    tokens: string[];
    finalised: boolean;
}
let chunks_to_process =reactive<pp[]>( [
       
    ]);
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
  progress_callback: (data: any) => console.log(data),
  device:"webgpu",
  }) as unknown as AutomaticSpeechRecognitionPipeline;
console.log("ok");
  }else{
  console.log('p')
  } 
  } catch(e){
    console.log(e);
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
  // const res=await transcriber(audioUrl.value,{
  // chunk_length_s: 30,        // 每块 30 秒
  // stride_length_s: 5,        // 重叠 5 秒（减少边界效应）
  // language: 'en',            // 显式指定语言（见第 3 条）
  // return_timestamps:true,
  // })
  // console.log(res);
}
/**
 *
 */
const textStreamer = async (transcriber:AutomaticSpeechRecognitionPipeline)=>{
  chunks_to_process.splice(0,chunks_to_process.length);
    console.log(chunks_to_process)
const tokenizer = transcriber.tokenizer as unknown as WhisperTokenizer;
  const stem1 =new WhisperTextStreamer(tokenizer,{  
  skip_prompt: true,
  time_precision:0.02,
  on_chunk_start:on_chunk_start,
  // on_chunk_end:on_chunk_end,
  callback_function:callback_function
});
  const result = await transcriber(audioUrl.value, { 
  max_new_tokens: 512,
  do_sample: false, 
  chunk_length_s: 30,        // 每块 30 秒
  stride_length_s: 5,        // 重叠 5 秒（减少边界效应）
  language: 'en',            // 显式指定语言（见第 3 条）
   return_timestamps:true,
   streamer:stem1,
 });
 console.log(result);
 console.log('end');
};
const changUrl=(newUrl:string)=>{
  audioUrl.value=newUrl;
}

function on_chunk_start(timestamps:number){
  chunks_to_process.push( {
          timestamp:[timestamps],
            tokens: [],
            finalised: false,
        },);
        console.log(chunks_to_process)
}
function callback_function(tokenText:string){
    let item=chunks_to_process[chunks_to_process.length-1] as pp;
       item.tokens.push(tokenText);
    
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
      <t-row v-for="item in chunks_to_process">
        <t-col> {{ item.timestamp }}</t-col>        <t-col> {{ item.tokens.join('') }}</t-col>
      </t-row>
  </div>
   

</template>

<style scoped>



</style>
