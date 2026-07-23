# PVE LXC 容器完全指南

**适用场景：** 在 PVE 上部署轻量级 Linux 容器，兼顾性能与资源效率。
**核心概念：** LXC 是**系统级容器**，提供完整 OS 环境；Docker 是**应用级容器**，两者可共存互补。



## 1. LXC 基础知识速览

### 1.1 LXC vs 虚拟机

LXC 共享宿主机内核，资源占用低、启动速度快，但安全性较虚拟机略低。适合运行文件服务器、数据库等多应用服务场景。

### 1.2 特权容器 vs 无特权容器（关键抉择）

| 类型                   | 级别                               | 安全 | 资源                      | 场景  |
| :-- | :-- | :-- | :-- | :-- |
| **无特权容器**（推荐） | 容器内 root 被映射为普通用户，权限受限 | 高     | 受限，不支持 NFS/SMB 直接挂载 | 常规服务（DNS、数据库等） |
| **特权容器**           | 容器内 root = 宿主机 root              | 低     | 支持硬件直通、NFS/SMB 挂载    | 需 GPU 转码、挂载共享存储 |

**建议：** 初学者优先选择**无特权容器**保障宿主机安全。



## 2. 下载容器模板

### 2.1 更换国内源（加速下载）

PVE 官方源在国外，建议替换为清华源：

```bash
# 备份原文件
cp /usr/share/perl5/PVE/APLInfo.pm /usr/share/perl5/PVE/APLInfo.pm_back

# 替换为清华源
sed -i 's|http://download.proxmox.com|https://mirrors.tuna.tsinghua.edu.cn/proxmox|g' /usr/share/perl5/PVE/APLInfo.pm

# 重启服务生效
systemctl restart pvedaemon.service
```

### 2.2 下载模板

- **Web 界面方式：** 数据中心 → 你的 PVE 节点 → local 存储 → CT模板 → 选择模板下载（如 Debian、Ubuntu）
- **命令行方式：**

```bash
pveam download local debian-12-standard_12.0-1_amd64.tar.zst
```



## 3. 创建容器

### 3.1 Web 界面创建（推荐新手）

点击「Create CT」，按步骤配置：

1. **常规：** 设置 CT ID（如 102）、主机名、密码
2. **模板：** 选择已下载的模板
3. **磁盘：** 默认 8GB，建议根据需求调整（运行 Docker 建议 20-50GB）
4. **CPU/内存：** 按需分配
5. **网络：** 桥接选择 `vmbr0`，配置静态 IP 或 DHCP

⚠️ **关键选项：** 如需特权容器（挂载 NFS/硬件），**取消勾选**「无特权的容器」。

### 3.2 命令行创建（特权模式示例）

```bash
pct create 102 local:vztmpl/debian-12-standard_12.0-1_amd64.tar.zst \
  --rootfs local-lvm:20 \
  --memory 2048 \
  --cores 2 \
  --hostname my-lxc \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 0   # 0=特权容器，1=无特权容器
```

### 3.3 基本管理命令

```bash
pct start <CTID>     # 启动
pct stop <CTID>      # 停止
pct enter <CTID>     # 进入容器 Shell
pct status <CTID>    # 查看状态
```



## 4. 容器配置进阶

### 4.1 启用嵌套虚拟化与 FUSE

如需在 LXC 内运行 Docker 或挂载网盘，编辑容器配置文件：

```bash
nano /etc/pve/lxc/<CTID>.conf
```

添加以下内容开启高级功能：

```text
features: nesting=1,fuse=1
```

### 4.2 硬件直通配置（GPU/核显）

以 Intel 核显（/dev/dri）为例，在配置文件中添加：

```text
lxc.cgroup2.devices.allow: c 226:0 rwm
lxc.cgroup2.devices.allow: c 226:128 rwm
lxc.mount.entry: /dev/dri dev/dri none bind,optional,create=dir
lxc.apparmor.profile: unconfined
```

### 4.3 在特权容器中安装 Docker

- 配置文件中需添加 `features: keyctl=1,nesting=1`
- 安装 Docker 后验证：`docker run hello-world`



## 5. 映射宿主机目录（Bind Mounts）

这是 LXC 最常用的功能之一，但**特权容器与无特权容器处理方式不同**。

### 5.1 方法一：通过 pct set 命令（推荐）

```bash
pct set <CTID> -mp0 /宿主机/路径,mp=/容器内/挂载点
```

示例：将宿主机 `/mnt/pve/data` 映射到容器 `/data`

```bash
pct set 102 -mp0 /mnt/pve/data,mp=/data
```

### 5.2 方法二：直接编辑配置文件

```bash
nano /etc/pve/lxc/<CTID>.conf
```

添加一行：

```text
mp0: /mnt/pve/data,mp=/data
```

### 5.3 ⚠️ 无特权容器的权限处理

无特权容器存在 UID/GID 映射问题，宿主机文件的所有权与容器内不一致。解决方案：

1. **方案 A：改用特权容器**（最简单，安全性略降）
2. **方案 B：调整目录权限**：在宿主机上将目录所有者改为容器映射的 UID/GID
3. **方案 C：配置 idmap 映射**（高级），如：

```text
mp0: /mnt/pve/data,mp=/data,idmap=u:1000:100000:1;g:1000:100000:1
```

### 5.4 直接挂载 NFS/SMB（仅限特权容器）

若在特权容器内直接挂载网络存储：

```text
lxc.mount.auto: cgroup:rw proc:rw sys:rw
```



## 6. 配置检查与生效

### 6.1 重启容器使配置生效

```bash
pct stop <CTID> && pct start <CTID>
```

### 6.2 验证挂载是否成功

进入容器检查：

```bash
pct enter <CTID>
df -h | grep /data   # 确认挂载点存在
ls -la /data         # 检查文件权限
```

### 6.3 查看容器完整配置

```bash
cat /etc/pve/lxc/<CTID>.conf
```



## 总结速查表

| 操作场景               | 关键命令/路径                                       |
| :-- | :-- |
| **更换模板源**         | 修改 `/usr/share/perl5/PVE/APLInfo.pm`              |
| **下载模板**           | `pveam download local <模板名>`                     |
| **创建容器（命令行）** | `pct create <CTID> ... --unprivileged 0/1`          |
| **基本管理**           | `pct start/stop/enter <CTID>`                       |
| **映射宿主机目录**     | `pct set <CTID> -mp0 /host/path,mp=/container/path` |
| **配置文件位置**       | `/etc/pve/lxc/<CTID>.conf`                          |
| **启用 Docker 支持**   | `features: nesting=1,keyctl=1`                      |

