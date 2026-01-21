import { pipeline, env, type PipelineType, WhisperTextStreamer, WhisperTokenizer, AutomaticSpeechRecognitionPipeline, type AudioPipelineInputs } from "@huggingface/transformers";
interface payloadInterface {
    task: PipelineType,
    model: string,
    config: object
}
interface pp {
    timestamp: number[];
    tokens: string[];
    finalised: boolean;
}
// 开启子线程=> 加载模型 =>传递相关音频 =>在子线程中进行推理
//      => 通过self.PostMessage传递推理结果给主线程
class ModelWorker {

    static model: AutomaticSpeechRecognitionPipeline;
    static isInitialized = false;
    static chunks_to_process: pp[] = [];
    static windowIdx = 0;
    // 保证 加载的模型有且唯一

    // 加载大模型
    static async init(payload: payloadInterface) {
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
        self.postMessage({ status: "Done", message: result })
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
        self.postMessage({ status: "Done", message: result })
    }

    static async modelFileLoad(payload: payloadInterface, progress_callback: ((x: any) => void)): Promise<AutomaticSpeechRecognitionPipeline> {
        const { task, model, config } = payload;
        const config_modified = { ...config, progress_callback }

        env.allowRemoteModels = true;
        env.allowLocalModels = false;
        env.localModelPath = '/model';
        const res = await pipeline(
            task,
            model,
            config_modified)
        self.postMessage({ mes: "ok" })
        return res as AutomaticSpeechRecognitionPipeline;
    }

    static on_chunk_start(timestamps: number) {

        // console.log('start',timestamps);
        const item = ModelWorker.chunks_to_process[ModelWorker.windowIdx];
        if (!item) {
            ModelWorker.chunks_to_process.push({
                timestamp: [timestamps],
                tokens: [],
                finalised: false,
            });
        }
    }

    static on_chunk_end(timestamp: number) {
        console.log('end', timestamp);

        const item = ModelWorker.chunks_to_process[ModelWorker.windowIdx];
        if (item) {
            item.finalised = true
        }
    }
    static callback_function(tokenText: string) {
        // console.log('callback_function',tokenText)

        let item = ModelWorker.chunks_to_process[ModelWorker.windowIdx];
        // console.log(item,windowIdx,chunks_to_process)
        if (item) {
            item.tokens.push(tokenText)
            if (item.finalised) {
                ModelWorker.windowIdx++;
                self.postMessage({mes:item,status:"res"})
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


async function actionSwitch(action: string, payload: payloadInterface) {
    switch (action) {
        case "init":
            await ModelWorker.init(payload);
            break;

        case "generate":
            await ModelWorker.generate(payload.task, "en");
            break;
    }
}

self.addEventListener('message', async (e) => {
    const { action, payload } = e.data;
    await actionSwitch(action, payload);
})

