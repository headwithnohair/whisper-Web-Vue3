# audioP

1.whisper 采用录音常用采样率 16000,在音频转录前需要留意,使用url传递音频文件那么pipline能够自动转化,但是使用float32Array则需要自己手动转化.
2.本项目使用web worker作为子线程.避免在加载模型,使用模型时卡顿.web worker不支持 blob url,故采用 float32Array 传递数据给模型
3.针对大于30秒的音频,配置后的whisper 会自动进行切割.

目前似乎不支持根据在流式输出时句子chunk输出时间戳(输出了也是对不上整个音频的),虽然以前的demo有相关实现,但目前demo是不支持的;另外transformer.js v4快出了,到时候看看有没有相关实现,如果没有的话,我就提个issue问问.

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
