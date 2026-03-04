# Hướng Dẫn Chạy Dự Án GreenPrep

## Yêu cầu

- Docker Desktop đang chạy
- Tắt PostgreSQL local nếu có (Win + R > services.msc > Stop postgresql)

## Khởi chạy

```bash
cd "D:/GP TEST"

# Build và chạy (lần đầu hoặc sau khi sửa code)
docker compose up --build -d

# Chạy bình thường (không cần build lại)
docker compose up -d

# Chờ ~10s, kiểm tra trạng thái
docker compose ps
```

Kết quả mong đợi: tất cả container **Up**, riêng `minio-init` là **Exited (0)** (bình thường).

## Dừng dự án

```bash
# Dừng (giữ data)
docker compose down

# Dừng + xoá data database (reset hoàn toàn)
docker compose down -v
```

## Truy cập

| Ứng dụng | URL |
|-----------|-----|
| Web Admin | https://127.0.0.1:3000 |
| Web Student | https://127.0.0.1:3001 |
| API | https://127.0.0.1:3010/api |
| MinIO Console | http://127.0.0.1:9001 |

MinIO login: `gp_minio_admin` / `gp_minio_pw`

> Trình duyệt sẽ cảnh báo SSL. Chọn Advanced > Proceed to localhost.

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

Trong psql:

```sql
\dt              -- Xem danh sách bảng
\d "Users"       -- Xem cấu trúc bảng
SELECT * FROM "Users";  -- Query dữ liệu
\q               -- Thoát
```

## Seed dữ liệu mẫu

```bash
docker exec -it greenprep_api npx sequelize-cli db:seed:all
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
docker compose up -d                # Chạy lại
```

### Frontend trắng / không load

1. Kiểm tra API đang chạy: `docker compose ps`
2. Rebuild frontend: `docker compose up --build -d web_teacher web_student`
