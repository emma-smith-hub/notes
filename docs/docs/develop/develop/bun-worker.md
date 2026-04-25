# Bun Workers

[官方文档](https://bun.com/docs/runtime/workers)

>   [!important]
>
>   注意：如果处理需要操控的任务时，尽可能在 `onmessage` 事件中处理，这样可控。
>
>   -   **`worker` 是在主线程 `new` 的时候就会执行。**
>   -   主线程 `postMessage` 后，`worker` 通过监听 `message` 然后执行代码。
>
>   注意：如果处理不需要由主线程控制的任务。
>
>   -   **`worker` 是在主线程 `new` 的时候就会执行**
>   -   可以通过顶层直接开始写处理逻辑。



## 1. 简单示例

::: code-group

``` ts [main.ts]
/**
 * 这里的路径要是 url:file 路径。而不能使用 path \ fs 路径
 */
const worker = new Worker(new URL('workers.ts', import.meta.url).href)

/**
 * 向 workers 发送数据
 */
worker.postMessage({ status: 0, name: 'main' })

/**
 * 从 worker 接收数据
 * 
 * @param event MessageEvent
 */
worker.onmessage = (event: MessageEvent) => {

    /**
     * event.data 从 worker 传来的数据
     */
    const { status, name } = event.data as { status: number, name: string }

    console.log(`[main 接收到数据]: ${status}, ${name}`)
}
```



``` ts [worker.ts]
// 给 ts 指定类型
declare var self: Worker

self.onmessage = (event: MessageEvent) => {

    /**
     * event.data 从主线程传来的数据
     */
    const { status, name } = event.data as { status: number, name: string }

    console.log(`[workers 接收到数据]: ${status}, ${name}`)

    /**
     * postMessage(any) 向主线程发送数据
     */
    postMessage({ status: status + 1, name: 'workers' })
}

```

:::



## 2. Options

### smol

性能模式

``` ts
const worker = new Worker(new URL('workers.ts', import.meta.url).href, {
    smol: true  // // 降低内存，但可能影响性能,减少 Worker 的内存占用。
})
```



当启用 `smol: true` 时，Bun 会：

-   减少 V8 引擎的初始堆内存大小
-   降低代码缓存的内存使用
-   采用更激进的内存回收策略



>   [!NOTE]
>
>   ✅ 适合 smol 的场景：
>
>   1.   大量 Worker 实例（如 100+ 个）
>   2.   每个 Worker 处理小型任务
>   3.   内存受限的环境（容器、边缘计算）
>
>   ❌ 不适合的场景：
>
>   1.   每个 Worker 需要处理大量数据
>   2.   CPU 密集型计算任务
>   3.   需要快速响应的实时系统



### env

环境变量隔离。

::: code-group

``` ts{8-12} [main.ts]
const users = [
    { name: '张三', age: 15, apiKey: 'xxx-zhangsan' },
    { name: '李四', age: 20, apiKey: 'xxx-lisi' },
]

const workers = users.map(user => {
    return new Worker(new URL('workers.ts', import.meta.url).href, {
        env: {
            NAME: user.name,
            AGE: user.age.toString(),
            API_KEY: user.apiKey
        }
    })
})


workers.map(worker => {
    // do someting ...
})

/** output
 * 控制台可能不输出
 * 原因是，workers 是在后台的线程中运行的。所以当前控制台可能看不到消息...
 * 当前环境变量：{"name":"张三","age":"15","apiKey":"xxx-zhangsan"}
 * 当前环境变量：{"name":"李四","age":"20","apiKey":"xxx-lisi"}
 */
```



``` ts{7} [workers.ts]
// 给 ts 指定类型
declare var self: Worker

self.onmessage = (event: MessageEvent) => {

    // 获取当前 worker 的环境变量
    const { NAME, AGE, API_KEY } = process.env

    // 输出一下
    console.log(`当前环境变量：${JSON.stringify({name:NAME, age:AGE, apiKey: API_KEY})}`);
}

```

:::



## 3. 退出

### worker 主动退出

`worker` 在执行完代码后会主动退出。不用操心。自己就退出了。

::: code-group

``` ts [worker.ts]
import { sleep } from "bun"

declare var self: Worker

self.postMessage('2s 后退出')
await sleep(1000)

self.postMessage('1s 后退出')
await sleep(1000)

self.postMessage('退出！')
```

``` ts [main.ts]
const worker = new Worker(new URL('worker.ts', import.meta.url).href)

worker.onmessage = (event: MessageEvent) => {
    console.log(event.data);
}

// 主线程可以通过 事件监听 来处理其他事情
worker.addEventListener('close', () =>{
    console.log('监听到 worker 退出');
})

/** output
 * 
 * 2s 后退出
 * 1s 后退出
 * 退出！
 * 监听到 worker 退出
 *  */
```

:::



### worker 手动退出

`process.exit()`

::: code-group

``` ts [worker.ts]
import { sleep } from "bun"

declare var self: Worker

/**
 * 当 worker 监听 onmessage 时。
 *    - worker 就不会自动退出了
 *    - 要退出必须手动退出！
 */

// main 在监听 onmessage -> 
self.postMessage({ type: 'close', message: '子线程：我请求关闭！' })

// 这里有一点切记！不要和主线程在 onmessage 中互 postMessage ！！ 会死循环！
self.onmessage = async (e: MessageEvent) => {
    const { type, delay } = e.data

    if (type === 'close') {
        console.log(`子线程：接收到准许关闭，即将在 ${delay}ms 后关闭！`);

        await sleep(delay)

        process.exit() // 自己让自己关闭  // [!code focus]
    }
}
```



``` ts [main.ts]
const worker = new Worker(new URL('worker.ts', import.meta.url).href)

// 这里有一点切记！不要和主线程在 onmessage 中互 postMessage ！！ 会死循环！
worker.onmessage = async (e: MessageEvent) => {
    const { type, message } = e.data

    if (type === 'close') {
        console.log(message);
        console.log('主线程：接收到关闭请求，我将发送关闭 delay');
        worker.postMessage({ type: 'close', delay: 3000 })
    }
}

worker.addEventListener('close', () => {
    console.log('监听到 worker 关闭');
})
```

:::



### 主线程手动控制 worker 退出

`worker.terminate()`

::: code-group

``` ts [main.ts]
import { sleep } from "bun";

const worker = new Worker(new URL('worker.ts', import.meta.url).href)

// 这里有一点切记！不要和主线程在 onmessage 中互 postMessage ！！ 会死循环！
worker.onmessage = async (e: MessageEvent) => {
    const { type, message } = e.data

    if (type === 'close') {
        console.log(message);
        worker.postMessage({ type: 'close', message: '主线程：接收到关闭请求，我会在 3000ms 后将你关闭' });
        await sleep(3000)

        worker.terminate()  // 主线程关闭子线程  // [!code focus]
    }
}

worker.addEventListener('close', () => {
    console.log('监听到 worker 关闭');
})
```





``` ts [worker.ts]
declare var self: Worker

/**
 * 当 worker 监听 onmessage 时。
 *    - worker 就不会自动退出了
 *    - 要退出必须手动退出！
 */

// main 在监听 onmessage -> 
self.postMessage({ type: 'close', message: '子线程：我请求关闭！' })

// 这里有一点切记！不要和主线程在 onmessage 中互 postMessage ！！ 会死循环！
self.onmessage = async (e: MessageEvent) => {
    const { type, message } = e.data

    if (type === 'close') {
        console.log(message);
    }
}

```

:::
