# P-Queue 轻量 js 队列

`p-queue` 是一个带并发控制的 Promise 队列，非常适合用于控制 API 请求速率或限制 CPU/内存密集型任务的并发数量。

-   [npm](https://www.npmjs.com/package/p-queue)

``` shell
bun add p-queue
```



## 1. 简单使用

``` ts {5-7}
import { sleep } from "bun";
import PQueue from "p-queue";

// 1. 注册实例
const queue = new PQueue({
    concurrency: 2  // 同时可以运行 2 个任务
})

// 2. 添加任务
// 添加的任务应该是一个 promise / 异步函数

console.log('我是输出 1');

queue.add(async () => {
    await sleep(2000)
    console.log('我是第一个任务')
})

queue.add(async () => {
    await sleep(4000)
    console.log('我是第二个任务')
})

queue.add(async () => {
    await sleep(1000)
    console.log('我是第三个任务')
})

console.log('我是输出 2');

queue.add(async () => {
    await sleep(3000)
    console.log('我是第四个任务')
})

console.log('我是输出 3');

/** 可以看到，每次同时会执行两个任务，不管耗时，总是先执行完，先算。这就是典型的队列
 * 我是输出 1
 * 我是输出 2
 * 我是输出 3
 * 我是第一个任务
 * 我是第三个任务
 * 我是第二个任务
 * 我是第四个任务
 */
```



### 1.1 获取任务返回值

``` ts {5}
import PQueue from "p-queue";

const queue = new PQueue({ concurrency: 1})

const res = await queue.add(() => fetch('https://www.baidu.com'))

console.log(res.status);

/**
 * 200
 */
```



### 1.2 批量添加

>   [!important]
>
>   批量添加的错误捕捉、获取结果比较麻烦，如果一个任务错误，那么会直接 `reject`。 所以还是建议使用 `.add`

``` ts {3-9}
const queue = new PQueue({ concurrency: 3 })

const [a, b, c] = await queue.addAll([
    () => fetch('https://www.baidu.com'),
    () => fetch('https://www.google.com'),
    () => fetch('https://www.bing.com'),
], {
    timeout: 2000
})

console.log(a?.status, b?.status, c?.status);
```







## 2. 核心 api

### 2.1 实例选项

``` ts
new PQueue([options])
```



| 选项          | 类型    | 默认值      | 说明                                                 |
| :------------ | :------ | :---------- | :--------------------------------------------------- |
| `concurrency` | number  | `Infinity`  | 同时运行的最大任务数（最小 1）                       |
| `timeout`     | number  | `undefined` | 每个任务的超时时间（毫秒），超时抛出 `TimeoutError`  |
| `autoStart`   | boolean | `true`      | 是否自动执行任务，设为 `false` 需手动调用 `.start()` |
| `intervalCap` | number  | `Infinity`  | 每个时间间隔内最大执行任务数                         |
| `interval`    | number  | `0`         | 间隔时长（毫秒），与 `intervalCap` 搭配实现速率限制  |
| `strict`      | boolean | `false`     | 是否启用严格限流（滑动窗口算法），防止突发请求       |
| `queueClass`  | class   | -           | 自定义队列类，实现 `enqueue`/`dequeue`/`size`        |



### 2.2 任务选项

```ts
queue.add(fn, options)
```

-   `fn`：返回 Promise 的函数，可接收 `{ signal }` 参数用于取消
-   `options`：
    -   `priority`：优先级（数字越大越先执行）
    -   `id`：任务唯一标识，用于后续更新优先级
    -   `signal`：`AbortSignal` 用于取消任务
    -   `timeout`：覆盖全局超时设置

>   [!warning]
>
>   `await queue.add(...)` 会等待任务**完成**。
>
>   如果你只是想把任务加入队列而不阻塞后续代码，就不要 `await`。

``` ts
// 添加不同优先级的任务
queue.add(() => fetchLow(), { priority: 0 });
queue.add(() => fetchHigh(), { priority: 1 }); // 优先执行

// 设置任务级别超时
queue.add(() => slowTask(), { timeout: 10000 });

// 使用 AbortController 取消任务
const controller = new AbortController();
queue.add(() => fetchData(), { signal: controller.signal });
controller.abort(); // 如果任务还在队列中，会被移除并 reject
```



## 3. 状态与控制



| 属性/方法                    | 说明                                              |
| :--------------------------- | :------------------------------------------------ |
| `.size`                      | 队列中等待执行的任务数量                          |
| `.pending`                   | 正在执行的任务数量                                |
| `.isPaused`                  | 队列是否暂停                                      |
| `.isRateLimited`             | 是否处于限流状态                                  |
| `.isSaturated`               | 是否饱和（并发满或限流中且有任务等待）            |
| `.pause()`                   | 暂停执行                                          |
| `.start()`                   | 开始/恢复执行                                     |
| `.clear()`                   | 清空等待队列（⚠️ 注意：清除的任务永远不会 settle） |
| `.setPriority(id, priority)` | 更新指定 ID 任务的优先级                          |

>   [!warning]
>
>   **`.clear()` 会让等待中的 Promise 永远不 settle**。
>
>   调用 `.clear()` 后，那些还在队列中未执行的任务所对应的 `.add()` 返回的 Promise 既不会 `resolve` 也不会 `reject`，可能导致内存泄漏或挂起。如需取消，请使用 `AbortSignal`。





## 4. 等待特定状态

这些方法返回 `Promise`，可用于控制流程：

| 方法                          | 触发时机                                            |
| :---------------------------- | :-------------------------------------------------- |
| `queue.onEmpty()`             | 队列变空（`size === 0`）                            |
| `queue.onIdle()`              | 队列空且无运行任务（`size === 0 && pending === 0`） |
| `queue.onPendingZero()`       | 运行任务数为 0（`pending === 0`）                   |
| `queue.onRateLimit()`         | 进入限流状态时                                      |
| `queue.onRateLimitCleared()`  | 解除限流时                                          |
| `queue.onSizeLessThan(limit)` | 队列大小小于 `limit` 时                             |

``` ts
// 等待所有任务完成
await queue.onIdle();
console.log('所有任务已完成');

// 实现背压（Backpressure）：等待队列少于 10 个再添加新任务
await queue.onSizeLessThan(10);
queue.add(() => newTask());
```





## 5. 事件监听

`queue` 继承自 `EventEmitter3`，可监听以下事件：

| 事件                 | 说明                                                   |
| :------------------- | :----------------------------------------------------- |
| `'active'`           | 每个任务开始处理时                                     |
| `'completed'`        | 任务成功完成时                                         |
| `'error'`            | 任务抛出错误时（注意仍需处理 `.add()` 返回的 Promise） |
| `'empty'`            | 队列变空时                                             |
| `'idle'`             | 队列空闲（空且无运行任务）时                           |
| `'pendingZero'`      | 运行任务数为 0 时                                      |
| `'add'`              | 调用 `.add()` 且队列任务数增加时                       |
| `'next'`             | 任务完成且队列任务数减少时                             |
| `'rateLimit'`        | 进入限流时                                             |
| `'rateLimitCleared'` | 退出限流时                                             |

``` ts
queue.on('idle', () => {
  console.log('队列空闲，可以执行后续操作');
});

queue.on('error', (error) => {
  console.error('任务出错:', error);
});
```



## 6. 注意事项

**必须处理每个 `.add()` 返回的 Promise 错误**

即使监听了 `'error'` 事件，依然需要 `.catch()` 或 `await` 捕获错误，否则可能产生未处理的 Promise 拒绝。

```
// ✅ 正确：两种方式处理
queue.add(task).catch(() => {});
await queue.add(task);
```

---

**`.clear()` 会让等待中的 Promise 永远不 settle**

调用 `.clear()` 后，那些还在队列中未执行的任务所对应的 `.add()` 返回的 Promise 既不会 `resolve` 也不会 `reject`，可能导致内存泄漏或挂起。如需取消，请使用 `AbortSignal`。



