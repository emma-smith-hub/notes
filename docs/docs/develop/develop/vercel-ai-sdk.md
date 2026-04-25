# vercel ai sdk

将大型语言模型（LLMs）集成到应用中非常复杂，且高度依赖于你所使用的具体模型提供者。

AI SDK标准化了跨支持供应商集成人工智能（AI）模型的标准化。这使开发者能够专注于构建出色的AI应用，而不必浪费时间在技术细节上。



-   [官方文档](https://ai-sdk.dev/docs)
-   [模型提供商](https://ai-sdk.dev/providers/ai-sdk-providers/openai)

``` shell
bun add ai

# 提供商 -> openai 兼容的
bun add @ai-sdk/openai
```

## 1. 超级简单的示例

这里使用的 `qwen`，任何支持 `openai sdk` 的提供商、中转站都可以使用 `@ai-sdk/openai`

``` ts {1,4-7}
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

const openai = createOpenAI({
    apiKey: 'xxx',
    baseURL: 'xxx'
})

const a = await generateText({
    model: openai('qwen3.6-flash-2026-04-16'),
    prompt: '你好，你是谁，你能做什么？'
})

console.log(a.text);
```

## 2. 参数配置

>   [!important]
>
>   注意：任何关于 `openai sdk` 的工厂配置参数都在：`providerOptions` 来处理。

-   [相关文档](https://ai-sdk.dev/providers/ai-sdk-providers/openai#responses-models)

``` ts
import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai" 	// [!code focus]
import { generateText } from "ai"

const openai = createOpenAI({
    apiKey: 'xxx',
    baseURL: 'xxx'
})

const a = await generateText({
    model: openai('qwen3.6-flash-2026-04-16'),
    prompt: '你好，你是谁，你能做什么？',
    providerOptions: {	// [!code focus]
        openai: {	// [!code focus]
            reasoningEffort: 'none'	// [!code focus]
        } satisfies OpenAILanguageModelResponsesOptions	// [!code focus]
    }
})

console.log(a.text);
```



## 3. 格式化返回

>   [!important]
>
>   和 `openai sdk` 一样，能直接支持的是 `openai` 的模型，对于其他模型：`claude`、 `qwen` 、`grok` 等 建议使用 **函数调用** 来实现。

-   [文档](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data#generating-structured-data)

``` ts
// 无示例，相关查看文档
```



## 4. 函数调用



### 4.1 获取参数。



[**stopWhen**](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-step-calls-using-stopwhen)

-   `stepCountIs(count)`——在指定步骤数后停止（默认：`stepCountIs(20)`)
-   `hasToolCall(toolName)`—— 在调用特定工具时停止
-   `isLoopFinished()`—— 从不触发，循环运行直到自然结束

``` ts {18-29,33-40}
import { createOpenAI, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai"
import { generateText, stepCountIs, tool } from "ai"
import z from "zod";

const openai = createOpenAI({
    apiKey: 'xxx',
    baseURL: 'xxx'
})

const a = await generateText({
    model: openai('qwen3.6-flash-2026-04-16'),
    prompt: '张三明年就 18 岁了',
    providerOptions: {
        openai: {
            reasoningEffort: 'none',
        } satisfies OpenAILanguageModelResponsesOptions
    },
    tools: {
        extract: tool({
            description: '提取结构化信息',
            inputSchema: z.object({
                name: z.string(),
                age: z.number()
            }),
            execute: async ({ name, age }) => {
                return { name, age:`${age} 岁了` }
            }
        }),
    },
    stopWhen: stepCountIs(1)	// [!code ++] 一次调用即可！只要拿到数据即可。
})

for (const item of a.toolResults) {
    // 这里就能拿到 tool 的调用参数。
    if (item.toolName === 'extract') {
        console.log(item.input);    // 函数参数
        console.log(item.output);   // 函数结果
        break
    }
}

/**
 * {
 *   name: "张三",
 *   age: 17,
 * }
 * {
 *   name: "张三",
 *   age: "17 岁了",
 * }
 */
```

















