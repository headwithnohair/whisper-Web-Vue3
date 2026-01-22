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
    </div>

</template>
<script lang="ts" setup>
import {pipeline,env, AutomaticSpeechRecognitionPipeline, WhisperTextStreamer, WhisperTokenizer} from "@huggingface/transformers";
import { reactive, ref } from "vue";
import AudioChoose from "../compoment/ui/AudioChoose.vue";
import AudioPlayer from "../compoment/ui/AudioPlayer.vue";
const audioUrl = ref<string>("");
const transcriber =ref<AutomaticSpeechRecognitionPipeline |null>(null);
const chunks_to_process =reactive<pp[]>([]);
let windowIdx = 0;
  interface pp{
    timestamp: number[];
    tokens: string[];
    finalised: boolean;
}
const changUrl=async (newUrl:string)=>{
  audioUrl.value=newUrl;
}
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


const startTrans =async (transcriber:AutomaticSpeechRecognitionPipeline)=>{
 console.log('======');
  const output = await transcriber(audioUrl.value,{
    language:'en',
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

     function on_chunk_start(timestamp: number) {
        const item = chunks_to_process[windowIdx];
        if (!item) { //
            chunks_to_process.push({
                timestamp: [timestamp],
                tokens: [],
                finalised: false,
            });
        }else{
            item.timestamp.push(timestamp);
        }
    }

     function on_chunk_end(timestamp: number) {
        const item = chunks_to_process[windowIdx];
        if (item) {
            item.finalised = true
        }
    }
    function callback_function(tokenText: string) {
        let item = chunks_to_process[windowIdx];
        if (item) {
            item.tokens.push(tokenText)
            if (item.finalised) {
               windowIdx++;
     
            }
        } else {
            chunks_to_process.push({
                timestamp: [],
                tokens: [tokenText],
                finalised: false,
            })
        }
    }
</script>
<style lang="css" module>


</style>
