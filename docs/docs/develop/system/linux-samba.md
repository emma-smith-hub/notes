# Linux Samba 配置

## 一、安装 Samba

```bash
sudo apt update
sudo apt install samba smbclient cifs-utils -y
```

## 二、Samba 用户管理（增删改）

> **重要**：Samba用户必须**先存在系统用户**，然后单独设置Samba密码。

### 1. 增加 Samba 用户

```bash
# 第一步：创建系统用户（-M不建家目录，-s禁止登录shell）
sudo useradd -M -s /usr/sbin/nologin smbuser

# 第二步：设置Samba密码（独立于系统密码）
sudo smbpasswd -a smbuser
# 系统会提示输入两次密码
```

如果系统用户已存在，直接执行第二步即可。

### 2. 查看所有 Samba 用户

```bash
sudo pdbedit -L		# 只会显示 samba 的用户
```

### 3. 修改用户密码

```bash
sudo smbpasswd smbuser
```

### 4. 启用/禁用用户

```bash
# 启用用户（默认创建后自动启用）
sudo smbpasswd -e smbuser

# 禁用用户（禁止登录Samba）
sudo smbpasswd -d smbuser
```

### 5. 删除 Samba 用户

```bash
# 从Samba数据库中移除（系统用户保留）
sudo smbpasswd -x smbuser

# 如需彻底删除系统用户（谨慎操作）
sudo userdel smbuser
```



## 三、配置文件

### 1. 备份原配置

```bash
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.bak
```

### 2. 编辑配置

```bash
sudo vim /etc/samba/smb.conf
```

### 3. 完整配置示例

```ini
[global]
   workgroup = WORKGROUP
   server string = %h Samba Server
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = file
   
   # 安全设置
   map to guest = Never          # 禁止任何形式的来宾/匿名访问
   # 或使用 Bad User：将错误用户名视为无效，不给来宾权限
   # map to guest = Bad User
   
   # 兼容Win10/11的SMB协议
   server min protocol = SMB2    # 禁止SMB1，提高安全性
   client min protocol = SMB2
   
   # 禁用来宾访问（关键！）
   restrict anonymous = 2
   guest account = nobody

[Share]
   comment = Shared Files
   path = /srv/samba/share       # 修改为你的共享目录
   browsable = yes
   writable = yes
   guest ok = no                 # 关闭来宾访问
   valid users = smbuser         # 只允许指定用户
   directory mask = 0755
   # 如果想多个用户，用空格分隔：valid users = smbuser1 smbuser2
```

::: details 方便复制

``` ini
[Share]
   comment = Shared Files
   path = /srv/samba/share
   browsable = yes
   writable = yes
   guest ok = no
   valid users = smbuser
   directory mask = 0755
```

:::



### 4. 创建共享目录并设置权限

```bash
sudo chmod 777 /srv/samba/share              # 读写权限
```

### 5. 验证配置并重启服务

```bash
# 检查配置文件语法
testparm

# 重启Samba服务
sudo systemctl restart smbd

# 设置开机自启
sudo systemctl enable smbd
```



## 四、Linux 挂载 SMB 共享

### 4.1 临时挂载（重启失效）

```bash
# 创建挂载点
sudo mkdir /mnt/smb

# 挂载（交互式输入密码）
sudo mount -t cifs //192.168.1.100/Share /mnt/smb -o username=smbuser

# 或直接在命令中提供密码（不安全，仅测试用）
sudo mount -t cifs //192.168.1.100/Share /mnt/smb -o username=smbuser,password=你的密码
```

### 5.1 永久挂载（开机自动挂载）

1. **创建凭据文件**（明文存储密码，需注意权限）：

```bash
sudo vim /etc/samba/credentials
```

文件内容：

```
username=smbuser
password=你的密码
domain=WORKGROUP
```

2. **设置权限**（仅root可读写）：

```bash
sudo chmod 600 /etc/samba/credentials
```

3. **编辑 `/etc/fstab`**：

```bash
sudo vim /etc/fstab
```

添加一行：

```
//192.168.1.100/Share /mnt/smb cifs credentials=/etc/samba/credentials,uid=1000,gid=1000,iocharset=utf8,file_mode=0644,dir_mode=0755 0 0
```

参数说明：

- `uid=1000/gid=1000`：挂载后文件归属本地用户（用 `id` 命令查看自己的uid）
- `iocharset=utf8`：支持中文文件名
- `file_mode` / `dir_mode`：挂载后文件/目录的权限

4. **测试挂载**：

```bash
sudo mount -a
```

如果有错误会立即报出，修复后再重启。

### 6.1 卸载共享

```bash
sudo umount /mnt/smb
```



## 五、常用排错命令

```bash
# 查看Samba服务状态
sudo systemctl status smbd

# 查看日志
sudo tail -f /var/log/samba/log.smbd

# 测试从本机访问共享
smbclient -L //localhost -U smbuser

# 测试登录
smbclient //localhost/Share -U smbuser
```



## 快速参考卡

| 操作              | 命令                                               |
| ----------------- | -------------------------------------------------- |
| 添加Samba用户     | `sudo smbpasswd -a 用户名`                         |
| 修改Samba密码     | `sudo smbpasswd 用户名`                            |
| 删除Samba用户     | `sudo smbpasswd -x 用户名`                         |
| 查看所有Samba用户 | `sudo pdbedit -L`                                  |
| 启用/禁用用户     | `smbpasswd -e/-d 用户名`                           |
| 临时挂载          | `mount -t cifs //IP/共享 /挂载点 -o username=用户` |
| 永久挂载          | 编辑 `/etc/fstab`，添加cifs条目                    |
| 卸载              | `umount 挂载点`                                    |



