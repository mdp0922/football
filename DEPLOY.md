# 云服务器部署指南

本指南将帮助您在云服务器（如阿里云、腾讯云、华为云等）上部署该项目。

## 1. 准备工作

确保您的云服务器满足以下条件：
- 操作系统：推荐 Ubuntu 20.04/22.04 或 CentOS 7+
- 已安装 Docker 和 Docker Compose
- 开放了必要的端口（安全组规则）：
  - 80 (HTTP)
  - 5432 (PostgreSQL，可选，如果不需要外部访问数据库可不开放)

### 安装 Docker (如果尚未安装)

**Ubuntu:**
```bash
curl -fsSL https://get.docker.com | bash
```

**CentOS:**
```bash
curl -fsSL https://get.docker.com | bash
systemctl start docker
systemctl enable docker
```

### 安装 Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

## 2. 上传代码

将项目代码上传到服务器。您可以使用 `git` 或 `scp` / `sftp`。

**推荐方式 (Git):**
```bash
# 在服务器上
git clone <您的仓库地址>
cd football
```

**或者直接上传文件 (不包含 node_modules):**
确保上传以下核心文件/目录：
- `server/`
- `src/`
- `public/`
- `Dockerfile`
- `docker-compose.prod.yml`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.mts`
- `index.html`
- `.dockerignore`

## 3. 启动服务

### 3.1 正常启动（推荐）
在项目根目录下，使用 `docker-compose.prod.yml` 启动服务：

```bash
# 构建并后台启动
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3.2 如果遇到构建网络问题（DNS错误）
如果在构建过程中出现 `npm install` 失败（如 `EAI_AGAIN`），请使用以下步骤**手动构建**：

```bash
# 1. 停止现有服务
docker-compose -f docker-compose.prod.yml down

# 2. 使用 host 网络手动构建镜像（解决DNS问题）
docker build --network=host -t football-app .

# 3. 启动服务（使用刚才构建好的镜像）
docker-compose -f docker-compose.prod.yml up -d
```

## 4. 验证部署

### 4.1 服务器内验证 (Local Check)
在云服务器终端执行：
```bash
# 应该返回 HTML 代码
curl -v http://localhost
```
- 如果返回 `Connection refused`：服务未启动，检查 `docker ps`。
- 如果返回 HTML 内容：服务正常。

### 4.2 外部验证 (External Check)
在浏览器访问 `http://<您的服务器IP>`。
- 如果可以打开：部署成功。
- 如果打不开但服务器内验证成功：请检查云服务商的**安全组**设置（放行 TCP 80）。

- 接口地址为 `http://<您的服务器IP>/api`。

## 5. 常见问题排查 (Troubleshooting)

如果访问不了（如连接超时、拒绝连接），请按以下顺序检查：

### 1. 检查安全组 (Security Group)
确保云服务商控制台（阿里云/腾讯云）的安全组入方向规则已允许 **80** 端口。

### 2. 检查服务器内部防火墙
即使安全组开了，服务器操作系统内部的防火墙也可能拦截。

**CentOS (firewalld):**
```bash
# 查看状态
systemctl status firewalld
# 开放 80 端口
firewall-cmd --zone=public --add-port=80/tcp --permanent
# 重载配置
firewall-cmd --reload
```

**Ubuntu (ufw):**
```bash
# 查看状态
sudo ufw status
# 开放 80 端口
sudo ufw allow 80/tcp
```

### 3. 检查容器状态
确认容器正在运行且端口映射正确：
```bash
docker ps
# 应该看到类似：0.0.0.0:80->3000/tcp
```

### 4. Git Clone 报错 SSL 证书问题
如果出现 `error setting certificate verify locations: CAfile: ...`，说明服务器缺少 CA 证书。

**CentOS:**
```bash
yum reinstall -y ca-certificates
update-ca-trust
```

**Ubuntu:**
```bash
apt-get install --reinstall ca-certificates
update-ca-certificates
```

**临时解决方案 (不推荐长期使用):**
```bash
git config --global http.sslVerify false
```

## 6. 常用维护命令

```bash
# 查看日志
docker-compose -f docker-compose.prod.yml logs -f

# 停止服务
docker-compose -f docker-compose.prod.yml down

# 重启服务
docker-compose -f docker-compose.prod.yml restart

# 更新代码后重新部署
git pull
# 如果遇到冲突（强制覆盖本地修改）：
# git fetch --all
# git reset --hard origin/main
# git pull

# 如果需要彻底重新安装（Clean Re-install）：
# 1. 停止并清理服务
# docker-compose -f docker-compose.prod.yml down
# 2. 返回上级目录并删除项目
# cd .. && rm -rf football
# 3. 重新克隆
# git clone <您的仓库地址> football
# 4. 进入目录并启动
# cd football && docker-compose -f docker-compose.prod.yml up -d --build

docker-compose -f docker-compose.prod.yml up -d --build
```
