# 🐳 Hướng Dẫn Khởi Chạy Dự Án GreenPrep Local Bằng Docker

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Yêu Cầu Hệ Thống](#2-yêu-cầu-hệ-thống)
3. [Cấu Trúc Thư Mục](#3-cấu-trúc-thư-mục)
4. [Chi Tiết Nội Dung Các File Cấu Hình](#4-chi-tiết-nội-dung-các-file-cấu-hình)
5. [Cấu Hình Biến Môi Trường (.env)](#5-cấu-hình-biến-môi-trường-env)
6. [Cấu Hình SSL Certificate](#6-cấu-hình-ssl-certificate)
7. [Khởi Chạy Dự Án](#7-khởi-chạy-dự-án)
8. [Các Lệnh Docker Thường Dùng](#8-các-lệnh-docker-thường-dùng)
9. [Truy Cập Ứng Dụng](#9-truy-cập-ứng-dụng)
10. [Migration & Seed Dữ Liệu](#10-migration--seed-dữ-liệu)
11. [Xử Lý Sự Cố](#11-xử-lý-sự-cố)

---

## 1. Tổng Quan Kiến Trúc

Dự án GreenPrep gồm **3 source code chính** và **3 service hạ tầng**, tất cả được quản lý trong 1 folder duy nhất thông qua `docker-compose.yml`.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                          │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  GP-Admin    │  │  GP-Student  │  │      GP-API          │  │
│  │  (Vite+Nginx)│  │  (Vite+Nginx)│  │  (Node.js/Express)   │  │
│  │  Port: 3000  │  │  Port: 3001  │  │  Port: 3010          │  │
│  │  (SSL)       │  │  (SSL)       │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────────┘  │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
│  ┌──────────────┐  ┌──────┴─────────┐  ┌──────────────────┐    │
│  │  PostgreSQL  │  │    MinIO       │  │   MinIO-Init     │    │
│  │  Port: 5432  │  │  Port: 9000   │  │  (Setup bucket)  │    │
│  │              │  │  Console: 9001│  │                   │    │
│  └──────────────┘  └───────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

| Service | Mô Tả | Container Name | Port |
|---------|--------|----------------|------|
| **GP-API** | Backend API (Node.js + Express + Sequelize) | `greenprep_api` | `3010` |
| **GP-Admin** | Web Teacher/Admin (Vite + Nginx SSL) | `web_teacher` | `3000` (HTTPS) |
| **GP-Student** | Web Student (Vite + Nginx SSL) | `web_student` | `3001` (HTTPS) |
| **PostgreSQL** | Database (PostgreSQL 17 Alpine) | `greenprep_database` | `5432` |
| **MinIO** | Object Storage (tương tự S3) | `minio` | `9000` (API) / `9001` (Console) |
| **MinIO-Init** | Tự động tạo user & bucket trên MinIO | `minio-init` | — |

---

## 2. Yêu Cầu Hệ Thống

### Bắt buộc

| Phần mềm | Phiên bản tối thiểu | Kiểm tra |
|-----------|---------------------|----------|
| **Docker** | 20.10+ | `docker --version` |
| **Docker Compose** | v2.0+ | `docker compose version` |
| **Git** | 2.30+ | `git --version` |

### Tài nguyên khuyến nghị

- **RAM**: tối thiểu 4 GB (khuyến nghị 8 GB)
- **Disk**: tối thiểu 5 GB trống
- **CPU**: 2 cores trở lên

### Cài đặt Docker

- **macOS**: Tải [Docker Desktop](https://www.docker.com/products/docker-desktop/) và cài đặt.
- **Windows**: Tải [Docker Desktop](https://www.docker.com/products/docker-desktop/), bật WSL 2.
- **Linux (Ubuntu)**:
  ```bash
  sudo apt update
  sudo apt install docker.io docker-compose-plugin -y
  sudo systemctl start docker
  sudo usermod -aG docker $USER
  ```

---

## 3. Cấu Trúc Thư Mục

```
GreenLight/
├── GP-API/                    # 📦 Source Backend (Node.js + Express)
│   ├── Dockerfile             #    Multi-stage build → node:20.19-alpine
│   ├── package.json
│   ├── server.js
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── migrations/
│
├── GP-Admin/                  # 🖥️ Source Web Teacher/Admin (Vite + React)
│   ├── Dockerfile             #    Multi-stage: build Vite → serve bằng Nginx
│   ├── package.json
│   ├── nginx/
│   │   └── nginx.conf         #    Nginx config, SSL port 3000
│   └── src/
│
├── GP-Student/                # 🎓 Source Web Student (Vite + React)
│   ├── Dockerfile             #    Multi-stage: build Vite → serve bằng Nginx
│   ├── package.json
│   ├── nginx/
│   │   └── nginx.conf         #    Nginx config, SSL port 3001
│   └── src/
│
├── certs/                     # 🔒 SSL Certificates
│   ├── public.crt
│   ├── private.key
│   └── CAs/
│
├── data/                      # 💾 MinIO data (auto-generated)
├── doc/                       # 📄 Tài liệu dự án
├── exports/                   # 📂 Thư mục export
│
├── docker-compose.yml         # 🐳 Docker Compose chính
├── .env                       # ⚙️ Biến môi trường
├── Dockerfile.minio-init      # 🔧 Dockerfile cho MinIO init
└── init-minio.sh              # 🔧 Script khởi tạo MinIO
```

---

## 4. Chi Tiết Nội Dung Các File Cấu Hình

Dưới đây là nội dung đầy đủ của từng file Docker và MinIO trong dự án, kèm giải thích.

---

### 4.1. `docker-compose.yml` — File chính điều phối tất cả services

```yaml
# docker-compose.yml

version: "1.0.0"

services:
  # ─── PostgreSQL Database ─────────────────────────────────
  postgres_db:
    image: postgres:17-alpine          # Image PostgreSQL 17 bản nhẹ (Alpine)
    container_name: greenprep_database
    restart: always                     # Tự khởi động lại nếu crash
    env_file:
      - .env                            # Đọc biến POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    ports:
      - 5432:5432                        # Mở port 5432 ra máy host
    volumes:
      - postgres_data:/var/lib/postgresql/data   # Persist dữ liệu database

  # ─── MinIO Object Storage ────────────────────────────────
  minio.local:
    image: minio/minio
    restart: always
    container_name: minio
    ports:
      - 9000:9000                        # MinIO S3 API
      - 9001:9001                        # MinIO Console (Web UI)
    env_file:
      - .env                            # Đọc MINIO_ROOT_USER, MINIO_ROOT_PASSWORD
    volumes:
      - ./certs:/root/.minio/certs:ro    # Mount SSL certs (read-only)
      - ./data:/data                     # Persist dữ liệu object storage
    command: server /data --console-address ":9001"

  # ─── MinIO Init (chạy 1 lần để tạo user) ────────────────
  minio-init:
    build:
      context: .                         # Build từ Dockerfile.minio-init
      dockerfile: Dockerfile.minio-init
    container_name: minio-init
    env_file:
      - .env
    depends_on:
      - minio.local                      # Chờ MinIO khởi động trước

  # ─── GP-API (Backend Node.js) ────────────────────────────
  server:
    build: ./GP-API                      # Build từ GP-API/Dockerfile
    container_name: greenprep_api
    ports:
      - 3010:3010                        # API port
    restart: always
    env_file:
      - .env
    depends_on:
      - postgres_db                      # Chờ DB
      - minio.local                      # Chờ MinIO
      - minio-init                       # Chờ MinIO init xong

  # ─── GP-Admin (Web Teacher) ──────────────────────────────
  web_teacher:
    build:
      context: ./GP-Admin
      args:
        - VITE_BASE_URL=$VITE_BASE_URL   # Truyền biến vào build Vite
    container_name: web_teacher
    ports:
      - 3000:3000                        # HTTPS port (Nginx SSL)
    restart: always
    environment:
      - VITE_BASE_URL
    depends_on:
      - server                           # Chờ API sẵn sàng
    volumes:
      - ./certs:/etc/nginx/certs:ro      # Mount SSL certs cho Nginx

  # ─── GP-Student (Web Student) ────────────────────────────
  web_student:
    build:
      context: ./GP-Student
      args:
        - VITE_BASE_URL=$VITE_BASE_URL
    container_name: web_student
    ports:
      - 3001:3001                        # HTTPS port (Nginx SSL)
    restart: always
    environment:
      - VITE_BASE_URL
    depends_on:
      - server
    volumes:
      - ./certs:/etc/nginx/certs:ro

volumes:
  postgres_data: {}                      # Named volume cho PostgreSQL
```

---

### 4.2. `GP-API/Dockerfile` — Backend API (Node.js + Express)

```dockerfile
# Stage 1: Build stage
FROM node:20.19-alpine AS build       # Dùng Node.js 20 bản Alpine (nhẹ)

WORKDIR /app

COPY package*.json ./                  # Copy package.json & package-lock.json
RUN npm ci                             # Cài dependencies (chính xác theo lock file)

COPY . .                               # Copy toàn bộ source code

# Xoá các file không cần thiết trong production
RUN rm -rf \
    *.md \
    .git \
    .env \
    migrations

# Stage 2: Production image
FROM node:20.19-alpine

WORKDIR /app

COPY --from=build /app ./              # Copy kết quả từ stage build

EXPOSE 3010                            # Khai báo port 3010

CMD [ "npm", "start" ]                 # Chạy: NODE_TLS_REJECT_UNAUTHORIZED=0 nodemon server.js
```

> **Giải thích**: Sử dụng **multi-stage build**. Stage 1 cài dependencies và dọn dẹp file thừa. Stage 2 chỉ copy kết quả → image nhẹ hơn.

---

### 4.3. `GP-Admin/Dockerfile` — Web Teacher (Vite → Nginx SSL)

```dockerfile
FROM node:20.19-alpine AS builder      # Stage 1: Build Vite app

WORKDIR /app

COPY package*.json ./
RUN npm install                        # Cài dependencies

COPY . .

ARG VITE_BASE_URL                      # Nhận biến từ docker-compose args
ENV VITE_BASE_URL=$VITE_BASE_URL       # Set env để Vite build đúng API URL

RUN npm run build                      # Build ra thư mục dist/

FROM nginx:1.23.1-alpine               # Stage 2: Serve bằng Nginx

COPY --from=builder /app/dist /usr/share/nginx/html   # Copy build output
COPY --from=builder /app/nginx/nginx.conf /etc/nginx/conf.d/default.conf  # Copy Nginx config

EXPOSE 3000                            # Port 3000 (SSL)

CMD ["nginx", "-g", "daemon off;"]     # Chạy Nginx foreground
```

> **Giải thích**: Build Vite app trong Node.js container, sau đó serve static files bằng Nginx với SSL.

---

### 4.4. `GP-Student/Dockerfile` — Web Student (Vite → Nginx SSL)

```dockerfile
FROM node:20.19-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_BASE_URL
ENV VITE_BASE_URL=$VITE_BASE_URL

RUN npm run build

FROM nginx:1.23.1-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001                            # Port 3001 (SSL) — khác GP-Admin

CMD ["nginx", "-g", "daemon off;"]
```

> **Giải thích**: Cấu trúc giống hệt GP-Admin, chỉ khác port `3001`.

---

### 4.5. `GP-Admin/nginx/nginx.conf` — Nginx config cho Web Teacher

```nginx
server {
    listen 3000 ssl;                           # Lắng nghe HTTPS trên port 3000
    server_name localhost;

    ssl_certificate     /etc/nginx/certs/public.crt;    # SSL cert (mount từ host)
    ssl_certificate_key /etc/nginx/certs/private.key;   # SSL private key

    location / {
        root /usr/share/nginx/html;            # Thư mục chứa build output
        index index.html index.htm;
        try_files $uri /index.html =404;       # SPA fallback: mọi route → index.html
    }

    error_page 500 502 503 504 /50x.html;

    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

### 4.6. `GP-Student/nginx/nginx.conf` — Nginx config cho Web Student

```nginx
server {
    listen 3001 ssl;                           # Lắng nghe HTTPS trên port 3001
    server_name localhost;

    ssl_certificate     /etc/nginx/certs/public.crt;
    ssl_certificate_key /etc/nginx/certs/private.key;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri /index.html =404;
    }

    error_page 500 502 503 504 /50x.html;

    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

> **Giải thích**: Giống GP-Admin, chỉ đổi port từ `3000` → `3001`.

---

### 4.7. `Dockerfile.minio-init` — Dockerfile tạo MinIO init container

```dockerfile
# Dockerfile.minio-init
FROM alpine:latest                     # Image Alpine nhẹ

# Cài curl + tải MinIO Client (mc)
RUN apk add --no-cache curl bash && \
    curl -O https://dl.min.io/client/mc/release/linux-amd64/mc && \
    chmod +x mc && mv mc /usr/local/bin/

# Copy script khởi tạo
COPY init-minio.sh /init-minio.sh
RUN chmod +x /init-minio.sh

ENTRYPOINT ["/init-minio.sh"]          # Chạy script khi container start
```

> **Giải thích**: Container này chỉ chạy **1 lần** khi `docker compose up`. Nhiệm vụ: cài MinIO Client (`mc`) và chạy script tạo user/bucket.

---

### 4.8. `init-minio.sh` — Script khởi tạo MinIO (tạo user & phân quyền)

```bash
#!/bin/sh

echo "⏳ Waiting for MinIO to be ready..."

# Chờ MinIO sẵn sàng (health check)
until wget -q --spider http://minio:9000/minio/health/ready; do
  sleep 1
done

echo "MinIO is ready. Configuring..."

# Tạo alias kết nối tới MinIO server
mc alias set gp_minio https://minio.local:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"

# Tạo MinIO user cho ứng dụng (nếu chưa tồn tại)
mc admin user info gp_minio "$MINIO_ACCESS_KEY" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "➕ Creating MinIO user..."
  mc admin user add gp_minio "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
  mc admin policy attach gp_minio readwrite --user "$MINIO_ACCESS_KEY"
else
  echo "ℹ️ MinIO user already exists."
fi
```

> **Giải thích**: Script này:
> 1. Chờ MinIO khởi động xong (health check)
> 2. Tạo alias `gp_minio` để kết nối
> 3. Kiểm tra nếu user chưa tồn tại → tạo user mới với access key/secret key
> 4. Gán policy `readwrite` cho user

---

## 5. Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục gốc `GreenLight/` với nội dung sau:

```env
# =========================================
# 🖥️ Web React Vite (Frontend)
# =========================================
# Dùng cho local development:
VITE_BASE_URL=https://127.0.0.1:3010/api

# =========================================
# 🔌 API Server
# =========================================
PORT=3010
JWT_SECRET=greenprep
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# =========================================
# 🗄️ PostgreSQL Database
# =========================================
DB_HOST=postgres_db
DB_PORT=5432
POSTGRES_USER=greenprep_db_user
POSTGRES_PASSWORD=greenprep_db_password
POSTGRES_DB=greenprep_db
DATABASE_URL=postgres://greenprep_db_user:greenprep_db_password@postgres_db:5432/greenprep_db

# =========================================
# 📦 MinIO Object Storage
# =========================================
MINIO_PORT=9000
MINIO_HOST=minio.local
MINIO_ROOT_USER=gp_minio_admin
MINIO_ROOT_PASSWORD=gp_minio_pw
MINIO_ACCESS_KEY=LKIdxNj8k7Fu7gUQJzTy
MINIO_SECRET_KEY=f0muapFM4uY4ArGVlNO9nzFAvUKIDVuMwOtC49Kr
BUCKET=gp-bucket
MINIO_URL_BASE=https://127.0.0.1:9000/gp-bucket
```

> [!IMPORTANT]
> - `DB_HOST=postgres_db` trỏ tới tên container PostgreSQL trong Docker network (KHÔNG dùng `localhost`).
> - `MINIO_HOST=minio.local` trỏ tới tên service MinIO trong `docker-compose.yml`.
> - `VITE_BASE_URL` phải trỏ tới `https://127.0.0.1:3010/api` khi chạy local.

---

## 6. Cấu Hình SSL Certificate

Dự án sử dụng **self-signed SSL certificate**. Các file cert nằm trong thư mục `certs/`:

```
certs/
├── public.crt     # Certificate công khai
├── private.key    # Private key
└── CAs/           # Certificate Authority (nếu có)
```

### Tạo Self-Signed Certificate (nếu chưa có)

```bash
cd GreenLight

# Tạo thư mục certs nếu chưa có
mkdir -p certs

# Tạo self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/private.key \
  -out certs/public.crt \
  -subj "/C=VN/ST=HCM/L=HCM/O=GreenPrep/CN=localhost"
```

> [!NOTE]
> Vì sử dụng self-signed certificate, trình duyệt sẽ hiện cảnh báo **"Your connection is not private"**. Nhấn **"Advanced" → "Proceed to localhost (unsafe)"** để tiếp tục.

---

## 7. Khởi Chạy Dự Án

### 7.1. Clone & Chuẩn bị source code

Đảm bảo 3 thư mục source code (`GP-API`, `GP-Admin`, `GP-Student`) nằm cùng cấp trong thư mục `GreenLight/`.

```bash
# Di chuyển vào thư mục dự án
cd GreenLight

# Kiểm tra cấu trúc
ls -la
# Kết quả mong đợi: GP-API/  GP-Admin/  GP-Student/  docker-compose.yml  .env  certs/  ...
```

### 7.2. Build & Khởi chạy tất cả services

```bash
# Build và chạy tất cả containers (chạy nền)
docker compose up --build -d
```

> [!TIP]
> Lần đầu build sẽ mất khoảng **5–10 phút** do cần tải images và install dependencies.

### 7.3. Kiểm tra trạng thái containers

```bash
# Xem tất cả containers đang chạy
docker compose ps
```

Kết quả mong đợi (tất cả phải ở trạng thái **Up**):

```
NAME                  STATUS
greenprep_database    Up
minio                 Up
minio-init            Exited (0)    ← Bình thường, chỉ chạy 1 lần
greenprep_api         Up
web_teacher           Up
web_student           Up
```

### 7.4. Xem logs

```bash
# Xem logs tất cả services
docker compose logs -f

# Xem logs từng service
docker compose logs -f server        # GP-API
docker compose logs -f web_teacher   # GP-Admin
docker compose logs -f web_student   # GP-Student
docker compose logs -f postgres_db   # PostgreSQL
docker compose logs -f minio.local   # MinIO
```

---

## 8. Các Lệnh Docker Thường Dùng

### Quản lý containers

```bash
# Khởi động tất cả services
docker compose up -d

# Dừng tất cả services
docker compose down

# Dừng và xoá cả volumes (⚠️ mất dữ liệu database)
docker compose down -v

# Restart 1 service cụ thể
docker compose restart server
docker compose restart web_teacher

# Rebuild và chạy lại 1 service (sau khi sửa code)
docker compose up --build -d server
docker compose up --build -d web_teacher
docker compose up --build -d web_student
```

### Build lại

```bash
# Build lại tất cả (không cache)
docker compose build --no-cache

# Build lại 1 service cụ thể
docker compose build --no-cache server
docker compose build --no-cache web_teacher
```

### Truy cập shell container

```bash
# Vào shell của GP-API container
docker exec -it greenprep_api sh

# Vào shell của PostgreSQL
docker exec -it greenprep_database psql -U greenprep_db_user -d greenprep_db

# Vào shell của MinIO
docker exec -it minio sh
```

---

## 9. Truy Cập Ứng Dụng

Sau khi tất cả containers khởi chạy thành công:

| Ứng dụng | URL | Ghi chú |
|-----------|-----|---------|
| 🖥️ **Web Admin/Teacher** | [https://127.0.0.1:3000](https://127.0.0.1:3000) | HTTPS (self-signed) |
| 🎓 **Web Student** | [https://127.0.0.1:3001](https://127.0.0.1:3001) | HTTPS (self-signed) |
| 🔌 **API Server** | [https://127.0.0.1:3010/api](https://127.0.0.1:3010/api) | Backend API |
| 📦 **MinIO Console** | [http://127.0.0.1:9001](http://127.0.0.1:9001) | User: `gp_minio_admin` / Pass: `gp_minio_pw` |
| 📦 **MinIO API** | [https://127.0.0.1:9000](https://127.0.0.1:9000) | S3-compatible API |

> [!WARNING]
> Trình duyệt sẽ cảnh báo SSL vì self-signed certificate. Chọn **"Advanced" → "Proceed"** để tiếp tục.

---

## 10. Migration & Seed Dữ Liệu

### Chạy migration (tạo bảng trong database)

```bash
# Exec vào container API rồi chạy migration
docker exec -it greenprep_api npx sequelize-cli db:migrate
```

### Seed dữ liệu mẫu

```bash
# Seed tất cả
docker exec -it greenprep_api npx sequelize-cli db:seed:all

# Seed một file cụ thể
docker exec -it greenprep_api npx sequelize-cli db:seed --seed <tên-file-seed>
```

### Tạo migration mới

```bash
docker exec -it greenprep_api npx sequelize-cli migration:generate --name <tên-migration>
```

---

## 11. Xử Lý Sự Cố

### ❌ Container không start được

```bash
# Kiểm tra logs chi tiết
docker compose logs <tên-service>

# Kiểm tra port conflict
lsof -i :3000   # GP-Admin
lsof -i :3001   # GP-Student
lsof -i :3010   # GP-API
lsof -i :5432   # PostgreSQL
lsof -i :9000   # MinIO
lsof -i :9001   # MinIO Console
```

**Giải pháp**: Tắt các ứng dụng đang chiếm port trước khi chạy Docker.

### ❌ Database connection refused

**Nguyên nhân**: GP-API khởi động trước khi PostgreSQL sẵn sàng.

```bash
# Restart GP-API
docker compose restart server
```

### ❌ MinIO init thất bại

```bash
# Kiểm tra logs
docker compose logs minio-init

# Chạy lại MinIO init
docker compose up -d minio-init
```

### ❌ Frontend hiện lỗi trắng / không load

**Nguyên nhân**: `VITE_BASE_URL` sai hoặc API chưa sẵn sàng.

1. Kiểm tra `.env` file: `VITE_BASE_URL=https://127.0.0.1:3010/api`
2. Kiểm tra API đang chạy: `docker compose ps server`
3. Rebuild frontend: `docker compose up --build -d web_teacher web_student`

### ❌ SSL Certificate error trên browser

1. Mở trực tiếp API URL `https://127.0.0.1:3010/api` → Accept certificate
2. Mở MinIO `https://127.0.0.1:9000` → Accept certificate
3. Sau đó quay lại truy cập Web Admin/Student

### ❌ Build quá chậm / thiếu bộ nhớ

```bash
# Dọn dẹp Docker resources không dùng
docker system prune -a

# Kiểm tra dung lượng Docker
docker system df
```

---

## 📌 Thứ Tự Khởi Động Services

```mermaid
graph TD
    A[PostgreSQL - postgres_db] --> D[GP-API - server]
    B[MinIO - minio.local] --> C[MinIO Init - minio-init]
    B --> D
    C --> D
    D --> E[GP-Admin - web_teacher]
    D --> F[GP-Student - web_student]
```

Docker Compose tự động xử lý thứ tự khởi động qua `depends_on`, nhưng **không đảm bảo service đã sẵn sàng nhận request**. Nếu gặp lỗi kết nối, hãy restart service bị lỗi.

---

## 📝 Quick Start (TL;DR)

```bash
# 1. Đảm bảo Docker đang chạy
docker --version

# 2. Đi tới thư mục dự án
cd GreenLight

# 3. Kiểm tra file .env đã đúng cấu hình
cat .env

# 4. Build & khởi chạy
docker compose up --build -d

# 5. Chờ 3-5 phút, kiểm tra trạng thái
docker compose ps

# 6. Chạy migration (lần đầu tiên)
docker exec -it greenprep_api npx sequelize-cli db:migrate

# 7. Seed dữ liệu mẫu (tuỳ chọn)
docker exec -it greenprep_api npx sequelize-cli db:seed:all

# 8. Truy cập ứng dụng
# Web Admin:   https://127.0.0.1:3000
# Web Student: https://127.0.0.1:3001
# API:         https://127.0.0.1:3010/api
# MinIO:       http://127.0.0.1:9001
```

---

> _Tài liệu tạo ngày: 02/03/2026_
> _Phiên bản: 1.0_
