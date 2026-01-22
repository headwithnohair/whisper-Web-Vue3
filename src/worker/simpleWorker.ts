import {ModelWorker,type modelConfig} from './module/modelWorker';
interface uniPayload{
    
}
async function actionSwitch(action: string, payload: any) {
    switch (action) {
        case "init":
            await ModelWorker.init(payload);
            break;

        case "generate":
            await ModelWorker.generate(payload.float32Array, payload.language);
            break;

        case "streamlyGenerate":
            await ModelWorker.streamlyGenerate(payload.float32Array, payload.language);
    }
}
self.addEventListener('message', async (e) => {
    const { action, payload } = e.data;
    await actionSwitch(action, payload);
})

