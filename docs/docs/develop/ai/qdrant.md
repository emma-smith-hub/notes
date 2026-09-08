# QDrant 向量数据库

[官网文档](https://qdrant.tech/documentation/)



## 安装

[详情](https://qdrant.tech/documentation/installation/#docker)

``` bash
docker pull qdrant/qdrant

# 配置文件
docker run --rm qdrant/qdrant cat /qdrant/config/production.yaml > ./custom_config.yaml

# 存储映射到宿主机
docker run -p 6333:6333 \
    -v $PWD/path/to/data:/qdrant/storage \
    qdrant/qdrant
    
# 配置文件映射到宿主机
docker run -p 6333:6333 \
    -v $(pwd)/path/to/data:/qdrant/storage \
    -v $(pwd)/path/to/custom_config.yaml:/qdrant/config/production.yaml \
    qdrant/qdrant
```



## 使用



### 增



### 删



#### 改



#### 查