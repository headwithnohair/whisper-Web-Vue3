import { pipeline, env, AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

class ModelWorker {
    // 开启子线程=> 加载大模型 =>传递相关音频 =>在子线程中进行推理=> 通过self.PostMessage传递推理结果给主线程
    // 保证 加载的模型有且唯一

    // 加载大模型
    static async function init(payload) {
        modelFileLoad(payload);
        self.postMessage({payload})
    }
    static function action(action, payload) {
        
        switch (action) {
            case "init":
                init(payload);
                break;
        
            case "startTrans":
                break;
        }

    }
//     self.onmessage = async (e) => {
//     const { action, payload, requestId } = e.data;
//         action(action,payload);
// };

async function modelFileLoad( payload) {
    // const { task, model, config } = payload;
    // env.allowRemoteModels = true;
    // env.allowLocalModels = false;
    // env.localModelPath = '/model';
    // const res = await pipeline(
    //     task,
    //     model,
    //     config)

    return ;
}
}
self.addEventListener('message', async (e) => {
    const { action, payload } = e.data;

    switch (action) {
        case 'init':
            init(payload);
            break;

        case 'startTrans':
            break;
    }})
