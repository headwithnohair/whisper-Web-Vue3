import {pipeline,env, AutomaticSpeechRecognitionPipeline} from "@huggingface/transformers";
export default async function (action, payload){

  const {task,model,config } =payload;
  env.allowRemoteModels=true;
  env.allowLocalModels =false;
  env.localModelPath='/model';


  const res=await pipeline(
  task,
  model,
  config)
  console.log("????");
return res;

}