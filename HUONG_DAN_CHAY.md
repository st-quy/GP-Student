# Hướng Dẫn Chạy Dự Án GreenPrep

## Yêu cầu

- **Docker Desktop** đã cài và đang chạy
- **Git** 2.30+
- RAM tối thiểu 4 GB, ổ cứng trống 5 GB
- Tắt PostgreSQL local nếu có (Win + R > `services.msc` > Stop postgresql)

## 1. Clone và chuẩn bị

```bash
git clone https://github.com/fptthinhgreenwich/greenprep123.git
cd greenprep123
```

## 2. Tạo file .env

Copy file mẫu và chỉnh sửa:

```bash
cp .env.example .env
```

Mở file `.env` và cập nhật 2 dòng sau bằng thông tin thật:

```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

> Các biến còn lại giữ nguyên mặc định là chạy được.

## 3. Tạo SSL Certificate

Dự án sử dụng HTTPS (self-signed). Cần tạo cert trước khi chạy:

```bash
mkdir -p certs

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/private.key \
  -out certs/public.crt \
  -subj "/C=VN/ST=HCM/L=HCM/O=GreenPrep/CN=localhost"
```

> Nếu dùng Windows không có `openssl`, cài Git Bash hoặc dùng WSL để chạy lệnh trên.

## 4. Build và khởi chạy

```bash
# Build và chạy (lần đầu hoặc sau khi sửa code)
docker compose up --build -d

# Chờ ~1-2 phút, kiểm tra trạng thái
docker compose ps
```

Kết quả mong đợi: tất cả container **Up**, riêng `minio-init` là **Exited (0)** (bình thường).

## 5. Chạy Migration & Seed dữ liệu

```bash
# Tạo bảng trong database (bắt buộc lần đầu)
docker exec -it greenprep_api npx sequelize-cli db:migrate

# Seed dữ liệu mẫu (tuỳ chọn)
docker exec -it greenprep_api npx sequelize-cli db:seed:all
```

## 6. Truy cập

| Ứng dụng | URL |
|-----------|-----|
| Web Admin | https://127.0.0.1:3000 |
| Web Student | https://127.0.0.1:3001 |
| API | https://127.0.0.1:3010/api |
| MinIO Console | http://127.0.0.1:9001 |

- MinIO login: `gp_minio_admin` / `gp_minio_pw`
- Trình duyệt sẽ cảnh báo SSL → Chọn **Advanced > Proceed to localhost**

---

## Dừng dự án

```bash
# Dừng (giữ data)
docker compose down

# Dừng + xoá data database (reset hoàn toàn)
docker compose down -v
```

## Rebuild sau khi sửa code

```bash
# Rebuild 1 service cụ thể
docker compose up --build -d server        # API
docker compose up --build -d web_teacher   # Admin
docker compose up --build -d web_student   # Student

# Rebuild tất cả
docker compose up --build -d
```

## Xem logs

```bash
docker compose logs -f              # Tất cả
docker compose logs -f server       # Chỉ API
docker compose logs -f web_teacher  # Chỉ Admin
docker compose logs -f web_student  # Chỉ Student
```

## Database

### Kết nối DBeaver / pgAdmin

| Thông tin | Giá trị |
|-----------|---------|
| Host | 127.0.0.1 |
| Port | 5432 |
| Database | greenprep_db |
| User | greenprep_db_user |
| Password | greenprep_db_password |

### Command line

```bash
docker exec -it greenprep_database psql -U greenprep_db_user -d greenprep_db
```

---

## Xử lý lỗi thường gặp

### Port 5432 bị chiếm

```
Win + R > services.msc > tìm postgresql > Stop
docker compose restart postgres_db
```

### API crash

```bash
docker compose logs -f server       # Xem lỗi
docker compose restart server       # Restart
```

### Lỗi password database

```bash
docker compose down -v              # Xoá volume cũ
docker compose up --build -d        # Chạy lại
```

### Frontend trắng / không load

1. Kiểm tra API đang chạy: `docker compose ps`
2. Mở `https://127.0.0.1:3010/api` trên trình duyệt → Accept certificate
3. Rebuild frontend: `docker compose up --build -d web_teacher web_student`

### SSL Certificate error

1. Mở trực tiếp `https://127.0.0.1:3010/api` → Accept certificate
2. Mở `https://127.0.0.1:9000` → Accept certificate
3. Quay lại truy cập Web Admin/Student
