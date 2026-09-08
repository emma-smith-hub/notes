# LLAMA 运行本地模型

- [官网](https://llama.app/)

## 查看显卡

```powershell
llama cli --list-devices
```

## 下载模型

```powershell
# 指定下载地址
$env:LLAMA_CACHE = "E:\Models"

# 下载命令
llama download -hf 模型名称
```

## server 启动

这里指定后端为：`Vulkan0` 具体请查看：[查看显卡](#查看显卡)

### 所有模型

```powershell
# 所有模型启动前，应该还需要指定 LLAMA_CACHE ... 不然获取不到所有模型
$env:LLAMA_CACHE = "E:\Models"

llama server --models-dir "E:\Models" --device Vulkan0 --host 0.0.0.0 --port 4567
```

### 指定模型

```powershell
llama server -m "E:\Models\models--unsloth--Qwen3.5-9B-GGUF\snapshots\3885219b6810b007914f3a7950a8d1b469d598a5\Qwen3.5-9B-Q4_K_M.gguf" --host 0.0.0.0 --port 4567
```



## embedding server

>   chat server 和 embedding server 只能分开启动，使用两个端口，也不知道为什么...

`--embedding`

```powershell
llama server -m "E:\Models\Qwen3-Embedding-4B-Q4_K_M.gguf" --embedding --host 0.0.0.0 --port 4567
```

