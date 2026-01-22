import { pipeline, env, type PipelineType, WhisperTextStreamer, WhisperTokenizer, AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
export {ModelWorker,type modelConfig}

// 主线程开启子线程=> 子线程加载模型 =>子线程加载完毕后,主线程传递音频 
//      =>子线程进行推理,通过self.postmessage返回输出=>主线程self.onmessage获取返回值
const MESSAGE_STATUS={
    modelLoadFinished:'100',
    modelGenerated:'101',
    modelStreamOutput:'102',
    modelError:'500',
}

class ModelWorker {

    static model: AutomaticSpeechRecognitionPipeline;
    static isInitialized:boolean = false;
    static chunks_to_process: pp[] = [];
    static windowIdx = 0;
    // 保证 加载的模型有且唯一

    // 加载大模型
    static async init(payload: modelConfig) {
        this.model = await this.modelFileLoad(payload, (x: any) => {
            self.postMessage(x);
        })
        this.isInitialized = true;
    }

    //输出结果  简单输出,在所有音频转录完成后输出
    static async generate(url: string, language?: string) {
        if (!this.isInitialized) {
            throw new Error('模型未初始化');
        }
        const result = await this.model(url, {
            max_new_tokens: 512,
            do_sample: false,
            chunk_length_s: 30,        // 每块 30 秒   25 
            stride_length_s: 5,        // 重叠 5 秒（减少边界效应）
            language: language,        // 显式指定语言
            return_timestamps: true,

        });
        self.postMessage({ status:MESSAGE_STATUS.modelGenerated, message: result })
    }
    //流式输出结果 
    static async streamlyGenerate(url: string, language?: string) {
        if (!this.isInitialized) {
            throw new Error('模型未初始化');
        }
        const tokenizer = this.model.tokenizer as WhisperTokenizer;
        const stem1 = new WhisperTextStreamer(tokenizer, {
            skip_prompt: true,
            time_precision: 0.02,
            on_chunk_start: this.on_chunk_start,
            on_chunk_end: this.on_chunk_end,
            callback_function: this.callback_function,
        });
        const result = await this.model(url, {
            max_new_tokens: 512,
            do_sample: false,
            chunk_length_s: 30,        // 每块 30 秒   25 
            stride_length_s: 5,        // 重叠 5 秒（减少边界效应）
            language: language,        // 显式指定语言
            return_timestamps: true,
            streamer: stem1,
        });
        self.postMessage({ status: MESSAGE_STATUS.modelGenerated, message: result })
    }

    static async modelFileLoad(payload: modelConfig, progress_callback: ((x: any) => void)): Promise<AutomaticSpeechRecognitionPipeline> {
        const { task, model, config,envSetting } = payload;
        const config_modified = { ...config, progress_callback };

        // 只允许远程加载模型,不允许加载本地模型
        // 如有需要,可自行修改,详见 https://hugging-face.cn/docs/transformers.js/api/env 或 https://hugging-face.co/docs/transformers.js/api/env
        env.allowRemoteModels = true;  //远程加载
        env.allowLocalModels = false; //本地加载
        env.localModelPath = '/model';//本地加载路径,由于是vite+vue  只可访问'@/public' 路径下的文件
        const res = await pipeline(
            task,
            model,
            config_modified);
        self.postMessage({  status: MESSAGE_STATUS.modelLoadFinished,message: "" })
        return res as AutomaticSpeechRecognitionPipeline;
    }

    static on_chunk_start(timestamp: number) {
        const item = ModelWorker.chunks_to_process[ModelWorker.windowIdx];
        if (!item) { //
            ModelWorker.chunks_to_process.push({
                timestamp: [timestamp],
                tokens: [],
                finalised: false,
            });
        }else{
            item.timestamp.push(timestamp);
        }
    }

    static on_chunk_end(timestamp: number) {
        const item = ModelWorker.chunks_to_process[ModelWorker.windowIdx];
        if (item) {
            item.finalised = true
        }
    }
    static callback_function(tokenText: string) {
        let item = ModelWorker.chunks_to_process[ModelWorker.windowIdx];
        if (item) {
            item.tokens.push(tokenText)
            if (item.finalised) {
                ModelWorker.windowIdx++;
                self.postMessage({mes:item,status:MESSAGE_STATUS.modelStreamOutput})
            }
        } else {
            ModelWorker.chunks_to_process.push({
                timestamp: [],
                tokens: [tokenText],
                finalised: false,
            })
        }
    }
}

interface modelConfig {
    task: PipelineType,
    model: string,
    config: object,
    envSetting:any,
}
interface pp {
    timestamp: number[];
    tokens: string[];
    finalised: boolean;
}


