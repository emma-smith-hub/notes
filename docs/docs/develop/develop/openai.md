# OpenAi js SDK

-   [SDK 官网](https://developers.openai.com/api/docs)

``` shell
bun add openai
```



`openai` 最新更新了 [Response Api](https://developers.openai.com/api/docs/guides/migrate-to-responses) 的写法，和之前的 `chat` 写法相比，简单了很多。



## 1. 开始使用

``` ts
import OpenAI from "openai";
const client = new OpenAI({
    apiKey: 'xxx',
    baseURL: 'xxx'
});

const response = await client.responses.create({
    model: "gpt-5.5",
    input: "你能帮我做一些什么呢？",
});

console.log(response.output_text);	// 可以直接拿到返回的 text 信息
```



## 2. 参数解释



1.   [思考文档](https://developers.openai.com/api/docs/guides/reasoning)
2.   [函数调用](#函数调用)

---

-   `model`：模型名称
-   `input`：用户输入
-   `reasoning`：推理思考
    -   `effort`：是否开启、开启级别
    -   `summary`：推理总结
-   `tools`：工具定义

``` ts
const res = await openai.responses.create({
    model: 'qwen3.6-flash-2026-04-16',  // 模型名称
    input: "你能做些什么？",   // 用户输入
    reasoning: {         // 思考
        effort: 'none'   // 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | null;
    },
    tools: [  	// 工具定义      	                    
        {
            type: 'function',	// 工具类型
            name: 'get_ai_content',	// 工具名称
            description: 'ai 应讲内容输出至这个函数',	// 工具介绍
            parameters: z.toJSONSchema(schemaResponse),		// 参数 json schema.
            strict: true	// 是否严格启用
        }
    ]
})
```





## 3. 格式化返回

-   [文档](https://developers.openai.com/api/docs/guides/structured-outputs)

>   [!important]
>
>   在格式化返回上，能直接支持的是 `openai` 的模型，对于其他模型：`claude`、 `qwen` 、`grok` 等 建议使用 **函数调用** 来实现。

``` ts {7-11,22-24}
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI();

const ResponseEvent = z.object({
    name: z.string(),
    date: z.string(),
    participants: z.array(z.string()),
});

const response = await openai.responses.parse({
    model: "gpt-4o-2024-08-06",
    input: [
        { role: "system", content: "提取相关信息" },
        {
            role: "user",
            content: "爱丽丝和鲍勃周五要去参加科学展览会。.",
        },
    ],
    text: {
        format: zodTextFormat(ResponseEvent, "event"),
    },
});

const event = response.output_parsed;
```

## 4. 函数调用

-   [文档](https://developers.openai.com/api/docs/guides/function-calling)

### 4.1 获取参数



### 4.2 函数调用

>   示例：让 `ai` 通过本地 `axios` 获取天气，然后总结发给我

``` ts
import axios from "axios"
import { OpenAI } from "openai"
import type { ResponseInputItem } from "openai/resources/responses/responses.mjs"
import z from "zod"

const openai = new OpenAI({
    apiKey: 'xxx',
    baseURL: 'xxx'
})

// 1. 定义工具函数
const getWeather = async (args: { city: string }) => {
    // 获取天气接口
    const res = await axios.get(`https://uapis.cn/api/v1/misc/weather`, {
        params: { city: args.city }
    })
    return res.data
}

// 2. 创建函数参数， jsonschema 比较麻烦，这里通过 zod 来处理
const agrs = z.object({
    city: z.string().meta({
        title: '城市名称',
        description: '需要输入城市名称',
    })
})

// 3. 创建一个对话上下文
let input: ResponseInputItem[] = [
    { role: 'user', content: '廊坊今天天气怎么样？适合穿什么衣服？' }
]

// 4. 第一轮对话，要把工具给 AI，让它调用并返回结果。
let response = await openai.responses.create({
    model: 'qwen3.6-flash-2026-04-16',
    input,
    tools: [
        {
            type: 'function',
            name: 'get_weather',
            description: '从这个工具中，可以获取到天气',
            parameters: z.toJSONSchema(agrs),
            strict: true
        }
    ]
})

// 5. 将 AI 解析的参数，通过本地调用，之后将信息再返回给 AI
for (const item of response.output) {
    // 如果 type 不是函数调用，则再回到循环
    if (item.type !== 'function_call') continue

    if (item.name === 'get_weather') {

        // 6. 添加上下文
        input.push({
            type: 'function_call',
            name: item.name,
            arguments: item.arguments,
            call_id: item.call_id
        })

        // 7. 将 citi 提取出来。
        const { city } = JSON.parse(item.arguments)

        const weather = await getWeather({ city })

        // 8. 将本地调用的结果添加到上下文
        input.push({
            type: 'function_call_output',
            call_id: item.call_id,
            output: JSON.stringify(weather)
        })

    }
}

// 9. 重新发起对话，结合上下文让 AI 给出结果
response = await openai.responses.create({
    model: 'qwen3.6-flash-2026-04-16',
    input,
    tools: [
        {
            type: 'function',
            name: 'get_weather',
            description: '从这个工具中，可以获取到天气',
            parameters: z.toJSONSchema(agrs),
            strict: true
        }
    ]
})

console.log(response.output_text);

/**
 * 今天廊坊的天气为**多云**，气温 **22℃**，南风3级，湿度54%，体感较为舒适。
 * 
 * 🧥 **穿衣建议：**
 * - 此时温度适中，建议采用**“轻薄内搭+薄外套”**的穿法，例如：长袖T恤/衬衫 + 针织开衫、薄风衣或牛仔外套。
 * - 下装适合搭配休闲裤、牛仔裤或薄款长裙。
 * - 早晚可能微凉，若长时间在户外可带一件稍厚的防风外套；日常通勤以透气舒适的衣物为主即可。

 * 出门无需带伞，但阳光时有时无，注意防晒和适时增减衣物哦！
 */
```