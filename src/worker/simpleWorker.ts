import { pipeline, env,type PipelineType} from "@huggingface/transformers";
interface payloadInterface{
    task:PipelineType,
    model:string,
    config:object
}
class ModelWorker {

    static model: any = null;
    static isInitialized = false;

    // 开启子线程=> 加载大模型 =>传递相关音频 =>在子线程中进行推理=> 通过self.PostMessage传递推理结果给主线程
    // 保证 加载的模型有且唯一

    // 加载大模型
    static async  init(payload:payloadInterface) {
      this.model = await this.modelFileLoad(payload,(x:any)=>{
        self.postMessage(x);
      });
      this.isInitialized = true;
    }

    static getModel() {
        if (!this.isInitialized) {
            throw new Error('模型未初始化');
        }
        return this.model;
    }

    static async  modelFileLoad( payload:payloadInterface,progress_callback:((x:any)=>void)) {
        const { task, model, config } = payload;
        const config_modified={...config,progress_callback}
        console.log(progress_callback);

        console.log(config);
        env.allowRemoteModels = true;
        env.allowLocalModels = false;
        env.localModelPath = '/model';
        const res = await pipeline(
            task,
            model,
            config_modified)
        self.postMessage({mes:"ok"})
    return ;
}}



async function  actionSwitch(action:string, payload:payloadInterface) {
        switch (action) {
            case "init":
       
                await ModelWorker.init(payload);
                break;
        
            case "startTrans":
                break;
        }
    }

self.addEventListener('message', async (e) => {
    const { action, payload } = e.data;
    await actionSwitch(action,payload);
})

