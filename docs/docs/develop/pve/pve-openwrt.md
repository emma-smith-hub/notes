# PVE 安装 OpenWrt

**适用场景：** 在 PVE 上以虚拟机方式部署 OpenWrt 软路由系统，兼容性最佳，适合做主路由或旁路由。

## 1. 创建虚拟机

### 1.1 Web 界面创建步骤

1. **PVE 管理界面** → 点击右上角「创建虚拟机」
2. **常规选项卡：**
    - VM ID：自定义（如 101）
    - 名称：OpenWrt
3. **操作系统选项卡：**
    - 不使用任何介质（镜像稍后导入）
    - Guest OS：Linux
4. **系统选项卡：**
    - 机型：`q35`（推荐）
    - BIOS：`OVMF (UEFI)`（配合 combined-efi 镜像）
    - 取消勾选「添加 EFI 磁盘」（OpenWrt 镜像自带 EFI 分区）
5. **磁盘选项卡：**
    - 直接删除默认磁盘（稍后导入 img）
6. **CPU 选项卡：**
    - 核心数：1（根据需求调整）
    - 类型：`host`（性能最佳）
7. **内存选项卡：**
    - 大小：512 MB（最小 256 MB，建议 1 GB）
8. **网络选项卡：**
    - 桥接：`vmbr0`
    - 模型：`VirtIO (paravirtualized)`（性能最优）
9. **确认并完成**

## 2. 导入 OpenWrt 镜像

目录：`/var/lib/vz/template/iso`

### 2.1 导入镜像为虚拟磁盘

```bash
qm importdisk <VMID> <镜像路径> <存储池>
```

**示例：**

```bash
qm importdisk 101 /var/lib/vz/template/iso/openwrt-23.05.4-x86-64-generic-ext4-combined-efi.img local-lvm
```

### 2.2 添加磁盘到虚拟机

Web 界面操作：

1. 进入虚拟机硬件页面
2. 双击「未使用的磁盘 0」
3. 确认总线类型（默认 `SCSI` 或 `SATA`）
4. 点击「添加」

命令行操作：

```bash
qm set 101 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-101-disk-0
```

### 2.3 设置启动顺序

Web 界面操作：

1. 虚拟机 → 选项 → 引导顺序
2. 将启动盘移到第一位
3. 取消勾选其他设备

命令行操作：

```bash
qm set 101 --boot order=scsi0
```



## 3. 启动虚拟机

### 3.1 启动 OpenWrt

```bash
qm start 101
```

### 3.2 进入控制台

- Web 界面：点击虚拟机 → 控制台
- 命令行：`qm terminal 101`



## 4. 终端配置 LAN 口 IP

### 4.1 查看当前网络配置

```bash
cat /etc/config/network
```

### 4.2 修改 LAN 口 IP

编辑网络配置文件：

```bash
vi /etc/config/network
```

**作为主路由（默认）：**

```text
config interface 'lan'
    option type 'bridge'
    option ifname 'eth0'
    option proto 'static'
    option ipaddr '192.168.1.1'      # 修改为你的管理 IP
    option netmask '255.255.255.0'
```

**作为旁路由（需指定网关）：**

```text
config interface 'lan'
        option device 'br-lan'
        option proto 'static'
        option ipaddr '192.168.2.2'      # 同网段空闲 IP
        option netmask '255.255.255.0'
        option gateway '192.168.2.1'     # 主路由 IP
        list dns '223.5.5.5'             # DNS 服务器
```

### 4.3 使用 UCI 命令快速修改（推荐）

```bash
# 修改 IP 地址
uci set network.lan.ipaddr='192.168.10.200'
# 修改网关
uci set network.lan.gateway='192.168.10.1'
# 修改子网掩码
uci set network.lan.netmask='255.255.255.0'

# 查看修改是否成功
uci show network.lan

# 提交修改
uci commit network

# 重启网络服务
ubus call network reload
```

### 4.4 设置 root 密码

```bash
passwd
```



## 5. 防火墙

### 5.1 关闭防火墙

```bash
/etc/init.d/firewall stop
```

### 5.2 开启防火墙

```
/etc/init.d/firewall start
```

## 总结速查表

| 操作场景          | 关键命令/路径                                             |
| :-- | :-- |
| **创建虚拟机**    | `qm create 101 --name OpenWrt ...`                        |
| **导入 img 镜像** | `qm importdisk <VMID> <镜像路径> <存储池>`                |
| **添加磁盘**      | `qm set 101 --scsi0 local-lvm:vm-101-disk-0`              |
| **设置启动顺序**  | `qm set 101 --boot order=scsi0`                           |
| **启动/停止**     | `qm start/stop 101`                                       |
| **进入终端**      | `qm terminal 101`                                         |
| **修改 LAN IP**   | `uci set network.lan.ipaddr='<IP>' && uci commit network` |
| **重启网络**      | `/etc/init.d/network restart`                             |
| **配置文件位置**  | `/etc/config/network`                                     |