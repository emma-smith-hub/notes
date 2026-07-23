# Linux 磁盘管理

**适用场景：** 服务器添加新硬盘、桌面版挂载大容量存储、系统维护。

**特别注意：** 本文专门针对 **2TB 以上** 硬盘的 GPT 分区方案进行详解。

## 1. 查看磁盘信息

在动手之前，必须先确认新硬盘的设备代号（如 `/dev/sdb` 或 `/dev/nvme0n1`）。

### 1.1 查看所有磁盘及分区

```bash
sudo fdisk -l
```

*输出结果中，根据容量大小识别你的新硬盘。*

### 1.2 查看磁盘树状结构

这个命令更直观，会显示磁盘挂载点和大小。

```bash
lsblk
```

*例如：`sdb` 8:16 0 3T 0 disk` 表示有一块 3TB 的未挂载硬盘。*

### 1.3 查看磁盘文件系统与 UUID

```bash
blkid
```

*UUID（通用唯一标识符）是永久挂载的关键。*



## 2. 分区操作

> [!WARNING] 核心分歧点
>
> 如果硬盘 **小于 2TB**，可以使用传统的 `fdisk` 配合 MBR 分区表；如果 **大于 2TB**，**必须** 使用 `parted` 配合 **GPT** 分区表，否则系统只能识别 2TB 的容量。

### 2.1 情况 A：硬盘 < 2TB (使用 fdisk)

以 `/dev/sdb` 为例：

```bash
sudo fdisk /dev/sdb
```

1. 输入 `g` (创建新的 GPT 分区表) 或 `o` (创建 DOS/MBR 分区表)。
2. 输入 `n` (新建分区)。
3. 输入 `p` (主分区)，默认编号 1。
4. 回车默认起始扇区，回车默认结束扇区（使用全部容量）。
5. 输入 `w` (写入并退出)。

### 2.2 情况 B：硬盘 ≥ 2TB (必须使用 parted + GPT) ——重点

如果使用 `fdisk` 对 3TB 硬盘操作，即使你输入 `g` 转为了 GPT，在部分老版本中依然会有警告。**强烈建议直接用 `parted`**：

```bash
sudo parted /dev/sdb
```

进入交互式命令行后，依次执行：

```bash
(parted) mklabel gpt          		# 创建 GPT 分区表 (这一步解决 2TB 限制)
(parted) unit TB              		# 以 TB 为单位显示，方便计算
(parted) mkpart primary 0TB 3TB  	# 或者 0% 100% 代表使用全部空间
(parted) align-check optimal 1   	# 检查分区是否对齐 (提高性能)
(parted) print               	    # 查看结果
(parted) quit                 	    # 退出
```



## 3. 格式化文件系统

分区创建好后（如 `/dev/sdb1`），需要格式化才能存储文件。

### 3.1 格式化为 ext4 (最常用，推荐)

```bash
sudo mkfs.ext4 /dev/sdb1
```

### 3.2 格式化为 NTFS (如果需要在 Windows 间移动)

```bash
sudo mkfs.ntfs -f /dev/sdb1
```



## 4. 临时挂载 (重启失效)

适合测试或一次性拷贝数据。

```bash
# 1. 创建挂载点目录
sudo mkdir /mnt/mydata

# 2. 执行挂载
sudo mount /dev/sdb1 /mnt/mydata

# 3. 验证挂载结果
df -h /mnt/mydata
```

**卸载命令：**

```bash
sudo umount /mnt/mydata
# 或者
sudo umount /dev/sdb1
```



## 5. 永久挂载 (重启自动挂载)

修改 `/etc/fstab` 文件。**强烈建议使用 UUID 而不是设备名**（设备名如 sdb1 可能会在重启后变化）。

### 5.1 获取磁盘的 UUID

```bash
sudo blkid /dev/sdb1

# 输出示例：/dev/sdb1: UUID="a1b2c3d4-e5f6-..." TYPE="ext4"
```

### 5.2 编辑 fstab 文件

```bash
sudo vim /etc/fstab
```

在文件末尾添加一行，格式如下：

```text
UUID=你的UUID号码   /mnt/mydata   ext4   defaults,noatime   0   2
```

**参数解释：**

- `UUID=...`：唯一标识符。
- `/mnt/mydata`：挂载点（必须事先存在）。
- `ext4`：文件系统类型。
- `defaults,noatime`：默认挂载参数 + 不记录访问时间（提高SSD/机械盘性能）。
- `0`：备份标志（0为不备份）。
- `2`：开机检查顺序（1为根目录，2为其他分区，0为不检查）。

### 5.3 验证 fstab 是否正确 (重要！)

执行以下命令，如果没有任何错误，说明语法正确；如果有报错，请立即修复，否则下次开机会进入维护模式。

```bash
sudo mount -a
```



## 6. 卸载硬盘 (Umount)

无论是临时还是永久挂载，卸载操作都是一样的。

### 6.1 正常卸载

```bash
sudo umount /mnt/mydata
```

### 6.2 强制卸载 (当提示 "target is busy" 时)

如果有进程正在占用该目录，需要先杀掉进程。

```bash
# 查看哪些进程在占用
sudo lsof | grep /mnt/mydata

# 或者使用 fuser 直接杀掉占用进程
sudo fuser -km /mnt/mydata

# 再次卸载
sudo umount /mnt/mydata
```

### 6.3 移除永久挂载 (取消开机自启)

如果需要彻底移除该硬盘的自动挂载，再次编辑 `/etc/fstab`：

```bash
sudo vim /etc/fstab
# 找到对应的 UUID 那行，在前面加 # 注释掉，或者直接删除该行。
```



## 总结速查表

| 操作场景          | 关键命令                                 |
| :- | :- |
| **查看磁盘**      | `lsblk`                                  |
| **2T 以上分区**   | `sudo parted /dev/sdb` -> `mklabel gpt`  |
| **格式化为 ext4** | `sudo mkfs.ext4 /dev/sdb1`               |
| **查看 UUID**     | `sudo blkid /dev/sdb1`                   |
| **永久挂载**      | 编辑 `/etc/fstab`，添加 UUID 行          |
| **测试挂载配置**  | `sudo mount -a`                          |
| **强制卸载**      | `sudo fuser -km /mnt/mydata` && `umount` |